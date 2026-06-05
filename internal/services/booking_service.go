package services

import (
	"context"
	"errors"
	"fmt"
	"log"
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
	OpenTime            string `json:"openTime"`
	CloseTime           string `json:"closeTime"`
	SlotIntervalMinutes int    `json:"slotIntervalMinutes"`
	SlotCapacity        int    `json:"slotCapacity"`
	ClosedWeekdays      string `json:"closedWeekdays"`
}

type BookingNotifier interface {
	BookingCreated(ctx context.Context, booking models.Booking) error
	BookingUpdated(ctx context.Context, booking models.Booking) error
}

type BookingSuccessRichMenuSwitcher interface {
	SwitchToBookingSuccess(ctx context.Context, lineUserID string) error
	SwitchToBookingMenu(ctx context.Context, lineUserID string) error
}

type BookingService struct {
	store            repositories.Store
	notifier         BookingNotifier
	richMenuSwitcher BookingSuccessRichMenuSwitcher
	capacity         int
}

func NewBookingService(store repositories.Store, notifier BookingNotifier, richMenuSwitcher BookingSuccessRichMenuSwitcher, capacity int) *BookingService {
	if capacity <= 0 {
		capacity = 1
	}
	return &BookingService{store: store, notifier: notifier, richMenuSwitcher: richMenuSwitcher, capacity: capacity}
}

func (service *BookingService) ListServices(ctx context.Context) ([]models.Service, error) {
	return service.store.ListServices(ctx)
}

func (service *BookingService) LatestBookingByLineUser(ctx context.Context, lineUserID string) (models.Booking, error) {
	lineUserID = strings.TrimSpace(lineUserID)
	if lineUserID == "" {
		return models.Booking{}, errors.New("line user id is required")
	}
	return service.store.LatestBookingByLineUser(ctx, lineUserID)
}

func (service *BookingService) CreateService(ctx context.Context, input ServiceInput) (models.Service, error) {
	input = normalizeServiceInput(input)
	if err := validateServiceInput(input); err != nil {
		return models.Service{}, err
	}
	item := models.Service{
		NameTH:          input.NameTH,
		NameEN:          input.NameEN,
		DescriptionTH:   input.DescriptionTH,
		DurationMinutes: input.DurationMinutes,
		PriceCents:      input.PriceCents,
		AccentColor:     input.AccentColor,
		IsActive:        input.IsActive,
	}
	if err := service.store.CreateService(ctx, &item); err != nil {
		return models.Service{}, err
	}
	return item, nil
}

func (service *BookingService) UpdateService(ctx context.Context, id string, input ServiceInput) (models.Service, error) {
	input = normalizeServiceInput(input)
	if strings.TrimSpace(id) == "" {
		return models.Service{}, ErrServiceRequired
	}
	if err := validateServiceInput(input); err != nil {
		return models.Service{}, err
	}
	item, err := service.store.FindServiceByID(ctx, strings.TrimSpace(id))
	if err != nil {
		return models.Service{}, err
	}
	item.NameTH = input.NameTH
	item.NameEN = input.NameEN
	item.DescriptionTH = input.DescriptionTH
	item.DurationMinutes = input.DurationMinutes
	item.PriceCents = input.PriceCents
	item.AccentColor = input.AccentColor
	item.IsActive = input.IsActive
	if err := service.store.UpdateService(ctx, &item); err != nil {
		return models.Service{}, err
	}
	return item, nil
}

func (service *BookingService) DeleteService(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return ErrServiceRequired
	}
	return service.store.DeleteService(ctx, strings.TrimSpace(id))
}

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
	return settings, nil
}

func (service *BookingService) ListAvailability(ctx context.Context, serviceID string, date string) ([]AvailabilitySlot, error) {
	if strings.TrimSpace(serviceID) == "" {
		return nil, ErrServiceRequired
	}
	bookingDate, err := time.Parse("2006-01-02", date)
	if err != nil {
		return nil, fmt.Errorf("%w: bookingDate", ErrInvalidBooking)
	}
	if _, err := service.store.FindServiceByID(ctx, serviceID); err != nil {
		return nil, err
	}
	settings, err := service.loadBookingSettings(ctx)
	if err != nil {
		return nil, err
	}
	if isClosedWeekday(settings.ClosedWeekdays, bookingDate.Weekday()) {
		return []AvailabilitySlot{}, nil
	}

	slots, err := businessSlots(settings)
	if err != nil {
		return nil, err
	}
	availability := make([]AvailabilitySlot, 0, len(slots))
	for _, slot := range slots {
		count, err := service.store.CountBookingsForSlot(ctx, serviceID, date, slot)
		if err != nil {
			return nil, err
		}
		availability = append(availability, AvailabilitySlot{
			Time:      slot,
			Booked:    count,
			Capacity:  settings.SlotCapacity,
			Available: count < int64(settings.SlotCapacity),
		})
	}
	return availability, nil
}

func (service *BookingService) CreateBooking(ctx context.Context, input CreateBookingInput) (models.Booking, error) {
	input = normalizeBookingInput(input)
	if err := validateBookingInput(input); err != nil {
		return models.Booking{}, err
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
	slots, err := businessSlots(settings)
	if err != nil {
		return models.Booking{}, err
	}
	if !containsSlot(slots, input.SlotTime) {
		return models.Booking{}, ErrSlotUnavailable
	}
	booked, err := service.store.CountBookingsForSlot(ctx, input.ServiceID, input.BookingDate, input.SlotTime)
	if err != nil {
		return models.Booking{}, err
	}
	if booked >= int64(settings.SlotCapacity) {
		return models.Booking{}, ErrSlotUnavailable
	}
	serviceItem, err := service.store.FindServiceByID(ctx, input.ServiceID)
	if err != nil {
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
	booking.Service = serviceItem
	if service.notifier != nil {
		_ = service.notifier.BookingCreated(ctx, booking)
	}
	if service.richMenuSwitcher != nil && booking.LineUserID != "" {
		if err := service.richMenuSwitcher.SwitchToBookingSuccess(ctx, booking.LineUserID); err != nil {
			log.Printf("switch line rich menu to booking success: %v", err)
		}
	}
	return booking, nil
}

func (service *BookingService) loadBookingSettings(ctx context.Context) (models.BookingSettings, error) {
	settings, err := service.store.GetBookingSettings(ctx)
	if err != nil {
		return models.BookingSettings{}, err
	}
	return normalizeBookingSettings(settings, service.capacity), nil
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
	if status == models.BookingStatusCancelled {
		return models.Booking{}, service.DeleteBooking(ctx, id)
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

func (service *BookingService) DeleteBooking(ctx context.Context, id string) error {
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
	service.switchToBookingMenu(ctx, booking.LineUserID)
	return nil
}

func (service *BookingService) switchToBookingMenu(ctx context.Context, lineUserID string) {
	if service.richMenuSwitcher == nil || strings.TrimSpace(lineUserID) == "" {
		return
	}
	if err := service.richMenuSwitcher.SwitchToBookingMenu(ctx, lineUserID); err != nil {
		log.Printf("switch line rich menu to booking menu: %v", err)
	}
}

func normalizeServiceInput(input ServiceInput) ServiceInput {
	input.NameTH = strings.TrimSpace(input.NameTH)
	input.NameEN = strings.TrimSpace(input.NameEN)
	input.DescriptionTH = strings.TrimSpace(input.DescriptionTH)
	input.AccentColor = strings.TrimSpace(input.AccentColor)
	if input.NameEN == "" {
		input.NameEN = input.NameTH
	}
	if input.AccentColor == "" {
		input.AccentColor = "#FF008C"
	}
	return input
}

func validateServiceInput(input ServiceInput) error {
	if input.NameTH == "" {
		return errors.New("service name is required")
	}
	if input.DurationMinutes <= 0 {
		return errors.New("service duration must be greater than zero")
	}
	if input.PriceCents < 0 {
		return errors.New("service price must be zero or greater")
	}
	return nil
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

func normalizeBookingSettingsInput(input BookingSettingsInput, fallbackCapacity int) models.BookingSettings {
	return normalizeBookingSettings(models.BookingSettings{
		OpenTime:            input.OpenTime,
		CloseTime:           input.CloseTime,
		SlotIntervalMinutes: input.SlotIntervalMinutes,
		SlotCapacity:        input.SlotCapacity,
		ClosedWeekdays:      input.ClosedWeekdays,
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
	for _, raw := range strings.Split(settings.ClosedWeekdays, ",") {
		raw = strings.TrimSpace(raw)
		if raw == "" {
			continue
		}
		if raw < "0" || raw > "6" {
			return fmt.Errorf("%w: closedWeekdays", ErrInvalidBooking)
		}
	}
	return nil
}

func businessSlots(settings models.BookingSettings) ([]string, error) {
	if err := validateBookingSettings(settings); err != nil {
		return nil, err
	}
	start, _ := parseClock(settings.OpenTime)
	closeAt, _ := parseClock(settings.CloseTime)
	slots := make([]string, 0, 16)
	for current := start; current.Before(closeAt); current = current.Add(time.Duration(settings.SlotIntervalMinutes) * time.Minute) {
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

func containsSlot(slots []string, slot string) bool {
	for _, item := range slots {
		if item == slot {
			return true
		}
	}
	return false
}

func bookingCode(date string) string {
	parts := strings.Split(date, "-")
	if len(parts) == 3 {
		return fmt.Sprintf("Q-%s%s-%04d", parts[2], parts[1], rand.Intn(10000))
	}
	return fmt.Sprintf("Q-%04d", rand.Intn(10000))
}

func isAllowedStatus(status string) bool {
	switch status {
	case models.BookingStatusPending, models.BookingStatusConfirmed, models.BookingStatusCompleted, models.BookingStatusCancelled:
		return true
	default:
		return false
	}
}
