package services

import (
	"context"
	"testing"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
)

func TestSendTestPushReportsDeliveryAndCleansExpiredSubscriptions(t *testing.T) {
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

	report, err := service.SendTestPush(context.Background(), "https://push.example.test/active")

	if err != nil {
		t.Fatalf("send test push: %v", err)
	}
	if report.Attempted != 1 || report.Sent != 1 || report.Failed != 0 || report.Expired != 0 {
		t.Fatalf("unexpected delivery report: %#v", report)
	}
	if len(store.deletedEndpoints) != 0 {
		t.Fatalf("expected unrelated expired endpoint to be skipped, got %#v", store.deletedEndpoints)
	}
	if len(pushSender.sent) != 1 || pushSender.sent[0].Title != "ทดสอบแจ้งเตือน" {
		t.Fatalf("expected test push to selected endpoint, got %#v", pushSender.sent)
	}
}

func TestSendTestPushToSubscriptionUsesProvidedSubscription(t *testing.T) {
	store := &notificationStore{}
	pushSender := &recordingPushSender{}
	service := NewNotificationServiceWithPush(store, nil, nil, pushSender)

	report, err := service.SendTestPushToSubscription(context.Background(), models.PushSubscription{
		Endpoint: "https://push.example.test/current",
		P256DH:   "current-key",
		Auth:     "current-auth",
	})

	if err != nil {
		t.Fatalf("send test push to subscription: %v", err)
	}
	if report.Attempted != 1 || report.Sent != 1 || report.Failed != 0 || report.Expired != 0 {
		t.Fatalf("unexpected delivery report: %#v", report)
	}
	if store.listPushCalls != 0 {
		t.Fatalf("expected direct test push to skip stored subscriptions lookup, got %d lookups", store.listPushCalls)
	}
	if len(pushSender.sent) != 1 || pushSender.sent[0].Title != "ทดสอบแจ้งเตือน" {
		t.Fatalf("expected test push to provided subscription, got %#v", pushSender.sent)
	}
}

func TestSendTestPushToSubscriptionReportsProviderErrors(t *testing.T) {
	store := &notificationStore{}
	pushSender := &recordingPushSender{
		errByEndpoint: map[string]error{
			"https://push.example.test/current": &PushError{StatusCode: 403, Body: "BadJwtToken"},
		},
	}
	service := NewNotificationServiceWithPush(store, nil, nil, pushSender)

	report, err := service.SendTestPushToSubscription(context.Background(), models.PushSubscription{
		Endpoint: "https://push.example.test/current",
		P256DH:   "current-key",
		Auth:     "current-auth",
	})

	if err != nil {
		t.Fatalf("send test push to subscription: %v", err)
	}
	if report.Attempted != 1 || report.Sent != 0 || report.Failed != 1 || report.Expired != 0 {
		t.Fatalf("unexpected delivery report: %#v", report)
	}
	if report.LastStatusCode != 403 {
		t.Fatalf("expected provider status code in report, got %d", report.LastStatusCode)
	}
	if report.LastError != "web push response status 403: BadJwtToken" {
		t.Fatalf("expected provider error in report, got %q", report.LastError)
	}
}
