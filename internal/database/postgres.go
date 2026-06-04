package database

import (
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"gorm.io/driver/postgres"
	"gorm.io/gorm"
	"gorm.io/gorm/logger"
)

func OpenPostgres(databaseURL string) (*gorm.DB, error) {
	return gorm.Open(postgres.Open(databaseURL), &gorm.Config{
		Logger: logger.Default.LogMode(logger.Warn),
		NowFunc: func() time.Time {
			return time.Now().UTC()
		},
	})
}

func AutoMigrate(db *gorm.DB) error {
	return db.AutoMigrate(&models.Service{}, &models.Staff{}, &models.Booking{}, &models.Notification{}, &models.PushSubscription{})
}
