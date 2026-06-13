package services

import (
	"crypto/hmac"
	"crypto/rand"
	"crypto/sha256"
	"crypto/subtle"
	"encoding/base64"
	"encoding/hex"
	"fmt"
	"io"
	"strconv"
	"time"
)

func (service *AuthService) sign(email string, expiresAt time.Time) string {
	emailPart := base64.RawURLEncoding.EncodeToString([]byte(email))
	expiresPart := strconv.FormatInt(expiresAt.Unix(), 10)
	return fmt.Sprintf("%s.%s.%s", emailPart, expiresPart, service.signature(email, expiresAt))
}

func (service *AuthService) signature(email string, expiresAt time.Time) string {
	mac := hmac.New(sha256.New, service.secret)
	_, _ = mac.Write([]byte(email))
	_, _ = mac.Write([]byte("."))
	_, _ = mac.Write([]byte(strconv.FormatInt(expiresAt.Unix(), 10)))
	return base64.RawURLEncoding.EncodeToString(mac.Sum(nil))
}

func (service *AuthService) passwordHash(password string) string {
	mac := hmac.New(sha256.New, service.secret)
	_, _ = mac.Write([]byte("admin-password."))
	_, _ = mac.Write([]byte(password))
	return hex.EncodeToString(mac.Sum(nil))
}

func (service *AuthService) tokenHash(token string) string {
	sum := sha256.Sum256([]byte(token))
	return hex.EncodeToString(sum[:])
}

func randomToken() (string, error) {
	buffer := make([]byte, 32)
	if _, err := io.ReadFull(rand.Reader, buffer); err != nil {
		return "", err
	}
	return base64.RawURLEncoding.EncodeToString(buffer), nil
}

func constantTimeEqual(left string, right string) bool {
	return subtle.ConstantTimeCompare([]byte(left), []byte(right)) == 1
}
