package services

import (
	"context"
	"testing"
	"time"
)

func TestWithReminderLockSkipsWhenRedisLockHeld(t *testing.T) {
	redisClient := &fakeRealtimeRedis{setNXResult: false}
	service := NewNotificationServiceWithPush(&notificationStore{}, nil, nil, nil)
	service.redis = redisClient

	ran, err := service.WithReminderLock(context.Background(), time.Minute, func(context.Context) error {
		t.Fatal("expected locked reminder job to be skipped")
		return nil
	})

	if err != nil {
		t.Fatalf("reminder lock: %v", err)
	}
	if ran {
		t.Fatal("expected reminder job to be skipped")
	}
	if redisClient.delCalls != 0 {
		t.Fatalf("expected no lock release when lock is not acquired, got %d", redisClient.delCalls)
	}
}

func TestWithReminderLockRunsAndReleasesRedisLock(t *testing.T) {
	redisClient := &fakeRealtimeRedis{setNXResult: true}
	service := NewNotificationServiceWithPush(&notificationStore{}, nil, nil, nil)
	service.redis = redisClient
	runCount := 0

	ran, err := service.WithReminderLock(context.Background(), time.Minute, func(context.Context) error {
		runCount++
		return nil
	})

	if err != nil {
		t.Fatalf("reminder lock: %v", err)
	}
	if !ran || runCount != 1 {
		t.Fatalf("expected reminder job to run once, ran=%v count=%d", ran, runCount)
	}
	if redisClient.delCalls != 1 {
		t.Fatalf("expected lock release once, got %d", redisClient.delCalls)
	}
}
