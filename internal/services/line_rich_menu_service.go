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
	bookingID          string
	bookingSuccessID   string
	httpClient         *http.Client
}

func NewLineRichMenuService(channelAccessToken string, bookingID string, bookingSuccessID string) *LineRichMenuService {
	return &LineRichMenuService{
		channelAccessToken: strings.TrimSpace(channelAccessToken),
		bookingID:          strings.TrimSpace(bookingID),
		bookingSuccessID:   strings.TrimSpace(bookingSuccessID),
		httpClient:         &http.Client{Timeout: 8 * time.Second},
	}
}

func (service *LineRichMenuService) SwitchToBookingSuccess(ctx context.Context, lineUserID string) error {
	return service.switchToRichMenu(ctx, lineUserID, service.bookingSuccessID)
}

func (service *LineRichMenuService) SwitchToBookingMenu(ctx context.Context, lineUserID string) error {
	return service.switchToRichMenu(ctx, lineUserID, service.bookingID)
}

func (service *LineRichMenuService) switchToRichMenu(ctx context.Context, lineUserID string, richMenuID string) error {
	if service == nil || service.channelAccessToken == "" || strings.TrimSpace(richMenuID) == "" || strings.TrimSpace(lineUserID) == "" {
		return nil
	}

	endpoint := fmt.Sprintf("https://api.line.me/v2/bot/user/%s/richmenu/%s", strings.TrimSpace(lineUserID), strings.TrimSpace(richMenuID))
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
