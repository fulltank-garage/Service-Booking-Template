import { Button, Card, CardContent, Stack, Typography } from '@mui/material'
import type { BookingSettings } from '../../../types/admin'
import { useBookingSettingsForm } from '../hooks/useBookingSettingsForm'
import { HolidaySection, PresetSection, QueueSection, ReminderSection, TimeSection } from './BookingSettingsSections'

export function BookingSettingsPage({
  onError,
  onSave,
  settings,
}: {
  onError: () => void
  onSave: (payload: BookingSettings) => Promise<void>
  settings: BookingSettings | null
}) {
  const form = useBookingSettingsForm(settings, onSave, onError)
  return (
    <Card sx={{ borderRadius: 3, border: '1px solid', borderColor: 'divider', boxShadow: 'none' }}>
      <CardContent sx={{ p: 2.5 }}>
        <Typography variant="h2" sx={{ mb: 2 }}>การตั้งค่าร้าน</Typography>
        <Stack spacing={2}>
          <PresetSection onApplyPreset={form.applyPreset} />
          <TimeSection openTime={form.openTime} closeTime={form.closeTime} setOpenTime={form.setOpenTime} setCloseTime={form.setCloseTime} />
          <QueueSection
            bufferMinutes={form.bufferMinutes}
            maxAdvanceDays={form.maxAdvanceDays}
            minAdvanceHours={form.minAdvanceHours}
            setBufferMinutes={form.setBufferMinutes}
            setMaxAdvanceDays={form.setMaxAdvanceDays}
            setMinAdvanceHours={form.setMinAdvanceHours}
            setSlotCapacity={form.setSlotCapacity}
            slotCapacity={form.slotCapacity}
          />
          <ReminderSection reminderLeadMinutes={form.reminderLeadMinutes} setReminderLeadMinutes={form.setReminderLeadMinutes} />
          <HolidaySection blackoutDates={form.blackoutDates} closedWeekdays={form.closedWeekdays} setBlackoutDates={form.setBlackoutDates} setClosedWeekdays={form.setClosedWeekdays} />
          <Stack direction="row" sx={{ justifyContent: 'flex-end' }}>
            <Button variant="contained" disabled={form.isSaving} onClick={form.handleSave}>
              {form.isSaving ? 'กำลังบันทึก...' : 'บันทึกตั้งค่า'}
            </Button>
          </Stack>
        </Stack>
      </CardContent>
    </Card>
  )
}
