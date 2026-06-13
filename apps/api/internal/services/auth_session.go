package services

import (
	"context"
	"encoding/base64"
	"strconv"
	"strings"
	"time"
)

func (service *AuthService) Login(email string, password string) (AdminSession, error) {
	if service.store != nil {
		return service.loginWithStore(context.Background(), email, password)
	}
	if !constantTimeEqual(strings.TrimSpace(email), service.email) || !constantTimeEqual(password, service.password) {
		return AdminSession{}, ErrInvalidCredentials
	}

	expiresAt := service.now().Add(adminSessionDuration)
	token := service.sign(service.email, expiresAt)
	return AdminSession{Name: service.name, Email: service.email, Token: token, ExpiresAt: expiresAt}, nil
}

func (service *AuthService) Refresh(ctx context.Context, token string) (AdminSession, error) {
	token = strings.TrimSpace(token)
	if token == "" {
		return AdminSession{}, ErrInvalidCredentials
	}
	if service.store != nil {
		return service.refreshStoredSession(ctx, token)
	}
	session, ok := service.SessionFromToken(ctx, token)
	if !ok {
		return AdminSession{}, ErrInvalidCredentials
	}
	expiresAt := service.now().Add(adminSessionDuration)
	nextToken := service.sign(session.Email, expiresAt)
	return AdminSession{Name: session.Name, Email: session.Email, Token: nextToken, ExpiresAt: expiresAt}, nil
}

func (service *AuthService) Validate(token string) bool {
	_, ok := service.SessionFromToken(context.Background(), token)
	return ok
}

func (service *AuthService) SessionFromToken(ctx context.Context, token string) (AdminSession, bool) {
	if service.store != nil {
		if session, ok := service.storedSessionFromToken(ctx, token); ok {
			return session, true
		}
	}
	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return AdminSession{}, false
	}

	emailBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return AdminSession{}, false
	}
	expiresUnix, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return AdminSession{}, false
	}
	expiresAt := time.Unix(expiresUnix, 0)
	if !service.now().Before(expiresAt) {
		return AdminSession{}, false
	}

	email := string(emailBytes)
	if !constantTimeEqual(email, service.email) {
		return AdminSession{}, false
	}

	expected := service.signature(email, expiresAt)
	if !constantTimeEqual(parts[2], expected) {
		return AdminSession{}, false
	}
	return AdminSession{Name: service.name, Email: service.email, Token: token, ExpiresAt: expiresAt}, true
}

func (service *AuthService) Logout(token string) error {
	token = strings.TrimSpace(token)
	if token == "" || service.store == nil {
		return nil
	}
	return service.store.RevokeAdminSession(context.Background(), service.tokenHash(token))
}
