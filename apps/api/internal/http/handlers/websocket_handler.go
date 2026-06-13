package handlers

import (
	"github.com/fulltank-garage/service-booking-template-api/internal/config"
	"github.com/fulltank-garage/service-booking-template-api/internal/ws"
	"github.com/gin-gonic/gin"
)

type WebSocketHandler struct {
	cfg config.Config
	hub *ws.Hub
}

func NewWebSocketHandler(cfg config.Config, hub *ws.Hub) *WebSocketHandler {
	return &WebSocketHandler{cfg: cfg, hub: hub}
}

func (handler *WebSocketHandler) Admin(c *gin.Context) {
	handler.hub.Serve(c, handler.cfg.AllowedOrigins)
}
