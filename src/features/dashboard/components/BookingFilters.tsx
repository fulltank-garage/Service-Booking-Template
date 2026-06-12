import { Button, FormControl, MenuItem, Select, Stack, TextField, Typography } from '@mui/material'
import type { BookingStatus } from '../../../types/admin'
import { formatThaiDateLabel } from '../../../utils/dateFormat'
import { statusLabels } from '../utils/bookingStatus'

export function BookingFilters({
  isExporting,
  onExport,
  onNextDay,
  onOpenCreate,
  onPreviousDay,
  onQueryChange,
  onStatusFilterChange,
  query,
  selectedDate,
  statusFilter,
}: {
  isExporting: boolean
  onExport: () => void
  onNextDay: () => void
  onOpenCreate: () => void
  onPreviousDay: () => void
  onQueryChange: (query: string) => void
  onStatusFilterChange: (status: BookingStatus | 'all') => void
  query: string
  selectedDate: string
  statusFilter: BookingStatus | 'all'
}) {
  return (
    <Stack spacing={1.5} sx={{ mb: 2 }}>
      <Stack direction={{ xs: 'column', sm: 'row' }} spacing={1.2} sx={{ alignItems: { xs: 'stretch', sm: 'center' }, justifyContent: 'space-between' }}>
        <Typography variant="h2">รายการจอง</Typography>
        <Typography sx={{ fontWeight: 950, color: 'primary.main' }}>{formatThaiDateLabel(selectedDate)}</Typography>
      </Stack>
      <TextField placeholder="ค้นหาชื่อ เบอร์โทร หรือเลขที่จอง" value={query} onChange={(event) => onQueryChange(event.target.value)} size="small" fullWidth />
      <FormControl fullWidth size="small">
        <Select aria-label="กรองสถานะ" value={statusFilter} onChange={(event) => onStatusFilterChange(event.target.value as BookingStatus | 'all')}>
          <MenuItem value="all">ทุกสถานะ</MenuItem>
          {Object.entries(statusLabels).map(([value, label]) => (
            <MenuItem key={value} value={value}>
              {label}
            </MenuItem>
          ))}
        </Select>
      </FormControl>
      <Stack direction="column" spacing={{ xs: 1.2, sm: 0.8 }}>
        <Button fullWidth variant="contained" onClick={onOpenCreate}>
          เพิ่มคิวโทร/หน้าร้าน
        </Button>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={{ xs: 1.2, sm: 0.8 }} sx={{ justifyContent: 'flex-end', alignItems: { xs: 'stretch', sm: 'center' } }}>
          <Button fullWidth variant="outlined" disabled={isExporting} onClick={onExport} sx={{ flex: { sm: 1 } }}>
            {isExporting ? 'กำลังส่งออก...' : 'ส่งออก CSV'}
          </Button>
          <Stack direction="row" spacing={0.8} sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr 1fr', sm: 'auto auto' }, flex: { sm: 'auto' } }}>
            <Button variant="outlined" onClick={onPreviousDay}>
              วันก่อนหน้า
            </Button>
            <Button variant="outlined" onClick={onNextDay}>
              วันถัดไป
            </Button>
          </Stack>
        </Stack>
      </Stack>
    </Stack>
  )
}
