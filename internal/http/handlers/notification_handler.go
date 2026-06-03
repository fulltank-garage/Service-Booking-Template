package handlers

import (
	"net/http"

	"github.com/fulltank-garage/service-booking-template-api/internal/config"
	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"github.com/fulltank-garage/service-booking-template-api/internal/services"
	"github.com/gin-gonic/gin"
)

type NotificationHandler struct {
	cfg     config.Config
	service *services.NotificationService
}

func NewNotificationHandler(cfg config.Config, service *services.NotificationService) *NotificationHandler {
	return &NotificationHandler{cfg: cfg, service: service}
}

func (handler *NotificationHandler) List(c *gin.Context) {
	items, err := handler.service.List(c.Request.Context(), c.Query("unread") == "true", 50)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errorBody("โหลดแจ้งเตือนไม่สำเร็จ"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (handler *NotificationHandler) MarkRead(c *gin.Context) {
	item, err := handler.service.MarkRead(c.Request.Context(), c.Param("id"))
	if err != nil {
		c.JSON(http.StatusNotFound, errorBody("ไม่พบแจ้งเตือน"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": item})
}

func (handler *NotificationHandler) PublicKey(c *gin.Context) {
	c.JSON(http.StatusOK, gin.H{"configured": handler.cfg.VAPIDPublicKey != "", "publicKey": handler.cfg.VAPIDPublicKey})
}

func (handler *NotificationHandler) Subscribe(c *gin.Context) {
	var payload struct {
		Endpoint string `json:"endpoint"`
		Keys     struct {
			P256DH string `json:"p256dh"`
			Auth   string `json:"auth"`
		} `json:"keys"`
		AdminProfileID string `json:"adminProfileId"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil || payload.Endpoint == "" {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูล subscription ไม่ถูกต้อง"))
		return
	}
	subscription := &models.PushSubscription{
		Endpoint:       payload.Endpoint,
		P256DH:         payload.Keys.P256DH,
		Auth:           payload.Keys.Auth,
		UserAgent:      c.Request.UserAgent(),
		AdminProfileID: payload.AdminProfileID,
	}
	if err := handler.service.SavePushSubscription(c.Request.Context(), subscription); err != nil {
		c.JSON(http.StatusInternalServerError, errorBody("บันทึก subscription ไม่สำเร็จ"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": subscription})
}
