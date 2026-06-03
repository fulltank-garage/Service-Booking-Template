package services

import (
	"testing"
	"time"
)

func TestAuthServiceLoginAndValidate(t *testing.T) {
	service := NewAuthService("admin@example.com", "password123", "session-secret")
	fixedNow := time.Date(2026, 6, 3, 10, 0, 0, 0, time.UTC)
	service.now = func() time.Time { return fixedNow }

	session, err := service.Login("admin@example.com", "password123")
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	if session.Token == "" {
		t.Fatal("expected token")
	}
	if !service.Validate(session.Token) {
		t.Fatal("expected token to validate")
	}
}

func TestAuthServiceRejectsInvalidCredentials(t *testing.T) {
	service := NewAuthService("admin@example.com", "password123", "session-secret")

	if _, err := service.Login("admin@example.com", "wrong"); err != ErrInvalidCredentials {
		t.Fatalf("expected invalid credentials, got %v", err)
	}
}
