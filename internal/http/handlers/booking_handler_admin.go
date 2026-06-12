package handlers

import (
	"errors"
	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"github.com/fulltank-garage/service-booking-template-api/internal/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"net/http"
	"strconv"
	"time"
)

func (handler *BookingHandler) CreateAdminBooking(c *gin.Context) {
	var input services.CreateBookingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูลไม่ถูกต้อง"))
		return
	}
	booking, err := handler.service.CreateAdminBooking(c.Request.Context(), input)
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

func (handler *BookingHandler) DeleteBooking(c *gin.Context) {
	if err := handler.service.DeleteBooking(c.Request.Context(), c.Param("id")); err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, errorBody(err.Error()))
		return
	}
	c.Status(http.StatusNoContent)
}

func (handler *BookingHandler) ListBookings(c *gin.Context) {
	items, err := handler.service.ListBookings(c.Request.Context(), models.BookingFilter{
		Status: c.Query("status"),
		Date:   c.Query("date"),
		Query:  c.Query("query"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, errorBody("โหลดรายการจองไม่สำเร็จ"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (handler *BookingHandler) DailySummary(c *gin.Context) {
	summary, err := handler.service.DailySummary(c.Request.Context(), c.Query("date"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errorBody(err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": summary})
}

func (handler *BookingHandler) ReminderCandidates(c *gin.Context) {
	leadMinutes := 0
	if raw := c.Query("leadMinutes"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, errorBody("leadMinutes ไม่ถูกต้อง"))
			return
		}
		leadMinutes = parsed
	}
	items, err := handler.service.ListReminderCandidates(c.Request.Context(), time.Now(), leadMinutes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errorBody("โหลดรายการแจ้งเตือนไม่สำเร็จ"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (handler *BookingHandler) UpdateBooking(c *gin.Context) {
	var input services.UpdateBookingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูลไม่ถูกต้อง"))
		return
	}
	booking, err := handler.service.UpdateBooking(c.Request.Context(), c.Param("id"), input)
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

func (handler *BookingHandler) UpdateStatus(c *gin.Context) {
	var payload struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูลไม่ถูกต้อง"))
		return
	}
	booking, err := handler.service.UpdateBookingStatus(c.Request.Context(), c.Param("id"), payload.Status)
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
