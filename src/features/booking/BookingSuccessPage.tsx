import { useEffect, useRef, useState } from 'react'
import type { ReactNode } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  Grid,
  MenuItem,
  Portal,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import axios from 'axios'
import { bookingApi } from '../../api/bookingApi'
import type { AvailabilitySlot, Booking } from '../../types/booking'
import { closeLiffWindow, type LineProfile } from '../../integrations/liff'
import { overlay } from '../../theme/theme'
import { formatThaiDateLabel } from '../../utils/dateFormat'

type BookingSuccessPageProps = {
  autoCloseOnSuccess?: boolean
  fallbackBooking: Booking | null
  lineProfile: LineProfile | null
  onBookingCancelled: () => void
}

const latestBookingCache = new Map<string, Booking>()
const latestBookingRequests = new Map<string, Promise<Booking>>()
const bookingRefreshIntervalMs = 5_000

const isNotFoundError = (error: unknown) => axios.isAxiosError(error) && error.response?.status === 404

const forgetLatestBooking = (lineUserId: string) => {
  latestBookingCache.delete(lineUserId)
  latestBookingRequests.delete(lineUserId)
}

const loadLatestBooking = (lineUserId: string, options?: { force?: boolean }) => {
  if (!options?.force) {
    const existingRequest = latestBookingRequests.get(lineUserId)
    if (existingRequest) {
      return existingRequest
    }
  }
  const request = bookingApi.latestBookingByLineUser(lineUserId)
    .then((booking) => {
      latestBookingCache.set(lineUserId, booking)
      return booking
    })
    .catch((error) => {
      latestBookingRequests.delete(lineUserId)
      throw error
    })
    .finally(() => {
      latestBookingRequests.delete(lineUserId)
    })
  latestBookingRequests.set(lineUserId, request)
  return request
}

export function BookingSuccessPage({ autoCloseOnSuccess = false, fallbackBooking, lineProfile, onBookingCancelled }: BookingSuccessPageProps) {
  const [booking, setBooking] = useState<Booking | null>(null)
  const [isLoading, setIsLoading] = useState(Boolean(lineProfile?.userId))
  const [error, setError] = useState('')
  const [isCancelling, setIsCancelling] = useState(false)
  const [isRescheduleOpen, setIsRescheduleOpen] = useState(false)
  const [isRescheduling, setIsRescheduling] = useState(false)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [rescheduleDate, setRescheduleDate] = useState('')
  const [rescheduleSlot, setRescheduleSlot] = useState('')
  const [rescheduleNotes, setRescheduleNotes] = useState('')
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const fallbackBookingRef = useRef(fallbackBooking)
  const displayedBooking = lineProfile?.userId ? booking : fallbackBooking
  const displayedBookingId = displayedBooking?.id ?? ''
  const fallbackBookingId = fallbackBooking?.id ?? ''
  const todayKey = new Date().toISOString().slice(0, 10)
  const rescheduleSlotSelectValue = slots.some((slot) => slot.time === rescheduleSlot) ? rescheduleSlot : ''
  const onBookingCancelledRef = useRef(onBookingCancelled)

  useEffect(() => {
    fallbackBookingRef.current = fallbackBooking
  }, [fallbackBooking])

  useEffect(() => {
    onBookingCancelledRef.current = onBookingCancelled
  }, [onBookingCancelled])

  useEffect(() => {
    if (!lineProfile?.userId) {
      return
    }
    let active = true
    const load = async () => {
      setIsLoading(true)
      setError('')
      try {
        const latestBooking = await loadLatestBooking(lineProfile.userId)
        if (active) setBooking(latestBooking)
      } catch (error) {
        if (active) {
          if (isNotFoundError(error)) {
            forgetLatestBooking(lineProfile.userId)
            setBooking(null)
            onBookingCancelledRef.current()
          } else {
            setBooking(fallbackBookingRef.current)
            setError('โหลดข้อมูลการจองล่าสุดไม่สำเร็จ')
          }
        }
      } finally {
        if (active) setIsLoading(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [fallbackBookingId, lineProfile?.userId])

  useEffect(() => {
    if (!lineProfile?.userId || !displayedBookingId) {
      return undefined
    }

    let active = true
    const refreshBooking = async () => {
      try {
        const latestBooking = await loadLatestBooking(lineProfile.userId, { force: true })
        if (active) setBooking(latestBooking)
      } catch (error) {
        if (!active) return
        if (isNotFoundError(error)) {
          forgetLatestBooking(lineProfile.userId)
          setBooking(null)
          onBookingCancelledRef.current()
        }
      }
    }

    const refreshWhenVisible = () => {
      if (!document.hidden) {
        void refreshBooking()
      }
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
    if (!autoCloseOnSuccess || !displayedBooking) {
      return undefined
    }

    const timer = window.setTimeout(() => closeLiffWindow(), 1800)
    return () => window.clearTimeout(timer)
  }, [autoCloseOnSuccess, displayedBooking])

  const handleCancelBooking = async () => {
    if (!displayedBooking || !lineProfile?.userId || isCancelling) {
      return
    }

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

  const openRescheduleDialog = () => {
    if (!displayedBooking) return
    setRescheduleDate(displayedBooking.bookingDate)
    setRescheduleSlot(displayedBooking.slotTime)
    setRescheduleNotes(displayedBooking.notes ?? '')
    setIsRescheduleOpen(true)
  }

  useEffect(() => {
    if (!isRescheduleOpen || !displayedBooking?.serviceId || !rescheduleDate) {
      return undefined
    }

    let active = true
    const load = async () => {
      setIsLoadingSlots(true)
      setError('')
      try {
        const items = await bookingApi.listAvailability(displayedBooking.serviceId, rescheduleDate)
        if (!active) return
        setSlots(items)
        const selectedStillAvailable = items.some((slot) => slot.time === rescheduleSlot && slot.available)
        if (!selectedStillAvailable) {
          setRescheduleSlot(items.find((slot) => slot.available)?.time ?? '')
        }
      } catch {
        if (active) setError('โหลดช่วงเวลาไม่สำเร็จ')
      } finally {
        if (active) setIsLoadingSlots(false)
      }
    }
    void load()

    return () => {
      active = false
    }
  }, [displayedBooking?.serviceId, isRescheduleOpen, rescheduleDate, rescheduleSlot])

  const handleRescheduleBooking = async () => {
    if (!displayedBooking || !lineProfile?.userId || !rescheduleDate || !rescheduleSlot || isRescheduling) {
      return
    }

    setIsRescheduling(true)
    setError('')
    try {
      const updated = await bookingApi.rescheduleBooking(displayedBooking.id, {
        lineUserId: lineProfile.userId,
        bookingDate: rescheduleDate,
        slotTime: rescheduleSlot,
        notes: rescheduleNotes,
      })
      if (lineProfile?.userId) {
        latestBookingCache.set(lineProfile.userId, updated)
      }
      setBooking(updated)
      setIsRescheduleOpen(false)
    } catch {
      setError('เลื่อนนัดไม่สำเร็จ กรุณาเลือกเวลาใหม่')
    } finally {
      setIsRescheduling(false)
    }
  }

  if (isLoading) {
    return (
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: 2.25 }}>
          <Stack spacing={2.4}>
            <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
              <Skeleton variant="rounded" width={54} height={54} sx={{ borderRadius: 2.4, bgcolor: 'divider', flexShrink: 0 }} />
              <Box sx={{ minWidth: 0, flex: 1 }}>
                <Skeleton variant="text" width="72%" height={40} sx={{ bgcolor: 'divider' }} />
                <Skeleton variant="text" width="42%" height={26} sx={{ bgcolor: 'divider' }} />
              </Box>
            </Stack>
            <Skeleton variant="rectangular" height={74} sx={{ borderRadius: 3, bgcolor: 'divider' }} />
            <Grid container spacing={1.4}>
              {Array.from({ length: 4 }).map((_, index) => (
                <Grid size={{ xs: 12, sm: 6 }} key={`booking-info-skeleton-${index}`}>
                  <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 1.4 }}>
                    <Skeleton variant="text" width={78} height={18} sx={{ bgcolor: 'divider' }} />
                    <Skeleton variant="text" width="68%" height={28} sx={{ mt: 0.35, bgcolor: 'divider' }} />
                  </Box>
                </Grid>
              ))}
            </Grid>
            <Divider />
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
              <Skeleton variant="rectangular" height={38} sx={{ flex: 1, borderRadius: 2, bgcolor: 'divider' }} />
              <Skeleton variant="rectangular" height={38} sx={{ flex: 1, borderRadius: 2, bgcolor: 'divider' }} />
            </Stack>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  if (!displayedBooking) {
    return (
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: 2.25 }}>
          <Stack spacing={2}>
            <Typography variant="h2" sx={{ fontSize: '1.8rem' }}>
              ยังไม่พบข้อมูลการจอง
            </Typography>
            <Typography sx={{ color: 'text.secondary' }}>
              เริ่มการจองเพื่อให้ระบบแสดงข้อมูลการจองของคุณในหน้านี้
            </Typography>
            {error && <Alert severity="error">{error}</Alert>}
            <Button variant="contained" onClick={onBookingCancelled}>
              เริ่มการจอง
            </Button>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: 2.25 }}>
        <Stack spacing={2.4}>
          <Stack direction="row" spacing={1.4} sx={{ alignItems: 'center' }}>
            <Box
              sx={{
                width: 54,
                height: 54,
                borderRadius: 2.4,
                bgcolor: 'secondary.main',
                display: 'grid',
                placeItems: 'center',
                flexShrink: 0,
              }}
            >
              <CheckCircleIcon sx={{ color: 'primary.main', fontSize: 34 }} />
            </Box>
            <Box sx={{ minWidth: 0 }}>
              <Typography variant="h2" sx={{ fontSize: '1.75rem' }}>
                ข้อมูลการจอง
              </Typography>
              <Typography sx={{ color: 'text.secondary', fontWeight: 760 }}>{displayedBooking.bookingCode}</Typography>
            </Box>
          </Stack>

          {error && <Alert severity="warning">{error}</Alert>}

          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 2 }}>
            <Typography sx={{ fontWeight: 950, fontSize: '1.2rem' }}>
              {displayedBooking.service?.nameTh ?? 'บริการที่เลือก'}
            </Typography>
          </Box>

          <Grid container spacing={1.4}>
            <SummaryItem label="ชื่อผู้จอง" value={displayedBooking.customerName} />
            <SummaryItem label="เบอร์โทร" value={displayedBooking.phone} />
            <SummaryItem label="วันที่" value={formatThaiDateLabel(displayedBooking.bookingDate)} />
            <SummaryItem label="เวลา" value={displayedBooking.slotTime} />
          </Grid>

          <Divider />
          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1}>
            <Button variant="outlined" disabled={!lineProfile?.userId || isCancelling} onClick={openRescheduleDialog}>
              เลื่อนนัด
            </Button>
            <Button variant="contained" disabled={!lineProfile?.userId || isCancelling} onClick={handleCancelBooking}>
              {isCancelling ? 'กำลังยกเลิก...' : 'ยกเลิกการจอง'}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
      <BottomEditorSheet isOpen={isRescheduleOpen} onClose={() => setIsRescheduleOpen(false)} title="เลื่อนนัด">
        <Stack spacing={2}>
          <TextField
            fullWidth
            label="วันที่"
            type="date"
            value={rescheduleDate}
            onChange={(event) => setRescheduleDate(event.target.value)}
            slotProps={{ htmlInput: { min: todayKey } }}
          />
          <FormControl fullWidth>
            <Select
              aria-label="เวลาใหม่"
              value={isLoadingSlots ? '' : rescheduleSlotSelectValue}
              disabled={isLoadingSlots}
              onChange={(event) => setRescheduleSlot(event.target.value)}
              displayEmpty
            >
              <MenuItem value="" disabled>
                {isLoadingSlots ? 'กำลังโหลดเวลา...' : 'เลือกเวลาใหม่'}
              </MenuItem>
              {slots.map((slot) => (
                <MenuItem key={slot.time} value={slot.time} disabled={!slot.available}>
                  {slot.time} {slot.available ? 'ว่าง' : 'ไม่ว่าง'}
                </MenuItem>
              ))}
            </Select>
          </FormControl>
          <TextField
            fullWidth
            multiline
            minRows={3}
            label="หมายเหตุ"
            value={rescheduleNotes}
            onChange={(event) => setRescheduleNotes(event.target.value)}
          />
          <Stack direction="row" spacing={1.2} sx={{ justifyContent: 'flex-end' }}>
          <Button variant="outlined" disabled={isRescheduling} onClick={() => setIsRescheduleOpen(false)}>
            ยกเลิก
          </Button>
          <Button variant="contained" disabled={!rescheduleDate || !rescheduleSlot || isRescheduling} onClick={handleRescheduleBooking}>
            {isRescheduling ? 'กำลังบันทึก...' : 'บันทึกการเลื่อนนัด'}
          </Button>
          </Stack>
        </Stack>
      </BottomEditorSheet>
    </Card>
  )
}

function BottomEditorSheet({
  children,
  isOpen,
  onClose,
  title,
}: {
  children: ReactNode
  isOpen: boolean
  onClose: () => void
  title: string
}) {
  useEffect(() => {
    if (!isOpen) return undefined

    const originalOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'

    return () => {
      document.body.style.overflow = originalOverflow
    }
  }, [isOpen])

  return (
    <Portal>
      <Box
        aria-hidden={!isOpen}
        data-testid="bottom-editor-overlay"
        sx={{
          position: 'fixed',
          top: 0,
          right: 0,
          bottom: 0,
          left: 0,
          zIndex: 1200,
          pointerEvents: isOpen ? 'auto' : 'none',
        }}
      >
        <Box
          aria-hidden="true"
          data-testid="bottom-editor-backdrop"
          sx={{
            position: 'absolute',
            top: 0,
            right: 0,
            bottom: 0,
            left: 0,
            border: 0,
            bgcolor: overlay.backgroundColor,
            backdropFilter: overlay.backdropFilter,
            WebkitBackdropFilter: overlay.backdropFilter,
            opacity: isOpen ? 1 : 0,
            transition: `opacity ${isOpen ? 360 : 280}ms ease`,
          }}
        />
        <Box
          role="dialog"
          aria-modal="true"
          aria-label={title}
          sx={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            width: { xs: 'calc(100% - 40px)', sm: 720 },
            maxWidth: 'calc(100% - 40px)',
            maxHeight: 'calc(100dvh - 40px)',
            display: 'flex',
            flexDirection: 'column',
            overflow: 'hidden',
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 3,
            bgcolor: 'background.paper',
            boxShadow: 'none',
            transform: isOpen ? 'translate(-50%, -50%) scale(1)' : 'translate(-50%, calc(-50% + 46px)) scale(0.98)',
            opacity: isOpen ? 1 : 0,
            transition: `transform ${isOpen ? 520 : 420}ms cubic-bezier(0.16, 1, 0.3, 1), opacity ${isOpen ? 320 : 260}ms ease`,
            willChange: 'transform',
          }}
        >
          <Stack direction="row" sx={{ alignItems: 'center', justifyContent: 'space-between', gap: 1.5, borderBottom: '1px solid', borderColor: 'divider', p: 1.5 }}>
            <Typography component="h2" sx={{ fontSize: '1.1rem', fontWeight: 950 }}>{title}</Typography>
            <Button variant="outlined" onClick={onClose}>
              ปิด
            </Button>
          </Stack>
          <Box sx={{ minHeight: 0, overflowY: 'auto', p: 2.5 }}>
            {children}
          </Box>
        </Box>
      </Box>
    </Portal>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, p: 1.4 }}>
        <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
          {label}
        </Typography>
        <Typography sx={{ mt: 0.35, fontWeight: 900 }}>{value}</Typography>
      </Box>
    </Grid>
  )
}
