package repositories

import (
	"context"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"gorm.io/gorm"
)

func (store *GormStore) ListServices(ctx context.Context) ([]models.Service, error) {
	var services []models.Service
	err := store.db.WithContext(ctx).Where("is_active = ?", true).Order("created_at ASC").Find(&services).Error
	return services, err
}

func (store *GormStore) ListAdminServices(ctx context.Context) ([]models.Service, error) {
	var services []models.Service
	err := store.db.WithContext(ctx).Order("created_at ASC").Find(&services).Error
	return services, err
}

func (store *GormStore) FindServiceByID(ctx context.Context, id string) (models.Service, error) {
	var service models.Service
	err := store.db.WithContext(ctx).Where("id = ? AND is_active = ?", id, true).First(&service).Error
	return service, err
}

func (store *GormStore) FindAnyServiceByID(ctx context.Context, id string) (models.Service, error) {
	var service models.Service
	err := store.db.WithContext(ctx).Where("id = ?", id).First(&service).Error
	return service, err
}

func (store *GormStore) CreateService(ctx context.Context, service *models.Service) error {
	return store.db.WithContext(ctx).Create(service).Error
}

func (store *GormStore) UpdateService(ctx context.Context, service *models.Service) error {
	return store.db.WithContext(ctx).Save(service).Error
}

func (store *GormStore) DeleteService(ctx context.Context, id string) error {
	result := store.db.WithContext(ctx).Model(&models.Service{}).Where("id = ?", id).Update("is_active", false)
	if result.Error != nil {
		return result.Error
	}
	if result.RowsAffected == 0 {
		return gorm.ErrRecordNotFound
	}
	return nil
}
