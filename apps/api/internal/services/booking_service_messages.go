package services

import (
	"context"
	"fmt"
	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"log"
	"strings"
)

func (service *BookingService) switchToBookingMenu(ctx context.Context, lineUserID string) {
	if service.richMenuSwitcher == nil || strings.TrimSpace(lineUserID) == "" {
		return
	}
	if err := service.richMenuSwitcher.SwitchToBookingMenu(ctx, lineUserID); err != nil {
		log.Printf("switch line rich menu to booking menu: %v", err)
	}
}

func (service *BookingService) sendCustomerMessage(ctx context.Context, booking models.Booking, message string) {
	if service.customerMessenger == nil || strings.TrimSpace(booking.LineUserID) == "" || strings.TrimSpace(message) == "" {
		return
	}
	if err := service.customerMessenger.SendBookingMessage(ctx, booking.LineUserID, message); err != nil {
		log.Printf("send line booking message: %v", err)
	}
}

func bookingCreatedMessage(booking models.Booking) string {
	return fmt.Sprintf(
		"ร้านได้รับคิวแล้ว\nเลขที่จอง: %s\nบริการ: %s\nวันที่: %s\nเวลา: %s\nรอร้านตรวจสอบและยืนยันคิวให้คุณ",
		booking.BookingCode,
		bookingServiceName(booking),
		formatThaiDateLabel(booking.BookingDate),
		booking.SlotTime,
	)
}

func bookingRescheduledMessage(booking models.Booking) string {
	return fmt.Sprintf(
		"เปลี่ยนวันและเวลาให้แล้ว\nเลขที่จอง: %s\nวันที่: %s\nเวลา: %s\nร้านได้รับข้อมูลการเลื่อนนัดของคุณแล้ว",
		booking.BookingCode,
		formatThaiDateLabel(booking.BookingDate),
		booking.SlotTime,
	)
}

func bookingStatusMessage(booking models.Booking) string {
	title, detail := bookingCustomerStatusCopy(booking.Status)
	return fmt.Sprintf(
		"%s\nเลขที่จอง: %s\n%s",
		title,
		booking.BookingCode,
		detail,
	)
}

func bookingCancelledMessage(booking models.Booking) string {
	return fmt.Sprintf("คิวนี้ถูกยกเลิกแล้ว\nเลขที่จอง: %s\nหากต้องการใช้บริการ กรุณาจองคิวใหม่", booking.BookingCode)
}

func bookingServiceName(booking models.Booking) string {
	if strings.TrimSpace(booking.Service.NameTH) != "" {
		return booking.Service.NameTH
	}
	if strings.TrimSpace(booking.Service.NameEN) != "" {
		return booking.Service.NameEN
	}
	return "-"
}

func bookingStatusLabel(status string) string {
	switch status {
	case models.BookingStatusConfirmed:
		return "ยืนยันแล้ว"
	case models.BookingStatusCompleted:
		return "เสร็จสิ้น"
	case models.BookingStatusCancelled:
		return "ยกเลิก"
	case models.BookingStatusNoShow:
		return "ไม่มาตามนัด"
	default:
		return "รอจัดการ"
	}
}

func bookingCustomerStatusCopy(status string) (string, string) {
	switch status {
	case models.BookingStatusConfirmed:
		return "ร้านยืนยันคิวแล้ว", "กรุณามาตามวันและเวลานัด"
	case models.BookingStatusCompleted:
		return "ใช้บริการเรียบร้อยแล้ว", "ขอบคุณที่มาใช้บริการ คุณสามารถจองคิวใหม่ได้เมื่อต้องการ"
	case models.BookingStatusCancelled:
		return "คิวนี้ถูกยกเลิกแล้ว", "หากต้องการใช้บริการ กรุณาจองคิวใหม่"
	case models.BookingStatusNoShow:
		return "ไม่ได้มาตามนัด", "หากต้องการใช้บริการ กรุณาจองคิวใหม่"
	default:
		return "ร้านได้รับคิวแล้ว", "รอร้านตรวจสอบและยืนยันคิวให้คุณ"
	}
}
