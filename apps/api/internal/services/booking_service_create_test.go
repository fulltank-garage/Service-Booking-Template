package services

import (
	"context"
	"errors"
	"strings"
	"testing"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
)

func TestCreateBookingRejectsFullSlot(t *testing.T) {
	store := &fakeStore{
		service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, IsActive: true, DurationMinutes: 30},
		bookings: []models.Booking{
			{SlotTime: "10:00", Status: models.BookingStatusPending, Service: models.Service{DurationMinutes: 30}},
			{SlotTime: "10:00", Status: models.BookingStatusPending, Service: models.Service{DurationMinutes: 30}},
		},
	}
	service := NewBookingService(store, nil, nil, 2)
	freezeBookingServiceNow(service)

	_, err := service.CreateBooking(context.Background(), CreateBookingInput{
		ServiceID:    "svc-1",
		CustomerName: "Somchai",
		Phone:        "0890000000",
		LineUserID:   "line-user-1",
		BookingDate:  "2026-06-10",
		SlotTime:     "10:00",
	})

	if !errors.Is(err, ErrSlotUnavailable) {
		t.Fatalf("expected ErrSlotUnavailable, got %v", err)
	}
}

func TestCreateBookingNormalizesAndPersistsPendingBooking(t *testing.T) {
	store := &fakeStore{service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, IsActive: true}}
	service := NewBookingService(store, nil, nil, 3)
	freezeBookingServiceNow(service)

	booking, err := service.CreateBooking(context.Background(), CreateBookingInput{
		ServiceID:    " svc-1 ",
		CustomerName: " Anong ",
		Phone:        " 0812345678 ",
		LineUserID:   " line-user-1 ",
		BookingDate:  "2026-06-10",
		SlotTime:     "10:00",
	})

	if err != nil {
		t.Fatalf("create booking: %v", err)
	}
	if booking.Status != models.BookingStatusPending {
		t.Fatalf("expected pending status, got %q", booking.Status)
	}
	if booking.CustomerName != "Anong" {
		t.Fatalf("expected trimmed customer name, got %q", booking.CustomerName)
	}
	if !strings.HasPrefix(booking.BookingCode, "Q-1006-") {
		t.Fatalf("expected readable booking code, got %q", booking.BookingCode)
	}
	if store.created == nil {
		t.Fatal("expected booking to be persisted")
	}
}

func TestCreateBookingRejectsMissingLineUserID(t *testing.T) {
	store := &fakeStore{service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, IsActive: true}}
	service := NewBookingService(store, nil, nil, 3)
	freezeBookingServiceNow(service)

	_, err := service.CreateBooking(context.Background(), CreateBookingInput{
		ServiceID:    "svc-1",
		CustomerName: "Anong",
		Phone:        "0812345678",
		BookingDate:  "2026-06-10",
		SlotTime:     "10:00",
	})

	if !errors.Is(err, ErrInvalidBooking) {
		t.Fatalf("expected missing line user id to be invalid, got %v", err)
	}
	if store.created != nil {
		t.Fatal("expected booking to not be persisted")
	}
}

func TestCreateBookingSendsLineMessage(t *testing.T) {
	store := &fakeStore{service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, NameTH: "ทำเล็บเจล", IsActive: true}}
	messenger := &recordingCustomerMessenger{}
	service := NewBookingServiceWithCustomerMessenger(store, nil, nil, messenger, 3)
	freezeBookingServiceNow(service)

	_, err := service.CreateBooking(context.Background(), CreateBookingInput{
		ServiceID:    "svc-1",
		CustomerName: "Anong",
		Phone:        "0812345678",
		LineUserID:   "line-user-1",
		BookingDate:  "2026-06-10",
		SlotTime:     "10:00",
	})

	if err != nil {
		t.Fatalf("create booking: %v", err)
	}
	if messenger.lineUserID != "line-user-1" {
		t.Fatalf("expected line message to booking user, got %q", messenger.lineUserID)
	}
	if !strings.Contains(messenger.message, "ร้านได้รับคิวแล้ว") ||
		!strings.Contains(messenger.message, "รอร้านตรวจสอบและยืนยันคิวให้คุณ") ||
		!strings.Contains(messenger.message, "10:00") {
		t.Fatalf("expected booking confirmation message, got %q", messenger.message)
	}
}
