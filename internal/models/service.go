package models

type Service struct {
	BaseModel
	NameTH          string `json:"nameTh" gorm:"size:180;not null"`
	NameEN          string `json:"nameEn" gorm:"size:180;not null"`
	DescriptionTH   string `json:"descriptionTh" gorm:"size:600"`
	DurationMinutes int    `json:"durationMinutes" gorm:"not null"`
	PriceCents      int64  `json:"priceCents" gorm:"not null;default:0"`
	AccentColor     string `json:"accentColor" gorm:"size:24;not null;default:'#0F766E'"`
	IsActive        bool   `json:"isActive" gorm:"not null;default:true"`
}

type Staff struct {
	BaseModel
	DisplayName string `json:"displayName" gorm:"size:180;not null"`
	Role        string `json:"role" gorm:"size:120;not null"`
	IsActive    bool   `json:"isActive" gorm:"not null;default:true"`
}
