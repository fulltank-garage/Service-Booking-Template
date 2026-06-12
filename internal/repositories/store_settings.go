package repositories

import (
	"context"
	"strings"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"gorm.io/gorm"
)

func (store *GormStore) GetBookingSettings(ctx context.Context) (models.BookingSettings, error) {
	var settings models.BookingSettings
	err := store.db.WithContext(ctx).First(&settings, "id = ?", "default").Error
	if err == gorm.ErrRecordNotFound {
		settings = models.BookingSettings{}
	} else if err != nil {
		return settings, err
	}
	blackoutDates, err := store.ListBlackoutDates(ctx)
	if err != nil {
		return settings, err
	}
	settings.BlackoutDates = blackoutDates
	return settings, nil
}

func (store *GormStore) ListBlackoutDates(ctx context.Context) ([]models.BookingBlackoutDate, error) {
	var blackoutDates []models.BookingBlackoutDate
	return blackoutDates, store.db.WithContext(ctx).Order("date ASC").Find(&blackoutDates).Error
}

func (store *GormStore) SaveBookingSettings(ctx context.Context, settings *models.BookingSettings) error {
	settings.ID = "default"
	return store.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Save(settings).Error; err != nil {
			return err
		}
		if settings.BlackoutDates == nil {
			return nil
		}
		if err := tx.Unscoped().Where("1 = 1").Delete(&models.BookingBlackoutDate{}).Error; err != nil {
			return err
		}
		for index := range settings.BlackoutDates {
			item := settings.BlackoutDates[index]
			item.Date = strings.TrimSpace(item.Date)
			item.Reason = strings.TrimSpace(item.Reason)
			if item.Date == "" {
				continue
			}
			if err := tx.Create(&item).Error; err != nil {
				return err
			}
		}
		return nil
	})
}
