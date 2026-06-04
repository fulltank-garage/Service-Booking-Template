package services

import (
	"context"
	"encoding/json"
	"fmt"
	"io"
	"log"
	"strings"

	webpush "github.com/SherClockHolmes/webpush-go"
	"github.com/fulltank-garage/service-booking-template-api/internal/models"
)

type PushMessage struct {
	Title string `json:"title"`
	Body  string `json:"body"`
	URL   string `json:"url"`
}

type PushSender interface {
	Send(ctx context.Context, subscription models.PushSubscription, message PushMessage) error
}

type WebPushSender struct {
	publicKey  string
	privateKey string
	subject    string
}

func NewWebPushSender(publicKey string, privateKey string, subject string) *WebPushSender {
	publicKey = strings.TrimSpace(publicKey)
	privateKey = strings.TrimSpace(privateKey)
	if publicKey == "" || privateKey == "" {
		return nil
	}

	subject = strings.TrimSpace(subject)
	if subject == "" {
		subject = "mailto:admin@example.com"
	} else if !strings.Contains(subject, ":") {
		subject = "mailto:" + subject
	}

	return &WebPushSender{publicKey: publicKey, privateKey: privateKey, subject: subject}
}

func (sender *WebPushSender) Send(ctx context.Context, subscription models.PushSubscription, message PushMessage) error {
	if sender == nil {
		return nil
	}

	payload, err := json.Marshal(message)
	if err != nil {
		return err
	}

	response, err := webpush.SendNotificationWithContext(ctx, payload, &webpush.Subscription{
		Endpoint: subscription.Endpoint,
		Keys: webpush.Keys{
			P256dh: subscription.P256DH,
			Auth:   subscription.Auth,
		},
	}, &webpush.Options{
		Subscriber:      sender.subject,
		VAPIDPublicKey:  sender.publicKey,
		VAPIDPrivateKey: sender.privateKey,
		TTL:             60,
	})
	if response != nil {
		_, _ = io.Copy(io.Discard, response.Body)
		_ = response.Body.Close()
		if response.StatusCode >= 400 {
			return fmt.Errorf("web push response status %d", response.StatusCode)
		}
	}
	if err != nil {
		log.Printf("send web push: %v", err)
	}
	return err
}
