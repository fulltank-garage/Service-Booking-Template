package routes

import (
	"github.com/fulltank-garage/service-booking-template-api/internal/config"
	"github.com/fulltank-garage/service-booking-template-api/internal/http/handlers"
	"github.com/fulltank-garage/service-booking-template-api/internal/http/middleware"
	"github.com/fulltank-garage/service-booking-template-api/internal/services"
	"github.com/fulltank-garage/service-booking-template-api/internal/ws"
	"github.com/gin-gonic/gin"
)

type Dependencies struct {
	Config              config.Config
	AuthService         *services.AuthService
	BookingService      *services.BookingService
	NotificationService *services.NotificationService
	Hub                 *ws.Hub
}

func New(deps Dependencies) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery(), middleware.CORS(deps.Config.AllowedOrigins))

	healthHandler := handlers.NewHealthHandler()
	authHandler := handlers.NewAuthHandler(deps.AuthService)
	bookingHandler := handlers.NewBookingHandler(deps.BookingService)
	notificationHandler := handlers.NewNotificationHandler(deps.Config, deps.NotificationService)
	webSocketHandler := handlers.NewWebSocketHandler(deps.Config, deps.Hub)

	api := router.Group("/api/v1")
	api.GET("/health", healthHandler.Health)
	api.GET("/services", bookingHandler.ListServices)
	api.GET("/availability", bookingHandler.Availability)
	api.POST("/bookings", bookingHandler.CreateBooking)

	admin := api.Group("/admin")
	admin.POST("/auth/login", authHandler.Login)
	admin.Use(middleware.AdminAuth(deps.AuthService))
	admin.GET("/bookings", bookingHandler.ListBookings)
	admin.PUT("/bookings/:id/status", bookingHandler.UpdateStatus)
	admin.GET("/services", bookingHandler.ListServices)
	admin.POST("/services", bookingHandler.CreateService)
	admin.PUT("/services/:id", bookingHandler.UpdateService)
	admin.DELETE("/services/:id", bookingHandler.DeleteService)
	admin.GET("/notifications", notificationHandler.List)
	admin.PUT("/notifications/:id/read", notificationHandler.MarkRead)
	admin.GET("/push/public-key", notificationHandler.PublicKey)
	admin.POST("/push/subscribe", notificationHandler.Subscribe)

	api.GET("/ws/admin", middleware.AdminAuth(deps.AuthService), webSocketHandler.Admin)

	return router
}
