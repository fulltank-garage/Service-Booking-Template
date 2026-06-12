package services

import (
	"context"
	"errors"
	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"log"
	"net/http"
)

func (service *NotificationService) SavePushSubscription(ctx context.Context, subscription *models.PushSubscription) error {
	return service.store.SavePushSubscription(ctx, subscription)
}

func (service *NotificationService) HasPushSender() bool {
	return service.push != nil
}

func (service *NotificationService) PushSubscriptionCount(ctx context.Context) (int, error) {
	subscriptions, err := service.store.ListPushSubscriptions(ctx)
	if err != nil {
		return 0, err
	}
	return len(subscriptions), nil
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
	report.TotalSubscriptions = len(subscriptions)
	for _, subscription := range subscriptions {
		if endpoint != "" && subscription.Endpoint != endpoint {
			continue
		}
		report.TargetedSubscriptions++
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
	report.Recommendation = pushRecommendation(report)
	return report, nil
}

func (service *NotificationService) sendPushToSubscription(ctx context.Context, subscription models.PushSubscription, message PushMessage) (PushDeliveryReport, error) {
	report := PushDeliveryReport{TotalSubscriptions: 1, TargetedSubscriptions: 1}
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
		report.Recommendation = pushRecommendation(report)
		return report, nil
	}
	report.Sent = 1
	report.Recommendation = pushRecommendation(report)
	return report, nil
}

func (report *PushDeliveryReport) recordPushError(err error) {
	report.LastError = err.Error()
	var pushErr *PushError
	if errors.As(err, &pushErr) {
		report.LastStatusCode = pushErr.StatusCode
	}
}

func pushRecommendation(report PushDeliveryReport) string {
	if report.Sent > 0 {
		return "push_ready"
	}
	if report.Attempted == 0 {
		if report.TotalSubscriptions == 0 {
			return "no_subscription"
		}
		return "subscription_not_found"
	}
	if report.Expired > 0 {
		return "subscription_expired"
	}
	if report.LastStatusCode == http.StatusForbidden || report.LastStatusCode == http.StatusUnauthorized {
		return "vapid_or_permission_invalid"
	}
	if report.Failed > 0 {
		return "provider_failed"
	}
	return "unknown"
}
