package services

import (
	"context"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
)

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
