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
	BookingService      *services.BookingService
	NotificationService *services.NotificationService
	Hub                 *ws.Hub
}

func New(deps Dependencies) *gin.Engine {
	router := gin.New()
	router.Use(gin.Logger(), gin.Recovery(), middleware.CORS(deps.Config.AllowedOrigins))

	healthHandler := handlers.NewHealthHandler()
	bookingHandler := handlers.NewBookingHandler(deps.BookingService)
	notificationHandler := handlers.NewNotificationHandler(deps.Config, deps.NotificationService)
	webSocketHandler := handlers.NewWebSocketHandler(deps.Config, deps.Hub)

	api := router.Group("/api/v1")
	api.GET("/health", healthHandler.Health)
	api.GET("/services", bookingHandler.ListServices)
	api.GET("/availability", bookingHandler.Availability)
	api.POST("/bookings", bookingHandler.CreateBooking)
	api.GET("/ws/admin", webSocketHandler.Admin)

	admin := api.Group("/admin")
	admin.GET("/bookings", bookingHandler.ListBookings)
	admin.PUT("/bookings/:id/status", bookingHandler.UpdateStatus)
	admin.GET("/notifications", notificationHandler.List)
	admin.PUT("/notifications/:id/read", notificationHandler.MarkRead)
	admin.GET("/push/public-key", notificationHandler.PublicKey)
	admin.POST("/push/subscribe", notificationHandler.Subscribe)

	return router
}
