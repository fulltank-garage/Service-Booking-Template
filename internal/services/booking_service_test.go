package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
)

func TestCreateBookingRejectsFullSlot(t *testing.T) {
	store := &fakeStore{service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, IsActive: true}, slotCount: 2}
	service := NewBookingService(store, nil, nil, 2)

	_, err := service.CreateBooking(context.Background(), CreateBookingInput{
		ServiceID:    "svc-1",
		CustomerName: "Somchai",
		Phone:        "0890000000",
		BookingDate:  "2026-06-10",
		SlotTime:     "10:00",
	})

	if !errors.Is(err, ErrSlotUnavailable) {
		t.Fatalf("expected ErrSlotUnavailable, got %v", err)
	}
}

func TestCreateBookingNormalizesAndPersistsPendingBooking(t *testing.T) {
	store := &fakeStore{service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, IsActive: true}}
	service := NewBookingService(store, nil, nil, 3)

	booking, err := service.CreateBooking(context.Background(), CreateBookingInput{
		ServiceID:    " svc-1 ",
		CustomerName: " Anong ",
		Phone:        " 0812345678 ",
		BookingDate:  "2026-06-10",
		SlotTime:     "10:00",
	})

	if err != nil {
		t.Fatalf("create booking: %v", err)
	}
	if booking.Status != models.BookingStatusPending {
		t.Fatalf("expected pending status, got %q", booking.Status)
	}
	if booking.CustomerName != "Anong" {
		t.Fatalf("expected trimmed customer name, got %q", booking.CustomerName)
	}
	if store.created == nil {
		t.Fatal("expected booking to be persisted")
	}
}

func TestListAvailabilityReturnsSixteenBusinessSlots(t *testing.T) {
	store := &fakeStore{service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, IsActive: true}}
	service := NewBookingService(store, nil, nil, 3)

	slots, err := service.ListAvailability(context.Background(), "svc-1", "2026-06-10")
	if err != nil {
		t.Fatalf("list availability: %v", err)
	}
	if len(slots) != 16 {
		t.Fatalf("expected 16 slots, got %d", len(slots))
	}
	if slots[0].Time != "09:00" || slots[15].Time != "16:30" {
		t.Fatalf("unexpected slot range: %s to %s", slots[0].Time, slots[15].Time)
	}
}

func TestListAvailabilityUsesBookingSettings(t *testing.T) {
	store := &fakeStore{
		service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, IsActive: true},
		settings: models.BookingSettings{
			OpenTime:            "10:00",
			CloseTime:           "11:00",
			SlotIntervalMinutes: 30,
			SlotCapacity:        2,
			ClosedWeekdays:      "0",
		},
	}
	service := NewBookingService(store, nil, nil, 1)

	slots, err := service.ListAvailability(context.Background(), "svc-1", "2026-06-10")
	if err != nil {
		t.Fatalf("list availability: %v", err)
	}
	if len(slots) != 2 {
		t.Fatalf("expected 2 slots from settings, got %d", len(slots))
	}
	if slots[0].Time != "10:00" || slots[1].Time != "10:30" {
		t.Fatalf("unexpected custom slots: %#v", slots)
	}
	if slots[0].Capacity != 2 {
		t.Fatalf("expected settings capacity 2, got %d", slots[0].Capacity)
	}

	closedSlots, err := service.ListAvailability(context.Background(), "svc-1", "2026-06-07")
	if err != nil {
		t.Fatalf("list closed day availability: %v", err)
	}
	if len(closedSlots) != 0 {
		t.Fatalf("expected no slots on closed weekday, got %d", len(closedSlots))
	}
}

type fakeStore struct {
	service   models.Service
	slotCount int64
	created   *models.Booking
	settings  models.BookingSettings
}

func (store *fakeStore) ListServices(context.Context) ([]models.Service, error) {
	return []models.Service{store.service}, nil
}
func (store *fakeStore) FindServiceByID(_ context.Context, id string) (models.Service, error) {
	if id != store.service.ID {
		return models.Service{}, errors.New("not found")
	}
	return store.service, nil
}
func (store *fakeStore) CreateService(_ context.Context, service *models.Service) error {
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
func (store *fakeStore) LatestBookingByLineUser(context.Context, string) (models.Booking, error) {
	return models.Booking{}, nil
}
func (store *fakeStore) ListBookings(context.Context, models.BookingFilter) ([]models.Booking, error) {
	return nil, nil
}
func (store *fakeStore) UpdateBookingStatus(context.Context, string, string) (models.Booking, error) {
	return models.Booking{}, nil
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
	return store.settings, nil
}
func (store *fakeStore) SaveBookingSettings(_ context.Context, settings *models.BookingSettings) error {
	store.settings = *settings
	return nil
}
