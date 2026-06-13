import { Box, Button, Grid, Stack, Typography } from '@mui/material'
import ScheduleIcon from '@mui/icons-material/Schedule'
import type { AvailabilitySlot } from '../../../types/booking'
import { SlotGridSkeleton } from './SlotGridSkeleton'

type TimeSlotPickerProps = {
  isLoadingSlots: boolean
  selectedServiceId: string
  selectedSlot: string
  slots: AvailabilitySlot[]
  onSelectSlot: (slot: string) => void
}

export function TimeSlotPicker({ isLoadingSlots, selectedServiceId, selectedSlot, slots, onSelectSlot }: TimeSlotPickerProps) {
  return (
    <Box>
      <Stack direction="row" spacing={1} sx={{ mb: 1.5, alignItems: 'center' }}>
        <ScheduleIcon color="primary" />
        <Typography variant="h3">เลือกเวลา</Typography>
      </Stack>
      {!selectedServiceId ? (
        <Box
          data-testid="time-slot-select-placeholder"
          sx={{
            border: '1px solid',
            borderColor: 'divider',
            borderRadius: 2,
            minHeight: 62,
            px: 2,
            py: 1.75,
            display: 'grid',
            placeItems: 'center',
            textAlign: 'center',
            bgcolor: 'background.default',
          }}
        >
          <Typography sx={{ color: 'text.secondary', fontWeight: 700, lineHeight: 1.55 }}>
            โปรดเลือกบริการที่ต้องการจอง เพื่อดูวันและเวลาที่ว่าง
          </Typography>
        </Box>
      ) : isLoadingSlots ? (
        <SlotGridSkeleton />
      ) : (
        <Grid container spacing={1.2}>
          {slots.map((slot) => (
            <Grid size={{ xs: 6 }} key={slot.time}>
              <Button
                fullWidth
                variant={selectedSlot === slot.time ? 'contained' : 'outlined'}
                disabled={!slot.available}
                onClick={() => onSelectSlot(slot.time)}
                sx={{
                  minHeight: 62,
                  borderRadius: 2,
                  borderColor: !slot.available ? 'divider' : undefined,
                  color: !slot.available ? 'text.secondary' : undefined,
                  '&.Mui-disabled': { bgcolor: '#F3F4F6', borderColor: 'divider', color: 'text.secondary' },
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
  )
}
