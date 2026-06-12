package services

import (
	"context"
	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"log"
)

func (service *NotificationService) List(ctx context.Context, unreadOnly bool, limit int) ([]models.Notification, error) {
	if limit <= 0 || limit > 100 {
		limit = 50
	}
	return service.store.ListNotifications(ctx, unreadOnly, limit)
}

func (service *NotificationService) MarkRead(ctx context.Context, id string) (models.Notification, error) {
	notification, err := service.store.MarkNotificationRead(ctx, id)
	if err != nil {
		return models.Notification{}, err
	}
	if err := service.publish(ctx, RealtimeEvent{Type: "notification.read", Notification: &notification}); err != nil {
		log.Printf("publish notification read: %v", err)
	}
	return notification, nil
}
