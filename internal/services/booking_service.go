package services

import (
	"context"
	"errors"
	"fmt"
	"math/rand"
	"regexp"
	"strings"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"github.com/fulltank-garage/service-booking-template-api/internal/repositories"
)

var (
	ErrServiceRequired = errors.New("service id is required")
	ErrSlotUnavailable = errors.New("booking slot is unavailable")
	ErrInvalidBooking  = errors.New("booking payload is invalid")
)

type CreateBookingInput struct {
	ServiceID    string `json:"serviceId"`
	CustomerName string `json:"customerName"`
	Phone        string `json:"phone"`
	LineUserID   string `json:"lineUserId"`
	BookingDate  string `json:"bookingDate"`
	SlotTime     string `json:"slotTime"`
	Notes        string `json:"notes"`
}

type AvailabilitySlot struct {
	Time      string `json:"time"`
	Booked    int64  `json:"booked"`
	Capacity  int    `json:"capacity"`
	Available bool   `json:"available"`
}

type BookingNotifier interface {
	BookingCreated(ctx context.Context, booking models.Booking) error
	BookingUpdated(ctx context.Context, booking models.Booking) error
}

type BookingService struct {
	store    repositories.Store
	notifier BookingNotifier
	capacity int
}

func NewBookingService(store repositories.Store, notifier BookingNotifier, capacity int) *BookingService {
	if capacity <= 0 {
		capacity = 1
	}
	return &BookingService{store: store, notifier: notifier, capacity: capacity}
}

func (service *BookingService) ListServices(ctx context.Context) ([]models.Service, error) {
	return service.store.ListServices(ctx)
}

func (service *BookingService) ListAvailability(ctx context.Context, serviceID string, date string) ([]AvailabilitySlot, error) {
	if strings.TrimSpace(serviceID) == "" {
		return nil, ErrServiceRequired
	}
	if _, err := time.Parse("2006-01-02", date); err != nil {
		return nil, fmt.Errorf("%w: bookingDate", ErrInvalidBooking)
	}
	if _, err := service.store.FindServiceByID(ctx, serviceID); err != nil {
		return nil, err
	}

	slots := businessSlots()
	availability := make([]AvailabilitySlot, 0, len(slots))
	for _, slot := range slots {
		count, err := service.store.CountBookingsForSlot(ctx, serviceID, date, slot)
		if err != nil {
			return nil, err
		}
		availability = append(availability, AvailabilitySlot{Time: slot, Booked: count, Capacity: service.capacity, Available: count < int64(service.capacity)})
	}
	return availability, nil
}

func (service *BookingService) CreateBooking(ctx context.Context, input CreateBookingInput) (models.Booking, error) {
	input = normalizeBookingInput(input)
	if err := validateBookingInput(input); err != nil {
		return models.Booking{}, err
	}

	booked, err := service.store.CountBookingsForSlot(ctx, input.ServiceID, input.BookingDate, input.SlotTime)
	if err != nil {
		return models.Booking{}, err
	}
	if booked >= int64(service.capacity) {
		return models.Booking{}, ErrSlotUnavailable
	}
	if _, err := service.store.FindServiceByID(ctx, input.ServiceID); err != nil {
		return models.Booking{}, err
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
	if err := service.store.CreateBooking(ctx, &booking); err != nil {
		return models.Booking{}, err
	}
	if service.notifier != nil {
		_ = service.notifier.BookingCreated(ctx, booking)
	}
	return booking, nil
}

func (service *BookingService) ListBookings(ctx context.Context, filter models.BookingFilter) ([]models.Booking, error) {
	if filter.Limit <= 0 || filter.Limit > 200 {
		filter.Limit = 80
	}
	return service.store.ListBookings(ctx, filter)
}

func (service *BookingService) UpdateBookingStatus(ctx context.Context, id string, status string) (models.Booking, error) {
	if !isAllowedStatus(status) {
		return models.Booking{}, fmt.Errorf("%w: status", ErrInvalidBooking)
	}
	booking, err := service.store.UpdateBookingStatus(ctx, id, status)
	if err != nil {
		return models.Booking{}, err
	}
	if service.notifier != nil {
		_ = service.notifier.BookingUpdated(ctx, booking)
	}
	return booking, nil
}

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

func businessSlots() []string {
	slots := make([]string, 0, 16)
	start := time.Date(2000, 1, 1, 9, 0, 0, 0, time.UTC)
	for i := 0; i < 16; i++ {
		slots = append(slots, start.Add(time.Duration(i)*30*time.Minute).Format("15:04"))
	}
	return slots
}

func bookingCode(date string) string {
	return fmt.Sprintf("SB-%s-%04d", strings.ReplaceAll(date, "-", ""), rand.Intn(10000))
}

func isAllowedStatus(status string) bool {
	switch status {
	case models.BookingStatusPending, models.BookingStatusConfirmed, models.BookingStatusCompleted, models.BookingStatusCancelled:
		return true
	default:
		return false
	}
}
