package services

import (
	"bytes"
	"context"
	"fmt"
	"net/http"
	"strings"
	"time"
)

type LineRichMenuService struct {
	channelAccessToken string
	bookingSuccessID   string
	httpClient         *http.Client
}

func NewLineRichMenuService(channelAccessToken string, bookingSuccessID string) *LineRichMenuService {
	return &LineRichMenuService{
		channelAccessToken: strings.TrimSpace(channelAccessToken),
		bookingSuccessID:   strings.TrimSpace(bookingSuccessID),
		httpClient:         &http.Client{Timeout: 8 * time.Second},
	}
}

func (service *LineRichMenuService) SwitchToBookingSuccess(ctx context.Context, lineUserID string) error {
	if service == nil || service.channelAccessToken == "" || service.bookingSuccessID == "" || strings.TrimSpace(lineUserID) == "" {
		return nil
	}

	endpoint := fmt.Sprintf("https://api.line.me/v2/bot/user/%s/richmenu/%s", strings.TrimSpace(lineUserID), service.bookingSuccessID)
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
