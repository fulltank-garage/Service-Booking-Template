package repositories

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"gorm.io/gorm"
)

type Store interface {
	ListServices(ctx context.Context) ([]models.Service, error)
	ListAdminServices(ctx context.Context) ([]models.Service, error)
	FindServiceByID(ctx context.Context, id string) (models.Service, error)
	FindAnyServiceByID(ctx context.Context, id string) (models.Service, error)
	CreateService(ctx context.Context, service *models.Service) error
	UpdateService(ctx context.Context, service *models.Service) error
	DeleteService(ctx context.Context, id string) error
	FindAdminUserByEmail(ctx context.Context, email string) (models.AdminUser, error)
	CreateAdminUser(ctx context.Context, user *models.AdminUser) error
	CreateAdminSession(ctx context.Context, session *models.AdminSessionRecord) error
	FindAdminSessionByTokenHash(ctx context.Context, tokenHash string) (models.AdminSessionRecord, error)
	RevokeAdminSession(ctx context.Context, tokenHash string) error
	CountBookingsForSlot(ctx context.Context, serviceID string, date string, slotTime string) (int64, error)
	CreateBooking(ctx context.Context, booking *models.Booking) error
	CreateBookingWithAvailability(ctx context.Context, booking *models.Booking, durationMinutes int, capacity int, bufferMinutes int) error
	FindBookingByID(ctx context.Context, id string) (models.Booking, error)
	LatestBookingByLineUser(ctx context.Context, lineUserID string) (models.Booking, error)
	ListBookings(ctx context.Context, filter models.BookingFilter) ([]models.Booking, error)
	UpdateBookingWithAvailability(ctx context.Context, booking *models.Booking, durationMinutes int, capacity int, bufferMinutes int) (models.Booking, error)
	UpdateBookingStatus(ctx context.Context, id string, status string) (models.Booking, error)
	DeleteBooking(ctx context.Context, id string) error
	GetBookingSettings(ctx context.Context) (models.BookingSettings, error)
	ListBlackoutDates(ctx context.Context) ([]models.BookingBlackoutDate, error)
	SaveBookingSettings(ctx context.Context, settings *models.BookingSettings) error
	CreateNotification(ctx context.Context, notification *models.Notification) error
	ListNotifications(ctx context.Context, unreadOnly bool, limit int) ([]models.Notification, error)
	MarkNotificationRead(ctx context.Context, id string) (models.Notification, error)
	CleanupNotifications(ctx context.Context, readBefore time.Time, allBefore time.Time) error
	SavePushSubscription(ctx context.Context, subscription *models.PushSubscription) error
	ListPushSubscriptions(ctx context.Context) ([]models.PushSubscription, error)
	DeletePushSubscription(ctx context.Context, endpoint string) error
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

func (store *GormStore) ListAdminServices(ctx context.Context) ([]models.Service, error) {
	var services []models.Service
	err := store.db.WithContext(ctx).Order("created_at ASC").Find(&services).Error
	return services, err
}

func (store *GormStore) FindServiceByID(ctx context.Context, id string) (models.Service, error) {
	var service models.Service
	err := store.db.WithContext(ctx).Where("id = ? AND is_active = ?", id, true).First(&service).Error
	return service, err
}

func (store *GormStore) FindAnyServiceByID(ctx context.Context, id string) (models.Service, error) {
	var service models.Service
	err := store.db.WithContext(ctx).Where("id = ?", id).First(&service).Error
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

func (store *GormStore) FindAdminUserByEmail(ctx context.Context, email string) (models.AdminUser, error) {
	var user models.AdminUser
	err := store.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	return user, err
}

func (store *GormStore) CreateAdminUser(ctx context.Context, user *models.AdminUser) error {
	return store.db.WithContext(ctx).Create(user).Error
}

func (store *GormStore) CreateAdminSession(ctx context.Context, session *models.AdminSessionRecord) error {
	return store.db.WithContext(ctx).Create(session).Error
}

func (store *GormStore) FindAdminSessionByTokenHash(ctx context.Context, tokenHash string) (models.AdminSessionRecord, error) {
	var session models.AdminSessionRecord
	err := store.db.WithContext(ctx).Preload("AdminUser").Where("token_hash = ?", tokenHash).First(&session).Error
	return session, err
}

func (store *GormStore) RevokeAdminSession(ctx context.Context, tokenHash string) error {
	now := time.Now().UTC()
	return store.db.WithContext(ctx).Model(&models.AdminSessionRecord{}).Where("token_hash = ?", tokenHash).Update("revoked_at", &now).Error
}

func (store *GormStore) CountBookingsForSlot(ctx context.Context, serviceID string, date string, slotTime string) (int64, error) {
	var count int64
	err := store.db.WithContext(ctx).
		Model(&models.Booking{}).
		Where("service_id = ? AND booking_date = ? AND slot_time = ? AND status NOT IN ?", serviceID, date, slotTime, []string{models.BookingStatusCancelled, models.BookingStatusCompleted, models.BookingStatusNoShow}).
		Count(&count).Error
	return count, err
}

func (store *GormStore) CreateBooking(ctx context.Context, booking *models.Booking) error {
	return store.db.WithContext(ctx).Create(booking).Error
}

func (store *GormStore) CreateBookingWithAvailability(ctx context.Context, booking *models.Booking, durationMinutes int, capacity int, bufferMinutes int) error {
	return store.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := lockBookingDate(tx, booking.BookingDate); err != nil {
			return err
		}
		var bookings []models.Booking
		if err := tx.Preload("Service").
			Where("booking_date = ? AND status NOT IN ?", booking.BookingDate, []string{models.BookingStatusCancelled, models.BookingStatusCompleted, models.BookingStatusNoShow}).
			Find(&bookings).Error; err != nil {
			return err
		}
		if countOverlappingBookings(bookings, booking.SlotTime, durationMinutes, bufferMinutes, "") >= int64(capacity) {
			return ErrSlotCapacityReached
		}
		return tx.Create(booking).Error
	})
}

func (store *GormStore) FindBookingByID(ctx context.Context, id string) (models.Booking, error) {
	var booking models.Booking
	err := store.db.WithContext(ctx).Preload("Service").First(&booking, "id = ?", id).Error
	return booking, err
}

func (store *GormStore) LatestBookingByLineUser(ctx context.Context, lineUserID string) (models.Booking, error) {
	var booking models.Booking
	err := store.db.WithContext(ctx).
		Preload("Service").
		Where("line_user_id = ?", lineUserID).
		Where("status IN ?", []string{models.BookingStatusPending, models.BookingStatusConfirmed}).
		Order("created_at DESC").
		First(&booking).Error
	return booking, err
}

func (store *GormStore) ListBookings(ctx context.Context, filter models.BookingFilter) ([]models.Booking, error) {
	var bookings []models.Booking
	query := store.db.WithContext(ctx).Preload("Service").Order("created_at DESC, booking_date DESC, slot_time DESC")
	if filter.Status != "" {
		query = query.Where("status = ?", filter.Status)
	}
	if filter.Date != "" {
		query = query.Where("booking_date = ?", filter.Date)
	}
	if strings.TrimSpace(filter.Query) != "" {
		term := "%" + strings.ToLower(strings.TrimSpace(filter.Query)) + "%"
		query = query.Where(
			"LOWER(booking_code) LIKE ? OR LOWER(customer_name) LIKE ? OR LOWER(phone) LIKE ?",
			term,
			term,
			term,
		)
	}
	if filter.Limit > 0 {
		query = query.Limit(filter.Limit)
	}
	err := query.Find(&bookings).Error
	return bookings, err
}

func (store *GormStore) UpdateBookingWithAvailability(ctx context.Context, booking *models.Booking, durationMinutes int, capacity int, bufferMinutes int) (models.Booking, error) {
	var updated models.Booking
	err := store.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := lockBookingDate(tx, booking.BookingDate); err != nil {
			return err
		}
		var bookings []models.Booking
		if err := tx.Preload("Service").
			Where("booking_date = ? AND status NOT IN ? AND id <> ?", booking.BookingDate, []string{models.BookingStatusCancelled, models.BookingStatusCompleted, models.BookingStatusNoShow}, booking.ID).
			Find(&bookings).Error; err != nil {
			return err
		}
		if countOverlappingBookings(bookings, booking.SlotTime, durationMinutes, bufferMinutes, booking.ID) >= int64(capacity) {
			return ErrSlotCapacityReached
		}
		if err := tx.Save(booking).Error; err != nil {
			return err
		}
		return tx.Preload("Service").First(&updated, "id = ?", booking.ID).Error
	})
	return updated, err
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

func (store *GormStore) DeleteBooking(ctx context.Context, id string) error {
	result := store.db.WithContext(ctx).Unscoped().Delete(&models.Booking{}, "id = ?", id)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}

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
	err := store.db.WithContext(ctx).Order("date ASC").Find(&blackoutDates).Error
	return blackoutDates, err
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

var ErrSlotCapacityReached = errors.New("slot capacity reached")

func lockBookingDate(tx *gorm.DB, date string) error {
	return tx.Exec("SELECT pg_advisory_xact_lock(hashtext(?))", "booking:"+date).Error
}

func countOverlappingBookings(bookings []models.Booking, slot string, durationMinutes int, bufferMinutes int, excludeID string) int64 {
	slotStart, ok := clockMinutes(slot)
	if !ok || durationMinutes <= 0 {
		return 0
	}
	if bufferMinutes < 0 {
		bufferMinutes = 0
	}
	slotEnd := slotStart + durationMinutes + bufferMinutes
	var count int64
	for _, booking := range bookings {
		if booking.ID == excludeID || booking.Status == models.BookingStatusCancelled || booking.Status == models.BookingStatusCompleted || booking.Status == models.BookingStatusNoShow {
			continue
		}
		bookingDuration := booking.Service.DurationMinutes
		if bookingDuration <= 0 {
			bookingDuration = durationMinutes
		}
		bookingStart, ok := clockMinutes(booking.SlotTime)
		if !ok {
			continue
		}
		bookingEnd := bookingStart + bookingDuration + bufferMinutes
		if slotStart < bookingEnd && bookingStart < slotEnd {
			count++
		}
	}
	return count
}

func clockMinutes(value string) (int, bool) {
	parsed, err := time.Parse("15:04", value)
	if err != nil {
		return 0, false
	}
	return parsed.Hour()*60 + parsed.Minute(), true
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

func (store *GormStore) CleanupNotifications(ctx context.Context, readBefore time.Time, allBefore time.Time) error {
	return store.db.WithContext(ctx).
		Where("(is_read = ? AND created_at < ?) OR created_at < ?", true, readBefore, allBefore).
		Delete(&models.Notification{}).
		Error
}

func (store *GormStore) SavePushSubscription(ctx context.Context, subscription *models.PushSubscription) error {
	return store.db.WithContext(ctx).
		Where(models.PushSubscription{Endpoint: subscription.Endpoint}).
		Assign(subscription).
		FirstOrCreate(subscription).Error
}

func (store *GormStore) ListPushSubscriptions(ctx context.Context) ([]models.PushSubscription, error) {
	var subscriptions []models.PushSubscription
	err := store.db.WithContext(ctx).Order("created_at DESC").Find(&subscriptions).Error
	return subscriptions, err
}

func (store *GormStore) DeletePushSubscription(ctx context.Context, endpoint string) error {
	return store.db.WithContext(ctx).Where("endpoint = ?", endpoint).Delete(&models.PushSubscription{}).Error
}
