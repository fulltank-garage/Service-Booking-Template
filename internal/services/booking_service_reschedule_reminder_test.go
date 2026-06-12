package services

import (
	"context"
	"testing"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
)

func TestRescheduleBookingByLineUserUpdatesSlotAndNotes(t *testing.T) {
	store := &fakeStore{
		service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, IsActive: true, DurationMinutes: 30},
		settings: models.BookingSettings{
			OpenTime:            "09:00",
			CloseTime:           "17:00",
			SlotIntervalMinutes: 30,
			SlotCapacity:        1,
			MaxAdvanceDays:      36500,
		},
		created: &models.Booking{
			BaseModel:    models.BaseModel{ID: "booking-1"},
			ServiceID:    "svc-1",
			Service:      models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, DurationMinutes: 30},
			LineUserID:   "line-user-1",
			CustomerName: "Somchai",
			Phone:        "0890000000",
			BookingDate:  "2026-06-10",
			SlotTime:     "10:00",
			Status:       models.BookingStatusPending,
		},
	}
	notifier := &recordingBookingNotifier{}
	service := NewBookingService(store, notifier, nil, 1)
	freezeBookingServiceNow(service)

	booking, err := service.RescheduleBookingByLineUser(context.Background(), "booking-1", RescheduleBookingInput{
		LineUserID:  "line-user-1",
		BookingDate: "2026-06-11",
		SlotTime:    "11:00",
		Notes:       "ขอเลื่อนเป็นช่วงสาย",
	})

	if err != nil {
		t.Fatalf("reschedule booking: %v", err)
	}
	if booking.BookingDate != "2026-06-11" || booking.SlotTime != "11:00" {
		t.Fatalf("expected rescheduled booking, got %s %s", booking.BookingDate, booking.SlotTime)
	}
	if booking.Notes != "ขอเลื่อนเป็นช่วงสาย" {
		t.Fatalf("expected notes to update, got %q", booking.Notes)
	}
	if notifier.rescheduledBooking.ID != "booking-1" {
		t.Fatalf("expected reschedule notifier to run, got %#v", notifier.rescheduledBooking)
	}
	if notifier.updatedBooking.ID != "" {
		t.Fatalf("expected generic update notifier to be skipped for reschedule, got %#v", notifier.updatedBooking)
	}
}

func TestListReminderCandidatesReturnsUpcomingActiveBookings(t *testing.T) {
	store := &fakeStore{
		bookings: []models.Booking{
			{
				BaseModel:   models.BaseModel{ID: "booking-1"},
				BookingDate: "2026-06-06",
				SlotTime:    "10:00",
				Status:      models.BookingStatusPending,
			},
			{
				BaseModel:   models.BaseModel{ID: "booking-2"},
				BookingDate: "2026-06-06",
				SlotTime:    "15:00",
				Status:      models.BookingStatusCancelled,
			},
			{
				BaseModel:   models.BaseModel{ID: "booking-3"},
				BookingDate: "2026-06-06",
				SlotTime:    "16:00",
				Status:      models.BookingStatusNoShow,
			},
		},
	}
	service := NewBookingService(store, nil, nil, 1)
	now := time.Date(2026, 6, 5, 12, 0, 0, 0, time.FixedZone("ICT", 7*60*60))

	candidates, err := service.ListReminderCandidates(context.Background(), now, 24*60)

	if err != nil {
		t.Fatalf("list reminder candidates: %v", err)
	}
	if len(candidates) != 1 || candidates[0].ID != "booking-1" {
		t.Fatalf("expected one active upcoming candidate, got %#v", candidates)
	}
}
