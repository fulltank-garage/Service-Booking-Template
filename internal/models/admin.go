package models

import "time"

const AdminRoleOwner = "owner"

type AdminUser struct {
	BaseModel
	Name         string `json:"name" gorm:"size:180;not null"`
	Email        string `json:"email" gorm:"uniqueIndex;size:180;not null"`
	PasswordHash string `json:"-" gorm:"size:120;not null"`
	Role         string `json:"role" gorm:"size:40;not null;default:'owner'"`
	IsActive     bool   `json:"isActive" gorm:"not null;default:true"`
}

type AdminSessionRecord struct {
	BaseModel
	AdminUserID string     `json:"adminUserId" gorm:"index;size:36;not null"`
	AdminUser   AdminUser  `json:"adminUser" gorm:"constraint:OnUpdate:CASCADE,OnDelete:CASCADE;"`
	TokenHash   string     `json:"-" gorm:"uniqueIndex;size:96;not null"`
	ExpiresAt   time.Time  `json:"expiresAt" gorm:"index;not null"`
	RevokedAt   *time.Time `json:"revokedAt" gorm:"index"`
}
