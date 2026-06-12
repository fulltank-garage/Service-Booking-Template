package services

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
)

func TestCancelBookingByLineUserDeletesBookingAndSwitchesRichMenu(t *testing.T) {
	store := &fakeStore{
		created: &models.Booking{
			BaseModel:  models.BaseModel{ID: "booking-1"},
			LineUserID: "line-user-1",
		},
	}
	switcher := &recordingRichMenuSwitcher{}
	service := NewBookingService(store, nil, switcher, 1)

	err := service.CancelBookingByLineUser(context.Background(), "booking-1", "line-user-1")

	if err != nil {
		t.Fatalf("cancel booking: %v", err)
	}
	if store.created != nil {
		t.Fatal("expected booking to be deleted")
	}
	if switcher.bookingMenuUserID != "line-user-1" {
		t.Fatalf("expected booking rich menu switch, got %q", switcher.bookingMenuUserID)
	}
}

func TestDeleteBookingNotifiesRealtime(t *testing.T) {
	store := &fakeStore{
		created: &models.Booking{
			BaseModel:   models.BaseModel{ID: "booking-1"},
			BookingCode: "Q-TEST",
		},
	}
	notifier := &recordingBookingNotifier{}
	service := NewBookingService(store, notifier, nil, 1)

	if err := service.DeleteBooking(context.Background(), "booking-1"); err != nil {
		t.Fatalf("delete booking: %v", err)
	}
	if notifier.deletedBooking.ID != "booking-1" || notifier.deletedReason != "deleted" {
		t.Fatalf("expected deleted booking event, got %#v reason=%q", notifier.deletedBooking, notifier.deletedReason)
	}
}

func TestUpdateBookingStatusCancelledNotifiesRealtime(t *testing.T) {
	store := &fakeStore{
		created: &models.Booking{
			BaseModel:   models.BaseModel{ID: "booking-1"},
			BookingCode: "Q-TEST",
		},
	}
	notifier := &recordingBookingNotifier{}
	service := NewBookingService(store, notifier, nil, 1)

	if _, err := service.UpdateBookingStatus(context.Background(), "booking-1", models.BookingStatusCancelled); err != nil {
		t.Fatalf("cancel booking status: %v", err)
	}
	if notifier.deletedBooking.ID != "booking-1" || notifier.deletedReason != "cancelled" {
		t.Fatalf("expected cancelled booking event, got %#v reason=%q", notifier.deletedBooking, notifier.deletedReason)
	}
}

func TestCancelBookingByLineUserNotifiesRealtime(t *testing.T) {
	store := &fakeStore{
		created: &models.Booking{
			BaseModel:  models.BaseModel{ID: "booking-1"},
			LineUserID: "line-user-1",
		},
	}
	notifier := &recordingBookingNotifier{}
	service := NewBookingService(store, notifier, nil, 1)

	if err := service.CancelBookingByLineUser(context.Background(), "booking-1", "line-user-1"); err != nil {
		t.Fatalf("cancel booking: %v", err)
	}
	if notifier.deletedBooking.ID != "booking-1" || notifier.deletedReason != "cancelled" {
		t.Fatalf("expected cancelled booking event, got %#v reason=%q", notifier.deletedBooking, notifier.deletedReason)
	}
}

func TestCancelBookingByLineUserSendsLineMessage(t *testing.T) {
	store := &fakeStore{
		created: &models.Booking{
			BaseModel:   models.BaseModel{ID: "booking-1"},
			BookingCode: "Q-TEST",
			LineUserID:  "line-user-1",
		},
	}
	messenger := &recordingCustomerMessenger{}
	service := NewBookingServiceWithCustomerMessenger(store, nil, nil, messenger, 1)

	if err := service.CancelBookingByLineUser(context.Background(), "booking-1", "line-user-1"); err != nil {
		t.Fatalf("cancel booking: %v", err)
	}

	if messenger.lineUserID != "line-user-1" {
		t.Fatalf("expected line message to booking user, got %q", messenger.lineUserID)
	}
	if !strings.Contains(messenger.message, "คิวนี้ถูกยกเลิกแล้ว") {
		t.Fatalf("expected cancellation message, got %q", messenger.message)
	}
}

func TestCancelBookingByLineUserRejectsDifferentLineUser(t *testing.T) {
	store := &fakeStore{
		created: &models.Booking{
			BaseModel:  models.BaseModel{ID: "booking-1"},
			LineUserID: "line-user-1",
		},
	}
	switcher := &recordingRichMenuSwitcher{}
	service := NewBookingService(store, nil, switcher, 1)

	err := service.CancelBookingByLineUser(context.Background(), "booking-1", "line-user-2")

	if !errors.Is(err, ErrInvalidBooking) {
		t.Fatalf("expected invalid booking error, got %v", err)
	}
	if store.created == nil {
		t.Fatal("expected booking to remain")
	}
	if switcher.bookingMenuUserID != "" {
		t.Fatalf("expected no rich menu switch, got %q", switcher.bookingMenuUserID)
	}
}
