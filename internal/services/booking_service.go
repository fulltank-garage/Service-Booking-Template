package services

import (
	"context"
	"errors"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"github.com/fulltank-garage/service-booking-template-api/internal/repositories"
)

var (
	ErrServiceRequired     = errors.New("service id is required")
	ErrSlotUnavailable     = errors.New("booking slot is unavailable")
	ErrInvalidBooking      = errors.New("booking payload is invalid")
	ErrActiveBookingExists = errors.New("active booking already exists")
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

type RescheduleBookingInput struct {
	LineUserID  string `json:"lineUserId"`
	BookingDate string `json:"bookingDate"`
	SlotTime    string `json:"slotTime"`
	Notes       string `json:"notes"`
}

type UpdateBookingInput struct {
	ServiceID    string `json:"serviceId"`
	CustomerName string `json:"customerName"`
	Phone        string `json:"phone"`
	BookingDate  string `json:"bookingDate"`
	SlotTime     string `json:"slotTime"`
	Notes        string `json:"notes"`
	Status       string `json:"status"`
}

type ServiceInput struct {
	NameTH          string `json:"nameTh"`
	NameEN          string `json:"nameEn"`
	DescriptionTH   string `json:"descriptionTh"`
	DurationMinutes int    `json:"durationMinutes"`
	PriceCents      int64  `json:"priceCents"`
	AccentColor     string `json:"accentColor"`
	IsActive        bool   `json:"isActive"`
}

type AvailabilitySlot struct {
	Time      string `json:"time"`
	Booked    int64  `json:"booked"`
	Capacity  int    `json:"capacity"`
	Available bool   `json:"available"`
}

type BookingSettingsInput struct {
	OpenTime            string                       `json:"openTime"`
	CloseTime           string                       `json:"closeTime"`
	SlotIntervalMinutes int                          `json:"slotIntervalMinutes"`
	SlotCapacity        int                          `json:"slotCapacity"`
	ClosedWeekdays      string                       `json:"closedWeekdays"`
	MinAdvanceHours     int                          `json:"minAdvanceHours"`
	MaxAdvanceDays      int                          `json:"maxAdvanceDays"`
	ReminderLeadMinutes int                          `json:"reminderLeadMinutes"`
	BufferMinutes       int                          `json:"bufferMinutes"`
	BlackoutDates       []models.BookingBlackoutDate `json:"blackoutDates"`
}

type DailyBookingSummary struct {
	Date      string `json:"date"`
	Pending   int    `json:"pending"`
	Confirmed int    `json:"confirmed"`
	Completed int    `json:"completed"`
	Cancelled int    `json:"cancelled"`
	NoShow    int    `json:"noShow"`
	Total     int    `json:"total"`
}

type BookingDailySummary struct {
	Today    DailyBookingSummary `json:"today"`
	Tomorrow DailyBookingSummary `json:"tomorrow"`
}

type BookingNotifier interface {
	BookingCreated(ctx context.Context, booking models.Booking) error
	BookingUpdated(ctx context.Context, booking models.Booking) error
	BookingRescheduled(ctx context.Context, booking models.Booking) error
	BookingDeleted(ctx context.Context, booking models.Booking, reason string) error
	ServiceChanged(ctx context.Context, eventType string, service models.Service) error
	BookingSettingsUpdated(ctx context.Context, settings models.BookingSettings) error
}

type BookingSuccessRichMenuSwitcher interface {
	SwitchToBookingSuccess(ctx context.Context, lineUserID string) error
	SwitchToBookingMenu(ctx context.Context, lineUserID string) error
}

type BookingCustomerMessenger interface {
	SendBookingMessage(ctx context.Context, lineUserID string, message string) error
}

type BookingService struct {
	store             repositories.Store
	notifier          BookingNotifier
	richMenuSwitcher  BookingSuccessRichMenuSwitcher
	customerMessenger BookingCustomerMessenger
	capacity          int
	now               func() time.Time
}

func NewBookingService(store repositories.Store, notifier BookingNotifier, richMenuSwitcher BookingSuccessRichMenuSwitcher, capacity int) *BookingService {
	if capacity <= 0 {
		capacity = 1
	}
	return &BookingService{
		store:            store,
		notifier:         notifier,
		richMenuSwitcher: richMenuSwitcher,
		capacity:         capacity,
		now:              time.Now,
	}
}

func NewBookingServiceWithCustomerMessenger(store repositories.Store, notifier BookingNotifier, richMenuSwitcher BookingSuccessRichMenuSwitcher, customerMessenger BookingCustomerMessenger, capacity int) *BookingService {
	service := NewBookingService(store, notifier, richMenuSwitcher, capacity)
	service.customerMessenger = customerMessenger
	return service
}
