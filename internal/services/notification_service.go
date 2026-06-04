package services

import (
	"context"
	"encoding/json"
	"fmt"
	"log"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"github.com/fulltank-garage/service-booking-template-api/internal/repositories"
	"github.com/fulltank-garage/service-booking-template-api/internal/ws"
	"github.com/redis/go-redis/v9"
)

const realtimeChannel = "service-booking:notifications"

type RealtimeEvent struct {
	Type         string               `json:"type"`
	Notification *models.Notification `json:"notification,omitempty"`
	Booking      *models.Booking      `json:"booking,omitempty"`
}

type NotificationService struct {
	store repositories.Store
	hub   *ws.Hub
	redis *redis.Client
}

func NewNotificationService(store repositories.Store, hub *ws.Hub, redisClient *redis.Client) *NotificationService {
	return &NotificationService{store: store, hub: hub, redis: redisClient}
}

func (service *NotificationService) BookingCreated(ctx context.Context, booking models.Booking) error {
	return service.createAndPublish(ctx, &models.Notification{
		Type:      models.NotificationTypeBookingCreated,
		Title:     "มีคิวจองใหม่",
		Body:      fmt.Sprintf("%s จองเวลา %s วันที่ %s", booking.CustomerName, booking.SlotTime, booking.BookingDate),
		URL:       "/bookings",
		BookingID: booking.ID,
	}, &booking)
}

func (service *NotificationService) BookingUpdated(ctx context.Context, booking models.Booking) error {
	return service.createAndPublish(ctx, &models.Notification{
		Type:      models.NotificationTypeBookingUpdated,
		Title:     "อัปเดตสถานะคิว",
		Body:      fmt.Sprintf("%s เปลี่ยนเป็น %s", booking.BookingCode, booking.Status),
		URL:       "/bookings",
		BookingID: booking.ID,
	}, &booking)
}

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

func (service *NotificationService) SavePushSubscription(ctx context.Context, subscription *models.PushSubscription) error {
	return service.store.SavePushSubscription(ctx, subscription)
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
	return service.publish(ctx, RealtimeEvent{Type: notification.Type, Notification: notification, Booking: booking})
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
