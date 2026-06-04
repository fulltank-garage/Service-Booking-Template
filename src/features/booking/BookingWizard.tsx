import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Skeleton,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ScheduleIcon from '@mui/icons-material/Schedule'
import SendIcon from '@mui/icons-material/Send'
import { bookingApi } from '../../api/bookingApi'
import type { AvailabilitySlot, Booking, CreateBookingPayload, ServiceItem } from '../../types/booking'
import type { LineProfile } from '../../integrations/liff'

type BookingWizardProps = {
  lineProfile: LineProfile | null
}

type CalendarDay = {
  date: Date
  inMonth: boolean
  key: string
}

const thaiMonths = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]

const weekdays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

const todayISO = () => new Date().toISOString().slice(0, 10)

const parseISODate = (value: string) => {
  const date = new Date(`${value}T00:00:00`)
  return Number.isFinite(date.getTime()) ? date : new Date()
}

const toISODate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

const addDays = (date: Date, count: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + count)
  return next
}

const addMonths = (date: Date, count: number) => new Date(date.getFullYear(), date.getMonth() + count, 1)

const buildCalendarDays = (monthDate: Date): CalendarDay[] => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const start = addDays(firstDay, -firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index)
    return {
      date,
      inMonth: date.getMonth() === monthDate.getMonth(),
      key: toISODate(date),
    }
  })
}

export function BookingWizard({ lineProfile }: BookingWizardProps) {
  const [services, setServices] = useState<ServiceItem[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [bookingDate, setBookingDate] = useState(todayISO)
  const [visibleMonth, setVisibleMonth] = useState(() => {
    const today = parseISODate(todayISO())
    return new Date(today.getFullYear(), today.getMonth(), 1)
  })
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState('')
  const [customerName, setCustomerName] = useState(lineProfile?.displayName ?? '')
  const [phone, setPhone] = useState('')
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null)
  const [isLoadingServices, setIsLoadingServices] = useState(true)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoadingServices(true)
      setError('')
      try {
        const items = await bookingApi.listServices()
        if (!active) return
        setServices(items)
      } catch {
        if (active) setError('โหลดข้อมูลไม่สำเร็จ')
      } finally {
        if (active) setIsLoadingServices(false)
      }
    }
    void load()
    return () => {
      active = false
    }
  }, [])

  useEffect(() => {
    if (!selectedServiceId || !bookingDate) return

    let active = true
    const load = async () => {
      setIsLoadingSlots(true)
      setSelectedSlot('')
      setError('')
      try {
        const items = await bookingApi.listAvailability(selectedServiceId, bookingDate)
        if (!active) return
        setSlots(items)
        setSelectedSlot(items.find((slot) => slot.available)?.time ?? '')
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
  }, [bookingDate, selectedServiceId])

  const canSubmit = Boolean(selectedServiceId && bookingDate && selectedSlot && customerName.trim() && phone.trim())
  const showInitialSkeleton = isLoadingServices && services.length === 0

  const handleSubmit = async () => {
    if (!canSubmit) return

    const payload: CreateBookingPayload = {
      serviceId: selectedServiceId,
      customerName: customerName.trim(),
      phone: phone.trim(),
      bookingDate,
      slotTime: selectedSlot,
      lineUserId: lineProfile?.userId,
      notes: '',
    }

    setIsSubmitting(true)
    setError('')
    try {
      const booking = await bookingApi.createBooking(payload)
      setConfirmedBooking(booking)
    } catch {
      setError('ส่งคำขอจองคิวไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (showInitialSkeleton) {
    return <BookingWizardSkeleton />
  }

  if (confirmedBooking) {
    return (
      <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Stack spacing={3} sx={{ alignItems: 'flex-start' }}>
            <CheckCircleIcon color="primary" sx={{ fontSize: 54 }} />
            <Box>
              <Typography variant="h2">จองคิวเรียบร้อย</Typography>
              <Typography sx={{ mt: 1, color: 'text.secondary' }}>
                ระบบบันทึกคำขอของคุณแล้ว ทีมงานจะตรวจสอบและยืนยันสถานะต่อไป
              </Typography>
            </Box>
            <Divider sx={{ width: '100%' }} />
            <Grid container spacing={2}>
              <SummaryItem label="เลขที่จอง" value={confirmedBooking.bookingCode} />
              <SummaryItem label="วันที่" value={confirmedBooking.bookingDate} />
              <SummaryItem label="เวลา" value={confirmedBooking.slotTime} />
              <SummaryItem label="สถานะ" value="รอยืนยัน" />
            </Grid>
            <Button variant="contained" onClick={() => setConfirmedBooking(null)}>
              จองคิวใหม่
            </Button>
          </Stack>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card
      data-testid="booking-wizard"
      sx={{
        borderRadius: 3,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: 'none',
      }}
    >
      <CardContent sx={{ p: 2.25 }}>
        <Stack spacing={2.75}>
          <Box>
            <Typography variant="h2" sx={{ fontSize: '1.8rem' }}>
              จองคิว
            </Typography>
            <Typography sx={{ mt: 0.75, color: 'text.secondary' }}>เลือกวัน เวลา และกรอกข้อมูลติดต่อ</Typography>
            {lineProfile && (
              <Typography variant="body2" sx={{ mt: 0.75, fontWeight: 750 }}>
                {lineProfile.displayName}
              </Typography>
            )}
          </Box>

          {error && (
            <Alert severity="error" sx={{ borderRadius: 2.5 }}>
              {error}
            </Alert>
          )}

          <BookingCalendar
            bookingDate={bookingDate}
            todayKey={todayISO()}
            visibleMonth={visibleMonth}
            onMonthChange={setVisibleMonth}
            onSelectDate={setBookingDate}
          />

          <FormControl fullWidth>
            <InputLabel id="service-label">บริการ</InputLabel>
            <Select
              labelId="service-label"
              label="บริการ"
              value={selectedServiceId}
              disabled={isLoadingServices}
              onChange={(event) => setSelectedServiceId(event.target.value)}
              displayEmpty
            >
              <MenuItem value="" disabled>
                เลือกบริการของคุณ
              </MenuItem>
              {services.map((service) => (
                <MenuItem value={service.id} key={service.id}>
                  {service.nameTh}
                </MenuItem>
              ))}
            </Select>
          </FormControl>

          <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
              <ScheduleIcon color="primary" />
              <Typography variant="h3">เลือกเวลา</Typography>
            </Stack>
            {isLoadingSlots ? (
              <SlotGridSkeleton />
            ) : (
              <Grid container spacing={1.2}>
                {slots.map((slot) => (
                  <Grid size={{ xs: 6 }} key={slot.time}>
                    <Button
                      fullWidth
                      variant={selectedSlot === slot.time ? 'contained' : 'outlined'}
                      disabled={!slot.available}
                      onClick={() => setSelectedSlot(slot.time)}
                      sx={{
                        minHeight: 62,
                        borderRadius: 2,
                        borderColor: !slot.available ? 'divider' : undefined,
                        color: !slot.available ? 'text.secondary' : undefined,
                        '&.Mui-disabled': {
                          bgcolor: '#F3F4F6',
                          borderColor: 'divider',
                          color: 'text.secondary',
                        },
                      }}
                    >
                      <Stack spacing={0.1} sx={{ alignItems: 'center', lineHeight: 1.1 }}>
                        <Typography sx={{ fontWeight: 850, lineHeight: 1.1 }}>{slot.time}</Typography>
                        <Typography variant="caption" sx={{ lineHeight: 1.1 }}>
                          {slot.available ? 'ว่าง' : 'ไม่ว่าง'}
                        </Typography>
                      </Stack>
                    </Button>
                  </Grid>
                ))}
              </Grid>
            )}
          </Box>

          <Grid container spacing={2}>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                label="ชื่อผู้จอง"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField fullWidth label="เบอร์โทร" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </Grid>
          </Grid>

          <Stack spacing={1.5}>
            <Button
              variant="contained"
              size="large"
              endIcon={<SendIcon />}
              disabled={!canSubmit || isSubmitting}
              onClick={handleSubmit}
            >
              {isSubmitting ? 'กำลังส่ง...' : 'ยืนยันการจอง'}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}

function BookingCalendar({
  bookingDate,
  todayKey,
  visibleMonth,
  onMonthChange,
  onSelectDate,
}: {
  bookingDate: string
  todayKey: string
  visibleMonth: Date
  onMonthChange: (date: Date) => void
  onSelectDate: (date: string) => void
}) {
  const days = useMemo(() => buildCalendarDays(visibleMonth), [visibleMonth])

  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 1.5, bgcolor: 'background.default' }}>
      <Stack spacing={1} sx={{ alignItems: 'center', mb: 1.5 }}>
        <Box sx={{ textAlign: 'center', minWidth: 0 }}>
          <Typography sx={{ fontWeight: 850 }}>
            {thaiMonths[visibleMonth.getMonth()]} {visibleMonth.getFullYear() + 543}
          </Typography>
          <Typography variant="body2" sx={{ color: 'text.secondary' }}>
            เลือกวันที่
          </Typography>
        </Box>
      </Stack>

      <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.6 }}>
        {weekdays.map((weekday) => (
          <Typography key={weekday} variant="caption" sx={{ py: 0.5, textAlign: 'center', fontWeight: 850 }}>
            {weekday}
          </Typography>
        ))}

        {days.map((day) => {
          const isSelected = day.key === bookingDate
          const isDisabled = !day.inMonth || day.key < todayKey

          return (
            <Button
              key={day.key}
              type="button"
              disabled={isDisabled}
              variant={isSelected ? 'contained' : 'outlined'}
              onClick={() => onSelectDate(day.key)}
              aria-label={`${day.date.getDate()} ${thaiMonths[day.date.getMonth()]}`}
              sx={{
                minWidth: 0,
                width: '100%',
                minHeight: 42,
                p: 0,
                borderRadius: 2,
                borderColor: isSelected ? 'primary.main' : 'divider',
                bgcolor: isSelected ? 'primary.main' : 'background.default',
                color: isSelected ? 'primary.contrastText' : 'text.primary',
                opacity: isDisabled ? 0.35 : 1,
              }}
            >
              {day.inMonth ? day.date.getDate() : ''}
            </Button>
          )
        })}
      </Box>

      <Stack direction="row" spacing={0.6} sx={{ justifyContent: 'flex-end', mt: 1.5 }}>
        <Button
          type="button"
          variant="outlined"
          aria-label="เดือนก่อนหน้า"
          onClick={() => onMonthChange(addMonths(visibleMonth, -1))}
          sx={{ minHeight: 40, px: 1.5 }}
        >
          เดือนก่อนหน้า
        </Button>
        <Button
          type="button"
          variant="outlined"
          aria-label="เดือนถัดไป"
          onClick={() => onMonthChange(addMonths(visibleMonth, 1))}
          sx={{ minHeight: 40, px: 1.5 }}
        >
          เดือนถัดไป
        </Button>
      </Stack>
    </Box>
  )
}

function BookingWizardSkeleton() {
  return (
    <Card
      data-testid="booking-wizard-skeleton"
      sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}
    >
      <CardContent sx={{ p: 2.25 }}>
        <Stack spacing={2.75}>
          <Box>
            <Skeleton variant="text" width={110} height={42} sx={{ bgcolor: 'divider' }} />
            <Skeleton variant="text" width={260} height={28} sx={{ bgcolor: 'divider' }} />
          </Box>

          <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 3, p: 1.5 }}>
            <Stack spacing={0.6} sx={{ alignItems: 'center', mb: 1.5 }}>
              <Skeleton variant="text" width={140} height={28} sx={{ bgcolor: 'divider' }} />
              <Skeleton variant="text" width={74} height={22} sx={{ bgcolor: 'divider' }} />
            </Stack>
            <Box sx={{ display: 'grid', gridTemplateColumns: 'repeat(7, 1fr)', gap: 0.6 }}>
              {Array.from({ length: 7 }).map((_, index) => (
                <Skeleton key={`weekday-${index}`} variant="text" height={22} sx={{ bgcolor: 'divider' }} />
              ))}
              {Array.from({ length: 42 }).map((_, index) => (
                <Skeleton key={`day-${index}`} variant="rectangular" height={42} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
              ))}
            </Box>
            <Stack direction="row" spacing={0.6} sx={{ justifyContent: 'flex-end', mt: 1.5 }}>
              <Skeleton variant="rectangular" width={118} height={40} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
              <Skeleton variant="rectangular" width={108} height={40} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
            </Stack>
          </Box>

          <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, bgcolor: 'divider' }} />

          <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
              <Skeleton variant="circular" width={24} height={24} sx={{ bgcolor: 'divider' }} />
              <Skeleton variant="text" width={100} height={32} sx={{ bgcolor: 'divider' }} />
            </Stack>
            <Grid container spacing={1.2}>
              {Array.from({ length: 6 }).map((_, index) => (
                <Grid size={{ xs: 6 }} key={`slot-${index}`}>
                  <Skeleton variant="rectangular" height={62} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
                </Grid>
              ))}
            </Grid>
          </Box>

          <Stack spacing={2}>
            <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
            <Skeleton variant="rectangular" height={56} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
          </Stack>
          <Skeleton variant="rectangular" height={46} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
        </Stack>
      </CardContent>
    </Card>
  )
}

function SlotGridSkeleton() {
  return (
    <Grid container spacing={1.2}>
      {Array.from({ length: 6 }).map((_, index) => (
        <Grid size={{ xs: 6 }} key={`loading-slot-${index}`}>
          <Skeleton variant="rectangular" height={62} sx={{ borderRadius: 2, bgcolor: 'divider' }} />
        </Grid>
      ))}
    </Grid>
  )
}

function SummaryItem({ label, value }: { label: string; value: string }) {
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 850 }}>{value}</Typography>
    </Grid>
  )
}
