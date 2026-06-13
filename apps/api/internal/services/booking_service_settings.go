package services

import (
	"context"
	"fmt"
	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"strings"
	"time"
)

func (service *BookingService) GetBookingSettings(ctx context.Context) (models.BookingSettings, error) {
	settings, err := service.loadBookingSettings(ctx)
	if err != nil {
		return models.BookingSettings{}, err
	}
	return settings, nil
}

func (service *BookingService) SaveBookingSettings(ctx context.Context, input BookingSettingsInput) (models.BookingSettings, error) {
	settings := normalizeBookingSettingsInput(input, service.capacity)
	if err := validateBookingSettings(settings); err != nil {
		return models.BookingSettings{}, err
	}
	if err := service.store.SaveBookingSettings(ctx, &settings); err != nil {
		return models.BookingSettings{}, err
	}
	if service.notifier != nil {
		_ = service.notifier.BookingSettingsUpdated(ctx, settings)
	}
	return settings, nil
}

func (service *BookingService) loadBookingSettings(ctx context.Context) (models.BookingSettings, error) {
	settings, err := service.store.GetBookingSettings(ctx)
	if err != nil {
		return models.BookingSettings{}, err
	}
	return normalizeBookingSettings(settings, service.capacity), nil
}

func normalizeBookingSettingsInput(input BookingSettingsInput, fallbackCapacity int) models.BookingSettings {
	return normalizeBookingSettings(models.BookingSettings{
		OpenTime:            input.OpenTime,
		CloseTime:           input.CloseTime,
		SlotIntervalMinutes: input.SlotIntervalMinutes,
		SlotCapacity:        input.SlotCapacity,
		ClosedWeekdays:      input.ClosedWeekdays,
		MinAdvanceHours:     input.MinAdvanceHours,
		MaxAdvanceDays:      input.MaxAdvanceDays,
		ReminderLeadMinutes: input.ReminderLeadMinutes,
		BufferMinutes:       input.BufferMinutes,
		BlackoutDates:       normalizeBlackoutDates(input.BlackoutDates),
	}, fallbackCapacity)
}

func normalizeBookingSettings(settings models.BookingSettings, fallbackCapacity int) models.BookingSettings {
	settings.OpenTime = strings.TrimSpace(settings.OpenTime)
	settings.CloseTime = strings.TrimSpace(settings.CloseTime)
	settings.ClosedWeekdays = strings.TrimSpace(settings.ClosedWeekdays)
	if settings.OpenTime == "" {
		settings.OpenTime = "09:00"
	}
	if settings.CloseTime == "" {
		settings.CloseTime = "17:00"
	}
	if settings.SlotIntervalMinutes <= 0 {
		settings.SlotIntervalMinutes = 30
	}
	if settings.SlotCapacity <= 0 {
		if fallbackCapacity <= 0 {
			fallbackCapacity = 1
		}
		settings.SlotCapacity = fallbackCapacity
	}
	if settings.MaxAdvanceDays <= 0 {
		settings.MaxAdvanceDays = 60
	}
	if settings.ReminderLeadMinutes <= 0 {
		settings.ReminderLeadMinutes = 24 * 60
	}
	if settings.BufferMinutes < 0 {
		settings.BufferMinutes = 0
	}
	settings.BlackoutDates = normalizeBlackoutDates(settings.BlackoutDates)
	return settings
}

func validateBookingSettings(settings models.BookingSettings) error {
	openAt, err := parseClock(settings.OpenTime)
	if err != nil {
		return fmt.Errorf("%w: openTime", ErrInvalidBooking)
	}
	closeAt, err := parseClock(settings.CloseTime)
	if err != nil {
		return fmt.Errorf("%w: closeTime", ErrInvalidBooking)
	}
	if !closeAt.After(openAt) {
		return fmt.Errorf("%w: closeTime", ErrInvalidBooking)
	}
	if settings.SlotIntervalMinutes < 5 || settings.SlotIntervalMinutes > 240 {
		return fmt.Errorf("%w: slotIntervalMinutes", ErrInvalidBooking)
	}
	if settings.SlotCapacity <= 0 || settings.SlotCapacity > 100 {
		return fmt.Errorf("%w: slotCapacity", ErrInvalidBooking)
	}
	if settings.BufferMinutes < 0 || settings.BufferMinutes > 240 {
		return fmt.Errorf("%w: bufferMinutes", ErrInvalidBooking)
	}
	for _, raw := range strings.Split(settings.ClosedWeekdays, ",") {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			continue
		}
		if raw < "0" || raw > "6" {
			return fmt.Errorf("%w: closedWeekdays", ErrInvalidBooking)
		}
	}
	for _, item := range settings.BlackoutDates {
		if _, err := time.Parse("2006-01-02", item.Date); err != nil {
			return fmt.Errorf("%w: blackoutDates", ErrInvalidBooking)
		}
	}
	return nil
}

func validateBookingDateRules(settings models.BookingSettings, date string, slotTime string, now time.Time) error {
	bookingDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		return fmt.Errorf("%w: bookingDate", ErrInvalidBooking)
	}
	if isClosedWeekday(settings.ClosedWeekdays, bookingDate.Weekday()) || isBlackoutDate(settings.BlackoutDates, date) {
		return ErrSlotUnavailable
	}
	return validateBookingWindow(settings, date, slotTime, now)
}

func validateBookingWindow(settings models.BookingSettings, date string, slotTime string, now time.Time) error {
	start, err := bookingStartTime(date, slotTime)
	if err != nil {
		return fmt.Errorf("%w: bookingDate", ErrInvalidBooking)
	}
	now = now.In(bangkokLocation())
	if start.Before(now.Add(time.Duration(settings.MinAdvanceHours) * time.Hour)) {
		return ErrSlotUnavailable
	}
	today := time.Date(now.Year(), now.Month(), now.Day(), 0, 0, 0, 0, bangkokLocation())
	latestDate := today.AddDate(0, 0, settings.MaxAdvanceDays)
	bookingDay := time.Date(start.Year(), start.Month(), start.Day(), 0, 0, 0, 0, bangkokLocation())
	if bookingDay.After(latestDate) {
		return ErrSlotUnavailable
	}
	return nil
}

func normalizeBlackoutDates(items []models.BookingBlackoutDate) []models.BookingBlackoutDate {
	if items == nil {
		return nil
	}
	seen := map[string]bool{}
	normalized := make([]models.BookingBlackoutDate, 0, len(items))
	for _, item := range items {
		item.Date = strings.TrimSpace(item.Date)
		item.Reason = strings.TrimSpace(item.Reason)
		if item.Date == "" || seen[item.Date] {
			continue
		}
		seen[item.Date] = true
		normalized = append(normalized, item)
	}
	return normalized
}
