package services

import (
	"fmt"
	"time"
)

func formatThaiDateLabel(value string) string {
	date, err := time.Parse("2006-01-02", value)
	if err != nil {
		return fmt.Sprintf("วันที่ %s", value)
	}
	return fmt.Sprintf("วันที่ %d %s %d", date.Day(), thaiShortMonths[date.Month()-1], date.Year()+543)
}
