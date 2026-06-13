package services

import (
	"bytes"
	"context"
	"encoding/json"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type LineRichMenuService struct {
	channelAccessToken string
	bookingID          string
	bookingSuccessID   string
	httpClient         *http.Client
	endpointBaseURL    string
}

func NewLineRichMenuService(channelAccessToken string, bookingID string, bookingSuccessID string) *LineRichMenuService {
	return &LineRichMenuService{
		channelAccessToken: strings.TrimSpace(channelAccessToken),
		bookingID:          strings.TrimSpace(bookingID),
		bookingSuccessID:   strings.TrimSpace(bookingSuccessID),
		httpClient:         &http.Client{Timeout: 8 * time.Second},
		endpointBaseURL:    "https://api.line.me",
	}
}

func (service *LineRichMenuService) SwitchToBookingSuccess(ctx context.Context, lineUserID string) error {
	return service.switchToRichMenu(ctx, lineUserID, service.bookingSuccessID)
}

func (service *LineRichMenuService) SwitchToBookingMenu(ctx context.Context, lineUserID string) error {
	return service.switchToRichMenu(ctx, lineUserID, service.bookingID)
}

func (service *LineRichMenuService) SendBookingMessage(ctx context.Context, lineUserID string, message string) error {
	if service == nil || service.channelAccessToken == "" || strings.TrimSpace(lineUserID) == "" || strings.TrimSpace(message) == "" {
		return nil
	}

	payload := struct {
		To       string `json:"to"`
		Messages []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		} `json:"messages"`
	}{
		To: strings.TrimSpace(lineUserID),
		Messages: []struct {
			Type string `json:"type"`
			Text string `json:"text"`
		}{
			{Type: "text", Text: strings.TrimSpace(message)},
		},
	}
	body, err := json.Marshal(payload)
	if err != nil {
		return err
	}

	endpoint := strings.TrimRight(service.endpointBaseURL, "/") + "/v2/bot/message/push"
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(body))
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+service.channelAccessToken)
	request.Header.Set("Content-Type", "application/json")

	response, err := service.httpClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("line push message failed: %s", response.Status)
	}
	return nil
}

func (service *LineRichMenuService) switchToRichMenu(ctx context.Context, lineUserID string, richMenuID string) error {
	if service == nil || service.channelAccessToken == "" || strings.TrimSpace(richMenuID) == "" || strings.TrimSpace(lineUserID) == "" {
		return nil
	}

	endpoint := fmt.Sprintf("%s/v2/bot/user/%s/richmenu/%s", strings.TrimRight(service.endpointBaseURL, "/"), strings.TrimSpace(lineUserID), strings.TrimSpace(richMenuID))
	request, err := http.NewRequestWithContext(ctx, http.MethodPost, endpoint, bytes.NewReader(nil))
	if err != nil {
		return err
	}
	request.Header.Set("Authorization", "Bearer "+service.channelAccessToken)

	response, err := service.httpClient.Do(request)
	if err != nil {
		return err
	}
	defer response.Body.Close()

	if response.StatusCode < http.StatusOK || response.StatusCode >= http.StatusMultipleChoices {
		return fmt.Errorf("line rich menu switch failed: %s", response.Status)
	}
	return nil
}
