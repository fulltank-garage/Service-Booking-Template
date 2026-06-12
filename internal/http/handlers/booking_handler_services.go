package handlers

import (
	"errors"
	"github.com/fulltank-garage/service-booking-template-api/internal/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
	"net/http"
)

func (handler *BookingHandler) ListServices(c *gin.Context) {
	items, err := handler.service.ListServices(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, errorBody("โหลดรายการบริการไม่สำเร็จ"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (handler *BookingHandler) ListAdminServices(c *gin.Context) {
	items, err := handler.service.ListAdminServices(c.Request.Context())
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
