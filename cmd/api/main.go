package main

import (
	"context"
	"errors"
	"log"
	"net/http"
	"os"
	"os/signal"
	"syscall"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/config"
	"github.com/fulltank-garage/service-booking-template-api/internal/database"
	httpserver "github.com/fulltank-garage/service-booking-template-api/internal/http/routes"
	"github.com/fulltank-garage/service-booking-template-api/internal/repositories"
	"github.com/fulltank-garage/service-booking-template-api/internal/services"
	"github.com/fulltank-garage/service-booking-template-api/internal/ws"
)

func main() {
	cfg := config.Load()

	db, err := database.OpenPostgres(cfg.DatabaseURL)
	if err != nil {
		log.Fatalf("connect postgres: %v", err)
	}
	if err := database.AutoMigrate(db); err != nil {
		log.Fatalf("migrate postgres: %v", err)
	}

	redisClient, err := database.OpenRedis(cfg.Redis)
	if err != nil {
		log.Printf("redis unavailable, using in-memory websocket hub only: %v", err)
	}

	hub := ws.NewHub()
	go hub.Run()

	store := repositories.NewGormStore(db)
	notifier := services.NewNotificationService(store, hub, redisClient)
	lineRichMenuService := services.NewLineRichMenuService(cfg.LineChannelToken, cfg.LineBookingSuccessRichMenuID)
	bookingService := services.NewBookingService(store, notifier, lineRichMenuService, cfg.BookingSlotCapacity)
	authService := services.NewAuthService(cfg.AdminDisplayName, cfg.AdminEmail, cfg.AdminPassword, cfg.AdminSessionSecret)
	if redisClient != nil {
		go notifier.Subscribe(context.Background())
	}

	router := httpserver.New(httpserver.Dependencies{
		Config:              cfg,
		AuthService:         authService,
		BookingService:      bookingService,
		NotificationService: notifier,
		Hub:                 hub,
	})

	server := &http.Server{
		Addr:              ":" + cfg.HTTPPort,
		Handler:           router,
		ReadHeaderTimeout: 5 * time.Second,
	}

	go func() {
		log.Printf("api listening on :%s", cfg.HTTPPort)
		if err := server.ListenAndServe(); err != nil && !errors.Is(err, http.ErrServerClosed) {
			log.Fatalf("listen: %v", err)
		}
	}()

	stop := make(chan os.Signal, 1)
	signal.Notify(stop, os.Interrupt, syscall.SIGTERM)
	<-stop

	ctx, cancel := context.WithTimeout(context.Background(), 10*time.Second)
	defer cancel()
	if err := server.Shutdown(ctx); err != nil {
		log.Printf("shutdown: %v", err)
	}
}
