package services

import (
	"context"
	"fmt"
	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"strings"
)

func (service *BookingService) UpdateBookingStatus(ctx context.Context, id string, status string) (models.Booking, error) {
	if !isAllowedStatus(status) {
		return models.Booking{}, fmt.Errorf("%w: status", ErrInvalidBooking)
	}
	if status == models.BookingStatusCancelled {
		return models.Booking{}, service.deleteBooking(ctx, id, "cancelled")
	}
	booking, err := service.store.UpdateBookingStatus(ctx, id, status)
	if err != nil {
		return models.Booking{}, err
	}
	if service.notifier != nil {
		_ = service.notifier.BookingUpdated(ctx, booking)
	}
	service.sendCustomerMessage(ctx, booking, bookingStatusMessage(booking))
	if status == models.BookingStatusCompleted || status == models.BookingStatusNoShow {
		service.switchToBookingMenu(ctx, booking.LineUserID)
	}
	return booking, nil
}

func (service *BookingService) DeleteBooking(ctx context.Context, id string) error {
	return service.deleteBooking(ctx, id, "deleted")
}

func (service *BookingService) deleteBooking(ctx context.Context, id string, reason string) error {
	id = strings.TrimSpace(id)
	if id == "" {
		return fmt.Errorf("%w: id", ErrInvalidBooking)
	}
	booking, err := service.store.FindBookingByID(ctx, id)
	if err != nil {
		return err
	}
	if err := service.store.DeleteBooking(ctx, id); err != nil {
		return err
	}
	if service.notifier != nil {
		_ = service.notifier.BookingDeleted(ctx, booking, reason)
	}
	service.sendCustomerMessage(ctx, booking, bookingCancelledMessage(booking))
	service.switchToBookingMenu(ctx, booking.LineUserID)
	return nil
}

func (service *BookingService) CancelBookingByLineUser(ctx context.Context, id string, lineUserID string) error {
	id = strings.TrimSpace(id)
	lineUserID = strings.TrimSpace(lineUserID)
	if id == "" || lineUserID == "" {
		return fmt.Errorf("%w: id", ErrInvalidBooking)
	}
	booking, err := service.store.FindBookingByID(ctx, id)
	if err != nil {
		return err
	}
	if booking.LineUserID != lineUserID {
		return fmt.Errorf("%w: lineUserId", ErrInvalidBooking)
	}
	if err := service.store.DeleteBooking(ctx, id); err != nil {
		return err
	}
	if service.notifier != nil {
		_ = service.notifier.BookingDeleted(ctx, booking, "cancelled")
	}
	service.sendCustomerMessage(ctx, booking, bookingCancelledMessage(booking))
	service.switchToBookingMenu(ctx, booking.LineUserID)
	return nil
}

func isAllowedStatus(status string) bool {
	switch status {
	case models.BookingStatusPending, models.BookingStatusConfirmed, models.BookingStatusCompleted, models.BookingStatusCancelled, models.BookingStatusNoShow:
		return true
	default:
		return false
	}
}

func isClosedBookingStatus(status string) bool {
	return status == models.BookingStatusCancelled || status == models.BookingStatusCompleted || status == models.BookingStatusNoShow
}
