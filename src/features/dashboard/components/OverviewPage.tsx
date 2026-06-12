import { Box, Card, CardContent, Grid, Stack, Typography } from '@mui/material'
import CalendarMonthIcon from '@mui/icons-material/CalendarMonth'
import CheckCircleIcon from '@mui/icons-material/CheckCircle'
import HourglassTopIcon from '@mui/icons-material/HourglassTop'
import type { BookingDailySummary, DailyBookingSummary } from '../../../types/admin'
import { formatThaiDateLabel } from '../../../utils/dateFormat'
import { SummaryCard } from './dashboardSkeletons'

type OverviewPageProps = {
  dailySummary: BookingDailySummary | null
  summary: { pending: number; confirmed: number; unread: number; total: number }
}

export function OverviewPage({ dailySummary, summary }: OverviewPageProps) {
  return (
    <Stack spacing={2.5}>
      <Grid container spacing={2}>
        <SummaryCard icon={<HourglassTopIcon />} label="รอจัดการ" value={summary.pending} color="#FF008C" />
        <SummaryCard icon={<CheckCircleIcon />} label="ยืนยันแล้ว" value={summary.confirmed} color="#111827" />
        <SummaryCard icon={<CalendarMonthIcon />} label="คิวทั้งหมด" value={summary.total} color="#FF008C" />
      </Grid>
      {dailySummary && (
        <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
          <CardContent sx={{ p: 2.5 }}>
            <Typography variant="h2" sx={{ mb: 1.5 }}>
              สรุปคิววันนี้/พรุ่งนี้
            </Typography>
            <Grid container spacing={1.5}>
              <DailySummaryPanel title="วันนี้" item={dailySummary.today} />
              <DailySummaryPanel title="พรุ่งนี้" item={dailySummary.tomorrow} />
            </Grid>
          </CardContent>
        </Card>
      )}
    </Stack>
  )
}

function DailySummaryPanel({ item, title }: { item: DailyBookingSummary; title: string }) {
  return (
    <Grid size={{ xs: 12, md: 6 }}>
      <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 2.5, bgcolor: 'background.default', p: 1.6 }}>
        <Typography sx={{ color: 'primary.main', fontWeight: 950 }}>
          {title} · {formatThaiDateLabel(item.date)}
        </Typography>
        <Grid container spacing={1} sx={{ mt: 0.5 }}>
          {[
            ['ทั้งหมด', item.total],
            ['รอจัดการ', item.pending],
            ['ยืนยันแล้ว', item.confirmed],
            ['เสร็จสิ้น', item.completed],
            ['ไม่มาตามนัด', item.noShow],
          ].map(([label, value]) => (
            <Grid key={label} size={{ xs: 6, sm: 4 }}>
              <Typography variant="caption" sx={{ color: 'text.secondary', fontWeight: 800 }}>
                {label}
              </Typography>
              <Typography sx={{ fontWeight: 950, lineHeight: 1.15 }}>{value}</Typography>
            </Grid>
          ))}
        </Grid>
      </Box>
    </Grid>
  )
}
