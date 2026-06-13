package repositories

import (
	"context"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"gorm.io/gorm"
)

type Store interface {
	ListServices(ctx context.Context) ([]models.Service, error)
	ListAdminServices(ctx context.Context) ([]models.Service, error)
	FindServiceByID(ctx context.Context, id string) (models.Service, error)
	FindAnyServiceByID(ctx context.Context, id string) (models.Service, error)
	CreateService(ctx context.Context, service *models.Service) error
	UpdateService(ctx context.Context, service *models.Service) error
	DeleteService(ctx context.Context, id string) error
	FindAdminUserByEmail(ctx context.Context, email string) (models.AdminUser, error)
	CreateAdminUser(ctx context.Context, user *models.AdminUser) error
	CreateAdminSession(ctx context.Context, session *models.AdminSessionRecord) error
	FindAdminSessionByTokenHash(ctx context.Context, tokenHash string) (models.AdminSessionRecord, error)
	RevokeAdminSession(ctx context.Context, tokenHash string) error
	CountBookingsForSlot(ctx context.Context, serviceID string, date string, slotTime string) (int64, error)
	CreateBooking(ctx context.Context, booking *models.Booking) error
	CreateBookingWithAvailability(ctx context.Context, booking *models.Booking, durationMinutes int, capacity int, bufferMinutes int) error
	FindBookingByID(ctx context.Context, id string) (models.Booking, error)
	LatestBookingByLineUser(ctx context.Context, lineUserID string) (models.Booking, error)
	ListBookings(ctx context.Context, filter models.BookingFilter) ([]models.Booking, error)
	CountNoShowBookingsByLineUser(ctx context.Context, lineUserID string) (int64, error)
	UpdateBookingWithAvailability(ctx context.Context, booking *models.Booking, durationMinutes int, capacity int, bufferMinutes int) (models.Booking, error)
	UpdateBookingStatus(ctx context.Context, id string, status string) (models.Booking, error)
	DeleteBooking(ctx context.Context, id string) error
	GetBookingSettings(ctx context.Context) (models.BookingSettings, error)
	ListBlackoutDates(ctx context.Context) ([]models.BookingBlackoutDate, error)
	SaveBookingSettings(ctx context.Context, settings *models.BookingSettings) error
	CreateNotification(ctx context.Context, notification *models.Notification) error
	ListNotifications(ctx context.Context, unreadOnly bool, limit int) ([]models.Notification, error)
	MarkNotificationRead(ctx context.Context, id string) (models.Notification, error)
	CleanupNotifications(ctx context.Context, readBefore time.Time, allBefore time.Time) error
	SavePushSubscription(ctx context.Context, subscription *models.PushSubscription) error
	ListPushSubscriptions(ctx context.Context) ([]models.PushSubscription, error)
	DeletePushSubscription(ctx context.Context, endpoint string) error
}

type GormStore struct {
	db *gorm.DB
}

func NewGormStore(db *gorm.DB) *GormStore {
	return &GormStore{db: db}
}
