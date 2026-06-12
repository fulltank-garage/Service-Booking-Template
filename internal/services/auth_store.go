package services

import (
	"context"
	"errors"
	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"gorm.io/gorm"
	"strings"
)

func (service *AuthService) Bootstrap(ctx context.Context) error {
	if service.store == nil {
		return nil
	}
	_, err := service.store.FindAdminUserByEmail(ctx, service.email)
	if err == nil {
		return nil
	}
	if !errors.Is(err, gorm.ErrRecordNotFound) {
		return err
	}
	return service.store.CreateAdminUser(ctx, &models.AdminUser{
		Name:         service.name,
		Email:        service.email,
		PasswordHash: service.passwordHash(service.password),
		Role:         models.AdminRoleOwner,
		IsActive:     true,
	})
}

func (service *AuthService) loginWithStore(ctx context.Context, email string, password string) (AdminSession, error) {
	email = strings.TrimSpace(email)
	if err := service.Bootstrap(ctx); err != nil {
		return AdminSession{}, err
	}
	user, err := service.store.FindAdminUserByEmail(ctx, email)
	if err != nil || !user.IsActive || !constantTimeEqual(user.PasswordHash, service.passwordHash(password)) {
		return AdminSession{}, ErrInvalidCredentials
	}

	token, err := randomToken()
	if err != nil {
		return AdminSession{}, err
	}
	expiresAt := service.now().Add(adminSessionDuration)
	if err := service.store.CreateAdminSession(ctx, &models.AdminSessionRecord{
		AdminUserID: user.ID,
		TokenHash:   service.tokenHash(token),
		ExpiresAt:   expiresAt,
	}); err != nil {
		return AdminSession{}, err
	}
	return AdminSession{Name: user.Name, Email: user.Email, Token: token, ExpiresAt: expiresAt}, nil
}

func (service *AuthService) refreshStoredSession(ctx context.Context, token string) (AdminSession, error) {
	session, err := service.store.FindAdminSessionByTokenHash(ctx, service.tokenHash(token))
	if err != nil || session.RevokedAt != nil || !session.AdminUser.IsActive || !service.now().Before(session.ExpiresAt) {
		return AdminSession{}, ErrInvalidCredentials
	}
	nextToken, err := randomToken()
	if err != nil {
		return AdminSession{}, err
	}
	expiresAt := service.now().Add(adminSessionDuration)
	if err := service.store.CreateAdminSession(ctx, &models.AdminSessionRecord{
		AdminUserID: session.AdminUserID,
		TokenHash:   service.tokenHash(nextToken),
		ExpiresAt:   expiresAt,
	}); err != nil {
		return AdminSession{}, err
	}
	if err := service.store.RevokeAdminSession(ctx, service.tokenHash(token)); err != nil {
		return AdminSession{}, err
	}
	return AdminSession{Name: session.AdminUser.Name, Email: session.AdminUser.Email, Token: nextToken, ExpiresAt: expiresAt}, nil
}

func (service *AuthService) storedSessionFromToken(ctx context.Context, token string) (AdminSession, bool) {
	token = strings.TrimSpace(token)
	if token == "" {
		return AdminSession{}, false
	}
	session, err := service.store.FindAdminSessionByTokenHash(ctx, service.tokenHash(token))
	if err != nil {
		return AdminSession{}, false
	}
	if session.RevokedAt != nil || !session.AdminUser.IsActive {
		return AdminSession{}, false
	}
	if !service.now().Before(session.ExpiresAt) {
		return AdminSession{}, false
	}
	return AdminSession{
		Name:      session.AdminUser.Name,
		Email:     session.AdminUser.Email,
		Token:     token,
		ExpiresAt: session.ExpiresAt,
	}, true
}
