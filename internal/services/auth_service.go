package services

import (
	"crypto/hmac"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"errors"
	"fmt"
	"strconv"
	"strings"
	"time"
)

var ErrInvalidCredentials = errors.New("invalid admin credentials")

type AuthService struct {
	email    string
	password string
	secret   []byte
	now      func() time.Time
}

type AdminSession struct {
	Email     string    `json:"email"`
	Token     string    `json:"token"`
	ExpiresAt time.Time `json:"expiresAt"`
}

func NewAuthService(email string, password string, sessionSecret string) *AuthService {
	return &AuthService{
		email:    strings.TrimSpace(email),
		password: password,
		secret:   []byte(sessionSecret),
		now:      time.Now,
	}
}

func (service *AuthService) Login(email string, password string) (AdminSession, error) {
	if !constantTimeEqual(strings.TrimSpace(email), service.email) || !constantTimeEqual(password, service.password) {
		return AdminSession{}, ErrInvalidCredentials
	}

	expiresAt := service.now().Add(24 * time.Hour)
	token := service.sign(service.email, expiresAt)
	return AdminSession{Email: service.email, Token: token, ExpiresAt: expiresAt}, nil
}

func (service *AuthService) Validate(token string) bool {
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

func constantTimeEqual(left string, right string) bool {
	return subtle.ConstantTimeCompare([]byte(left), []byte(right)) == 1
}
