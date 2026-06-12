package services

import (
	"context"
	"errors"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"github.com/fulltank-garage/service-booking-template-api/internal/repositories"
	"gorm.io/gorm"
)

func freezeBookingServiceNow(service *BookingService) {
	service.now = func() time.Time {
		return time.Date(2026, 6, 5, 12, 0, 0, 0, time.FixedZone("ICT", 7*60*60))
	}
}

type fakeStore struct {
	service       models.Service
	slotCount     int64
	created       *models.Booking
	bookings      []models.Booking
	settings      models.BookingSettings
	blackoutDates []models.BookingBlackoutDate
}

func (store *fakeStore) ListServices(context.Context) ([]models.Service, error) {
	return []models.Service{store.service}, nil
}
func (store *fakeStore) ListAdminServices(context.Context) ([]models.Service, error) {
	return []models.Service{store.service}, nil
}
func (store *fakeStore) FindServiceByID(_ context.Context, id string) (models.Service, error) {
	if id != store.service.ID {
		return models.Service{}, errors.New("not found")
	}
	return store.service, nil
}
func (store *fakeStore) FindAnyServiceByID(_ context.Context, id string) (models.Service, error) {
	if id != store.service.ID {
		return models.Service{}, errors.New("not found")
	}
	return store.service, nil
}
func (store *fakeStore) CreateService(_ context.Context, service *models.Service) error {
	if service.ID == "" {
		service.ID = "svc-1"
	}
	store.service = *service
	return nil
}
func (store *fakeStore) UpdateService(_ context.Context, service *models.Service) error {
	store.service = *service
	return nil
}
func (store *fakeStore) DeleteService(context.Context, string) error {
	store.service.IsActive = false
	return nil
}
func (store *fakeStore) FindAdminUserByEmail(context.Context, string) (models.AdminUser, error) {
	return models.AdminUser{}, nil
}
func (store *fakeStore) CreateAdminUser(context.Context, *models.AdminUser) error { return nil }
func (store *fakeStore) CreateAdminSession(context.Context, *models.AdminSessionRecord) error {
	return nil
}
func (store *fakeStore) FindAdminSessionByTokenHash(context.Context, string) (models.AdminSessionRecord, error) {
	return models.AdminSessionRecord{}, nil
}
func (store *fakeStore) RevokeAdminSession(context.Context, string) error { return nil }
func (store *fakeStore) CountBookingsForSlot(context.Context, string, string, string) (int64, error) {
	return store.slotCount, nil
}
func (store *fakeStore) CreateBooking(_ context.Context, booking *models.Booking) error {
	store.created = booking
	return nil
}
func (store *fakeStore) CreateBookingWithAvailability(_ context.Context, booking *models.Booking, durationMinutes int, capacity int, bufferMinutes int) error {
	if countOverlappingBookings(store.bookings, booking.SlotTime, durationMinutes, bufferMinutes) >= int64(capacity) {
		return repositories.ErrSlotCapacityReached
	}
	store.created = booking
	return nil
}
func (store *fakeStore) FindBookingByID(context.Context, string) (models.Booking, error) {
	if store.created == nil {
		return models.Booking{}, errors.New("not found")
	}
	return *store.created, nil
}
func (store *fakeStore) LatestBookingByLineUser(context.Context, string) (models.Booking, error) {
	return models.Booking{}, gorm.ErrRecordNotFound
}
func (store *fakeStore) ListBookings(context.Context, models.BookingFilter) ([]models.Booking, error) {
	return store.bookings, nil
}
func (store *fakeStore) CountNoShowBookingsByLineUser(_ context.Context, lineUserID string) (int64, error) {
	var count int64
	for _, booking := range store.bookings {
		if booking.LineUserID == lineUserID && booking.Status == models.BookingStatusNoShow {
			count++
		}
	}
	return count, nil
}
func (store *fakeStore) UpdateBookingWithAvailability(_ context.Context, booking *models.Booking, durationMinutes int, capacity int, bufferMinutes int) (models.Booking, error) {
	if countOverlappingBookings(store.bookings, booking.SlotTime, durationMinutes, bufferMinutes) >= int64(capacity) {
		return models.Booking{}, repositories.ErrSlotCapacityReached
	}
	store.created = booking
	return *booking, nil
}
func (store *fakeStore) UpdateBookingStatus(_ context.Context, _ string, status string) (models.Booking, error) {
	if store.created == nil {
		return models.Booking{}, errors.New("not found")
	}
	store.created.Status = status
	return *store.created, nil
}
func (store *fakeStore) DeleteBooking(context.Context, string) error {
	store.created = nil
	return nil
}
func (store *fakeStore) CreateNotification(context.Context, *models.Notification) error { return nil }
func (store *fakeStore) ListNotifications(context.Context, bool, int) ([]models.Notification, error) {
	return nil, nil
}
func (store *fakeStore) MarkNotificationRead(context.Context, string) (models.Notification, error) {
	return models.Notification{}, nil
}
func (store *fakeStore) CleanupNotifications(context.Context, time.Time, time.Time) error {
	return nil
}
func (store *fakeStore) SavePushSubscription(context.Context, *models.PushSubscription) error {
	return nil
}
func (store *fakeStore) ListPushSubscriptions(context.Context) ([]models.PushSubscription, error) {
	return nil, nil
}
func (store *fakeStore) DeletePushSubscription(context.Context, string) error { return nil }
func (store *fakeStore) GetBookingSettings(context.Context) (models.BookingSettings, error) {
	store.settings.BlackoutDates = store.blackoutDates
	return store.settings, nil
}
func (store *fakeStore) ListBlackoutDates(context.Context) ([]models.BookingBlackoutDate, error) {
	return store.blackoutDates, nil
}
func (store *fakeStore) SaveBookingSettings(_ context.Context, settings *models.BookingSettings) error {
	store.settings = *settings
	return nil
}
