import { Box, Grid, Typography } from '@mui/material'
import type { ServiceItem } from '../../../types/booking'
import { formatThaiDateLabel } from '../../../utils/dateFormat'

export function BookingSummaryPreview({
  bookingDate,
  phone,
  selectedService,
  selectedSlot,
}: {
  bookingDate: string
  phone: string
  selectedService: ServiceItem | null
  selectedSlot: string
}) {
  return (
    <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'background.default', p: 1.5 }}>
      <Typography variant="h3" sx={{ mb: 1 }}>
        ตรวจสอบก่อนจอง
      </Typography>
      <Grid container spacing={1}>
        <PreviewItem label="บริการ" value={selectedService?.nameTh ?? 'ยังไม่ได้เลือกบริการ'} />
        <PreviewItem label="วันที่" value={bookingDate ? formatThaiDateLabel(bookingDate) : 'ยังไม่ได้เลือกวันที่'} />
        <PreviewItem label="เวลา" value={selectedSlot || 'ยังไม่ได้เลือกเวลา'} />
        <PreviewItem label="เบอร์โทร" value={phone.trim() || 'ยังไม่ได้กรอกเบอร์โทร'} />
      </Grid>
    </Box>
  )
}

function PreviewItem({ label, value }: { label: string; value: string }) {
  return (
    <Grid size={{ xs: 12, sm: 6 }}>
      <Typography variant="caption" color="text.secondary">
        {label}
      </Typography>
      <Typography sx={{ fontWeight: 850 }}>{value}</Typography>
    </Grid>
  )
}
