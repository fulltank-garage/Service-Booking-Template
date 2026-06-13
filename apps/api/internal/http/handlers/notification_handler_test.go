package handlers

import (
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"

	webpush "github.com/SherClockHolmes/webpush-go"
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
		Error      string `json:"error"`
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
	privateKey, publicKey, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		t.Fatalf("generate VAPID keys: %v", err)
	}

	handler := NewNotificationHandler(config.Config{
		VAPIDPublicKey:  publicKey,
		VAPIDPrivateKey: privateKey,
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
		Error      string `json:"error"`
		PublicKey  string `json:"publicKey"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if !body.Configured {
		t.Fatal("expected push to be configured when both VAPID keys are present")
	}
	if body.Error != "" {
		t.Fatalf("expected no config error, got %q", body.Error)
	}
	if body.PublicKey != publicKey {
		t.Fatalf("expected public key to be returned, got %q", body.PublicKey)
	}
}

func TestPushPublicKeyRejectsMismatchedVAPIDKeys(t *testing.T) {
	gin.SetMode(gin.TestMode)
	privateKey, _, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		t.Fatalf("generate first VAPID key pair: %v", err)
	}
	_, publicKey, err := webpush.GenerateVAPIDKeys()
	if err != nil {
		t.Fatalf("generate second VAPID key pair: %v", err)
	}

	handler := NewNotificationHandler(config.Config{
		VAPIDPublicKey:  publicKey,
		VAPIDPrivateKey: privateKey,
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
		Error      string `json:"error"`
		PublicKey  string `json:"publicKey"`
	}
	if err := json.Unmarshal(response.Body.Bytes(), &body); err != nil {
		t.Fatalf("decode response: %v", err)
	}
	if body.Configured {
		t.Fatal("expected push to be unconfigured when VAPID keys do not match")
	}
	if body.Error == "" {
		t.Fatal("expected a config error")
	}
	if body.PublicKey != publicKey {
		t.Fatalf("expected public key to still be returned, got %q", body.PublicKey)
	}
}
