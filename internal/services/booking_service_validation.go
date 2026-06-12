package services

import (
	"fmt"
	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"regexp"
	"strings"
	"time"
)

func normalizeBookingInput(input CreateBookingInput) CreateBookingInput {
	input.ServiceID = strings.TrimSpace(input.ServiceID)
	input.CustomerName = strings.TrimSpace(input.CustomerName)
	input.Phone = strings.TrimSpace(input.Phone)
	input.LineUserID = strings.TrimSpace(input.LineUserID)
	input.BookingDate = strings.TrimSpace(input.BookingDate)
	input.SlotTime = strings.TrimSpace(input.SlotTime)
	input.Notes = strings.TrimSpace(input.Notes)
	return input
}

func normalizeRescheduleBookingInput(input RescheduleBookingInput) RescheduleBookingInput {
	input.LineUserID = strings.TrimSpace(input.LineUserID)
	input.BookingDate = strings.TrimSpace(input.BookingDate)
	input.SlotTime = strings.TrimSpace(input.SlotTime)
	input.Notes = strings.TrimSpace(input.Notes)
	return input
}

func normalizeUpdateBookingInput(input UpdateBookingInput, current models.Booking) UpdateBookingInput {
	input.ServiceID = strings.TrimSpace(input.ServiceID)
	input.CustomerName = strings.TrimSpace(input.CustomerName)
	input.Phone = strings.TrimSpace(input.Phone)
	input.BookingDate = strings.TrimSpace(input.BookingDate)
	input.SlotTime = strings.TrimSpace(input.SlotTime)
	input.Notes = strings.TrimSpace(input.Notes)
	input.Status = strings.TrimSpace(input.Status)
	if input.ServiceID == "" {
		input.ServiceID = current.ServiceID
	}
	if input.CustomerName == "" {
		input.CustomerName = current.CustomerName
	}
	if input.Phone == "" {
		input.Phone = current.Phone
	}
	if input.BookingDate == "" {
		input.BookingDate = current.BookingDate
	}
	if input.SlotTime == "" {
		input.SlotTime = current.SlotTime
	}
	if input.Status == "" {
		input.Status = current.Status
	}
	return input
}

func validateBookingInput(input CreateBookingInput) error {
	if input.ServiceID == "" || input.CustomerName == "" || input.Phone == "" {
		return ErrInvalidBooking
	}
	if _, err := time.Parse("2006-01-02", input.BookingDate); err != nil {
		return fmt.Errorf("%w: bookingDate", ErrInvalidBooking)
	}
	if !regexp.MustCompile(`^\d{2}:\d{2}$`).MatchString(input.SlotTime) {
		return fmt.Errorf("%w: slotTime", ErrInvalidBooking)
	}
	return nil
}
