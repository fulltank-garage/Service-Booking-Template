package services

import (
	"context"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
)

func TestLineServiceSendsPushTextMessage(t *testing.T) {
	var authorization string
	var payload struct {
		To       string `json:"to"`
		Messages []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"messages"`
	}
	server := httptest.NewServer(http.HandlerFunc(func(writer http.ResponseWriter, request *http.Request) {
		authorization = request.Header.Get("Authorization")
		if request.URL.Path != "/v2/bot/message/push" {
			t.Fatalf("unexpected path %q", request.URL.Path)
		}
		if err := json.NewDecoder(request.Body).Decode(&payload); err != nil {
			t.Fatalf("decode payload: %v", err)
		}
		writer.WriteHeader(http.StatusOK)
	}))
	defer server.Close()

	service := NewLineRichMenuService("channel-token", "booking-menu", "success-menu")
	service.endpointBaseURL = server.URL

	if err := service.SendBookingMessage(context.Background(), "line-user-1", "จองคิวสำเร็จ"); err != nil {
		t.Fatalf("send line message: %v", err)
	}

	if authorization != "Bearer channel-token" {
		t.Fatalf("expected bearer token, got %q", authorization)
	}
	if payload.To != "line-user-1" {
		t.Fatalf("expected recipient line user, got %q", payload.To)
	}
	if len(payload.Messages) != 1 || payload.Messages[0].Type != "text" || payload.Messages[0].Text != "จองคิวสำเร็จ" {
		t.Fatalf("unexpected line message payload: %#v", payload.Messages)
	}
}
