package services

import (
	"context"
	"errors"
	"strings"
	"testing"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"github.com/fulltank-garage/service-booking-template-api/internal/repositories"
	"gorm.io/gorm"
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
	if !strings.Contains(messenger.message, "จองคิวสำเร็จ") || !strings.Contains(messenger.message, "10:00") {
		t.Fatalf("expected booking confirmation message, got %q", messenger.message)
	}
}

func TestUpdateServiceCanReactivateInactiveService(t *testing.T) {
	store := &fakeStore{
		service: models.Service{
			BaseModel:       models.BaseModel{ID: "svc-1"},
			NameTH:          "ทำเล็บเจล",
			NameEN:          "Gel nail",
			DescriptionTH:   "ทำเล็บเจลสีพื้น",
			DurationMinutes: 45,
			PriceCents:      35000,
			AccentColor:     "#FF008C",
			IsActive:        false,
		},
	}
	notifier := &recordingBookingNotifier{}
	service := NewBookingService(store, notifier, nil, 1)

	updated, err := service.UpdateService(context.Background(), "svc-1", ServiceInput{
		NameTH:          "ทำเล็บเจล",
		NameEN:          "Gel nail",
		DescriptionTH:   "ทำเล็บเจลสีพื้น",
		DurationMinutes: 45,
		PriceCents:      35000,
		AccentColor:     "#FF008C",
		IsActive:        true,
	})

	if err != nil {
		t.Fatalf("update service: %v", err)
	}
	if !updated.IsActive || !store.service.IsActive {
		t.Fatal("expected inactive service to be reactivated")
	}
}

func TestServiceChangesNotifyRealtime(t *testing.T) {
	store := &fakeStore{service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, IsActive: true}}
	notifier := &recordingBookingNotifier{}
	service := NewBookingService(store, notifier, nil, 1)

	created, err := service.CreateService(context.Background(), ServiceInput{
		NameTH:          "บริการใหม่",
		DurationMinutes: 30,
		PriceCents:      0,
		IsActive:        true,
	})
	if err != nil {
		t.Fatalf("create service: %v", err)
	}
	if notifier.serviceEventType != "service.created" || notifier.service.ID != created.ID {
		t.Fatalf("expected service.created event, got %q %#v", notifier.serviceEventType, notifier.service)
	}

	_, err = service.UpdateService(context.Background(), "svc-1", ServiceInput{
		NameTH:          "บริการแก้ไข",
		DurationMinutes: 45,
		PriceCents:      1000,
		IsActive:        true,
	})
	if err != nil {
		t.Fatalf("update service: %v", err)
	}
	if notifier.serviceEventType != "service.updated" {
		t.Fatalf("expected service.updated event, got %q", notifier.serviceEventType)
	}

	if err := service.DeleteService(context.Background(), "svc-1"); err != nil {
		t.Fatalf("delete service: %v", err)
	}
	if notifier.serviceEventType != "service.deleted" {
		t.Fatalf("expected service.deleted event, got %q", notifier.serviceEventType)
	}
}

func TestSaveBookingSettingsNotifiesRealtime(t *testing.T) {
	store := &fakeStore{}
	notifier := &recordingBookingNotifier{}
	service := NewBookingService(store, notifier, nil, 1)

	settings, err := service.SaveBookingSettings(context.Background(), BookingSettingsInput{
		OpenTime:            "09:00",
		CloseTime:           "17:00",
		SlotIntervalMinutes: 30,
		SlotCapacity:        2,
	})

	if err != nil {
		t.Fatalf("save booking settings: %v", err)
	}
	if notifier.settings.ID != settings.ID || notifier.settings.OpenTime != "09:00" {
		t.Fatalf("expected booking settings event, got %#v", notifier.settings)
	}
}

func TestListAvailabilityReturnsSixteenBusinessSlots(t *testing.T) {
	store := &fakeStore{service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, IsActive: true}}
	service := NewBookingService(store, nil, nil, 3)

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
	if !strings.Contains(messenger.message, "อัปเดตสถานะการจอง") || !strings.Contains(messenger.message, "ยืนยันแล้ว") {
		t.Fatalf("expected status update message, got %q", messenger.message)
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
	if !strings.Contains(messenger.message, "ยกเลิกการจองแล้ว") {
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

type fakeStore struct {
	service       models.Service
	slotCount     int64
	created       *models.Booking
	bookings      []models.Booking
	settings      models.BookingSettings
	blackoutDates []models.BookingBlackoutDate
}

func (store *fakeStore) ListServices(context.Context) ([]models.Service, error) {
	return []models.Service{store.service}, nil
}
func (store *fakeStore) ListAdminServices(context.Context) ([]models.Service, error) {
	return []models.Service{store.service}, nil
}
func (store *fakeStore) FindServiceByID(_ context.Context, id string) (models.Service, error) {
	if id != store.service.ID {
		return models.Service{}, errors.New("not found")
	}
	return store.service, nil
}
func (store *fakeStore) FindAnyServiceByID(_ context.Context, id string) (models.Service, error) {
	if id != store.service.ID {
		return models.Service{}, errors.New("not found")
	}
	return store.service, nil
}
func (store *fakeStore) CreateService(_ context.Context, service *models.Service) error {
	if service.ID == "" {
		service.ID = "svc-1"
	}
	store.service = *service
	return nil
}
func (store *fakeStore) UpdateService(_ context.Context, service *models.Service) error {
	store.service = *service
	return nil
}
func (store *fakeStore) DeleteService(context.Context, string) error {
	store.service.IsActive = false
	return nil
}
func (store *fakeStore) FindAdminUserByEmail(context.Context, string) (models.AdminUser, error) {
	return models.AdminUser{}, nil
}
func (store *fakeStore) CreateAdminUser(context.Context, *models.AdminUser) error { return nil }
func (store *fakeStore) CreateAdminSession(context.Context, *models.AdminSessionRecord) error {
	return nil
}
func (store *fakeStore) FindAdminSessionByTokenHash(context.Context, string) (models.AdminSessionRecord, error) {
	return models.AdminSessionRecord{}, nil
}
func (store *fakeStore) RevokeAdminSession(context.Context, string) error { return nil }
func (store *fakeStore) CountBookingsForSlot(context.Context, string, string, string) (int64, error) {
	return store.slotCount, nil
}
func (store *fakeStore) CreateBooking(_ context.Context, booking *models.Booking) error {
	store.created = booking
	return nil
}
func (store *fakeStore) CreateBookingWithAvailability(_ context.Context, booking *models.Booking, durationMinutes int, capacity int, bufferMinutes int) error {
	if countOverlappingBookings(store.bookings, booking.SlotTime, durationMinutes, bufferMinutes) >= int64(capacity) {
		return repositories.ErrSlotCapacityReached
	}
	store.created = booking
	return nil
}
func (store *fakeStore) FindBookingByID(context.Context, string) (models.Booking, error) {
	if store.created == nil {
		return models.Booking{}, errors.New("not found")
	}
	return *store.created, nil
}
func (store *fakeStore) LatestBookingByLineUser(context.Context, string) (models.Booking, error) {
	return models.Booking{}, gorm.ErrRecordNotFound
}
func (store *fakeStore) ListBookings(context.Context, models.BookingFilter) ([]models.Booking, error) {
	return store.bookings, nil
}
func (store *fakeStore) CountNoShowBookingsByLineUser(_ context.Context, lineUserID string) (int64, error) {
	var count int64
	for _, booking := range store.bookings {
		if booking.LineUserID == lineUserID && booking.Status == models.BookingStatusNoShow {
			count++
		}
	}
	return count, nil
}
func (store *fakeStore) UpdateBookingWithAvailability(_ context.Context, booking *models.Booking, durationMinutes int, capacity int, bufferMinutes int) (models.Booking, error) {
	if countOverlappingBookings(store.bookings, booking.SlotTime, durationMinutes, bufferMinutes) >= int64(capacity) {
		return models.Booking{}, repositories.ErrSlotCapacityReached
	}
	store.created = booking
	return *booking, nil
}
func (store *fakeStore) UpdateBookingStatus(_ context.Context, _ string, status string) (models.Booking, error) {
	if store.created == nil {
		return models.Booking{}, errors.New("not found")
	}
	store.created.Status = status
	return *store.created, nil
}
func (store *fakeStore) DeleteBooking(context.Context, string) error {
	store.created = nil
	return nil
}
func (store *fakeStore) CreateNotification(context.Context, *models.Notification) error { return nil }
func (store *fakeStore) ListNotifications(context.Context, bool, int) ([]models.Notification, error) {
	return nil, nil
}
func (store *fakeStore) MarkNotificationRead(context.Context, string) (models.Notification, error) {
	return models.Notification{}, nil
}
func (store *fakeStore) CleanupNotifications(context.Context, time.Time, time.Time) error {
	return nil
}
func (store *fakeStore) SavePushSubscription(context.Context, *models.PushSubscription) error {
	return nil
}
func (store *fakeStore) ListPushSubscriptions(context.Context) ([]models.PushSubscription, error) {
	return nil, nil
}
func (store *fakeStore) DeletePushSubscription(context.Context, string) error { return nil }
func (store *fakeStore) GetBookingSettings(context.Context) (models.BookingSettings, error) {
	store.settings.BlackoutDates = store.blackoutDates
	return store.settings, nil
}
func (store *fakeStore) ListBlackoutDates(context.Context) ([]models.BookingBlackoutDate, error) {
	return store.blackoutDates, nil
}
func (store *fakeStore) SaveBookingSettings(_ context.Context, settings *models.BookingSettings) error {
	store.settings = *settings
	return nil
}

type recordingRichMenuSwitcher struct {
	bookingMenuUserID    string
	bookingSuccessUserID string
}

type recordingCustomerMessenger struct {
	lineUserID string
	message    string
}

func (messenger *recordingCustomerMessenger) SendBookingMessage(_ context.Context, lineUserID string, message string) error {
	messenger.lineUserID = lineUserID
	messenger.message = message
	return nil
}

type recordingBookingNotifier struct {
	createdBooking     models.Booking
	updatedBooking     models.Booking
	rescheduledBooking models.Booking
	deletedBooking     models.Booking
	deletedReason      string
	serviceEventType   string
	service            models.Service
	settings           models.BookingSettings
}

func (notifier *recordingBookingNotifier) BookingCreated(_ context.Context, booking models.Booking) error {
	notifier.createdBooking = booking
	return nil
}

func (notifier *recordingBookingNotifier) BookingUpdated(_ context.Context, booking models.Booking) error {
	notifier.updatedBooking = booking
	return nil
}

func (notifier *recordingBookingNotifier) BookingRescheduled(_ context.Context, booking models.Booking) error {
	notifier.rescheduledBooking = booking
	return nil
}

func (notifier *recordingBookingNotifier) BookingDeleted(_ context.Context, booking models.Booking, reason string) error {
	notifier.deletedBooking = booking
	notifier.deletedReason = reason
	return nil
}

func (notifier *recordingBookingNotifier) ServiceChanged(_ context.Context, eventType string, service models.Service) error {
	notifier.serviceEventType = eventType
	notifier.service = service
	return nil
}

func (notifier *recordingBookingNotifier) BookingSettingsUpdated(_ context.Context, settings models.BookingSettings) error {
	notifier.settings = settings
	return nil
}

func (switcher *recordingRichMenuSwitcher) SwitchToBookingSuccess(_ context.Context, lineUserID string) error {
	switcher.bookingSuccessUserID = lineUserID
	return nil
}

func (switcher *recordingRichMenuSwitcher) SwitchToBookingMenu(_ context.Context, lineUserID string) error {
	switcher.bookingMenuUserID = lineUserID
	return nil
}
