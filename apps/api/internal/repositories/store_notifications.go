package repositories

import (
	"context"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"gorm.io/gorm"
)

func (store *GormStore) CreateNotification(ctx context.Context, notification *models.Notification) error {
	return store.db.WithContext(ctx).Create(notification).Error
}

func (store *GormStore) ListNotifications(ctx context.Context, unreadOnly bool, limit int) ([]models.Notification, error) {
	var notifications []models.Notification
	query := store.db.WithContext(ctx).Order("created_at DESC")
	if unreadOnly {
		query = query.Where("is_read = ?", false)
	}
	if limit > 0 {
		query = query.Limit(limit)
	}
	err := query.Find(&notifications).Error
	return notifications, err
}

func (store *GormStore) MarkNotificationRead(ctx context.Context, id string) (models.Notification, error) {
	var notification models.Notification
	err := store.db.WithContext(ctx).Transaction(func(tx *gorm.DB) error {
		if err := tx.First(&notification, "id = ?", id).Error; err != nil {
			return err
		}
		notification.IsRead = true
		return tx.Save(&notification).Error
	})
	return notification, err
}

func (store *GormStore) CleanupNotifications(ctx context.Context, readBefore time.Time, allBefore time.Time) error {
	return store.db.WithContext(ctx).
		Where("(is_read = ? AND created_at < ?) OR created_at < ?", true, readBefore, allBefore).
		Delete(&models.Notification{}).
		Error
}

func (store *GormStore) SavePushSubscription(ctx context.Context, subscription *models.PushSubscription) error {
	return store.db.WithContext(ctx).
		Where(models.PushSubscription{Endpoint: subscription.Endpoint}).
		Assign(subscription).
		FirstOrCreate(subscription).Error
}

func (store *GormStore) ListPushSubscriptions(ctx context.Context) ([]models.PushSubscription, error) {
	var subscriptions []models.PushSubscription
	err := store.db.WithContext(ctx).Order("created_at DESC").Find(&subscriptions).Error
	return subscriptions, err
}

func (store *GormStore) DeletePushSubscription(ctx context.Context, endpoint string) error {
	return store.db.WithContext(ctx).Where("endpoint = ?", endpoint).Delete(&models.PushSubscription{}).Error
}
