package handlers

import (
	"github.com/fulltank-garage/service-booking-template-api/internal/services"
	"github.com/gin-gonic/gin"
)

type BookingHandler struct {
	service *services.BookingService
}

func NewBookingHandler(service *services.BookingService) *BookingHandler {
	return &BookingHandler{service: service}
}

func errorBody(message string) gin.H {
	return gin.H{"error": gin.H{"message": message}}
}
