package handlers

import (
	"errors"
	"github.com/fulltank-garage/service-booking-template-api/internal/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"net/http"
)

func (handler *BookingHandler) GetBookingSettings(c *gin.Context) {
	settings, err := handler.service.GetBookingSettings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, errorBody("โหลดตั้งค่าการจองไม่สำเร็จ"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": settings})
}

func (handler *BookingHandler) GetBookingRules(c *gin.Context) {
	settings, err := handler.service.GetBookingSettings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, errorBody("โหลดตั้งค่าการจองไม่สำเร็จ"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": settings})
}

func (handler *BookingHandler) SaveBookingSettings(c *gin.Context) {
	var input services.BookingSettingsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูลไม่ถูกต้อง"))
		return
	}
	settings, err := handler.service.SaveBookingSettings(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusBadRequest, errorBody(err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": settings})
}

func (handler *BookingHandler) Availability(c *gin.Context) {
	items, err := handler.service.ListAvailability(c.Request.Context(), c.Query("serviceId"), c.Query("date"))
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, errorBody(err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}
