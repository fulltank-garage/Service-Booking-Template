package services

import (
	"context"
	"crypto/elliptic"
	"encoding/base64"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"log"
	"net/mail"
	"net/url"
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

var ErrExpiredPushSubscription = errors.New("expired push subscription")

type PushError struct {
	StatusCode int
	Body       string
}

func (err *PushError) Error() string {
	if err.Body != "" {
		return fmt.Sprintf("web push response status %d: %s", err.StatusCode, err.Body)
	}
	return fmt.Sprintf("web push response status %d", err.StatusCode)
}

func (err *PushError) Is(target error) bool {
	return target == ErrExpiredPushSubscription && (err.StatusCode == 404 || err.StatusCode == 410)
}

type WebPushSender struct {
	publicKey  string
	privateKey string
	subject    string
}

const webPushTTLSeconds = 24 * 60 * 60
const defaultVAPIDSubject = "https://example.com"

func DecodeVAPIDKey(key string) ([]byte, error) {
	key = strings.TrimSpace(key)
	if key == "" {
		return nil, errors.New("empty VAPID key")
	}
	if bytes, err := base64.RawURLEncoding.DecodeString(key); err == nil {
		return bytes, nil
	}
	return base64.URLEncoding.DecodeString(key)
}

func ValidateVAPIDKeyPair(publicKey string, privateKey string) error {
	publicBytes, err := DecodeVAPIDKey(publicKey)
	if err != nil {
		return fmt.Errorf("invalid VAPID public key: %w", err)
	}
	privateBytes, err := DecodeVAPIDKey(privateKey)
	if err != nil {
		return fmt.Errorf("invalid VAPID private key: %w", err)
	}
	if len(privateBytes) != 32 {
		return fmt.Errorf("invalid VAPID private key length: got %d", len(privateBytes))
	}

	curve := elliptic.P256()
	x, y := curve.ScalarBaseMult(privateBytes)
	if x == nil || y == nil {
		return errors.New("invalid VAPID private key")
	}
	derivedPublicKey := elliptic.Marshal(curve, x, y)
	if string(publicBytes) != string(derivedPublicKey) {
		return errors.New("VAPID public key does not match private key")
	}
	return nil
}

func normalizeVAPIDSubject(subject string) string {
	subject = strings.TrimSpace(subject)
	if subject == "" {
		return defaultVAPIDSubject
	}
	if strings.HasPrefix(subject, "mailto:") {
		subject = strings.TrimSpace(strings.TrimPrefix(subject, "mailto:"))
	}
	if parsedURL, err := url.Parse(subject); err == nil && parsedURL.Scheme == "https" && parsedURL.Host != "" {
		return subject
	}
	if address, err := mail.ParseAddress(subject); err == nil {
		domain := strings.ToLower(address.Address[strings.LastIndex(address.Address, "@")+1:])
		if domain != "" && !strings.HasSuffix(domain, ".local") && strings.Contains(domain, ".") {
			return address.Address
		}
	}
	return defaultVAPIDSubject
}

func NewWebPushSender(publicKey string, privateKey string, subject string) *WebPushSender {
	publicKey = strings.TrimSpace(publicKey)
	privateKey = strings.TrimSpace(privateKey)
	if publicKey == "" || privateKey == "" {
		return nil
	}

	subject = normalizeVAPIDSubject(subject)

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
		TTL:             webPushTTLSeconds,
		Urgency:         webpush.UrgencyHigh,
	})
	if response != nil {
		body, _ := io.ReadAll(io.LimitReader(response.Body, 512))
		_ = response.Body.Close()
		if response.StatusCode >= 400 {
			return &PushError{StatusCode: response.StatusCode, Body: strings.TrimSpace(string(body))}
		}
	}
	if err != nil {
		log.Printf("send web push: %v", err)
	}
	return err
}
