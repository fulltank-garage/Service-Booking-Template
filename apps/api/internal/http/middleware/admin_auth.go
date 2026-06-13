package middleware

import (
	"net/http"
	"strings"

	"github.com/fulltank-garage/service-booking-template-api/internal/services"
	"github.com/gin-gonic/gin"
)

func AdminAuth(authService *services.AuthService) gin.HandlerFunc {
	return func(c *gin.Context) {
		token := bearerToken(c.GetHeader("Authorization"))
		if token == "" {
			token = strings.TrimSpace(c.Query("token"))
		}
		session, ok := authService.SessionFromToken(c.Request.Context(), token)
		if token == "" || !ok {
			c.AbortWithStatusJSON(http.StatusUnauthorized, gin.H{"error": "unauthorized"})
			return
		}
		c.Request = c.Request.WithContext(services.WithAdminActor(c.Request.Context(), services.AdminActor{
			Name:  session.Name,
			Email: session.Email,
		}))
		c.Next()
	}
}

func bearerToken(header string) string {
	const prefix = "Bearer "
	if !strings.HasPrefix(header, prefix) {
		return ""
	}
	return strings.TrimSpace(strings.TrimPrefix(header, prefix))
}
