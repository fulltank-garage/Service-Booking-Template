package handlers

import (
	"errors"
	"net/http"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"github.com/fulltank-garage/service-booking-template-api/internal/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type BookingHandler struct {
	service *services.BookingService
}

func NewBookingHandler(service *services.BookingService) *BookingHandler {
	return &BookingHandler{service: service}
}

func (handler *BookingHandler) ListServices(c *gin.Context) {
	items, err := handler.service.ListServices(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, errorBody("โหลดรายการบริการไม่สำเร็จ"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (handler *BookingHandler) CreateService(c *gin.Context) {
	var input services.ServiceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูลไม่ถูกต้อง"))
		return
	}
	item, err := handler.service.CreateService(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusBadRequest, errorBody(err.Error()))
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": item})
}

func (handler *BookingHandler) UpdateService(c *gin.Context) {
	var input services.ServiceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูลไม่ถูกต้อง"))
		return
	}
	item, err := handler.service.UpdateService(c.Request.Context(), c.Param("id"), input)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, errorBody(err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": item})
}

func (handler *BookingHandler) DeleteService(c *gin.Context) {
	if err := handler.service.DeleteService(c.Request.Context(), c.Param("id")); err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, errorBody(err.Error()))
		return
	}
	c.Status(http.StatusNoContent)
}

func (handler *BookingHandler) GetBookingSettings(c *gin.Context) {
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

func (handler *BookingHandler) CreateBooking(c *gin.Context) {
	var input services.CreateBookingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูลไม่ถูกต้อง"))
		return
	}
	booking, err := handler.service.CreateBooking(c.Request.Context(), input)
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

func (handler *BookingHandler) ListBookings(c *gin.Context) {
	items, err := handler.service.ListBookings(c.Request.Context(), models.BookingFilter{Status: c.Query("status"), Date: c.Query("date")})
	if err != nil {
		c.JSON(http.StatusInternalServerError, errorBody("โหลดรายการจองไม่สำเร็จ"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
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

func errorBody(message string) gin.H {
	return gin.H{"error": gin.H{"message": message}}
}
