import { Box, FormControl, Grid, MenuItem, Select, TextField, Typography } from '@mui/material'
import type { ServiceItem } from '../../../types/admin'
import { formatThaiDateLabel, todayISO } from '../../../utils/dateFormat'
import { digitsOnly } from '../utils/formatters'

export type AvailabilitySlot = { time: string; available: boolean }

export function BookingCreateIntro() {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'background.default', p: 1.4 }}>
      <Typography sx={{ fontWeight: 950 }}>กรอกเฉพาะข้อมูลจำเป็นก่อน</Typography>
      <Typography sx={{ mt: 0.3, color: 'text.secondary', fontWeight: 760 }}>เลือกบริการ เบอร์โทร วันที่ และเวลาให้ครบ ชื่อลูกค้ากับหมายเหตุค่อยเติมทีหลังได้</Typography>
    </Box>
  )
}

export function ServiceSelect({ onChange, serviceId, services }: { onChange: (value: string) => void; serviceId: string; services: ServiceItem[] }) {
  return (
    <FormControl fullWidth>
      <Select aria-label="บริการ" value={serviceId} onChange={(event) => onChange(event.target.value)} displayEmpty>
        <MenuItem value="" disabled>เลือกบริการ</MenuItem>
        {services.map((service) => (
          <MenuItem key={service.id} value={service.id}>{service.nameTh}</MenuItem>
        ))}
      </Select>
    </FormControl>
  )
}

export function CustomerFields({
  customerName,
  onCustomerNameChange,
  onPhoneChange,
  phone,
}: {
  customerName: string
  onCustomerNameChange: (value: string) => void
  onPhoneChange: (value: string) => void
  phone: string
}) {
  return (
    <Grid container spacing={1.5}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="ชื่อผู้จอง" value={customerName} onChange={(event) => onCustomerNameChange(event.target.value)} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth label="เบอร์โทร" value={phone} onChange={(event) => onPhoneChange(digitsOnly(event.target.value))} slotProps={{ htmlInput: { inputMode: 'numeric', pattern: '[0-9]*' } }} />
      </Grid>
    </Grid>
  )
}

export function BookingDateTimeFields({
  bookingDate,
  bookingDateBlockReason,
  isLoadingSlots,
  maxBookingDate,
  onBookingDateChange,
  onSlotTimeChange,
  serviceId,
  slotError,
  slots,
  slotTime,
}: {
  bookingDate: string
  bookingDateBlockReason: string
  isLoadingSlots: boolean
  maxBookingDate: string
  onBookingDateChange: (value: string) => void
  onSlotTimeChange: (value: string) => void
  serviceId: string
  slotError: string
  slots: AvailabilitySlot[]
  slotTime: string
}) {
  return (
    <Grid container spacing={1.5}>
      <Grid size={{ xs: 12, sm: 6 }}>
        <TextField fullWidth error={Boolean(bookingDateBlockReason)} helperText={bookingDateBlockReason || `เลือกได้ตั้งแต่วันนี้ถึง ${formatThaiDateLabel(maxBookingDate)}`} label="วันที่" type="date" value={bookingDate} onChange={(event) => onBookingDateChange(event.target.value)} slotProps={{ htmlInput: { min: todayISO(), max: maxBookingDate } }} />
      </Grid>
      <Grid size={{ xs: 12, sm: 6 }}>
        <FormControl fullWidth>
          <Select aria-label="เวลา" value={slotTime} onChange={(event) => onSlotTimeChange(event.target.value)} displayEmpty disabled={!serviceId || !bookingDate || Boolean(bookingDateBlockReason) || isLoadingSlots || slots.length === 0}>
            <MenuItem value="" disabled>{isLoadingSlots ? 'กำลังโหลดเวลา...' : 'เลือกเวลา'}</MenuItem>
            {slots.map((slot) => (
              <MenuItem key={`create-time-${slot.time}`} value={slot.time} disabled={!slot.available}>{slot.time}</MenuItem>
            ))}
          </Select>
        </FormControl>
        {slotError && <Typography sx={{ mt: 0.6, color: 'error.main', fontSize: '0.82rem', fontWeight: 760 }}>{slotError}</Typography>}
      </Grid>
    </Grid>
  )
}
