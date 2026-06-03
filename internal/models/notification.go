package models

const (
	NotificationTypeBookingCreated = "booking.created"
	NotificationTypeBookingUpdated = "booking.updated"
)

type Notification struct {
	BaseModel
	Type      string `json:"type" gorm:"index;size:80;not null"`
	Title     string `json:"title" gorm:"size:180;not null"`
	Body      string `json:"body" gorm:"size:600;not null"`
	URL       string `json:"url" gorm:"size:240;not null;default:'/'"`
	IsRead    bool   `json:"isRead" gorm:"index;not null;default:false"`
	BookingID string `json:"bookingId" gorm:"size:36;index"`
}

type PushSubscription struct {
	BaseModel
	Endpoint       string `json:"endpoint" gorm:"uniqueIndex;size:900;not null"`
	P256DH         string `json:"p256dh" gorm:"size:255;not null"`
	Auth           string `json:"auth" gorm:"size:255;not null"`
	UserAgent      string `json:"userAgent" gorm:"size:255"`
	AdminProfileID string `json:"adminProfileId" gorm:"size:120;index"`
}
