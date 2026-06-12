package repositories

import (
	"context"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
)

func (store *GormStore) FindAdminUserByEmail(ctx context.Context, email string) (models.AdminUser, error) {
	var user models.AdminUser
	err := store.db.WithContext(ctx).Where("email = ?", email).First(&user).Error
	return user, err
}

func (store *GormStore) CreateAdminUser(ctx context.Context, user *models.AdminUser) error {
	return store.db.WithContext(ctx).Create(user).Error
}

func (store *GormStore) CreateAdminSession(ctx context.Context, session *models.AdminSessionRecord) error {
	return store.db.WithContext(ctx).Create(session).Error
}

func (store *GormStore) FindAdminSessionByTokenHash(ctx context.Context, tokenHash string) (models.AdminSessionRecord, error) {
	var session models.AdminSessionRecord
	err := store.db.WithContext(ctx).Preload("AdminUser").Where("token_hash = ?", tokenHash).First(&session).Error
	return session, err
}

func (store *GormStore) RevokeAdminSession(ctx context.Context, tokenHash string) error {
	now := time.Now().UTC()
	return store.db.WithContext(ctx).Model(&models.AdminSessionRecord{}).Where("token_hash = ?", tokenHash).Update("revoked_at", &now).Error
}
