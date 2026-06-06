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
	configured := handler.cfg.VAPIDPublicKey != "" && handler.cfg.VAPIDPrivateKey != ""
	configError := ""
	if configured {
		if err := services.ValidateVAPIDKeyPair(handler.cfg.VAPIDPublicKey, handler.cfg.VAPIDPrivateKey); err != nil {
			configured = false
			configError = "VAPID_PUBLIC_KEY และ VAPID_PRIVATE_KEY ไม่ใช่คู่เดียวกัน"
		}
	}
	c.JSON(http.StatusOK, gin.H{
		"configured": configured,
		"error":      configError,
		"publicKey":  handler.cfg.VAPIDPublicKey,
	})
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
	if err := c.ShouldBindJSON(&payload); err != nil || payload.Endpoint == "" || payload.Keys.P256DH == "" || payload.Keys.Auth == "" {
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

func (handler *NotificationHandler) TestPush(c *gin.Context) {
	var payload struct {
		Endpoint string `json:"endpoint"`
		Keys     struct {
			P256DH string `json:"p256dh"`
			Auth   string `json:"auth"`
		} `json:"keys"`
	}
	_ = c.ShouldBindJSON(&payload)
	if payload.Endpoint != "" && payload.Keys.P256DH != "" && payload.Keys.Auth != "" {
		subscription := models.PushSubscription{
			Endpoint:  payload.Endpoint,
			P256DH:    payload.Keys.P256DH,
			Auth:      payload.Keys.Auth,
			UserAgent: c.Request.UserAgent(),
		}
		if err := handler.service.SavePushSubscription(c.Request.Context(), &subscription); err != nil {
			c.JSON(http.StatusInternalServerError, errorBody("บันทึก subscription ไม่สำเร็จ"))
			return
		}
		report, err := handler.service.SendTestPushToSubscription(c.Request.Context(), subscription)
		if err != nil {
			c.JSON(http.StatusInternalServerError, errorBody("ส่งทดสอบแจ้งเตือนไม่สำเร็จ"))
			return
		}
		c.JSON(http.StatusOK, gin.H{"data": report})
		return
	}

	report, err := handler.service.SendTestPush(c.Request.Context(), payload.Endpoint)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errorBody("ส่งทดสอบแจ้งเตือนไม่สำเร็จ"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": report})
}
