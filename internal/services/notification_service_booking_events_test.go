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
	if pushSender.sent[0].Body != "ลูกค้าทดสอบ จองเวลา 10:00 วันที่ 5 มิ.ย. 2569" {
		t.Fatalf("expected Thai date in push body, got %q", pushSender.sent[0].Body)
	}
}

func TestBookingCreatedSendsWebPushAfterRequestContextIsCancelled(t *testing.T) {
	store := &notificationStore{
		subscriptions: []models.PushSubscription{
			{Endpoint: "https://push.example.test/one", P256DH: "key", Auth: "auth"},
		},
	}
	pushSender := &recordingPushSender{}
	service := NewNotificationServiceWithPush(store, nil, nil, pushSender)
	ctx, cancel := context.WithCancel(context.Background())
	cancel()

	err := service.BookingCreated(ctx, models.Booking{
		BaseModel:    models.BaseModel{ID: "booking-1"},
		BookingCode:  "SB-TEST-0001",
		CustomerName: "ลูกค้าทดสอบ",
		BookingDate:  "2026-06-05",
		SlotTime:     "10:00",
	})

	if err != nil {
		t.Fatalf("booking created: %v", err)
	}
	if len(pushSender.sent) != 1 {
		t.Fatalf("expected push to still be sent, got %d", len(pushSender.sent))
	}
	if len(pushSender.contextErrors) != 1 || pushSender.contextErrors[0] != nil {
		t.Fatalf("expected push context to be detached from request cancellation, got %#v", pushSender.contextErrors)
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
