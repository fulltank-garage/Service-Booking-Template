package database

import (
	"context"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/config"
	"github.com/redis/go-redis/v9"
)

func OpenRedis(cfg config.RedisConfig) (*redis.Client, error) {
	var options *redis.Options
	var err error
	if cfg.URL != "" {
		options, err = redis.ParseURL(cfg.URL)
		if err != nil {
			return nil, err
		}
	} else {
		options = &redis.Options{Addr: cfg.Addr, Password: cfg.Password, DB: cfg.DB}
	}
	client := redis.NewClient(options)
	ctx, cancel := context.WithTimeout(context.Background(), 2*time.Second)
	defer cancel()
	if err := client.Ping(ctx).Err(); err != nil {
		return nil, err
	}
	return client, nil
}
