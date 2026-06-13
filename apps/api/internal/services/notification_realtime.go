package services

import (
	"context"
	"encoding/json"
	"log"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
)

func (service *NotificationService) WithReminderLock(ctx context.Context, ttl time.Duration, run func(context.Context) error) (bool, error) {
	if ttl <= 0 {
		ttl = 5 * time.Minute
	}
	if service.redis == nil {
		return true, run(ctx)
	}

	locked, err := service.redis.SetNX(ctx, reminderLockKey, time.Now().UTC().Format(time.RFC3339Nano), ttl).Result()
	if err != nil {
		return false, err
	}
	if !locked {
		return false, nil
	}
	defer func() {
		if err := service.redis.Del(ctx, reminderLockKey).Err(); err != nil {
			log.Printf("release reminder lock: %v", err)
		}
	}()

	return true, run(ctx)
}

func (service *NotificationService) Subscribe(ctx context.Context) {
	if service.redis == nil {
		return
	}
	pubsub := service.redis.Subscribe(ctx, realtimeChannel)
	defer pubsub.Close()
	for message := range pubsub.Channel() {
		if service.hub != nil {
			service.hub.Broadcast([]byte(message.Payload))
		}
	}
}

func (service *NotificationService) createAndPublish(ctx context.Context, notification *models.Notification, booking *models.Booking) error {
	if err := service.store.CreateNotification(ctx, notification); err != nil {
		return err
	}
	service.cleanupOldNotifications(ctx)
	if err := service.publish(ctx, RealtimeEvent{Type: notification.Type, Notification: notification, Booking: booking}); err != nil {
		return err
	}
	service.sendPush(ctx, *notification)
	return nil
}

func (service *NotificationService) cleanupOldNotifications(ctx context.Context) {
	now := time.Now().UTC()
	if err := service.store.CleanupNotifications(ctx, now.Add(-readNotificationRetention), now.Add(-allNotificationRetention)); err != nil {
		log.Printf("cleanup notifications: %v", err)
	}
}

func (service *NotificationService) publish(ctx context.Context, event RealtimeEvent) error {
	payload, err := json.Marshal(event)
	if err != nil {
		return err
	}
	if service.hub != nil {
		service.hub.Broadcast(payload)
	}
	if service.redis != nil {
		if err := service.redis.Publish(ctx, realtimeChannel, payload).Err(); err != nil {
			log.Printf("publish redis notification: %v", err)
		}
	}
	return nil
}
