package services

import (
	"context"
	"errors"
	"fmt"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"github.com/fulltank-garage/service-booking-template-api/internal/repositories"
	"gorm.io/gorm"
	"log"
)

func (service *BookingService) CreateBooking(ctx context.Context, input CreateBookingInput) (models.Booking, error) {
	return service.createBooking(ctx, input, true)
}

func (service *BookingService) CreateAdminBooking(ctx context.Context, input CreateBookingInput) (models.Booking, error) {
	return service.createBooking(ctx, input, false)
}

func (service *BookingService) createBooking(ctx context.Context, input CreateBookingInput, requireLineUser bool) (models.Booking, error) {
	input = normalizeBookingInput(input)
	if err := validateBookingInput(input); err != nil {
		return models.Booking{}, err
	}
	if requireLineUser && input.LineUserID == "" {
		return models.Booking{}, fmt.Errorf("%w: lineUserId", ErrInvalidBooking)
	}
	if input.LineUserID != "" {
		if existing, err := service.store.LatestBookingByLineUser(ctx, input.LineUserID); err == nil && !isClosedBookingStatus(existing.Status) {
			return models.Booking{}, ErrActiveBookingExists
		} else if err != nil && !errors.Is(err, gorm.ErrRecordNotFound) {
			return models.Booking{}, err
		}
	}

	settings, err := service.loadBookingSettings(ctx)
	if err != nil {
		return models.Booking{}, err
	}
	bookingDate, err := time.Parse("2006-01-02", input.BookingDate)
	if err != nil {
		return models.Booking{}, fmt.Errorf("%w: bookingDate", ErrInvalidBooking)
	}
	if isClosedWeekday(settings.ClosedWeekdays, bookingDate.Weekday()) {
		return models.Booking{}, ErrSlotUnavailable
	}
	if isBlackoutDate(settings.BlackoutDates, input.BookingDate) {
		return models.Booking{}, ErrSlotUnavailable
	}
	serviceItem, err := service.store.FindServiceByID(ctx, input.ServiceID)
	if err != nil {
		return models.Booking{}, err
	}
	if err := validateBookingWindow(settings, input.BookingDate, input.SlotTime, service.now()); err != nil {
		return models.Booking{}, err
	}
	slots, err := serviceSlots(settings, serviceItem.DurationMinutes)
	if err != nil {
		return models.Booking{}, err
	}
	if !containsSlot(slots, input.SlotTime) {
		return models.Booking{}, ErrSlotUnavailable
	}
	booking := models.Booking{
		BookingCode:  bookingCode(input.BookingDate),
		ServiceID:    input.ServiceID,
		CustomerName: input.CustomerName,
		Phone:        input.Phone,
		LineUserID:   input.LineUserID,
		Notes:        input.Notes,
		BookingDate:  input.BookingDate,
		SlotTime:     input.SlotTime,
		Status:       models.BookingStatusPending,
	}
	if err := service.store.CreateBookingWithAvailability(ctx, &booking, serviceItem.DurationMinutes, settings.SlotCapacity, settings.BufferMinutes); err != nil {
		if errors.Is(err, repositories.ErrSlotCapacityReached) {
			return models.Booking{}, ErrSlotUnavailable
		}
		return models.Booking{}, err
	}
	booking.Service = serviceItem
	if service.notifier != nil {
		_ = service.notifier.BookingCreated(ctx, booking)
	}
	service.sendCustomerMessage(ctx, booking, bookingCreatedMessage(booking))
	if service.richMenuSwitcher != nil && booking.LineUserID != "" {
		if err := service.richMenuSwitcher.SwitchToBookingSuccess(ctx, booking.LineUserID); err != nil {
			log.Printf("switch line rich menu to booking success: %v", err)
		}
	}
	return booking, nil
}
