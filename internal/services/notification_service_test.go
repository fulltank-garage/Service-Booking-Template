package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
)

func TestBookingCreatedSendsWebPushToSavedSubscriptions(t *testing.T) {
	store := &notificationStore{
		subscriptions: []models.PushSubscription{
			{Endpoint: "https://push.example.test/one", P256DH: "key", Auth: "auth"},
			{Endpoint: "https://push.example.test/two", P256DH: "key", Auth: "auth"},
		},
	}
	pushSender := &recordingPushSender{}
	service := NewNotificationServiceWithPush(store, nil, nil, pushSender)

	err := service.BookingCreated(context.Background(), models.Booking{
		BaseModel:    models.BaseModel{ID: "booking-1"},
		BookingCode:  "SB-TEST-0001",
		CustomerName: "ลูกค้าทดสอบ",
		BookingDate:  "2026-06-05",
		SlotTime:     "10:00",
	})

	if err != nil {
		t.Fatalf("booking created: %v", err)
	}
	if store.created == nil {
		t.Fatal("expected notification to be persisted")
	}
	if len(pushSender.sent) != 2 {
		t.Fatalf("expected push to 2 subscriptions, got %d", len(pushSender.sent))
	}
	if pushSender.sent[0].Title != "มีคิวจองใหม่" {
		t.Fatalf("expected booking push title, got %q", pushSender.sent[0].Title)
	}
	if pushSender.sent[0].Body != "ลูกค้าทดสอบ จองเวลา 10:00 วันที่ 5 มิ.ย. 2569" {
		t.Fatalf("expected Thai date in push body, got %q", pushSender.sent[0].Body)
	}
}

func TestBookingCreatedDeletesExpiredWebPushSubscriptions(t *testing.T) {
	store := &notificationStore{
		subscriptions: []models.PushSubscription{
			{Endpoint: "https://push.example.test/expired", P256DH: "key", Auth: "auth"},
			{Endpoint: "https://push.example.test/active", P256DH: "key", Auth: "auth"},
		},
	}
	pushSender := &recordingPushSender{
		errByEndpoint: map[string]error{
			"https://push.example.test/expired": &PushError{StatusCode: 410},
		},
	}
	service := NewNotificationServiceWithPush(store, nil, nil, pushSender)

	err := service.BookingCreated(context.Background(), models.Booking{
		BaseModel:    models.BaseModel{ID: "booking-1"},
		BookingCode:  "SB-TEST-0001",
		CustomerName: "ลูกค้าทดสอบ",
		BookingDate:  "2026-06-05",
		SlotTime:     "10:00",
	})

	if err != nil {
		t.Fatalf("booking created: %v", err)
	}
	if len(store.deletedEndpoints) != 1 {
		t.Fatalf("expected 1 deleted endpoint, got %d", len(store.deletedEndpoints))
	}
	if store.deletedEndpoints[0] != "https://push.example.test/expired" {
		t.Fatalf("expected expired endpoint to be deleted, got %q", store.deletedEndpoints[0])
	}
}

func TestBookingCreatedRunsNotificationCleanup(t *testing.T) {
	store := &notificationStore{}
	service := NewNotificationServiceWithPush(store, nil, nil, nil)

	err := service.BookingCreated(context.Background(), models.Booking{
		BaseModel:    models.BaseModel{ID: "booking-1"},
		BookingCode:  "SB-TEST-0001",
		CustomerName: "ลูกค้าทดสอบ",
		BookingDate:  "2026-06-05",
		SlotTime:     "10:00",
	})

	if err != nil {
		t.Fatalf("booking created: %v", err)
	}
	if store.cleanupReadBefore.IsZero() || store.cleanupAllBefore.IsZero() {
		t.Fatal("expected notification cleanup thresholds to be set")
	}
	if got := store.cleanupReadBefore.Sub(store.cleanupAllBefore); got < 22*24*time.Hour || got > 24*24*time.Hour {
		t.Fatalf("expected unread notifications to be retained longer than read notifications, got %v", got)
	}
}

type notificationStore struct {
	created           *models.Notification
	subscriptions     []models.PushSubscription
	deletedEndpoints  []string
	cleanupReadBefore time.Time
	cleanupAllBefore  time.Time
}

func (store *notificationStore) ListServices(context.Context) ([]models.Service, error) {
	return nil, nil
}
func (store *notificationStore) FindServiceByID(context.Context, string) (models.Service, error) {
	return models.Service{}, nil
}
func (store *notificationStore) CreateService(context.Context, *models.Service) error { return nil }
func (store *notificationStore) UpdateService(context.Context, *models.Service) error { return nil }
func (store *notificationStore) DeleteService(context.Context, string) error          { return nil }
func (store *notificationStore) FindAdminUserByEmail(context.Context, string) (models.AdminUser, error) {
	return models.AdminUser{}, nil
}
func (store *notificationStore) CreateAdminUser(context.Context, *models.AdminUser) error { return nil }
func (store *notificationStore) CreateAdminSession(context.Context, *models.AdminSessionRecord) error {
	return nil
}
func (store *notificationStore) FindAdminSessionByTokenHash(context.Context, string) (models.AdminSessionRecord, error) {
	return models.AdminSessionRecord{}, nil
}
func (store *notificationStore) RevokeAdminSession(context.Context, string) error { return nil }
func (store *notificationStore) CountBookingsForSlot(context.Context, string, string, string) (int64, error) {
	return 0, nil
}
func (store *notificationStore) CreateBooking(context.Context, *models.Booking) error { return nil }
func (store *notificationStore) FindBookingByID(context.Context, string) (models.Booking, error) {
	return models.Booking{}, nil
}
func (store *notificationStore) LatestBookingByLineUser(context.Context, string) (models.Booking, error) {
	return models.Booking{}, nil
}
func (store *notificationStore) ListBookings(context.Context, models.BookingFilter) ([]models.Booking, error) {
	return nil, nil
}
func (store *notificationStore) UpdateBookingStatus(context.Context, string, string) (models.Booking, error) {
	return models.Booking{}, nil
}
func (store *notificationStore) DeleteBooking(context.Context, string) error { return nil }
func (store *notificationStore) CreateNotification(_ context.Context, notification *models.Notification) error {
	store.created = notification
	return nil
}
func (store *notificationStore) ListNotifications(context.Context, bool, int) ([]models.Notification, error) {
	return nil, nil
}
func (store *notificationStore) MarkNotificationRead(context.Context, string) (models.Notification, error) {
	return models.Notification{}, nil
}
func (store *notificationStore) CleanupNotifications(_ context.Context, readBefore time.Time, allBefore time.Time) error {
	store.cleanupReadBefore = readBefore
	store.cleanupAllBefore = allBefore
	return nil
}
func (store *notificationStore) SavePushSubscription(context.Context, *models.PushSubscription) error {
	return nil
}
func (store *notificationStore) ListPushSubscriptions(context.Context) ([]models.PushSubscription, error) {
	return store.subscriptions, nil
}
func (store *notificationStore) DeletePushSubscription(_ context.Context, endpoint string) error {
	store.deletedEndpoints = append(store.deletedEndpoints, endpoint)
	return nil
}
func (store *notificationStore) GetBookingSettings(context.Context) (models.BookingSettings, error) {
	return models.BookingSettings{}, nil
}
func (store *notificationStore) SaveBookingSettings(context.Context, *models.BookingSettings) error {
	return nil
}

type recordingPushSender struct {
	sent          []PushMessage
	errByEndpoint map[string]error
}

func (sender *recordingPushSender) Send(_ context.Context, subscription models.PushSubscription, message PushMessage) error {
	sender.sent = append(sender.sent, message)
	if err, ok := sender.errByEndpoint[subscription.Endpoint]; ok {
		return err
	}
	return nil
}

func TestPushErrorStatusHelpers(t *testing.T) {
	if !errors.Is(&PushError{StatusCode: 410}, ErrExpiredPushSubscription) {
		t.Fatal("expected 410 push error to match expired subscription sentinel")
	}
	if !errors.Is(&PushError{StatusCode: 404}, ErrExpiredPushSubscription) {
		t.Fatal("expected 404 push error to match expired subscription sentinel")
	}
	if errors.Is(&PushError{StatusCode: 500}, ErrExpiredPushSubscription) {
		t.Fatal("expected 500 push error to not match expired subscription sentinel")
	}
}

func TestWebPushTTLIsLongEnoughForClosedMobileApps(t *testing.T) {
	if webPushTTLSeconds < 24*60*60 {
		t.Fatalf("expected at least one day TTL for closed mobile apps, got %d", webPushTTLSeconds)
	}
}
