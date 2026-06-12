package services

import (
	"context"
	"strings"
	"testing"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
)

func TestUpdateBookingStatusNoShowSwitchesRichMenuToBooking(t *testing.T) {
	store := &fakeStore{
		created: &models.Booking{
			BaseModel:   models.BaseModel{ID: "booking-1"},
			BookingCode: "Q-TEST",
			LineUserID:  "line-user-1",
			Status:      models.BookingStatusConfirmed,
		},
	}
	switcher := &recordingRichMenuSwitcher{}
	service := NewBookingService(store, nil, switcher, 1)

	if _, err := service.UpdateBookingStatus(context.Background(), "booking-1", models.BookingStatusNoShow); err != nil {
		t.Fatalf("update status: %v", err)
	}

	if switcher.bookingMenuUserID != "line-user-1" {
		t.Fatalf("expected booking rich menu switch, got %q", switcher.bookingMenuUserID)
	}
}

func TestUpdateBookingStatusSendsLineMessage(t *testing.T) {
	store := &fakeStore{
		created: &models.Booking{
			BaseModel:    models.BaseModel{ID: "booking-1"},
			BookingCode:  "Q-TEST",
			LineUserID:   "line-user-1",
			BookingDate:  "2026-06-10",
			SlotTime:     "10:00",
			Status:       models.BookingStatusPending,
			CustomerName: "Anong",
		},
	}
	messenger := &recordingCustomerMessenger{}
	service := NewBookingServiceWithCustomerMessenger(store, nil, nil, messenger, 1)

	if _, err := service.UpdateBookingStatus(context.Background(), "booking-1", models.BookingStatusConfirmed); err != nil {
		t.Fatalf("update status: %v", err)
	}

	if messenger.lineUserID != "line-user-1" {
		t.Fatalf("expected line message to booking user, got %q", messenger.lineUserID)
	}
	if !strings.Contains(messenger.message, "ร้านยืนยันคิวแล้ว") || !strings.Contains(messenger.message, "กรุณามาตามวันและเวลานัด") {
		t.Fatalf("expected status update message, got %q", messenger.message)
	}
}

func TestCustomerBookingMessagesUseFriendlyCopy(t *testing.T) {
	booking := models.Booking{
		BookingCode: "Q-TEST",
		BookingDate: "2026-06-10",
		SlotTime:    "10:00",
		Status:      models.BookingStatusPending,
		Service:     models.Service{NameTH: "ทำเล็บเจล"},
	}

	createdMessage := bookingCreatedMessage(booking)
	if !strings.Contains(createdMessage, "ร้านได้รับคิวแล้ว") || !strings.Contains(createdMessage, "รอร้านตรวจสอบและยืนยันคิวให้คุณ") {
		t.Fatalf("expected friendly created message, got %q", createdMessage)
	}

	rescheduledMessage := bookingRescheduledMessage(booking)
	if !strings.Contains(rescheduledMessage, "เปลี่ยนวันและเวลาให้แล้ว") || !strings.Contains(rescheduledMessage, "ร้านได้รับข้อมูลการเลื่อนนัดของคุณแล้ว") {
		t.Fatalf("expected friendly rescheduled message, got %q", rescheduledMessage)
	}

	booking.Status = models.BookingStatusCompleted
	completedMessage := bookingStatusMessage(booking)
	if !strings.Contains(completedMessage, "ใช้บริการเรียบร้อยแล้ว") || !strings.Contains(completedMessage, "คุณสามารถจองคิวใหม่ได้เมื่อต้องการ") {
		t.Fatalf("expected friendly completed message, got %q", completedMessage)
	}

	booking.Status = models.BookingStatusNoShow
	noShowMessage := bookingStatusMessage(booking)
	if !strings.Contains(noShowMessage, "ไม่ได้มาตามนัด") || !strings.Contains(noShowMessage, "กรุณาจองคิวใหม่") {
		t.Fatalf("expected friendly no-show message, got %q", noShowMessage)
	}
}

func TestUpdateBookingStatusCompletedSwitchesRichMenuToBooking(t *testing.T) {
	store := &fakeStore{
		created: &models.Booking{
			BaseModel:   models.BaseModel{ID: "booking-1"},
			BookingCode: "Q-TEST",
			LineUserID:  "line-user-1",
			Status:      models.BookingStatusConfirmed,
		},
	}
	switcher := &recordingRichMenuSwitcher{}
	service := NewBookingService(store, nil, switcher, 1)

	if _, err := service.UpdateBookingStatus(context.Background(), "booking-1", models.BookingStatusCompleted); err != nil {
		t.Fatalf("update status: %v", err)
	}

	if switcher.bookingMenuUserID != "line-user-1" {
		t.Fatalf("expected booking rich menu switch, got %q", switcher.bookingMenuUserID)
	}
}
