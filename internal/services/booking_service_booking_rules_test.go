package services

import (
	"context"
	"errors"
	"testing"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
)

func TestCreateBookingAllowsOverlappingSlotWhenCapacityAvailable(t *testing.T) {
	store := &fakeStore{
		service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, IsActive: true, DurationMinutes: 45},
		settings: models.BookingSettings{
			OpenTime:            "09:00",
			CloseTime:           "11:00",
			SlotIntervalMinutes: 30,
			SlotCapacity:        2,
		},
		bookings: []models.Booking{
			{
				SlotTime: "09:00",
				Status:   models.BookingStatusPending,
				Service:  models.Service{DurationMinutes: 60},
			},
		},
	}
	service := NewBookingService(store, nil, nil, 1)
	freezeBookingServiceNow(service)

	booking, err := service.CreateBooking(context.Background(), CreateBookingInput{
		ServiceID:    "svc-1",
		CustomerName: "Somchai",
		Phone:        "0890000000",
		LineUserID:   "line-user-1",
		BookingDate:  "2026-06-10",
		SlotTime:     "09:45",
	})

	if err != nil {
		t.Fatalf("create booking: %v", err)
	}
	if booking.SlotTime != "09:45" {
		t.Fatalf("expected booking at overlapping slot, got %q", booking.SlotTime)
	}
}

func TestCreateBookingRejectsSlotBlockedByBufferTime(t *testing.T) {
	store := &fakeStore{
		service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, IsActive: true, DurationMinutes: 15},
		settings: models.BookingSettings{
			OpenTime:            "09:00",
			CloseTime:           "11:00",
			SlotIntervalMinutes: 15,
			SlotCapacity:        1,
			BufferMinutes:       15,
		},
		bookings: []models.Booking{
			{
				SlotTime: "09:00",
				Status:   models.BookingStatusPending,
				Service:  models.Service{DurationMinutes: 30},
			},
		},
	}
	service := NewBookingService(store, nil, nil, 1)
	freezeBookingServiceNow(service)

	_, err := service.CreateBooking(context.Background(), CreateBookingInput{
		ServiceID:    "svc-1",
		CustomerName: "Somchai",
		Phone:        "0890000000",
		LineUserID:   "line-user-1",
		BookingDate:  "2026-06-10",
		SlotTime:     "09:30",
	})

	if !errors.Is(err, ErrSlotUnavailable) {
		t.Fatalf("expected buffer-blocked slot to be unavailable, got %v", err)
	}
}

func TestCreateBookingRejectsBlackoutDate(t *testing.T) {
	store := &fakeStore{
		service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, IsActive: true, DurationMinutes: 30},
		settings: models.BookingSettings{
			OpenTime:            "09:00",
			CloseTime:           "17:00",
			SlotIntervalMinutes: 30,
			SlotCapacity:        1,
			MinAdvanceHours:     0,
			MaxAdvanceDays:      36500,
		},
		blackoutDates: []models.BookingBlackoutDate{{Date: "2026-06-10", Reason: "Shop holiday"}},
	}
	service := NewBookingService(store, nil, nil, 1)
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
		t.Fatalf("expected blackout date to be unavailable, got %v", err)
	}
}

func TestCreateBookingRejectsDateOutsideBookingWindow(t *testing.T) {
	store := &fakeStore{
		service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, IsActive: true, DurationMinutes: 30},
		settings: models.BookingSettings{
			OpenTime:            "09:00",
			CloseTime:           "17:00",
			SlotIntervalMinutes: 30,
			SlotCapacity:        1,
			MinAdvanceHours:     24,
			MaxAdvanceDays:      30,
		},
	}
	service := NewBookingService(store, nil, nil, 1)
	service.now = func() time.Time {
		return time.Date(2026, 6, 5, 12, 0, 0, 0, time.FixedZone("ICT", 7*60*60))
	}

	_, err := service.CreateBooking(context.Background(), CreateBookingInput{
		ServiceID:    "svc-1",
		CustomerName: "Somchai",
		Phone:        "0890000000",
		LineUserID:   "line-user-1",
		BookingDate:  "2026-06-05",
		SlotTime:     "13:00",
	})

	if !errors.Is(err, ErrSlotUnavailable) {
		t.Fatalf("expected too-soon booking to be unavailable, got %v", err)
	}
}
