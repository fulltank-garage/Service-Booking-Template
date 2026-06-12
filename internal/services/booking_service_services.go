package services

import (
	"context"
	"errors"
	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"strings"
)

func (service *BookingService) ListServices(ctx context.Context) ([]models.Service, error) {
	return service.store.ListServices(ctx)
}

func (service *BookingService) ListAdminServices(ctx context.Context) ([]models.Service, error) {
	return service.store.ListAdminServices(ctx)
}

func (service *BookingService) LatestBookingByLineUser(ctx context.Context, lineUserID string) (models.Booking, error) {
	lineUserID = strings.TrimSpace(lineUserID)
	if lineUserID == "" {
		return models.Booking{}, errors.New("line user id is required")
	}
	return service.store.LatestBookingByLineUser(ctx, lineUserID)
}

func (service *BookingService) CreateService(ctx context.Context, input ServiceInput) (models.Service, error) {
	input = normalizeServiceInput(input)
	if err := validateServiceInput(input); err != nil {
		return models.Service{}, err
	}
	item := models.Service{
		NameTH:          input.NameTH,
		NameEN:          input.NameEN,
		DescriptionTH:   input.DescriptionTH,
		DurationMinutes: input.DurationMinutes,
		PriceCents:      input.PriceCents,
		AccentColor:     input.AccentColor,
		IsActive:        input.IsActive,
	}
	if err := service.store.CreateService(ctx, &item); err != nil {
		return models.Service{}, err
	}
	if service.notifier != nil {
		_ = service.notifier.ServiceChanged(ctx, models.NotificationTypeServiceCreated, item)
	}
	return item, nil
}

func (service *BookingService) UpdateService(ctx context.Context, id string, input ServiceInput) (models.Service, error) {
	input = normalizeServiceInput(input)
	if strings.TrimSpace(id) == "" {
		return models.Service{}, ErrServiceRequired
	}
	if err := validateServiceInput(input); err != nil {
		return models.Service{}, err
	}
	item, err := service.store.FindAnyServiceByID(ctx, strings.TrimSpace(id))
	if err != nil {
		return models.Service{}, err
	}
	item.NameTH = input.NameTH
	item.NameEN = input.NameEN
	item.DescriptionTH = input.DescriptionTH
	item.DurationMinutes = input.DurationMinutes
	item.PriceCents = input.PriceCents
	item.AccentColor = input.AccentColor
	item.IsActive = input.IsActive
	if err := service.store.UpdateService(ctx, &item); err != nil {
		return models.Service{}, err
	}
	if service.notifier != nil {
		_ = service.notifier.ServiceChanged(ctx, models.NotificationTypeServiceUpdated, item)
	}
	return item, nil
}

func (service *BookingService) DeleteService(ctx context.Context, id string) error {
	if strings.TrimSpace(id) == "" {
		return ErrServiceRequired
	}
	id = strings.TrimSpace(id)
	item, err := service.store.FindAnyServiceByID(ctx, id)
	if err != nil {
		return err
	}
	if err := service.store.DeleteService(ctx, id); err != nil {
		return err
	}
	item.IsActive = false
	if service.notifier != nil {
		_ = service.notifier.ServiceChanged(ctx, models.NotificationTypeServiceDeleted, item)
	}
	return nil
}

func normalizeServiceInput(input ServiceInput) ServiceInput {
	input.NameTH = strings.TrimSpace(input.NameTH)
	input.NameEN = strings.TrimSpace(input.NameEN)
	input.DescriptionTH = strings.TrimSpace(input.DescriptionTH)
	input.AccentColor = strings.TrimSpace(input.AccentColor)
	if input.NameEN == "" {
		input.NameEN = input.NameTH
	}
	if input.AccentColor == "" {
		input.AccentColor = "#FF008C"
	}
	return input
}

func validateServiceInput(input ServiceInput) error {
	if input.NameTH == "" {
		return errors.New("service name is required")
	}
	if input.DurationMinutes <= 0 {
		return errors.New("service duration must be greater than zero")
	}
	if input.PriceCents < 0 {
		return errors.New("service price must be zero or greater")
	}
	return nil
}
