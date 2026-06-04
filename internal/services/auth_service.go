package services

import (
	"context"
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"errors"
	"fmt"
	"io"
	"strconv"
	"strings"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"github.com/fulltank-garage/service-booking-template-api/internal/repositories"
	"gorm.io/gorm"
)

var ErrInvalidCredentials = errors.New("invalid admin credentials")

type AuthService struct {
	name     string
	email    string
	password string
	secret   []byte
	now      func() time.Time
	store    repositories.Store
}

type AdminSession struct {
	Name      string    `json:"name"`
	Email     string    `json:"email"`
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
}

func NewAuthService(name string, email string, password string, sessionSecret string) *AuthService {
	return &AuthService{
		name:     strings.TrimSpace(name),
		email:    strings.TrimSpace(email),
		password: password,
		secret:   []byte(sessionSecret),
		now:      time.Now,
	}
}

func NewAuthServiceWithStore(store repositories.Store, name string, email string, password string, sessionSecret string) *AuthService {
	service := NewAuthService(name, email, password, sessionSecret)
	service.store = store
	return service
}

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

func (service *AuthService) Login(email string, password string) (AdminSession, error) {
	if service.store != nil {
		return service.loginWithStore(context.Background(), email, password)
	}
	if !constantTimeEqual(strings.TrimSpace(email), service.email) || !constantTimeEqual(password, service.password) {
		return AdminSession{}, ErrInvalidCredentials
	}

	expiresAt := service.now().Add(24 * time.Hour)
	token := service.sign(service.email, expiresAt)
	return AdminSession{Name: service.name, Email: service.email, Token: token, ExpiresAt: expiresAt}, nil
}

func (service *AuthService) Validate(token string) bool {
	if service.store != nil && service.validateStoredSession(context.Background(), token) {
		return true
	}

	parts := strings.Split(token, ".")
	if len(parts) != 3 {
		return false
	}

	emailBytes, err := base64.RawURLEncoding.DecodeString(parts[0])
	if err != nil {
		return false
	}
	expiresUnix, err := strconv.ParseInt(parts[1], 10, 64)
	if err != nil {
		return false
	}
	expiresAt := time.Unix(expiresUnix, 0)
	if !service.now().Before(expiresAt) {
		return false
	}

	email := string(emailBytes)
	if !constantTimeEqual(email, service.email) {
		return false
	}

	expected := service.signature(email, expiresAt)
	return constantTimeEqual(parts[2], expected)
}

func (service *AuthService) Logout(token string) error {
	token = strings.TrimSpace(token)
	if token == "" || service.store == nil {
		return nil
	}
	return service.store.RevokeAdminSession(context.Background(), service.tokenHash(token))
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
	expiresAt := service.now().Add(24 * time.Hour)
	if err := service.store.CreateAdminSession(ctx, &models.AdminSessionRecord{
		AdminUserID: user.ID,
		TokenHash:   service.tokenHash(token),
		ExpiresAt:   expiresAt,
	}); err != nil {
		return AdminSession{}, err
	}
	return AdminSession{Name: user.Name, Email: user.Email, Token: token, ExpiresAt: expiresAt}, nil
}

func (service *AuthService) validateStoredSession(ctx context.Context, token string) bool {
	token = strings.TrimSpace(token)
	if token == "" {
		return false
	}
	session, err := service.store.FindAdminSessionByTokenHash(ctx, service.tokenHash(token))
	if err != nil {
		return false
	}
	if session.RevokedAt != nil || !session.AdminUser.IsActive {
		return false
	}
	return service.now().Before(session.ExpiresAt)
}

func (service *AuthService) sign(email string, expiresAt time.Time) string {
	emailPart := base64.RawURLEncoding.EncodeToString([]byte(email))
	expiresPart := strconv.FormatInt(expiresAt.Unix(), 10)
	return fmt.Sprintf("%s.%s.%s", emailPart, expiresPart, service.signature(email, expiresAt))
}

func (service *AuthService) signature(email string, expiresAt time.Time) string {
	mac := hmac.New(sha256.New, service.secret)
	_, _ = mac.Write([]byte(email))
	_, _ = mac.Write([]byte("."))
	_, _ = mac.Write([]byte(strconv.FormatInt(expiresAt.Unix(), 10)))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func (service *AuthService) passwordHash(password string) string {
	mac := hmac.New(sha256.New, service.secret)
	_, _ = mac.Write([]byte("admin-password."))
	_, _ = mac.Write([]byte(password))
	return hex.EncodeToString(mac.Sum(nil))
}

func (service *AuthService) tokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func randomToken() (string, error) {
	buffer := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, buffer); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buffer), nil
}

func constantTimeEqual(left string, right string) bool {
	return subtle.ConstantTimeCompare([]byte(left), []byte(right)) == 1
}
