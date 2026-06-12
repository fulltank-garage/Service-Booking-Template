package services

import (
	"context"
	"fmt"
	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"strings"
)

func (service *NotificationService) BookingCreated(ctx context.Context, booking models.Booking) error {
	actor := adminActorSuffix(ctx)
	return service.createAndPublish(ctx, &models.Notification{
		Type:      models.NotificationTypeBookingCreated,
		Title:     "มีคิวจองใหม่",
		Body:      fmt.Sprintf("%s จองเวลา %s %s%s", booking.CustomerName, booking.SlotTime, formatThaiDateLabel(booking.BookingDate), actor),
		URL:       "/bookings",
		BookingID: booking.ID,
	}, &booking)
}

func (service *NotificationService) BookingUpdated(ctx context.Context, booking models.Booking) error {
	actor := adminActorSuffix(ctx)
	return service.createAndPublish(ctx, &models.Notification{
		Type:      models.NotificationTypeBookingUpdated,
		Title:     "อัปเดตสถานะคิว",
		Body:      fmt.Sprintf("%s เปลี่ยนเป็น %s%s", booking.BookingCode, bookingStatusLabel(booking.Status), actor),
		URL:       "/bookings",
		BookingID: booking.ID,
	}, &booking)
}

func (service *NotificationService) BookingRescheduled(ctx context.Context, booking models.Booking) error {
	actor := adminActorSuffix(ctx)
	return service.createAndPublish(ctx, &models.Notification{
		Type:      models.NotificationTypeBookingUpdated,
		Title:     "มีการเลื่อนนัด",
		Body:      fmt.Sprintf("%s เลื่อนเป็นเวลา %s %s%s", booking.CustomerName, booking.SlotTime, formatThaiDateLabel(booking.BookingDate), actor),
		URL:       "/bookings",
		BookingID: booking.ID,
	}, &booking)
}

func (service *NotificationService) BookingDeleted(ctx context.Context, booking models.Booking, reason string) error {
	actor := adminActorSuffix(ctx)
	eventType := models.NotificationTypeBookingDeleted
	title := "ลบรายการจองแล้ว"
	body := fmt.Sprintf("%s %s ถูกลบออกจากระบบ%s", booking.BookingCode, booking.CustomerName, actor)
	if reason == "cancelled" {
		eventType = models.NotificationTypeBookingCancelled
		title = "มีการยกเลิกการจอง"
		body = fmt.Sprintf("%s ยกเลิกคิว %s%s", booking.CustomerName, booking.BookingCode, actor)
	}
	return service.createAndPublish(ctx, &models.Notification{
		Type:      eventType,
		Title:     title,
		Body:      body,
		URL:       "/bookings",
		BookingID: booking.ID,
	}, &booking)
}

func adminActorSuffix(ctx context.Context) string {
	actor, ok := AdminActorFromContext(ctx)
	if !ok {
		return ""
	}
	name := strings.TrimSpace(actor.Name)
	if name == "" {
		name = strings.TrimSpace(actor.Email)
	}
	if name == "" {
		return ""
	}
	return " โดย " + name
}

func (service *NotificationService) ServiceChanged(ctx context.Context, eventType string, item models.Service) error {
	return service.publish(ctx, RealtimeEvent{Type: eventType, Service: &item})
}

func (service *NotificationService) BookingSettingsUpdated(ctx context.Context, settings models.BookingSettings) error {
	return service.publish(ctx, RealtimeEvent{Type: models.NotificationTypeBookingSettingsUpdated, Settings: &settings})
}
