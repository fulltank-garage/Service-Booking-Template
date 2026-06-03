import { useEffect, useMemo, useState } from 'react'
import {
  Alert,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  FormControl,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  Stack,
  TextField,
  Typography,
} from '@mui/material'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import ScheduleIcon from '@mui/icons-material/Schedule'
import SendIcon from '@mui/icons-material/Send'
import { bookingApi } from '../../api/bookingApi'
import type { AvailabilitySlot, Booking, CreateBookingPayload, ServiceItem } from '../../types/booking'
import type { LineProfile } from '../../integrations/liff'

type BookingWizardProps = {
  lineProfile: LineProfile | null
}

const todayISO = () => new Date().toISOString().slice(0, 10)

export function BookingWizard({ lineProfile }: BookingWizardProps) {
  const [services, setServices] = useState<ServiceItem[]>([])
  const [selectedServiceId, setSelectedServiceId] = useState('')
  const [bookingDate, setBookingDate] = useState(todayISO)
  const [slots, setSlots] = useState<AvailabilitySlot[]>([])
  const [selectedSlot, setSelectedSlot] = useState('')
  const [customerName, setCustomerName] = useState(lineProfile?.displayName ?? '')
  const [phone, setPhone] = useState('')
  const [notes, setNotes] = useState('')
  const [confirmedBooking, setConfirmedBooking] = useState<Booking | null>(null)
  const [isLoadingServices, setIsLoadingServices] = useState(true)
  const [isLoadingSlots, setIsLoadingSlots] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [error, setError] = useState('')

  const selectedService = useMemo(
    () => services.find((service) => service.id === selectedServiceId) ?? null,
    [selectedServiceId, services],
  )

  useEffect(() => {
    let active = true
    const load = async () => {
      setIsLoadingServices(true)
      setError('')
      try {
        const items = await bookingApi.listServices()
        if (!active) return
        setServices(items)
        setSelectedServiceId((current) => current || items[0]?.id || '')
      } catch {
        if (active) setError('โหลดรายการบริการไม่สำเร็จ')
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
    } catch {
      setError('ส่งคำขอจองคิวไม่สำเร็จ กรุณาลองใหม่')
    } finally {
      setIsSubmitting(false)
    }
  }

  if (confirmedBooking) {
    return (
      <Card sx={{ borderRadius: 5, border: '1px solid', borderColor: 'divider', boxShadow: '0 24px 80px rgba(29,29,31,0.08)' }}>
        <CardContent sx={{ p: { xs: 3, md: 5 } }}>
          <Stack spacing={3} sx={{ alignItems: 'flex-start' }}>
            <CheckCircleIcon color="primary" sx={{ fontSize: 54 }} />
            <Box>
              <Typography variant="h2">จองคิวเรียบร้อย</Typography>
              <Typography sx={{ mt: 1, color: 'text.secondary' }}>
                ระบบบันทึกคำขอของคุณแล้ว ทีมงานสามารถยืนยันสถานะต่อได้จากหน้า Admin
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
        borderRadius: 5,
        border: '1px solid',
        borderColor: 'divider',
        boxShadow: '0 24px 80px rgba(29,29,31,0.08)',
      }}
    >
      <CardContent sx={{ p: { xs: 2.5, sm: 3.5, md: 5 } }}>
        <Stack spacing={3.5}>
          <Stack direction={{ xs: 'column', md: 'row' }} spacing={2} sx={{ justifyContent: 'space-between' }}>
            <Box>
              <Typography variant="h2">จองคิวเข้าใช้บริการ</Typography>
              <Typography sx={{ mt: 1, color: 'text.secondary' }}>
                เลือกบริการ วัน เวลา และข้อมูลติดต่อ ระบบพร้อมใช้กับ LINE LIFF และ Rich Menu
              </Typography>
            </Box>
            {lineProfile ? (
              <Chip label={`LINE: ${lineProfile.displayName}`} color="primary" variant="outlined" />
            ) : (
              <Chip label="LIFF ยังไม่ถูกตั้งค่า" variant="outlined" />
            )}
          </Stack>

          {error && <Alert severity="error">{error}</Alert>}

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 7 }}>
              <FormControl fullWidth>
                <InputLabel id="service-label">บริการ</InputLabel>
                <Select
                  labelId="service-label"
                  label="บริการ"
                  value={selectedServiceId}
                  disabled={isLoadingServices}
                  onChange={(event) => setSelectedServiceId(event.target.value)}
                >
                  {services.map((service) => (
                    <MenuItem value={service.id} key={service.id}>
                      {service.nameTh} / {service.nameEn}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid size={{ xs: 12, md: 5 }}>
              <TextField
                fullWidth
                label="วันที่"
                type="date"
                value={bookingDate}
                onChange={(event) => setBookingDate(event.target.value)}
                slotProps={{ inputLabel: { shrink: true } }}
              />
            </Grid>
          </Grid>

          {selectedService && (
            <Box
              sx={{
                p: 2.5,
                borderRadius: 4,
                bgcolor: 'rgba(15,118,110,0.08)',
                border: '1px solid rgba(15,118,110,0.15)',
              }}
            >
              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ alignItems: { sm: 'center' } }}>
                <CalendarMonthIcon color="primary" />
                <Box sx={{ flex: 1 }}>
                  <Typography sx={{ fontWeight: 800 }}>{selectedService.nameTh}</Typography>
                  <Typography variant="body2" color="text.secondary">
                    {selectedService.descriptionTh}
                  </Typography>
                </Box>
                <Chip label={`${selectedService.durationMinutes} นาที`} color="primary" />
              </Stack>
            </Box>
          )}

          <Box>
            <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
              <ScheduleIcon color="primary" />
              <Typography variant="h3">เลือกเวลา</Typography>
              {isLoadingSlots && <CircularProgress size={18} />}
            </Stack>
            <Grid container spacing={1.2}>
              {slots.map((slot) => (
                <Grid size={{ xs: 6, sm: 4, md: 3 }} key={slot.time}>
                  <Button
                    fullWidth
                    variant={selectedSlot === slot.time ? 'contained' : 'outlined'}
                    disabled={!slot.available}
                    onClick={() => setSelectedSlot(slot.time)}
                    sx={{ minHeight: 52, borderRadius: 3 }}
                  >
                    {slot.time}
                  </Button>
                </Grid>
              ))}
            </Grid>
          </Box>

          <Grid container spacing={2.5}>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField
                fullWidth
                label="ชื่อผู้จอง"
                value={customerName}
                onChange={(event) => setCustomerName(event.target.value)}
              />
            </Grid>
            <Grid size={{ xs: 12, md: 6 }}>
              <TextField fullWidth label="เบอร์โทร" value={phone} onChange={(event) => setPhone(event.target.value)} />
            </Grid>
            <Grid size={{ xs: 12 }}>
              <TextField
                fullWidth
                multiline
                minRows={3}
                label="รายละเอียดเพิ่มเติม"
                value={notes}
                onChange={(event) => setNotes(event.target.value)}
              />
            </Grid>
          </Grid>

          <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.5} sx={{ justifyContent: 'space-between', alignItems: { sm: 'center' } }}>
            <Typography variant="body2" color="text.secondary">
              Rich Menu สามารถเปิดหน้านี้พร้อม query/serviceId เพื่อเริ่ม flow ได้ทันที
            </Typography>
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
