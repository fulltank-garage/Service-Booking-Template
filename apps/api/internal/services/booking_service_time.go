package services

import (
	"fmt"
	"math/rand"
	"strings"
	"time"
)

func clockMinutes(value string) (int, bool) {
	parsed, err := time.Parse("15:04", value)
	if err != nil {
		return 0, false
	}
	return parsed.Hour()*60 + parsed.Minute(), true
}

func bookingStartTime(date string, slot string) (time.Time, error) {
	return time.ParseInLocation("2006-01-02 15:04", date+" "+slot, bangkokLocation())
}

func bangkokLocation() *time.Location {
	location, err := time.LoadLocation("Asia/Bangkok")
	if err != nil {
		return time.FixedZone("ICT", 7*60*60)
	}
	return location
}

func bookingCode(date string) string {
	parts := strings.Split(date, "-")
	if len(parts) == 3 {
		return fmt.Sprintf("Q-%s%s-%04d", parts[2], parts[1], rand.Intn(10000))
	}
	return fmt.Sprintf("Q-%04d", rand.Intn(10000))
}
