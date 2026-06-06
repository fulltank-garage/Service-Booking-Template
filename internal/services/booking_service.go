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
	"gorm.io/gorm"
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

func (service *BookingService) ListServices(ctx context.Context) ([]models.Service, error) {
	return service.store.ListServices(ctx)
}

func (service *BookingService) ListAdminServices(ctx context.Context) ([]models.Service, error) {
	return service.store.ListAdminServices(ctx)
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
	if service.notifier != nil {
		_ = service.notifier.ServiceChanged(ctx, models.NotificationTypeServiceCreated, item)
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
	item, err := service.store.FindAnyServiceByID(ctx, strings.TrimSpace(id))
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
	if service.notifier != nil {
		_ = service.notifier.ServiceChanged(ctx, models.NotificationTypeServiceUpdated, item)
	}
	return item, nil
}

func (service *BookingService) DeleteService(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return ErrServiceRequired
	}
	id = strings.TrimSpace(id)
	item, err := service.store.FindAnyServiceByID(ctx, id)
	if err != nil {
		return err
	}
	if err := service.store.DeleteService(ctx, id); err != nil {
		return err
	}
	item.IsActive = false
	if service.notifier != nil {
		_ = service.notifier.ServiceChanged(ctx, models.NotificationTypeServiceDeleted, item)
	}
	return nil
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
	if service.notifier != nil {
		_ = service.notifier.BookingSettingsUpdated(ctx, settings)
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
	bookings, err := service.store.ListBookings(ctx, filter)
	if err != nil {
		return nil, err
	}
	return service.attachNoShowCounts(ctx, bookings), nil
}

func (service *BookingService) ListBookingsForExport(ctx context.Context, filter models.BookingFilter) ([]models.Booking, error) {
	if filter.Limit <= 0 || filter.Limit > 2000 {
		filter.Limit = 2000
	}
	bookings, err := service.store.ListBookings(ctx, filter)
	if err != nil {
		return nil, err
	}
	return service.attachNoShowCounts(ctx, bookings), nil
}

func (service *BookingService) DailySummary(ctx context.Context, today string) (BookingDailySummary, error) {
	if strings.TrimSpace(today) == "" {
		today = service.now().In(bangkokLocation()).Format("2006-01-02")
	}
	parsedToday, err := time.Parse("2006-01-02", today)
	if err != nil {
		return BookingDailySummary{}, fmt.Errorf("%w: date", ErrInvalidBooking)
	}
	tomorrow := parsedToday.AddDate(0, 0, 1).Format("2006-01-02")
	todayItems, err := service.store.ListBookings(ctx, models.BookingFilter{Date: today, Limit: 200})
	if err != nil {
		return BookingDailySummary{}, err
	}
	tomorrowItems, err := service.store.ListBookings(ctx, models.BookingFilter{Date: tomorrow, Limit: 200})
	if err != nil {
		return BookingDailySummary{}, err
	}
	return BookingDailySummary{
		Today:    summarizeBookings(today, todayItems),
		Tomorrow: summarizeBookings(tomorrow, tomorrowItems),
	}, nil
}

func (service *BookingService) attachNoShowCounts(ctx context.Context, bookings []models.Booking) []models.Booking {
	counts := map[string]int{}
	for index := range bookings {
		lineUserID := strings.TrimSpace(bookings[index].LineUserID)
		if lineUserID == "" {
			continue
		}
		count, exists := counts[lineUserID]
		if !exists {
			value, err := service.store.CountNoShowBookingsByLineUser(ctx, lineUserID)
			if err != nil {
				log.Printf("count no-show booking %s: %v", lineUserID, err)
				continue
			}
			count = int(value)
			counts[lineUserID] = count
		}
		bookings[index].NoShowCount = count
	}
	return bookings
}

func summarizeBookings(date string, bookings []models.Booking) DailyBookingSummary {
	summary := DailyBookingSummary{Date: date, Total: len(bookings)}
	for _, booking := range bookings {
		switch booking.Status {
		case models.BookingStatusPending:
			summary.Pending++
		case models.BookingStatusConfirmed:
			summary.Confirmed++
		case models.BookingStatusCompleted:
			summary.Completed++
		case models.BookingStatusCancelled:
			summary.Cancelled++
		case models.BookingStatusNoShow:
			summary.NoShow++
		}
	}
	return summary
}

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

func (service *BookingService) ListReminderCandidates(ctx context.Context, now time.Time, leadMinutes int) ([]models.Booking, error) {
	if leadMinutes <= 0 {
		settings, err := service.loadBookingSettings(ctx)
		if err != nil {
			return nil, err
		}
		leadMinutes = settings.ReminderLeadMinutes
	}
	bookings, err := service.store.ListBookings(ctx, models.BookingFilter{Limit: 200})
	if err != nil {
		return nil, err
	}
	now = now.In(bangkokLocation())
	until := now.Add(time.Duration(leadMinutes) * time.Minute)
	candidates := make([]models.Booking, 0)
	for _, booking := range bookings {
		if isClosedBookingStatus(booking.Status) {
			continue
		}
		start, err := bookingStartTime(booking.BookingDate, booking.SlotTime)
		if err != nil {
			continue
		}
		if start.After(now) && !start.After(until) {
			candidates = append(candidates, booking)
		}
	}
	return candidates, nil
}

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

func (service *BookingService) switchToBookingMenu(ctx context.Context, lineUserID string) {
	if service.richMenuSwitcher == nil || strings.TrimSpace(lineUserID) == "" {
		return
	}
	if err := service.richMenuSwitcher.SwitchToBookingMenu(ctx, lineUserID); err != nil {
		log.Printf("switch line rich menu to booking menu: %v", err)
	}
}

func (service *BookingService) sendCustomerMessage(ctx context.Context, booking models.Booking, message string) {
	if service.customerMessenger == nil || strings.TrimSpace(booking.LineUserID) == "" || strings.TrimSpace(message) == "" {
		return
	}
	if err := service.customerMessenger.SendBookingMessage(ctx, booking.LineUserID, message); err != nil {
		log.Printf("send line booking message: %v", err)
	}
}

func bookingCreatedMessage(booking models.Booking) string {
	return fmt.Sprintf(
		"จองคิวสำเร็จ\nเลขที่จอง: %s\nบริการ: %s\nวันที่: %s\nเวลา: %s",
		booking.BookingCode,
		bookingServiceName(booking),
		formatThaiDateLabel(booking.BookingDate),
		booking.SlotTime,
	)
}

func bookingRescheduledMessage(booking models.Booking) string {
	return fmt.Sprintf(
		"เลื่อนนัดสำเร็จ\nเลขที่จอง: %s\nวันที่: %s\nเวลา: %s",
		booking.BookingCode,
		formatThaiDateLabel(booking.BookingDate),
		booking.SlotTime,
	)
}

func bookingStatusMessage(booking models.Booking) string {
	return fmt.Sprintf(
		"อัปเดตสถานะการจอง\nเลขที่จอง: %s\nสถานะ: %s",
		booking.BookingCode,
		bookingStatusLabel(booking.Status),
	)
}

func bookingCancelledMessage(booking models.Booking) string {
	return fmt.Sprintf("ยกเลิกการจองแล้ว\nเลขที่จอง: %s", booking.BookingCode)
}

func bookingServiceName(booking models.Booking) string {
	if strings.TrimSpace(booking.Service.NameTH) != "" {
		return booking.Service.NameTH
	}
	if strings.TrimSpace(booking.Service.NameEN) != "" {
		return booking.Service.NameEN
	}
	return "-"
}

func bookingStatusLabel(status string) string {
	switch status {
	case models.BookingStatusConfirmed:
		return "ยืนยันแล้ว"
	case models.BookingStatusCompleted:
		return "เสร็จสิ้น"
	case models.BookingStatusCancelled:
		return "ยกเลิก"
	case models.BookingStatusNoShow:
		return "ไม่มาตามนัด"
	default:
		return "รอจัดการ"
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

func clockMinutes(value string) (int, bool) {
	parsed, err := time.Parse("15:04", value)
	if err != nil {
		return 0, false
	}
	return parsed.Hour()*60 + parsed.Minute(), true
}

func bookingStartTime(date string, slot string) (time.Time, error) {
	return time.ParseInLocation("2006-01-02 15:04", date+" "+slot, bangkokLocation())
}

func bangkokLocation() *time.Location {
	location, err := time.LoadLocation("Asia/Bangkok")
	if err != nil {
		return time.FixedZone("ICT", 7*60*60)
	}
	return location
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
	case models.BookingStatusPending, models.BookingStatusConfirmed, models.BookingStatusCompleted, models.BookingStatusCancelled, models.BookingStatusNoShow:
		return true
	default:
		return false
	}
}

func isClosedBookingStatus(status string) bool {
	return status == models.BookingStatusCancelled || status == models.BookingStatusCompleted || status == models.BookingStatusNoShow
}
