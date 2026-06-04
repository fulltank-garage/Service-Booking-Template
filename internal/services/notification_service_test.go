package services

import (
	"context"
	"testing"

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
}

type notificationStore struct {
	created       *models.Notification
	subscriptions []models.PushSubscription
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
func (store *notificationStore) CountBookingsForSlot(context.Context, string, string, string) (int64, error) {
	return 0, nil
}
func (store *notificationStore) CreateBooking(context.Context, *models.Booking) error { return nil }
func (store *notificationStore) LatestBookingByLineUser(context.Context, string) (models.Booking, error) {
	return models.Booking{}, nil
}
func (store *notificationStore) ListBookings(context.Context, models.BookingFilter) ([]models.Booking, error) {
	return nil, nil
}
func (store *notificationStore) UpdateBookingStatus(context.Context, string, string) (models.Booking, error) {
	return models.Booking{}, nil
}
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
func (store *notificationStore) SavePushSubscription(context.Context, *models.PushSubscription) error {
	return nil
}
func (store *notificationStore) ListPushSubscriptions(context.Context) ([]models.PushSubscription, error) {
	return store.subscriptions, nil
}

type recordingPushSender struct {
	sent []PushMessage
}

func (sender *recordingPushSender) Send(_ context.Context, _ models.PushSubscription, message PushMessage) error {
	sender.sent = append(sender.sent, message)
	return nil
}
