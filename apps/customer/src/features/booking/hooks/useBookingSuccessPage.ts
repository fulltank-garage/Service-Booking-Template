import { useEffect, useRef, useState } from 'react'
import { bookingApi } from '../../../api/bookingApi'
import { closeLiffWindow, type LineProfile } from '../../../integrations/liff'
import type { Booking } from '../../../types/booking'
import {
  forgetLatestBooking,
  isClosedBookingStatus,
  isNotFoundError,
  loadLatestBooking,
} from '../services/latestBookingApiCache'
import { useRescheduleBooking } from './useRescheduleBooking'

const bookingRefreshIntervalMs = 5_000

type UseBookingSuccessPageOptions = {
  autoCloseOnSuccess: boolean
  fallbackBooking: Booking | null
  lineProfile: LineProfile | null
  onBookingCancelled: () => void
  onBookingUpdated?: (booking: Booking) => void
}

const closeStaleBookingDetails = (lineUserId: string, setBooking: (booking: Booking | null) => void, onBookingCancelled: () => void) => {
  forgetLatestBooking(lineUserId)
  setBooking(null)
  onBookingCancelled()
}

export function useBookingSuccessPage({
  autoCloseOnSuccess,
  fallbackBooking,
  lineProfile,
  onBookingCancelled,
  onBookingUpdated,
}: UseBookingSuccessPageOptions) {
  const [booking, setBooking] = useState<Booking | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(lineProfile?.userId))
  const [error, setError] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const fallbackBookingRef = useRef(fallbackBooking)
  const onBookingCancelledRef = useRef(onBookingCancelled)
  const onBookingUpdatedRef = useRef(onBookingUpdated)
  const displayedBooking = lineProfile?.userId ? booking : fallbackBooking
  const displayedBookingId = displayedBooking?.id ?? ''
  const reschedule = useRescheduleBooking({
    booking: displayedBooking,
    lineProfile,
    onBookingUpdated: onBookingUpdatedRef.current,
    setBooking,
    setError,
  })

  useEffect(() => {
    fallbackBookingRef.current = fallbackBooking
    onBookingCancelledRef.current = onBookingCancelled
    onBookingUpdatedRef.current = onBookingUpdated
  }, [fallbackBooking, onBookingCancelled, onBookingUpdated])

  useEffect(() => {
    if (!lineProfile?.userId) return
    let active = true
    void loadLatestBooking(lineProfile.userId)
      .then((latestBooking) => {
        if (!active) return
        if (isClosedBookingStatus(latestBooking.status)) {
          closeStaleBookingDetails(lineProfile.userId, setBooking, onBookingCancelledRef.current)
        } else {
          setBooking(latestBooking)
          onBookingUpdatedRef.current?.(latestBooking)
        }
      })
      .catch((error) => {
        if (!active) return
        if (isNotFoundError(error)) closeStaleBookingDetails(lineProfile.userId, setBooking, onBookingCancelledRef.current)
        else {
          setBooking(fallbackBookingRef.current)
          setError('โหลดข้อมูลการจองล่าสุดไม่สำเร็จ')
        }
      })
      .finally(() => {
        if (active) setIsLoading(false)
      })
    return () => {
      active = false
    }
  }, [lineProfile?.userId])

  useEffect(() => {
    if (!lineProfile?.userId || !displayedBookingId) return undefined
    let active = true
    const refreshBooking = async () => {
      try {
        const latestBooking = await loadLatestBooking(lineProfile.userId, { force: true })
        if (!active) return
        if (isClosedBookingStatus(latestBooking.status)) closeStaleBookingDetails(lineProfile.userId, setBooking, onBookingCancelledRef.current)
        else {
          setBooking(latestBooking)
          onBookingUpdatedRef.current?.(latestBooking)
        }
      } catch (error) {
        if (active && isNotFoundError(error)) closeStaleBookingDetails(lineProfile.userId, setBooking, onBookingCancelledRef.current)
      }
    }
    const refreshWhenVisible = () => {
      if (!document.hidden) void refreshBooking()
    }
    const interval = window.setInterval(refreshBooking, bookingRefreshIntervalMs)
    document.addEventListener('visibilitychange', refreshWhenVisible)
    window.addEventListener('focus', refreshWhenVisible)
    return () => {
      active = false
      window.clearInterval(interval)
      document.removeEventListener('visibilitychange', refreshWhenVisible)
      window.removeEventListener('focus', refreshWhenVisible)
    }
  }, [displayedBookingId, lineProfile?.userId])

  useEffect(() => {
    if (!autoCloseOnSuccess || !displayedBooking) return undefined
    const timer = window.setTimeout(() => closeLiffWindow(), 1800)
    return () => window.clearTimeout(timer)
  }, [autoCloseOnSuccess, displayedBooking])

  const handleCancelBooking = async () => {
    if (!displayedBooking || !lineProfile?.userId || isCancelling) return
    setIsCancelling(true)
    setError('')
    try {
      await bookingApi.cancelBooking(displayedBooking.id, lineProfile.userId)
      onBookingCancelled()
    } catch {
      setError('ยกเลิกการจองไม่สำเร็จ')
    } finally {
      setIsCancelling(false)
    }
  }

  return {
    displayedBooking,
    error,
    handleCancelBooking,
    isCancelling,
    isLoading,
    ...reschedule,
  }
}
