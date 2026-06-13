import { useEffect, useState } from 'react'
import { bookingApi } from '../../../api/bookingApi'
import type { LineProfile } from '../../../integrations/liff'
import type { AvailabilitySlot, Booking } from '../../../types/booking'
import { cacheLatestBooking } from '../services/latestBookingApiCache'

type UseRescheduleBookingOptions = {
  booking: Booking | null
  lineProfile: LineProfile | null
  onBookingUpdated?: (booking: Booking) => void
  setBooking: (booking: Booking) => void
  setError: (message: string) => void
}

export function useRescheduleBooking({ booking, lineProfile, onBookingUpdated, setBooking, setError }: UseRescheduleBookingOptions) {
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false)
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleSlot, setRescheduleSlot] = useState('')
  const [rescheduleNotes, setRescheduleNotes] = useState('')
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const todayKey = new Date().toISOString().slice(0, 10)
  const rescheduleSlotSelectValue = slots.some((slot) => slot.time === rescheduleSlot) ? rescheduleSlot : ''

  useEffect(() => {
    if (!isRescheduleOpen || !booking?.serviceId || !rescheduleDate) return undefined
    let active = true
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset loading/error state when the reschedule availability request changes.
    setIsLoadingSlots(true)
    setError('')
    void bookingApi.listAvailability(booking.serviceId, rescheduleDate)
      .then((items) => {
        if (!active) return
        setSlots(items)
        if (!items.some((slot) => slot.time === rescheduleSlot && slot.available)) {
          setRescheduleSlot(items.find((slot) => slot.available)?.time ?? '')
        }
      })
      .catch(() => {
        if (active) setError('โหลดช่วงเวลาไม่สำเร็จ')
      })
      .finally(() => {
        if (active) setIsLoadingSlots(false)
      })
    return () => {
      active = false
    }
  }, [booking?.serviceId, isRescheduleOpen, rescheduleDate, rescheduleSlot, setError])

  const openRescheduleDialog = () => {
    if (!booking) return
    setRescheduleDate(booking.bookingDate)
    setRescheduleSlot(booking.slotTime)
    setRescheduleNotes(booking.notes ?? '')
    setIsRescheduleOpen(true)
  }

  const handleRescheduleBooking = async () => {
    if (!booking || !lineProfile?.userId || !rescheduleDate || !rescheduleSlot || isRescheduling) return
    setIsRescheduling(true)
    setError('')
    try {
      const updated = await bookingApi.rescheduleBooking(booking.id, {
        lineUserId: lineProfile.userId,
        bookingDate: rescheduleDate,
        slotTime: rescheduleSlot,
        notes: rescheduleNotes,
      })
      cacheLatestBooking(lineProfile.userId, updated)
      setBooking(updated)
      onBookingUpdated?.(updated)
      setIsRescheduleOpen(false)
    } catch {
      setError('เลื่อนนัดไม่สำเร็จ กรุณาเลือกเวลาใหม่')
    } finally {
      setIsRescheduling(false)
    }
  }

  return {
    handleRescheduleBooking,
    isLoadingSlots,
    isRescheduleOpen,
    isRescheduling,
    openRescheduleDialog,
    rescheduleDate,
    rescheduleNotes,
    rescheduleSlot,
    rescheduleSlotSelectValue,
    setIsRescheduleOpen,
    setRescheduleDate,
    setRescheduleNotes,
    setRescheduleSlot,
    slots,
    todayKey,
  }
}
