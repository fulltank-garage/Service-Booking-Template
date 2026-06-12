import { useMemo } from 'react'
import { Box, Button, Stack, Typography } from '@mui/material'
import { addMonths, buildCalendarDays, isClosedBookingDate, thaiMonths, weekdays } from '../utils/bookingWizardDates'

type BookingCalendarProps = {
  blackoutDates: Set<string>
  bookingDate: string
  closedWeekdays: Set<number>
  maxDateKey: string
  todayKey: string
  visibleMonth: Date
  onMonthChange: (date: Date) => void
  onSelectDate: (date: string) => void
}

export function BookingCalendar({
  blackoutDates,
  bookingDate,
  closedWeekdays,
  maxDateKey,
  todayKey,
  visibleMonth,
  onMonthChange,
  onSelectDate,
}: BookingCalendarProps) {
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
          const isDisabled = !day.inMonth || day.key < todayKey || day.key > maxDateKey || isClosedBookingDate(day.key, closedWeekdays, blackoutDates)
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
        <Button type="button" variant="outlined" aria-label="เดือนก่อนหน้า" onClick={() => onMonthChange(addMonths(visibleMonth, -1))} sx={{ minHeight: 40, px: 1.5 }}>
          เดือนก่อนหน้า
        </Button>
        <Button type="button" variant="outlined" aria-label="เดือนถัดไป" onClick={() => onMonthChange(addMonths(visibleMonth, 1))} sx={{ minHeight: 40, px: 1.5 }}>
          เดือนถัดไป
        </Button>
      </Stack>
    </Box>
  )
}
