import { useMemo, useState } from 'react'
import type { BookingPayload } from '../../../api/adminApi'
import type { Booking, BookingStatus, ServiceItem } from '../../../types/admin'
import { isClosedBookingStatus } from '../utils/bookingStatus'

export function useBookingsCardState({
  bookings,
  onExportBookings,
  onUpdateBooking,
  selectedDate,
  services,
}: {
  bookings: Booking[]
  onExportBookings: () => void | Promise<void>
  onUpdateBooking: (booking: Booking, payload: BookingPayload) => Promise<void>
  selectedDate: string
  services: ServiceItem[]
}) {
  const [editingBooking, setEditingBooking] = useState<Booking | null>(null)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [serviceIdForCreate, setServiceIdForCreate] = useState('')
  const [bookingDateForCreate, setBookingDateForCreate] = useState(selectedDate)
  const [editServiceId, setEditServiceId] = useState('')
  const [editCustomerName, setEditCustomerName] = useState('')
  const [editPhone, setEditPhone] = useState('')
  const [editDate, setEditDate] = useState('')
  const [editSlotTime, setEditSlotTime] = useState('')
  const [editNotes, setEditNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)
  const [isExporting, setIsExporting] = useState(false)

  const nextBooking = useMemo(
    () =>
      bookings
        .filter((booking) => !isClosedBookingStatus(booking.status))
        .slice()
        .sort((a, b) => a.slotTime.localeCompare(b.slotTime))[0] ?? null,
    [bookings],
  )

  const openCreateBooking = () => {
    setServiceIdForCreate(services[0]?.id ?? '')
    setBookingDateForCreate(selectedDate)
    setIsCreateOpen(true)
  }

  const openEditBooking = (booking: Booking) => {
    if (isClosedBookingStatus(booking.status)) return
    setEditingBooking(booking)
    setEditServiceId(booking.serviceId)
    setEditCustomerName(booking.customerName)
    setEditPhone(booking.phone)
    setEditDate(booking.bookingDate)
    setEditSlotTime(booking.slotTime)
    setEditNotes(booking.notes ?? '')
  }

  const handleSaveBooking = async () => {
    if (!editingBooking || isSaving) return
    setIsSaving(true)
    try {
      await onUpdateBooking(editingBooking, {
        serviceId: editServiceId,
        customerName: editingBooking.customerName,
        phone: editingBooking.phone,
        bookingDate: editDate,
        slotTime: editSlotTime,
        notes: editNotes.trim(),
        status: editingBooking.status as BookingStatus,
      })
      setEditingBooking(null)
    } finally {
      setIsSaving(false)
    }
  }

  const handleExport = async () => {
    if (isExporting) return
    setIsExporting(true)
    try {
      await onExportBookings()
    } finally {
      setIsExporting(false)
    }
  }

  return {
    bookingDateForCreate,
    editCustomerName,
    editDate,
    editNotes,
    editPhone,
    editServiceId,
    editingBooking,
    editSlotTime,
    handleExport,
    handleSaveBooking,
    isCreateOpen,
    isExporting,
    isSaving,
    nextBooking,
    openCreateBooking,
    openEditBooking,
    serviceIdForCreate,
    setBookingDateForCreate,
    setEditDate,
    setEditingBooking,
    setEditNotes,
    setEditServiceId,
    setEditSlotTime,
    setIsCreateOpen,
    setServiceIdForCreate,
  }
}
