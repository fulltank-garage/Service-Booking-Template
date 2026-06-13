package services

import (
	"context"
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
	TotalSubscriptions    int    `json:"totalSubscriptions"`
	TargetedSubscriptions int    `json:"targetedSubscriptions"`
	Attempted             int    `json:"attempted"`
	Sent                  int    `json:"sent"`
	Expired               int    `json:"expired"`
	Failed                int    `json:"failed"`
	LastStatusCode        int    `json:"lastStatusCode,omitempty"`
	LastError             string `json:"lastError,omitempty"`
	Recommendation        string `json:"recommendation,omitempty"`
}

type PushHealthReport struct {
	Configured        bool   `json:"configured"`
	ValidKeys         bool   `json:"validKeys"`
	SenderReady       bool   `json:"senderReady"`
	SubscriptionCount int    `json:"subscriptionCount"`
	LastStatusCode    int    `json:"lastStatusCode,omitempty"`
	LastError         string `json:"lastError,omitempty"`
	Recommendation    string `json:"recommendation"`
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
