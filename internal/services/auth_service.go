package services

import (
	"context"
	"errors"
	"strings"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/repositories"
)

var ErrInvalidCredentials = errors.New("invalid admin credentials")

const adminSessionDuration = 90 * 24 * time.Hour

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

type adminActorContextKey struct{}

type AdminActor struct {
	Name  string
	Email string
}

func WithAdminActor(ctx context.Context, actor AdminActor) context.Context {
	return context.WithValue(ctx, adminActorContextKey{}, actor)
}

func AdminActorFromContext(ctx context.Context) (AdminActor, bool) {
	actor, ok := ctx.Value(adminActorContextKey{}).(AdminActor)
	return actor, ok
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
