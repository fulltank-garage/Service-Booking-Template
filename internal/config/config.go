package config

import (
	"os"
	"strconv"
	"strings"
)

type RedisConfig struct {
	Addr     string
	Password string
	DB       int
}

type Config struct {
	AppEnv              string
	HTTPPort            string
	DatabaseURL         string
	Redis               RedisConfig
	PublicWebURL        string
	AdminWebURL         string
	BookingSlotCapacity int
	VAPIDPublicKey      string
	VAPIDPrivateKey     string
	AllowedOrigins      []string
}

func Load() Config {
	publicURL := getEnv("PUBLIC_WEB_URL", "http://127.0.0.1:5173")
	adminURL := getEnv("ADMIN_WEB_URL", "http://127.0.0.1:5174")
	return Config{
		AppEnv:       getEnv("APP_ENV", "development"),
		HTTPPort:     getEnv("HTTP_PORT", "8080"),
		DatabaseURL:  getEnv("DATABASE_URL", "postgres://service_booking:service_booking@localhost:5432/service_booking?sslmode=disable"),
		PublicWebURL: publicURL,
		AdminWebURL:  adminURL,
		Redis: RedisConfig{
			Addr:     getEnv("REDIS_ADDR", "localhost:6379"),
			Password: os.Getenv("REDIS_PASSWORD"),
			DB:       getEnvInt("REDIS_DB", 0),
		},
		BookingSlotCapacity: getEnvInt("BOOKING_SLOT_CAPACITY", 3),
		VAPIDPublicKey:      os.Getenv("VAPID_PUBLIC_KEY"),
		VAPIDPrivateKey:     os.Getenv("VAPID_PRIVATE_KEY"),
		AllowedOrigins:      parseOrigins(getEnv("CORS_ALLOWED_ORIGINS", publicURL+","+adminURL)),
	}
}

func getEnv(key string, fallback string) string {
	if value := strings.TrimSpace(os.Getenv(key)); value != "" {
		return value
	}
	return fallback
}

func getEnvInt(key string, fallback int) int {
	value, err := strconv.Atoi(strings.TrimSpace(os.Getenv(key)))
	if err != nil {
		return fallback
	}
	return value
}

func parseOrigins(raw string) []string {
	parts := strings.Split(raw, ",")
	origins := make([]string, 0, len(parts))
	for _, part := range parts {
		if origin := strings.TrimSpace(part); origin != "" {
			origins = append(origins, origin)
		}
	}
	return origins
}
