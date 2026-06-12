import { type Dispatch, type SetStateAction } from 'react'
import { adminApi, type BookingPayload } from '../../../api/adminApi'
import type { Booking, BookingStatus } from '../../../types/admin'
import { bookingMatchesFilters, sortBookingsByNewestCreated, upsertById } from '../utils/bookingCollections'

type BookingActionsOptions = {
  bookingQuery: string
  bookingStatusFilter: BookingStatus | 'all'
  loadData: () => Promise<void>
  refreshDailySummary: () => void
  selectedBookingDate: string
  setBookings: Dispatch<SetStateAction<Booking[]>>
  setNotice: Dispatch<SetStateAction<string>>
}

export function useBookingManagementActions({
  bookingQuery,
  bookingStatusFilter,
  loadData,
  refreshDailySummary,
  selectedBookingDate,
  setBookings,
  setNotice,
}: BookingActionsOptions) {
  const filters = { date: selectedBookingDate, query: bookingQuery, status: bookingStatusFilter }
  const handleStatusChange = async (booking: Booking, status: BookingStatus) => {
    const updatedBooking = { ...booking, status }
    setBookings((current) =>
      sortBookingsByNewestCreated(
        bookingMatchesFilters(updatedBooking, filters)
          ? current.map((item) => (item.id === booking.id ? updatedBooking : item))
          : current.filter((item) => item.id !== booking.id),
      ),
    )
    try {
      await adminApi.updateBookingStatus(booking.id, status)
      setNotice('อัปเดตสถานะคิวแล้ว')
    } catch {
      setNotice('อัปเดตสถานะไม่สำเร็จ')
      void loadData()
    }
  }

  const handleDeleteBooking = async (booking: Booking) => {
    setBookings((current) => current.filter((item) => item.id !== booking.id))
    try {
      await adminApi.deleteBooking(booking.id)
      setNotice('ยกเลิกและลบคิวแล้ว')
    } catch {
      setNotice('ยกเลิกคิวไม่สำเร็จ')
      void loadData()
    }
  }

  const handleUpdateBooking = async (booking: Booking, payload: BookingPayload) => {
    try {
      const updated = await adminApi.updateBooking(booking.id, payload)
      setBookings((current) =>
        sortBookingsByNewestCreated(
          bookingMatchesFilters(updated, filters)
            ? current.map((item) => (item.id === updated.id ? updated : item))
            : current.filter((item) => item.id !== updated.id),
        ),
      )
      setNotice('แก้ไขรายการจองแล้ว')
    } catch {
      setNotice('แก้ไขรายการจองไม่สำเร็จ')
      void loadData()
      throw new Error('update booking failed')
    }
  }

  const handleCreateBooking = async (payload: Omit<BookingPayload, 'status'>) => {
    try {
      const created = await adminApi.createBooking(payload)
      setBookings((current) =>
        sortBookingsByNewestCreated(bookingMatchesFilters(created, filters) ? upsertById(current, created) : current),
      )
      refreshDailySummary()
      setNotice('เพิ่มคิวจองแล้ว')
    } catch {
      setNotice('เพิ่มคิวจองไม่สำเร็จ')
      void loadData()
      throw new Error('create booking failed')
    }
  }

  const handleExportBookings = async () => {
    try {
      const blob = await adminApi.exportBookings(filters)
      const url = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = url
      link.download = `bookings-${selectedBookingDate}.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.URL.revokeObjectURL(url)
      setNotice('ส่งออกประวัติการจองแล้ว')
    } catch {
      setNotice('ส่งออกประวัติการจองไม่สำเร็จ')
    }
  }

  return { handleCreateBooking, handleDeleteBooking, handleExportBookings, handleStatusChange, handleUpdateBooking }
}
