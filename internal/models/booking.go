package models

const (
	BookingStatusPending   = "pending"
	BookingStatusConfirmed = "confirmed"
	BookingStatusCompleted = "completed"
	BookingStatusCancelled = "cancelled"
)

type Booking struct {
	BaseModel
	BookingCode  string  `json:"bookingCode" gorm:"uniqueIndex;size:32;not null"`
	ServiceID    string  `json:"serviceId" gorm:"index;size:36;not null"`
	Service      Service `json:"service" gorm:"constraint:OnUpdate:CASCADE,OnDelete:RESTRICT;"`
	CustomerName string  `json:"customerName" gorm:"size:180;not null"`
	Phone        string  `json:"phone" gorm:"size:40;not null"`
	LineUserID   string  `json:"lineUserId" gorm:"size:128;index"`
	Notes        string  `json:"notes" gorm:"size:1000"`
	BookingDate  string  `json:"bookingDate" gorm:"index;size:10;not null"`
	SlotTime     string  `json:"slotTime" gorm:"index;size:5;not null"`
	Status       string  `json:"status" gorm:"index;size:32;not null"`
}

type BookingFilter struct {
	Status string
	Date   string
	Limit  int
}

type BookingSettings struct {
	BaseModel
	OpenTime            string `json:"openTime" gorm:"size:5;not null;default:'09:00'"`
	CloseTime           string `json:"closeTime" gorm:"size:5;not null;default:'17:00'"`
	SlotIntervalMinutes int    `json:"slotIntervalMinutes" gorm:"not null;default:30"`
	SlotCapacity        int    `json:"slotCapacity" gorm:"not null;default:1"`
	ClosedWeekdays      string `json:"closedWeekdays" gorm:"size:32;not null;default:''"`
}
