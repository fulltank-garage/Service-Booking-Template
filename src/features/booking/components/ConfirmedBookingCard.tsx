import { Box, Button, Card, CardContent, Divider, Grid, Stack, Typography } from '@mui/material'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import type { Booking } from '../../../types/booking'
import { formatThaiDateLabel } from '../../../utils/dateFormat'

export function ConfirmedBookingCard({ booking, onCreateNew }: { booking: Booking; onCreateNew: () => void }) {
  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: { xs: 3, md: 5 } }}>
        <Stack spacing={3} sx={{ alignItems: 'flex-start' }}>
          <CheckCircleIcon color="primary" sx={{ fontSize: 54 }} />
          <Box>
            <Typography variant="h2">จองคิวเรียบร้อย</Typography>
            <Typography sx={{ mt: 1, color: 'text.secondary' }}>ร้านได้รับข้อมูลแล้ว กรุณารอการยืนยันจากร้าน</Typography>
          </Box>
          <Divider sx={{ width: '100%' }} />
          <Grid container spacing={2}>
            <SummaryItem label="เลขที่จอง" value={booking.bookingCode} />
            <SummaryItem label="วันที่" value={formatThaiDateLabel(booking.bookingDate)} />
            <SummaryItem label="เวลา" value={booking.slotTime} />
          </Grid>
          <Button variant="contained" onClick={onCreateNew}>
            จองคิวใหม่
          </Button>
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
