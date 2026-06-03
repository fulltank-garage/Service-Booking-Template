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

func Seed(db *gorm.DB) error {
	var count int64
	if err := db.Model(&models.Service{}).Count(&count).Error; err != nil {
		return err
	}
	if count > 0 {
		return nil
	}

	return db.Create(&[]models.Service{
		{NameTH: "ปรึกษาบริการ", NameEN: "Service Consultation", DescriptionTH: "นัดหมายเพื่อประเมินความต้องการและแนะนำบริการที่เหมาะสม", DurationMinutes: 30, PriceCents: 0, AccentColor: "#0F766E", IsActive: true},
		{NameTH: "เข้าใช้บริการมาตรฐาน", NameEN: "Standard Service", DescriptionTH: "จองคิวสำหรับบริการหลักของสาขา", DurationMinutes: 60, PriceCents: 50000, AccentColor: "#F97363", IsActive: true},
		{NameTH: "บริการเร่งด่วน", NameEN: "Express Service", DescriptionTH: "คิวเร่งด่วนสำหรับงานที่ต้องการความรวดเร็ว", DurationMinutes: 45, PriceCents: 80000, AccentColor: "#2563EB", IsActive: true},
	}).Error
}
