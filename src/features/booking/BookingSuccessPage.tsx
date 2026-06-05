import { useEffect, useRef, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  Divider,
  FormControl,
  Grid,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import { bookingApi } from '../../api/bookingApi'
import type { AvailabilitySlot, Booking } from '../../types/booking'
import { closeLiffWindow, type LineProfile } from '../../integrations/liff'
import { formatThaiDateLabel } from '../../utils/dateFormat'

type BookingSuccessPageProps = {
  autoCloseOnSuccess?: boolean
  fallbackBooking: Booking | null
  lineProfile: LineProfile | null
  onBookingCancelled: () => void
}

const latestBookingCache = new Map<string, Booking>()
const latestBookingRequests = new Map<string, Promise<Booking>>()

const loadLatestBookingOnce = (lineUserId: string) => {
  const cached = latestBookingCache.get(lineUserId)
  if (cached) {
    return Promise.resolve(cached)
  }
  const existingRequest = latestBookingRequests.get(lineUserId)
  if (existingRequest) {
    return existingRequest
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
  const fallbackBookingId = fallbackBooking?.id ?? ''
  const todayKey = new Date().toISOString().slice(0, 10)

  useEffect(() => {
    fallbackBookingRef.current = fallbackBooking
  }, [fallbackBooking])

  useEffect(() => {
    if (!lineProfile?.userId) {
      return
    }
    let active = true
    const load = async () => {
      setIsLoading(true)
      setError('')
      try {
        const latestBooking = await loadLatestBookingOnce(lineProfile.userId)
        if (active) setBooking(latestBooking)
      } catch {
        if (active) {
          setBooking(fallbackBookingRef.current)
          setError('โหลดข้อมูลการจองล่าสุดไม่สำเร็จ')
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
          <Stack spacing={2}>
            <Skeleton variant="text" width={190} height={44} sx={{ bgcolor: 'divider' }} />
            <Skeleton variant="rectangular" height={96} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
            <Skeleton variant="rectangular" height={180} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
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
      <Dialog open={isRescheduleOpen} onClose={() => setIsRescheduleOpen(false)} fullWidth maxWidth="sm">
        <DialogTitle sx={{ fontWeight: 950 }}>เลื่อนนัด</DialogTitle>
        <DialogContent>
          <Stack spacing={2} sx={{ pt: 1 }}>
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
                value={isLoadingSlots ? '' : rescheduleSlot}
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
          </Stack>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 3 }}>
          <Button variant="outlined" disabled={isRescheduling} onClick={() => setIsRescheduleOpen(false)}>
            ยกเลิก
          </Button>
          <Button variant="contained" disabled={!rescheduleDate || !rescheduleSlot || isRescheduling} onClick={handleRescheduleBooking}>
            {isRescheduling ? 'กำลังบันทึก...' : 'บันทึกการเลื่อนนัด'}
          </Button>
        </DialogActions>
      </Dialog>
    </Card>
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
