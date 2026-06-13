package services

import (
	"context"
	"testing"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
)

func TestListAvailabilityReturnsSixteenBusinessSlots(t *testing.T) {
	store := &fakeStore{service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, IsActive: true}}
	service := NewBookingService(store, nil, nil, 3)
	freezeBookingServiceNow(service)

	slots, err := service.ListAvailability(context.Background(), "svc-1", "2026-06-10")
	if err != nil {
		t.Fatalf("list availability: %v", err)
	}
	if len(slots) != 16 {
		t.Fatalf("expected 16 slots, got %d", len(slots))
	}
	if slots[0].Time != "09:00" || slots[15].Time != "16:30" {
		t.Fatalf("unexpected slot range: %s to %s", slots[0].Time, slots[15].Time)
	}
}

func TestListAvailabilityUsesBookingSettings(t *testing.T) {
	store := &fakeStore{
		service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, IsActive: true},
		settings: models.BookingSettings{
			OpenTime:            "10:00",
			CloseTime:           "11:00",
			SlotIntervalMinutes: 30,
			SlotCapacity:        2,
			ClosedWeekdays:      "0",
		},
	}
	notifier := &recordingBookingNotifier{}
	service := NewBookingService(store, notifier, nil, 1)
	freezeBookingServiceNow(service)

	slots, err := service.ListAvailability(context.Background(), "svc-1", "2026-06-10")
	if err != nil {
		t.Fatalf("list availability: %v", err)
	}
	if len(slots) != 2 {
		t.Fatalf("expected 2 slots from settings, got %d", len(slots))
	}
	if slots[0].Time != "10:00" || slots[1].Time != "10:30" {
		t.Fatalf("unexpected custom slots: %#v", slots)
	}
	if slots[0].Capacity != 2 {
		t.Fatalf("expected settings capacity 2, got %d", slots[0].Capacity)
	}

	closedSlots, err := service.ListAvailability(context.Background(), "svc-1", "2026-06-07")
	if err != nil {
		t.Fatalf("list closed day availability: %v", err)
	}
	if len(closedSlots) != 0 {
		t.Fatalf("expected no slots on closed weekday, got %d", len(closedSlots))
	}
}

func TestListAvailabilityUsesServiceDurationAndOverlappingBookings(t *testing.T) {
	store := &fakeStore{
		service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, IsActive: true, DurationMinutes: 45},
		settings: models.BookingSettings{
			OpenTime:            "09:00",
			CloseTime:           "11:00",
			SlotIntervalMinutes: 30,
			SlotCapacity:        1,
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

	slots, err := service.ListAvailability(context.Background(), "svc-1", "2026-06-10")
	if err != nil {
		t.Fatalf("list availability: %v", err)
	}
	if len(slots) != 2 {
		t.Fatalf("expected duration-based slots, got %d", len(slots))
	}
	if slots[0].Time != "09:00" || slots[1].Time != "09:45" {
		t.Fatalf("unexpected duration slots: %#v", slots)
	}
	if slots[0].Available || slots[1].Available {
		t.Fatalf("expected overlapping slots to be unavailable with one technician: %#v", slots)
	}
}

func TestListAvailabilityUsesBufferMinutesForOverlappingBookings(t *testing.T) {
	store := &fakeStore{
		service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, IsActive: true, DurationMinutes: 30},
		settings: models.BookingSettings{
			OpenTime:            "09:00",
			CloseTime:           "10:30",
			SlotIntervalMinutes: 30,
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

	slots, err := service.ListAvailability(context.Background(), "svc-1", "2026-06-10")
	if err != nil {
		t.Fatalf("list availability: %v", err)
	}
	if len(slots) != 2 {
		t.Fatalf("expected buffer-aware slots, got %d", len(slots))
	}
	if slots[0].Available || !slots[1].Available {
		t.Fatalf("expected buffer to block 09:00 and allow 09:45, got %#v", slots)
	}
}
