package services

import (
	"context"
	"testing"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
)

func TestBookingRescheduledSendsWebPushToSavedSubscriptions(t *testing.T) {
	store := &notificationStore{
		subscriptions: []models.PushSubscription{
			{Endpoint: "https://push.example.test/one", P256DH: "key", Auth: "auth"},
		},
	}
	pushSender := &recordingPushSender{}
	service := NewNotificationServiceWithPush(store, nil, nil, pushSender)

	err := service.BookingRescheduled(context.Background(), models.Booking{
		BaseModel:    models.BaseModel{ID: "booking-1"},
		BookingCode:  "SB-TEST-0001",
		CustomerName: "ลูกค้าทดสอบ",
		BookingDate:  "2026-06-11",
		SlotTime:     "11:00",
	})

	if err != nil {
		t.Fatalf("booking rescheduled: %v", err)
	}
	if store.created == nil {
		t.Fatal("expected notification to be persisted")
	}
	if store.created.Type != models.NotificationTypeBookingUpdated {
		t.Fatalf("expected booking.updated notification, got %q", store.created.Type)
	}
	if store.created.Title != "มีการเลื่อนนัด" {
		t.Fatalf("expected reschedule notification title, got %q", store.created.Title)
	}
	if len(pushSender.sent) != 1 {
		t.Fatalf("expected push to 1 subscription, got %d", len(pushSender.sent))
	}
	if pushSender.sent[0].Body != "ลูกค้าทดสอบ เลื่อนเป็นเวลา 11:00 วันที่ 11 มิ.ย. 2569" {
		t.Fatalf("expected reschedule push body, got %q", pushSender.sent[0].Body)
	}
}

func TestBookingCancelledSendsWebPushToSavedSubscriptions(t *testing.T) {
	store := &notificationStore{
		subscriptions: []models.PushSubscription{
			{Endpoint: "https://push.example.test/one", P256DH: "key", Auth: "auth"},
		},
	}
	pushSender := &recordingPushSender{}
	service := NewNotificationServiceWithPush(store, nil, nil, pushSender)

	err := service.BookingDeleted(context.Background(), models.Booking{
		BaseModel:    models.BaseModel{ID: "booking-1"},
		BookingCode:  "SB-TEST-0001",
		CustomerName: "ลูกค้าทดสอบ",
	}, "cancelled")

	if err != nil {
		t.Fatalf("booking cancelled: %v", err)
	}
	if store.created == nil {
		t.Fatal("expected notification to be persisted")
	}
	if store.created.Type != models.NotificationTypeBookingCancelled {
		t.Fatalf("expected booking.cancelled notification, got %q", store.created.Type)
	}
	if store.created.Title != "มีการยกเลิกการจอง" {
		t.Fatalf("expected cancellation notification title, got %q", store.created.Title)
	}
	if len(pushSender.sent) != 1 {
		t.Fatalf("expected push to 1 subscription, got %d", len(pushSender.sent))
	}
	if pushSender.sent[0].Body != "ลูกค้าทดสอบ ยกเลิกคิว SB-TEST-0001" {
		t.Fatalf("expected cancellation push body, got %q", pushSender.sent[0].Body)
	}
}

func TestBookingDeletedSendsWebPushToSavedSubscriptions(t *testing.T) {
	store := &notificationStore{
		subscriptions: []models.PushSubscription{
			{Endpoint: "https://push.example.test/one", P256DH: "key", Auth: "auth"},
		},
	}
	pushSender := &recordingPushSender{}
	service := NewNotificationServiceWithPush(store, nil, nil, pushSender)

	err := service.BookingDeleted(context.Background(), models.Booking{
		BaseModel:    models.BaseModel{ID: "booking-1"},
		BookingCode:  "SB-TEST-0001",
		CustomerName: "ลูกค้าทดสอบ",
	}, "deleted")

	if err != nil {
		t.Fatalf("booking deleted: %v", err)
	}
	if store.created == nil {
		t.Fatal("expected notification to be persisted")
	}
	if store.created.Type != models.NotificationTypeBookingDeleted {
		t.Fatalf("expected booking.deleted notification, got %q", store.created.Type)
	}
	if store.created.Title != "ลบรายการจองแล้ว" {
		t.Fatalf("expected deletion notification title, got %q", store.created.Title)
	}
	if len(pushSender.sent) != 1 {
		t.Fatalf("expected push to 1 subscription, got %d", len(pushSender.sent))
	}
	if pushSender.sent[0].Body != "SB-TEST-0001 ลูกค้าทดสอบ ถูกลบออกจากระบบ" {
		t.Fatalf("expected deletion push body, got %q", pushSender.sent[0].Body)
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
