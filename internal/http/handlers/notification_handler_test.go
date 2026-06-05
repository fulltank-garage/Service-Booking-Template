package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	"github.com/fulltank-garage/service-booking-template-api/internal/config"
	"github.com/gin-gonic/gin"
)

func TestPushPublicKeyRequiresPublicAndPrivateVAPIDKeys(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := NewNotificationHandler(config.Config{
		VAPIDPublicKey: "public-key",
	}, nil)
	router := gin.New()
	router.GET("/admin/push/public-key", handler.PublicKey)

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/admin/push/public-key", nil)
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.Code)
	}

	var body struct {
		Configured bool   `json:"configured"`
		PublicKey  string `json:"publicKey"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Configured {
		t.Fatal("expected push to be unconfigured when the private VAPID key is missing")
	}
	if body.PublicKey != "public-key" {
		t.Fatalf("expected public key to still be returned, got %q", body.PublicKey)
	}
}

func TestPushPublicKeyConfiguredWithCompleteVAPIDKeys(t *testing.T) {
	gin.SetMode(gin.TestMode)

	handler := NewNotificationHandler(config.Config{
		VAPIDPublicKey:  "public-key",
		VAPIDPrivateKey: "private-key",
	}, nil)
	router := gin.New()
	router.GET("/admin/push/public-key", handler.PublicKey)

	response := httptest.NewRecorder()
	request := httptest.NewRequest(http.MethodGet, "/admin/push/public-key", nil)
	router.ServeHTTP(response, request)

	if response.Code != http.StatusOK {
		t.Fatalf("expected status 200, got %d", response.Code)
	}

	var body struct {
		Configured bool   `json:"configured"`
		PublicKey  string `json:"publicKey"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !body.Configured {
		t.Fatal("expected push to be configured when both VAPID keys are present")
	}
	if body.PublicKey != "public-key" {
		t.Fatalf("expected public key to be returned, got %q", body.PublicKey)
	}
}
