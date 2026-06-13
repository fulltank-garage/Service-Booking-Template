package services

import (
	"context"
	"fmt"
	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"strings"
	"time"
)

func (service *BookingService) ListAvailability(ctx context.Context, serviceID string, date string) ([]AvailabilitySlot, error) {
	if strings.TrimSpace(serviceID) == "" {
		return nil, ErrServiceRequired
	}
	bookingDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		return nil, fmt.Errorf("%w: bookingDate", ErrInvalidBooking)
	}
	serviceItem, err := service.store.FindServiceByID(ctx, serviceID)
	if err != nil {
		return nil, err
	}
	settings, err := service.loadBookingSettings(ctx)
	if err != nil {
		return nil, err
	}
	if isClosedWeekday(settings.ClosedWeekdays, bookingDate.Weekday()) {
		return []AvailabilitySlot{}, nil
	}
	if isBlackoutDate(settings.BlackoutDates, inputDate(bookingDate)) {
		return []AvailabilitySlot{}, nil
	}

	slots, err := serviceSlots(settings, serviceItem.DurationMinutes)
	if err != nil {
		return nil, err
	}
	existingBookings, err := service.store.ListBookings(ctx, models.BookingFilter{Date: date})
	if err != nil {
		return nil, err
	}
	availability := make([]AvailabilitySlot, 0, len(slots))
	for _, slot := range slots {
		count := countOverlappingBookings(existingBookings, slot, serviceItem.DurationMinutes, settings.BufferMinutes)
		isInsideBookingWindow := validateBookingWindow(settings, date, slot, service.now()) == nil
		availability = append(availability, AvailabilitySlot{
			Time:      slot,
			Booked:    count,
			Capacity:  settings.SlotCapacity,
			Available: isInsideBookingWindow && count < int64(settings.SlotCapacity),
		})
	}
	return availability, nil
}

func businessSlots(settings models.BookingSettings) ([]string, error) {
	return serviceSlots(settings, settings.SlotIntervalMinutes)
}

func serviceSlots(settings models.BookingSettings, durationMinutes int) ([]string, error) {
	if err := validateBookingSettings(settings); err != nil {
		return nil, err
	}
	if durationMinutes <= 0 {
		durationMinutes = settings.SlotIntervalMinutes
	}
	start, _ := parseClock(settings.OpenTime)
	closeAt, _ := parseClock(settings.CloseTime)
	slots := make([]string, 0, 16)
	stepMinutes := durationMinutes + settings.BufferMinutes
	if stepMinutes <= 0 {
		stepMinutes = settings.SlotIntervalMinutes
	}
	for current := start; !current.Add(time.Duration(durationMinutes) * time.Minute).After(closeAt); current = current.Add(time.Duration(stepMinutes) * time.Minute) {
		slots = append(slots, current.Format("15:04"))
	}
	return slots, nil
}

func parseClock(value string) (time.Time, error) {
	return time.Parse("15:04", value)
}

func isClosedWeekday(value string, weekday time.Weekday) bool {
	target := fmt.Sprintf("%d", int(weekday))
	for _, raw := range strings.Split(value, ",") {
		if strings.TrimSpace(raw) == target {
			return true
		}
	}
	return false
}

func isBlackoutDate(items []models.BookingBlackoutDate, date string) bool {
	for _, item := range items {
		if strings.TrimSpace(item.Date) == date {
			return true
		}
	}
	return false
}

func inputDate(date time.Time) string {
	return date.Format("2006-01-02")
}

func containsSlot(slots []string, slot string) bool {
	for _, item := range slots {
		if item == slot {
			return true
		}
	}
	return false
}

func countOverlappingBookings(bookings []models.Booking, slot string, durationMinutes int, bufferMinutes int) int64 {
	slotStart, ok := clockMinutes(slot)
	if !ok || durationMinutes <= 0 {
		return 0
	}
	if bufferMinutes < 0 {
		bufferMinutes = 0
	}
	slotEnd := slotStart + durationMinutes + bufferMinutes
	var count int64
	for _, booking := range bookings {
		if isClosedBookingStatus(booking.Status) {
			continue
		}
		bookingDuration := booking.Service.DurationMinutes
		if bookingDuration <= 0 {
			bookingDuration = durationMinutes
		}
		bookingStart, ok := clockMinutes(booking.SlotTime)
		if !ok {
			continue
		}
		bookingEnd := bookingStart + bookingDuration + bufferMinutes
		if slotStart < bookingEnd && bookingStart < slotEnd {
			count++
		}
	}
	return count
}
