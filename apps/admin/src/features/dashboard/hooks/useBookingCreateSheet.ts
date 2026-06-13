import { useEffect, useMemo, useState } from 'react'
import type { BookingPayload } from '../../../api/adminApi'
import { adminApi } from '../../../api/adminApi'
import type { BookingSettings, ServiceItem } from '../../../types/admin'
import { addDaysToISODate, todayISO } from '../../../utils/dateFormat'
import { digitsOnly } from '../utils/formatters'
import { getBookingDateBlockReason } from '../utils/bookingDateRules'

export function useBookingCreateSheet({
  bookingDate,
  bookingSettings,
  isOpen,
  onBookingDateChange,
  onCreate,
  onServiceIdChange,
  selectedDate,
  serviceId,
  services,
}: {
  bookingDate: string
  bookingSettings: BookingSettings | null
  isOpen: boolean
  onBookingDateChange: (value: string) => void
  onCreate: (payload: Omit<BookingPayload, 'status'>) => Promise<void>
  onServiceIdChange: (value: string) => void
  selectedDate: string
  serviceId: string
  services: ServiceItem[]
}) {
  const [customerName, setCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [slotTime, setSlotTime] = useState('')
  const [slots, setSlots] = useState<Array<{ time: string; available: boolean }>>([])
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [slotError, setSlotError] = useState('')
  const [notes, setNotes] = useState('')
  const [isSaving, setIsSaving] = useState(false)

  const bookingDateBlockReason = useMemo(() => getBookingDateBlockReason(bookingDate, bookingSettings), [bookingDate, bookingSettings])
  const maxBookingDate = useMemo(() => addDaysToISODate(todayISO(), bookingSettings?.maxAdvanceDays ?? 60), [bookingSettings?.maxAdvanceDays])

  const clearSelectedSlot = () => {
    setSlotTime('')
    setSlots([])
    setSlotError('')
  }

  const reset = () => {
    onServiceIdChange(services[0]?.id ?? '')
    setCustomerName('')
    setPhone('')
    onBookingDateChange(selectedDate)
    clearSelectedSlot()
    setNotes('')
  }

  const handleBookingDateChange = (value: string) => {
    onBookingDateChange(value)
    clearSelectedSlot()
  }

  useEffect(() => {
    if (!isOpen || !serviceId || !bookingDate || bookingDateBlockReason) return undefined
    let active = true
    const loadSlots = async () => {
      setIsLoadingSlots(true)
      setSlotError('')
      setSlotTime('')
      try {
        const items = await adminApi.listAvailability(serviceId, bookingDate)
        if (!active) return
        setSlots(items)
        setSlotTime(items.find((slot) => slot.available)?.time ?? '')
      } catch {
        if (!active) return
        setSlots([])
        setSlotError('โหลดช่วงเวลาไม่สำเร็จ')
      } finally {
        if (active) setIsLoadingSlots(false)
      }
    }
    void loadSlots()
    return () => {
      active = false
    }
  }, [bookingDate, bookingDateBlockReason, isOpen, serviceId])

  const handleCreate = async () => {
    if (isSaving || !serviceId || !phone.trim() || !bookingDate || bookingDateBlockReason || !slotTime) return
    setIsSaving(true)
    try {
      await onCreate({
        serviceId,
        customerName: customerName.trim() || 'ลูกค้า Walk-in',
        phone: digitsOnly(phone),
        bookingDate,
        slotTime,
        notes: notes.trim(),
      })
      reset()
    } finally {
      setIsSaving(false)
    }
  }

  return {
    bookingDateBlockReason,
    customerName,
    handleBookingDateChange,
    handleCreate,
    isLoadingSlots,
    isSaving,
    maxBookingDate,
    notes,
    phone,
    setCustomerName,
    setNotes,
    setPhone,
    setSlotTime,
    slotError,
    slots,
    slotTime,
  }
}
