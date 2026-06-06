package services

import (
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"log"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"github.com/fulltank-garage/service-booking-template-api/internal/repositories"
	"github.com/fulltank-garage/service-booking-template-api/internal/ws"
	"github.com/redis/go-redis/v9"
)

const realtimeChannel = "service-booking:notifications"

const (
	readNotificationRetention = 7 * 24 * time.Hour
	allNotificationRetention  = 30 * 24 * time.Hour
	reminderLockKey           = "service-booking:reminder-job-lock"
	webPushDeliveryTimeout    = 10 * time.Second
)

var thaiShortMonths = [...]string{"ม.ค.", "ก.พ.", "มี.ค.", "เม.ย.", "พ.ค.", "มิ.ย.", "ก.ค.", "ส.ค.", "ก.ย.", "ต.ค.", "พ.ย.", "ธ.ค."}

type RealtimeEvent struct {
	Type         string                  `json:"type"`
	Notification *models.Notification    `json:"notification,omitempty"`
	Booking      *models.Booking         `json:"booking,omitempty"`
	BookingID    string                  `json:"bookingId,omitempty"`
	Service      *models.Service         `json:"service,omitempty"`
	Settings     *models.BookingSettings `json:"settings,omitempty"`
}

type realtimeRedisClient interface {
	Publish(ctx context.Context, channel string, message interface{}) *redis.IntCmd
	Subscribe(ctx context.Context, channels ...string) *redis.PubSub
	SetNX(ctx context.Context, key string, value interface{}, expiration time.Duration) *redis.BoolCmd
	Del(ctx context.Context, keys ...string) *redis.IntCmd
}

type NotificationService struct {
	store repositories.Store
	hub   *ws.Hub
	redis realtimeRedisClient
	push  PushSender
}

type PushDeliveryReport struct {
	Attempted      int    `json:"attempted"`
	Sent           int    `json:"sent"`
	Expired        int    `json:"expired"`
	Failed         int    `json:"failed"`
	LastStatusCode int    `json:"lastStatusCode,omitempty"`
	LastError      string `json:"lastError,omitempty"`
}

func NewNotificationService(store repositories.Store, hub *ws.Hub, redisClient *redis.Client) *NotificationService {
	return NewNotificationServiceWithPush(store, hub, redisClient, nil)
}

func NewNotificationServiceWithPush(store repositories.Store, hub *ws.Hub, redisClient *redis.Client, pushSender PushSender) *NotificationService {
	service := &NotificationService{store: store, hub: hub, push: pushSender}
	if redisClient != nil {
		service.redis = redisClient
	}
	return service
}

func (service *NotificationService) BookingCreated(ctx context.Context, booking models.Booking) error {
	return service.createAndPublish(ctx, &models.Notification{
		Type:      models.NotificationTypeBookingCreated,
		Title:     "มีคิวจองใหม่",
		Body:      fmt.Sprintf("%s จองเวลา %s %s", booking.CustomerName, booking.SlotTime, formatThaiDateLabel(booking.BookingDate)),
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

func (service *NotificationService) BookingRescheduled(ctx context.Context, booking models.Booking) error {
	return service.createAndPublish(ctx, &models.Notification{
		Type:      models.NotificationTypeBookingUpdated,
		Title:     "มีการเลื่อนนัด",
		Body:      fmt.Sprintf("%s เลื่อนเป็นเวลา %s %s", booking.CustomerName, booking.SlotTime, formatThaiDateLabel(booking.BookingDate)),
		URL:       "/bookings",
		BookingID: booking.ID,
	}, &booking)
}

func (service *NotificationService) BookingDeleted(ctx context.Context, booking models.Booking, reason string) error {
	eventType := models.NotificationTypeBookingDeleted
	title := "ลบรายการจองแล้ว"
	body := fmt.Sprintf("%s %s ถูกลบออกจากระบบ", booking.BookingCode, booking.CustomerName)
	if reason == "cancelled" {
		eventType = models.NotificationTypeBookingCancelled
		title = "มีการยกเลิกการจอง"
		body = fmt.Sprintf("%s ยกเลิกคิว %s", booking.CustomerName, booking.BookingCode)
	}
	return service.createAndPublish(ctx, &models.Notification{
		Type:      eventType,
		Title:     title,
		Body:      body,
		URL:       "/bookings",
		BookingID: booking.ID,
	}, &booking)
}

func (service *NotificationService) ServiceChanged(ctx context.Context, eventType string, item models.Service) error {
	return service.publish(ctx, RealtimeEvent{Type: eventType, Service: &item})
}

func (service *NotificationService) BookingSettingsUpdated(ctx context.Context, settings models.BookingSettings) error {
	return service.publish(ctx, RealtimeEvent{Type: models.NotificationTypeBookingSettingsUpdated, Settings: &settings})
}

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

func (service *NotificationService) SendTestPush(ctx context.Context, endpoint string) (PushDeliveryReport, error) {
	return service.sendPushMessage(ctx, PushMessage{
		Title: "ทดสอบแจ้งเตือน",
		Body:  "ระบบแจ้งเตือนพร้อมใช้งาน",
		URL:   "/",
	}, endpoint)
}

func (service *NotificationService) SendTestPushToSubscription(ctx context.Context, subscription models.PushSubscription) (PushDeliveryReport, error) {
	return service.sendPushToSubscription(ctx, subscription, PushMessage{
		Title: "ทดสอบแจ้งเตือน",
		Body:  "ระบบแจ้งเตือนพร้อมใช้งาน",
		URL:   "/",
	})
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

func (service *NotificationService) sendPush(ctx context.Context, notification models.Notification) {
	if service.push == nil {
		return
	}
	pushCtx, cancel := context.WithTimeout(context.WithoutCancel(ctx), webPushDeliveryTimeout)
	defer cancel()

	_, err := service.sendPushMessage(pushCtx, PushMessage{
		Title: notification.Title,
		Body:  notification.Body,
		URL:   notification.URL,
	}, "")
	if err != nil {
		log.Printf("send push notifications: %v", err)
	}
}

func (service *NotificationService) sendPushMessage(ctx context.Context, message PushMessage, endpoint string) (PushDeliveryReport, error) {
	report := PushDeliveryReport{}
	if service.push == nil {
		return report, nil
	}
	subscriptions, err := service.store.ListPushSubscriptions(ctx)
	if err != nil {
		log.Printf("list push subscriptions: %v", err)
		return report, err
	}
	for _, subscription := range subscriptions {
		if endpoint != "" && subscription.Endpoint != endpoint {
			continue
		}
		report.Attempted++
		if err := service.push.Send(ctx, subscription, message); err != nil {
			report.Failed++
			report.recordPushError(err)
			log.Printf("send push subscription %s: %v", subscription.Endpoint, err)
			if errors.Is(err, ErrExpiredPushSubscription) {
				report.Expired++
				if deleteErr := service.store.DeletePushSubscription(ctx, subscription.Endpoint); deleteErr != nil {
					log.Printf("delete expired push subscription %s: %v", subscription.Endpoint, deleteErr)
				}
			}
			continue
		}
		report.Sent++
	}
	return report, nil
}

func (service *NotificationService) sendPushToSubscription(ctx context.Context, subscription models.PushSubscription, message PushMessage) (PushDeliveryReport, error) {
	report := PushDeliveryReport{}
	if service.push == nil {
		return report, nil
	}
	report.Attempted = 1
	if err := service.push.Send(ctx, subscription, message); err != nil {
		report.Failed = 1
		report.recordPushError(err)
		log.Printf("send push subscription %s: %v", subscription.Endpoint, err)
		if errors.Is(err, ErrExpiredPushSubscription) {
			report.Expired = 1
			if deleteErr := service.store.DeletePushSubscription(ctx, subscription.Endpoint); deleteErr != nil {
				log.Printf("delete expired push subscription %s: %v", subscription.Endpoint, deleteErr)
			}
		}
		return report, nil
	}
	report.Sent = 1
	return report, nil
}

func (report *PushDeliveryReport) recordPushError(err error) {
	report.LastError = err.Error()
	var pushErr *PushError
	if errors.As(err, &pushErr) {
		report.LastStatusCode = pushErr.StatusCode
	}
}

func formatThaiDateLabel(value string) string {
	date, err := time.Parse("2006-01-02", value)
	if err != nil {
		return fmt.Sprintf("วันที่ %s", value)
	}
	return fmt.Sprintf("วันที่ %d %s %d", date.Day(), thaiShortMonths[date.Month()-1], date.Year()+543)
}
