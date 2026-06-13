package services

import (
	"context"
	"errors"
	"fmt"
	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"github.com/fulltank-garage/service-booking-template-api/internal/repositories"
	"strings"
)

func (service *BookingService) UpdateBooking(ctx context.Context, id string, input UpdateBookingInput) (models.Booking, error) {
	id = strings.TrimSpace(id)
	if id == "" {
		return models.Booking{}, fmt.Errorf("%w: id", ErrInvalidBooking)
	}
	booking, err := service.store.FindBookingByID(ctx, id)
	if err != nil {
		return models.Booking{}, err
	}
	input = normalizeUpdateBookingInput(input, booking)
	if err := validateBookingInput(CreateBookingInput{
		ServiceID:    input.ServiceID,
		CustomerName: input.CustomerName,
		Phone:        input.Phone,
		BookingDate:  input.BookingDate,
		SlotTime:     input.SlotTime,
	}); err != nil {
		return models.Booking{}, err
	}
	if input.Status != "" && !isAllowedStatus(input.Status) {
		return models.Booking{}, fmt.Errorf("%w: status", ErrInvalidBooking)
	}
	serviceItem, err := service.store.FindServiceByID(ctx, input.ServiceID)
	if err != nil {
		return models.Booking{}, err
	}
	settings, err := service.loadBookingSettings(ctx)
	if err != nil {
		return models.Booking{}, err
	}
	if err := validateBookingDateRules(settings, input.BookingDate, input.SlotTime, service.now()); err != nil {
		return models.Booking{}, err
	}
	slots, err := serviceSlots(settings, serviceItem.DurationMinutes)
	if err != nil {
		return models.Booking{}, err
	}
	if !containsSlot(slots, input.SlotTime) {
		return models.Booking{}, ErrSlotUnavailable
	}
	previousBookingDate := booking.BookingDate
	previousSlotTime := booking.SlotTime
	booking.ServiceID = input.ServiceID
	booking.Service = serviceItem
	booking.CustomerName = input.CustomerName
	booking.Phone = input.Phone
	booking.BookingDate = input.BookingDate
	booking.SlotTime = input.SlotTime
	booking.Notes = input.Notes
	if input.Status != "" {
		booking.Status = input.Status
	}
	updated, err := service.store.UpdateBookingWithAvailability(ctx, &booking, serviceItem.DurationMinutes, settings.SlotCapacity, settings.BufferMinutes)
	if err != nil {
		if errors.Is(err, repositories.ErrSlotCapacityReached) {
			return models.Booking{}, ErrSlotUnavailable
		}
		return models.Booking{}, err
	}
	if service.notifier != nil {
		if previousBookingDate != updated.BookingDate || previousSlotTime != updated.SlotTime {
			_ = service.notifier.BookingRescheduled(ctx, updated)
		} else {
			_ = service.notifier.BookingUpdated(ctx, updated)
		}
	}
	return updated, nil
}

func (service *BookingService) RescheduleBookingByLineUser(ctx context.Context, id string, input RescheduleBookingInput) (models.Booking, error) {
	id = strings.TrimSpace(id)
	input = normalizeRescheduleBookingInput(input)
	if id == "" || input.LineUserID == "" {
		return models.Booking{}, fmt.Errorf("%w: id", ErrInvalidBooking)
	}
	booking, err := service.store.FindBookingByID(ctx, id)
	if err != nil {
		return models.Booking{}, err
	}
	if booking.LineUserID != input.LineUserID {
		return models.Booking{}, fmt.Errorf("%w: lineUserId", ErrInvalidBooking)
	}
	updated, err := service.UpdateBooking(ctx, id, UpdateBookingInput{
		ServiceID:    booking.ServiceID,
		CustomerName: booking.CustomerName,
		Phone:        booking.Phone,
		BookingDate:  input.BookingDate,
		SlotTime:     input.SlotTime,
		Notes:        input.Notes,
		Status:       booking.Status,
	})
	if err != nil {
		return models.Booking{}, err
	}
	service.sendCustomerMessage(ctx, updated, bookingRescheduledMessage(updated))
	return updated, nil
}
