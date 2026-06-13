package services

import (
	"context"
	"fmt"
	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"log"
	"strings"
	"time"
)

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
