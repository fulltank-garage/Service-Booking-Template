package repositories

import (
	"context"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"gorm.io/gorm"
)

type Store interface {
	ListServices(ctx context.Context) ([]models.Service, error)
	FindServiceByID(ctx context.Context, id string) (models.Service, error)
	CreateService(ctx context.Context, service *models.Service) error
	UpdateService(ctx context.Context, service *models.Service) error
	DeleteService(ctx context.Context, id string) error
	CountBookingsForSlot(ctx context.Context, serviceID string, date string, slotTime string) (int64, error)
	CreateBooking(ctx context.Context, booking *models.Booking) error
	ListBookings(ctx context.Context, filter models.BookingFilter) ([]models.Booking, error)
	UpdateBookingStatus(ctx context.Context, id string, status string) (models.Booking, error)
	CreateNotification(ctx context.Context, notification *models.Notification) error
	ListNotifications(ctx context.Context, unreadOnly bool, limit int) ([]models.Notification, error)
	MarkNotificationRead(ctx context.Context, id string) (models.Notification, error)
	SavePushSubscription(ctx context.Context, subscription *models.PushSubscription) error
}

type GormStore struct {
	db *gorm.DB
}

func NewGormStore(db *gorm.DB) *GormStore {
	return &GormStore{db: db}
}

func (store *GormStore) ListServices(ctx context.Context) ([]models.Service, error) {
	var services []models.Service
	err := store.db.WithContext(ctx).Where("is_active = ?", true).Order("created_at ASC").Find(&services).Error
	return services, err
}

func (store *GormStore) FindServiceByID(ctx context.Context, id string) (models.Service, error) {
	var service models.Service
	err := store.db.WithContext(ctx).Where("id = ? AND is_active = ?", id, true).First(&service).Error
	return service, err
}

func (store *GormStore) CreateService(ctx context.Context, service *models.Service) error {
	return store.db.WithContext(ctx).Create(service).Error
}

func (store *GormStore) UpdateService(ctx context.Context, service *models.Service) error {
	return store.db.WithContext(ctx).Save(service).Error
}

func (store *GormStore) DeleteService(ctx context.Context, id string) error {
	result := store.db.WithContext(ctx).Model(&models.Service{}).Where("id = ?", id).Update("is_active", false)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

func (store *GormStore) CountBookingsForSlot(ctx context.Context, serviceID string, date string, slotTime string) (int64, error) {
	var count int64
	err := store.db.WithContext(ctx).
		Model(&models.Booking{}).
		Where("service_id = ? AND booking_date = ? AND slot_time = ? AND status <> ?", serviceID, date, slotTime, models.BookingStatusCancelled).
		Count(&count).Error
	return count, err
}

func (store *GormStore) CreateBooking(ctx context.Context, booking *models.Booking) error {
	return store.db.WithContext(ctx).Create(booking).Error
}

func (store *GormStore) ListBookings(ctx context.Context, filter models.BookingFilter) ([]models.Booking, error) {
	var bookings []models.Booking
	query := store.db.WithContext(ctx).Preload("Service").Order("booking_date DESC, slot_time DESC, created_at DESC")
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.Date != "" {
		query = query.Where("booking_date = ?", filter.Date)
	}
	if filter.Limit > 0 {
		query = query.Limit(filter.Limit)
	}
	err := query.Find(&bookings).Error
	return bookings, err
}

func (store *GormStore) UpdateBookingStatus(ctx context.Context, id string, status string) (models.Booking, error) {
	var booking models.Booking
	err := store.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.Preload("Service").First(&booking, "id = ?", id).Error; err != nil {
			return err
		}
		booking.Status = status
		if err := tx.Save(&booking).Error; err != nil {
			return err
		}
		return tx.Preload("Service").First(&booking, "id = ?", id).Error
	})
	return booking, err
}

func (store *GormStore) CreateNotification(ctx context.Context, notification *models.Notification) error {
	return store.db.WithContext(ctx).Create(notification).Error
}

func (store *GormStore) ListNotifications(ctx context.Context, unreadOnly bool, limit int) ([]models.Notification, error) {
	var notifications []models.Notification
	query := store.db.WithContext(ctx).Order("created_at DESC")
	if unreadOnly {
		query = query.Where("is_read = ?", false)
	}
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&notifications).Error
	return notifications, err
}

func (store *GormStore) MarkNotificationRead(ctx context.Context, id string) (models.Notification, error) {
	var notification models.Notification
	err := store.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&notification, "id = ?", id).Error; err != nil {
			return err
		}
		notification.IsRead = true
		return tx.Save(&notification).Error
	})
	return notification, err
}

func (store *GormStore) SavePushSubscription(ctx context.Context, subscription *models.PushSubscription) error {
	return store.db.WithContext(ctx).
		Where(models.PushSubscription{Endpoint: subscription.Endpoint}).
		Assign(subscription).
		FirstOrCreate(subscription).Error
}
