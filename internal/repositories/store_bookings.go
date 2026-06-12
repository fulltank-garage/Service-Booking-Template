package repositories

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"gorm.io/gorm"
)

var ErrSlotCapacityReached = errors.New("slot capacity reached")

func (store *GormStore) CountBookingsForSlot(ctx context.Context, serviceID string, date string, slotTime string) (int64, error) {
	var count int64
	err := store.db.WithContext(ctx).
		Model(&models.Booking{}).
		Where("service_id = ? AND booking_date = ? AND slot_time = ? AND status NOT IN ?", serviceID, date, slotTime, closedBookingStatuses()).
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
			Where("booking_date = ? AND status NOT IN ?", booking.BookingDate, closedBookingStatuses()).
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
	if filter.From != "" {
		query = query.Where("booking_date >= ?", filter.From)
	}
	if filter.To != "" {
		query = query.Where("booking_date <= ?", filter.To)
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

func (store *GormStore) CountNoShowBookingsByLineUser(ctx context.Context, lineUserID string) (int64, error) {
	var count int64
	err := store.db.WithContext(ctx).
		Model(&models.Booking{}).
		Where("line_user_id = ? AND status = ?", strings.TrimSpace(lineUserID), models.BookingStatusNoShow).
		Count(&count).Error
	return count, err
}

func (store *GormStore) UpdateBookingWithAvailability(ctx context.Context, booking *models.Booking, durationMinutes int, capacity int, bufferMinutes int) (models.Booking, error) {
	var updated models.Booking
	err := store.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := lockBookingDate(tx, booking.BookingDate); err != nil {
			return err
		}
		var bookings []models.Booking
		if err := tx.Preload("Service").
			Where("booking_date = ? AND status NOT IN ? AND id <> ?", booking.BookingDate, closedBookingStatuses(), booking.ID).
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

func closedBookingStatuses() []string {
	return []string{models.BookingStatusCancelled, models.BookingStatusCompleted, models.BookingStatusNoShow}
}

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
