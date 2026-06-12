import { useEffect, useMemo, useState } from 'react'
import { bookingApi } from '../../../api/bookingApi'
import type { LineProfile } from '../../../integrations/liff'
import type { AvailabilitySlot, Booking, BookingRules, CreateBookingPayload, ServiceItem } from '../../../types/booking'
import { getBookingBootstrapCache, preloadBookingBootstrap } from '../bookingBootstrap'
import {
  addDays,
  findFirstAvailableDate,
  getDefaultBookingDate,
  isClosedBookingDate,
  parseClosedWeekdays,
  parseISODate,
  todayISO,
  toISODate,
} from '../utils/bookingWizardDates'
import { isActiveBookingError } from '../utils/bookingWizardInput'

type UseBookingWizardStateOptions = {
  lineProfile: LineProfile | null
  onBookingConfirmed?: (booking: Booking) => void
}

export function useBookingWizardState({ lineProfile, onBookingConfirmed }: UseBookingWizardStateOptions) {
  const bootstrapCache = getBookingBootstrapCache()
  const [services, setServices] = useState<ServiceItem[]>(() => bootstrapCache?.services ?? [])
  const [bookingRules, setBookingRules] = useState<BookingRules | null>(() => bootstrapCache?.rules ?? null)
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [bookingDate, setBookingDate] = useState(() => getDefaultBookingDate(bootstrapCache?.rules))
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = parseISODate(todayISO())
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState('')
  const [manualCustomerName, setManualCustomerName] = useState('')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null)
  const [isLoadingServices, setIsLoadingServices] = useState(() => !bootstrapCache)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    if (getBookingBootstrapCache()) return undefined
    let active = true
    void preloadBookingBootstrap()
      .then(({ services: items, rules }) => {
        if (!active) return
        setServices(items)
        setBookingRules(rules)
        setBookingDate((current) => getOpenBookingDate(current, rules))
      })
      .catch(() => {
        if (active) setError('โหลดข้อมูลไม่สำเร็จ')
      })
      .finally(() => {
        if (active) setIsLoadingServices(false)
      })
    setIsLoadingServices(true)
    setError('')
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selectedServiceId || !bookingDate) return undefined
    let active = true
    setIsLoadingSlots(true)
    setSelectedSlot('')
    setError('')
    void bookingApi.listAvailability(selectedServiceId, bookingDate)
      .then((items) => {
        if (!active) return
        setSlots(items)
        setSelectedSlot(items.find((slot) => slot.available)?.time ?? '')
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
  }, [bookingDate, selectedServiceId])

  const customerName = lineProfile?.displayName ?? manualCustomerName
  const todayKey = todayISO()
  const maxDateKey = toISODate(addDays(parseISODate(todayKey), bookingRules?.maxAdvanceDays ?? 60))
  const canSubmit = Boolean(selectedServiceId && bookingDate && selectedSlot && customerName.trim() && phone.trim())
  const showInitialSkeleton = isLoadingServices && services.length === 0
  const blackoutDates = useMemo(() => new Set((bookingRules?.blackoutDates ?? []).map((item) => item.date)), [bookingRules?.blackoutDates])
  const closedWeekdays = useMemo(() => parseClosedWeekdays(bookingRules?.closedWeekdays), [bookingRules?.closedWeekdays])
  const selectedService = useMemo(() => services.find((service) => service.id === selectedServiceId) ?? null, [selectedServiceId, services])

  const handleSubmit = async () => {
    if (!canSubmit) return
    const payload: CreateBookingPayload = {
      serviceId: selectedServiceId,
      customerName: customerName.trim(),
      phone: phone.trim(),
      bookingDate,
      slotTime: selectedSlot,
      lineUserId: lineProfile?.userId,
      notes: notes.trim(),
    }
    setIsSubmitting(true)
    setError('')
    try {
      const booking = await bookingApi.createBooking(payload)
      setConfirmedBooking(booking)
      onBookingConfirmed?.(booking)
    } catch (error) {
      setError(isActiveBookingError(error) ? 'คุณมีรายการจองที่ยังใช้งานอยู่แล้ว กรุณาเปิดหน้าข้อมูลการจองเพื่อตรวจสอบหรือยกเลิกก่อนจองใหม่' : 'ส่งคำขอจองคิวไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setIsSubmitting(false)
    }
  }

  return {
    blackoutDates,
    bookingDate,
    canSubmit,
    closedWeekdays,
    confirmedBooking,
    customerName,
    error,
    handleSubmit,
    isLoadingServices,
    isLoadingSlots,
    isSubmitting,
    maxDateKey,
    notes,
    phone,
    selectedService,
    selectedServiceId,
    selectedSlot,
    services,
    setBookingDate,
    setConfirmedBooking,
    setManualCustomerName,
    setNotes,
    setPhone,
    setSelectedServiceId,
    setSelectedSlot,
    setVisibleMonth,
    showInitialSkeleton,
    slots,
    todayKey,
    visibleMonth,
  }
}

const getOpenBookingDate = (current: string, rules: BookingRules) => {
  const closedWeekdays = parseClosedWeekdays(rules.closedWeekdays)
  const blackoutDates = new Set((rules.blackoutDates ?? []).map((item) => item.date))
  if (!isClosedBookingDate(current, closedWeekdays, blackoutDates)) return current
  const maxDateKey = toISODate(addDays(parseISODate(todayISO()), rules.maxAdvanceDays ?? 60))
  return findFirstAvailableDate(todayISO(), maxDateKey, closedWeekdays, blackoutDates)
}
