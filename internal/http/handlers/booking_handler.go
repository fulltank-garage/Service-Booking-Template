package handlers

import (
	"encoding/csv"
	"errors"
	"net/http"
	"strconv"
	"time"

	"github.com/fulltank-garage/service-booking-template-api/internal/models"
	"github.com/fulltank-garage/service-booking-template-api/internal/services"
	"github.com/gin-gonic/gin"
	"gorm.io/gorm"
)

type BookingHandler struct {
	service *services.BookingService
}

func NewBookingHandler(service *services.BookingService) *BookingHandler {
	return &BookingHandler{service: service}
}

func (handler *BookingHandler) ListServices(c *gin.Context) {
	items, err := handler.service.ListServices(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, errorBody("โหลดรายการบริการไม่สำเร็จ"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (handler *BookingHandler) ListAdminServices(c *gin.Context) {
	items, err := handler.service.ListAdminServices(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, errorBody("โหลดรายการบริการไม่สำเร็จ"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (handler *BookingHandler) CreateService(c *gin.Context) {
	var input services.ServiceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูลไม่ถูกต้อง"))
		return
	}
	item, err := handler.service.CreateService(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusBadRequest, errorBody(err.Error()))
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": item})
}

func (handler *BookingHandler) UpdateService(c *gin.Context) {
	var input services.ServiceInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูลไม่ถูกต้อง"))
		return
	}
	item, err := handler.service.UpdateService(c.Request.Context(), c.Param("id"), input)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, errorBody(err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": item})
}

func (handler *BookingHandler) DeleteService(c *gin.Context) {
	if err := handler.service.DeleteService(c.Request.Context(), c.Param("id")); err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, errorBody(err.Error()))
		return
	}
	c.Status(http.StatusNoContent)
}

func (handler *BookingHandler) GetBookingSettings(c *gin.Context) {
	settings, err := handler.service.GetBookingSettings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, errorBody("โหลดตั้งค่าการจองไม่สำเร็จ"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": settings})
}

func (handler *BookingHandler) GetBookingRules(c *gin.Context) {
	settings, err := handler.service.GetBookingSettings(c.Request.Context())
	if err != nil {
		c.JSON(http.StatusInternalServerError, errorBody("โหลดตั้งค่าการจองไม่สำเร็จ"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": settings})
}

func (handler *BookingHandler) SaveBookingSettings(c *gin.Context) {
	var input services.BookingSettingsInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูลไม่ถูกต้อง"))
		return
	}
	settings, err := handler.service.SaveBookingSettings(c.Request.Context(), input)
	if err != nil {
		c.JSON(http.StatusBadRequest, errorBody(err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": settings})
}

func (handler *BookingHandler) Availability(c *gin.Context) {
	items, err := handler.service.ListAvailability(c.Request.Context(), c.Query("serviceId"), c.Query("date"))
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, errorBody(err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (handler *BookingHandler) CreateBooking(c *gin.Context) {
	var input services.CreateBookingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูลไม่ถูกต้อง"))
		return
	}
	booking, err := handler.service.CreateBooking(c.Request.Context(), input)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, services.ErrSlotUnavailable) || errors.Is(err, services.ErrActiveBookingExists) {
			status = http.StatusConflict
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, errorBody(err.Error()))
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": booking})
}

func (handler *BookingHandler) CreateAdminBooking(c *gin.Context) {
	var input services.CreateBookingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูลไม่ถูกต้อง"))
		return
	}
	booking, err := handler.service.CreateAdminBooking(c.Request.Context(), input)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, services.ErrSlotUnavailable) || errors.Is(err, services.ErrActiveBookingExists) {
			status = http.StatusConflict
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, errorBody(err.Error()))
		return
	}
	c.JSON(http.StatusCreated, gin.H{"data": booking})
}

func (handler *BookingHandler) LatestBooking(c *gin.Context) {
	booking, err := handler.service.LatestBookingByLineUser(c.Request.Context(), c.Query("lineUserId"))
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, errorBody(err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": booking})
}

func (handler *BookingHandler) DeleteBooking(c *gin.Context) {
	if err := handler.service.DeleteBooking(c.Request.Context(), c.Param("id")); err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, errorBody(err.Error()))
		return
	}
	c.Status(http.StatusNoContent)
}

func (handler *BookingHandler) CancelBooking(c *gin.Context) {
	var payload struct {
		LineUserID string `json:"lineUserId"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูลไม่ถูกต้อง"))
		return
	}
	if err := handler.service.CancelBookingByLineUser(c.Request.Context(), c.Param("id"), payload.LineUserID); err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, errorBody(err.Error()))
		return
	}
	c.Status(http.StatusNoContent)
}

func (handler *BookingHandler) RescheduleBooking(c *gin.Context) {
	var input services.RescheduleBookingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูลไม่ถูกต้อง"))
		return
	}
	booking, err := handler.service.RescheduleBookingByLineUser(c.Request.Context(), c.Param("id"), input)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, services.ErrSlotUnavailable) {
			status = http.StatusConflict
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, errorBody(err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": booking})
}

func (handler *BookingHandler) ListBookings(c *gin.Context) {
	items, err := handler.service.ListBookings(c.Request.Context(), models.BookingFilter{
		Status: c.Query("status"),
		Date:   c.Query("date"),
		Query:  c.Query("query"),
	})
	if err != nil {
		c.JSON(http.StatusInternalServerError, errorBody("โหลดรายการจองไม่สำเร็จ"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (handler *BookingHandler) DailySummary(c *gin.Context) {
	summary, err := handler.service.DailySummary(c.Request.Context(), c.Query("date"))
	if err != nil {
		c.JSON(http.StatusBadRequest, errorBody(err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": summary})
}

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

func (handler *BookingHandler) ReminderCandidates(c *gin.Context) {
	leadMinutes := 0
	if raw := c.Query("leadMinutes"); raw != "" {
		parsed, err := strconv.Atoi(raw)
		if err != nil {
			c.JSON(http.StatusBadRequest, errorBody("leadMinutes ไม่ถูกต้อง"))
			return
		}
		leadMinutes = parsed
	}
	items, err := handler.service.ListReminderCandidates(c.Request.Context(), time.Now(), leadMinutes)
	if err != nil {
		c.JSON(http.StatusInternalServerError, errorBody("โหลดรายการแจ้งเตือนไม่สำเร็จ"))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": items})
}

func (handler *BookingHandler) UpdateBooking(c *gin.Context) {
	var input services.UpdateBookingInput
	if err := c.ShouldBindJSON(&input); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูลไม่ถูกต้อง"))
		return
	}
	booking, err := handler.service.UpdateBooking(c.Request.Context(), c.Param("id"), input)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, services.ErrSlotUnavailable) {
			status = http.StatusConflict
		}
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, errorBody(err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": booking})
}

func (handler *BookingHandler) UpdateStatus(c *gin.Context) {
	var payload struct {
		Status string `json:"status"`
	}
	if err := c.ShouldBindJSON(&payload); err != nil {
		c.JSON(http.StatusBadRequest, errorBody("ข้อมูลไม่ถูกต้อง"))
		return
	}
	booking, err := handler.service.UpdateBookingStatus(c.Request.Context(), c.Param("id"), payload.Status)
	if err != nil {
		status := http.StatusBadRequest
		if errors.Is(err, gorm.ErrRecordNotFound) {
			status = http.StatusNotFound
		}
		c.JSON(status, errorBody(err.Error()))
		return
	}
	c.JSON(http.StatusOK, gin.H{"data": booking})
}

func errorBody(message string) gin.H {
	return gin.H{"error": gin.H{"message": message}}
}
