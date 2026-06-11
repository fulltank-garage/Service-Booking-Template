package services

import (
	"context"
	"testing"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"gorm.io/gorm"
)

func TestAuthServiceLoginAndValidate(t *testing.T) {
	service := NewAuthService("FULLTANK Garage Admin", "admin@example.com", "password123", "session-secret")
	fixedNow := time.Date(2026, 6, 3, 10, 0, 0, 0, time.UTC)
	service.now = func() time.Time { return fixedNow }

	session, err := service.Login("admin@example.com", "password123")
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	if session.Token == "" {
		t.Fatal("expected token")
	}
	if session.Name != "FULLTANK Garage Admin" {
		t.Fatalf("expected session name, got %q", session.Name)
	}
	if !service.Validate(session.Token) {
		t.Fatal("expected token to validate")
	}
	if got := session.ExpiresAt.Sub(fixedNow); got != 90*24*time.Hour {
		t.Fatalf("expected 90 day session, got %s", got)
	}
}

func TestAuthServiceRejectsInvalidCredentials(t *testing.T) {
	service := NewAuthService("FULLTANK Garage Admin", "admin@example.com", "password123", "session-secret")

	if _, err := service.Login("admin@example.com", "wrong"); err != ErrInvalidCredentials {
		t.Fatalf("expected invalid credentials, got %v", err)
	}
}

func TestAuthServiceRefreshRotatesStoredSessionForNinetyDays(t *testing.T) {
	store := &authSessionStore{
		user: models.AdminUser{
			BaseModel:    models.BaseModel{ID: "admin-1"},
			Name:         "FULLTANK Garage Admin",
			Email:        "admin@example.com",
			PasswordHash: "",
			IsActive:     true,
		},
		sessions: map[string]models.AdminSessionRecord{},
	}
	service := NewAuthServiceWithStore(store, "FULLTANK Garage Admin", "admin@example.com", "password123", "session-secret")
	store.user.PasswordHash = service.passwordHash("password123")
	fixedNow := time.Date(2026, 6, 3, 10, 0, 0, 0, time.UTC)
	service.now = func() time.Time { return fixedNow }

	session, err := service.Login("admin@example.com", "password123")
	if err != nil {
		t.Fatalf("login: %v", err)
	}
	if got := session.ExpiresAt.Sub(fixedNow); got != 90*24*time.Hour {
		t.Fatalf("expected 90 day session, got %s", got)
	}

	service.now = func() time.Time { return fixedNow.Add(24 * time.Hour) }
	refreshed, err := service.Refresh(context.Background(), session.Token)
	if err != nil {
		t.Fatalf("refresh: %v", err)
	}
	if refreshed.Token == "" || refreshed.Token == session.Token {
		t.Fatalf("expected rotated token, got old=%q new=%q", session.Token, refreshed.Token)
	}
	if got := refreshed.ExpiresAt.Sub(service.now()); got != 90*24*time.Hour {
		t.Fatalf("expected refreshed 90 day session, got %s", got)
	}
	if service.Validate(session.Token) {
		t.Fatal("expected old token to be revoked")
	}
	if !service.Validate(refreshed.Token) {
		t.Fatal("expected refreshed token to validate")
	}
}

type authSessionStore struct {
	*fakeStore
	user     models.AdminUser
	sessions map[string]models.AdminSessionRecord
}

func (store *authSessionStore) ensureFakeStore() {
	if store.fakeStore == nil {
		store.fakeStore = &fakeStore{}
	}
}

func (store *authSessionStore) FindAdminUserByEmail(_ context.Context, email string) (models.AdminUser, error) {
	store.ensureFakeStore()
	if store.user.Email != email {
		return models.AdminUser{}, errRecordNotFound()
	}
	return store.user, nil
}

func (store *authSessionStore) CreateAdminUser(_ context.Context, user *models.AdminUser) error {
	store.ensureFakeStore()
	store.user = *user
	return nil
}

func (store *authSessionStore) CreateAdminSession(_ context.Context, session *models.AdminSessionRecord) error {
	store.ensureFakeStore()
	if store.sessions == nil {
		store.sessions = map[string]models.AdminSessionRecord{}
	}
	record := *session
	record.AdminUser = store.user
	store.sessions[record.TokenHash] = record
	return nil
}

func (store *authSessionStore) FindAdminSessionByTokenHash(_ context.Context, tokenHash string) (models.AdminSessionRecord, error) {
	store.ensureFakeStore()
	session, ok := store.sessions[tokenHash]
	if !ok {
		return models.AdminSessionRecord{}, errRecordNotFound()
	}
	session.AdminUser = store.user
	return session, nil
}

func (store *authSessionStore) RevokeAdminSession(_ context.Context, tokenHash string) error {
	store.ensureFakeStore()
	session, ok := store.sessions[tokenHash]
	if !ok {
		return nil
	}
	now := time.Now()
	session.RevokedAt = &now
	store.sessions[tokenHash] = session
	return nil
}

func errRecordNotFound() error {
	return gorm.ErrRecordNotFound
}
