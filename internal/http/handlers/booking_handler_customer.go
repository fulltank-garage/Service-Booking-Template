package handlers

import (
	"errors"
	"github.com/fulltank-garage/service-booking-template-api/internal/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"net/http"
)

func (handler *BookingHandler) CreateBooking(c *gin.Context) {
	var input services.CreateBookingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูลไม่ถูกต้อง"))
		return
	}
	booking, err := handler.service.CreateBooking(c.Request.Context(), input)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, services.ErrSlotUnavailable) || errors.Is(err, services.ErrActiveBookingExists) {
			status = http.StatusConflict
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, errorBody(err.Error()))
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": booking})
}

func (handler *BookingHandler) LatestBooking(c *gin.Context) {
	booking, err := handler.service.LatestBookingByLineUser(c.Request.Context(), c.Query("lineUserId"))
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, errorBody(err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": booking})
}

func (handler *BookingHandler) CancelBooking(c *gin.Context) {
	var payload struct {
		LineUserID string `json:"lineUserId"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูลไม่ถูกต้อง"))
		return
	}
	if err := handler.service.CancelBookingByLineUser(c.Request.Context(), c.Param("id"), payload.LineUserID); err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, errorBody(err.Error()))
		return
	}
	c.Status(http.StatusNoContent)
}

func (handler *BookingHandler) RescheduleBooking(c *gin.Context) {
	var input services.RescheduleBookingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูลไม่ถูกต้อง"))
		return
	}
	booking, err := handler.service.RescheduleBookingByLineUser(c.Request.Context(), c.Param("id"), input)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, services.ErrSlotUnavailable) {
			status = http.StatusConflict
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, errorBody(err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": booking})
}
