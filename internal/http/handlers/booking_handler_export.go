package handlers

import (
	"encoding/csv"
	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"github.com/gin-gonic/gin"
	"net/http"
	"strconv"
	"time"
)

func (handler *BookingHandler) ExportBookings(c *gin.Context) {
	items, err := handler.service.ListBookingsForExport(c.Request.Context(), models.BookingFilter{
		Status: c.Query("status"),
		Date:   c.Query("date"),
		From:   c.Query("from"),
		To:     c.Query("to"),
		Query:  c.Query("query"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, errorBody("export รายการจองไม่สำเร็จ"))
		return
	}

	c.Header("Content-Type", "text/csv; charset=utf-8")
	c.Header("Content-Disposition", "attachment; filename=bookings.csv")
	writer := csv.NewWriter(c.Writer)
	_ = writer.Write([]string{"booking_code", "customer_name", "phone", "service", "booking_date", "slot_time", "status", "no_show_count", "notes", "created_at"})
	for _, booking := range items {
		_ = writer.Write([]string{
			booking.BookingCode,
			booking.CustomerName,
			booking.Phone,
			booking.Service.NameTH,
			booking.BookingDate,
			booking.SlotTime,
			booking.Status,
			strconv.Itoa(booking.NoShowCount),
			booking.Notes,
			booking.CreatedAt.Format(time.RFC3339),
		})
	}
	writer.Flush()
}
