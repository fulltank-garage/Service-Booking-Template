package services

import (
	"context"
	"testing"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
)

func TestUpdateServiceCanReactivateInactiveService(t *testing.T) {
	store := &fakeStore{
		service: models.Service{
			BaseModel:       models.BaseModel{ID: "svc-1"},
			NameTH:          "ทำเล็บเจล",
			NameEN:          "Gel nail",
			DescriptionTH:   "ทำเล็บเจลสีพื้น",
			DurationMinutes: 45,
			PriceCents:      35000,
			AccentColor:     "#FF008C",
			IsActive:        false,
		},
	}
	notifier := &recordingBookingNotifier{}
	service := NewBookingService(store, notifier, nil, 1)
	freezeBookingServiceNow(service)

	updated, err := service.UpdateService(context.Background(), "svc-1", ServiceInput{
		NameTH:          "ทำเล็บเจล",
		NameEN:          "Gel nail",
		DescriptionTH:   "ทำเล็บเจลสีพื้น",
		DurationMinutes: 45,
		PriceCents:      35000,
		AccentColor:     "#FF008C",
		IsActive:        true,
	})

	if err != nil {
		t.Fatalf("update service: %v", err)
	}
	if !updated.IsActive || !store.service.IsActive {
		t.Fatal("expected inactive service to be reactivated")
	}
}

func TestServiceChangesNotifyRealtime(t *testing.T) {
	store := &fakeStore{service: models.Service{BaseModel: models.BaseModel{ID: "svc-1"}, IsActive: true}}
	notifier := &recordingBookingNotifier{}
	service := NewBookingService(store, notifier, nil, 1)

	created, err := service.CreateService(context.Background(), ServiceInput{
		NameTH:          "บริการใหม่",
		DurationMinutes: 30,
		PriceCents:      0,
		IsActive:        true,
	})
	if err != nil {
		t.Fatalf("create service: %v", err)
	}
	if notifier.serviceEventType != "service.created" || notifier.service.ID != created.ID {
		t.Fatalf("expected service.created event, got %q %#v", notifier.serviceEventType, notifier.service)
	}

	_, err = service.UpdateService(context.Background(), "svc-1", ServiceInput{
		NameTH:          "บริการแก้ไข",
		DurationMinutes: 45,
		PriceCents:      1000,
		IsActive:        true,
	})
	if err != nil {
		t.Fatalf("update service: %v", err)
	}
	if notifier.serviceEventType != "service.updated" {
		t.Fatalf("expected service.updated event, got %q", notifier.serviceEventType)
	}

	if err := service.DeleteService(context.Background(), "svc-1"); err != nil {
		t.Fatalf("delete service: %v", err)
	}
	if notifier.serviceEventType != "service.deleted" {
		t.Fatalf("expected service.deleted event, got %q", notifier.serviceEventType)
	}
}

func TestSaveBookingSettingsNotifiesRealtime(t *testing.T) {
	store := &fakeStore{}
	notifier := &recordingBookingNotifier{}
	service := NewBookingService(store, notifier, nil, 1)

	settings, err := service.SaveBookingSettings(context.Background(), BookingSettingsInput{
		OpenTime:            "09:00",
		CloseTime:           "17:00",
		SlotIntervalMinutes: 30,
		SlotCapacity:        2,
	})

	if err != nil {
		t.Fatalf("save booking settings: %v", err)
	}
	if notifier.settings.ID != settings.ID || notifier.settings.OpenTime != "09:00" {
		t.Fatalf("expected booking settings event, got %#v", notifier.settings)
	}
}
