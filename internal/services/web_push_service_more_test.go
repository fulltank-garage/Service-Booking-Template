package services

import (
	"errors"
	"testing"
)

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

func TestWebPushSenderNormalizesMailtoSubjectForLibrary(t *testing.T) {
	sender := NewWebPushSender("public-key", "private-key", "mailto:admin@example.com")
	if sender == nil {
		t.Fatal("expected sender")
	}
	if sender.subject != "admin@example.com" {
		t.Fatalf("expected mailto prefix to be stripped before webpush library adds it, got %q", sender.subject)
	}
}

func TestWebPushSenderUsesHTTPSSubject(t *testing.T) {
	sender := NewWebPushSender("public-key", "private-key", "https://service-booking-template-admin-production.up.railway.app")
	if sender == nil {
		t.Fatal("expected sender")
	}
	if sender.subject != "https://service-booking-template-admin-production.up.railway.app" {
		t.Fatalf("expected HTTPS subject to be used directly, got %q", sender.subject)
	}
}

func TestWebPushSenderRejectsLocalEmailSubject(t *testing.T) {
	sender := NewWebPushSender("public-key", "private-key", "admin@service-booking.local")
	if sender == nil {
		t.Fatal("expected sender")
	}
	if sender.subject != defaultVAPIDSubject {
		t.Fatalf("expected .local subject to fall back to default HTTPS subject, got %q", sender.subject)
	}
}

func TestWebPushSenderUsesHTTPSDefaultSubject(t *testing.T) {
	sender := NewWebPushSender("public-key", "private-key", "")
	if sender == nil {
		t.Fatal("expected sender")
	}
	if sender.subject != defaultVAPIDSubject {
		t.Fatalf("expected default subject without mailto prefix, got %q", sender.subject)
	}
}
