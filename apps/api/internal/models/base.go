package models

import (
	"time"

	"github.com/google/uuid"
	"gorm.io/gorm"
)

type BaseModel struct {
	ID        string         `json:"id" gorm:"primaryKey;size:36"`
	CreatedAt time.Time      `json:"createdAt"`
	UpdatedAt time.Time      `json:"updatedAt"`
	DeletedAt gorm.DeletedAt `json:"-" gorm:"index"`
}

func (model *BaseModel) BeforeCreate(_ *gorm.DB) error {
	if model.ID == "" {
		model.ID = uuid.NewString()
	}
	return nil
}
