import { useState } from 'react'
import type { BookingSettings } from '../../../types/admin'

export function useBookingSettingsForm(
  settings: BookingSettings | null,
  onSave: (payload: BookingSettings) => Promise<void>,
  onError: () => void,
) {
  const [openTime, setOpenTime] = useState(settings?.openTime ?? '09:00')
  const [closeTime, setCloseTime] = useState(settings?.closeTime ?? '17:00')
  const [slotCapacity, setSlotCapacity] = useState(String(settings?.slotCapacity ?? 1))
  const [minAdvanceHours, setMinAdvanceHours] = useState(String(settings?.minAdvanceHours ?? 0))
  const [maxAdvanceDays, setMaxAdvanceDays] = useState(String(settings?.maxAdvanceDays ?? 60))
  const [reminderLeadMinutes, setReminderLeadMinutes] = useState(String(settings?.reminderLeadMinutes ?? 1440))
  const [bufferMinutes, setBufferMinutes] = useState(String(settings?.bufferMinutes ?? 0))
  const [closedWeekdays, setClosedWeekdays] = useState(settings?.closedWeekdays ?? '')
  const [blackoutDates, setBlackoutDates] = useState(settings?.blackoutDates ?? [])
  const [isSaving, setIsSaving] = useState(false)
  const applyPreset = (preset: 'small' | 'medium' | 'large') => {
    if (preset === 'small') {
      setSlotCapacity('1'); setMinAdvanceHours('0'); setMaxAdvanceDays('30'); setBufferMinutes('10'); setReminderLeadMinutes('1440'); return
    }
    if (preset === 'medium') {
      setSlotCapacity('2'); setMinAdvanceHours('1'); setMaxAdvanceDays('45'); setBufferMinutes('15'); setReminderLeadMinutes('1440'); return
    }
    setSlotCapacity('4'); setMinAdvanceHours('2'); setMaxAdvanceDays('60'); setBufferMinutes('15'); setReminderLeadMinutes('120')
  }
  const handleSave = async () => {
    if (isSaving) return
    setIsSaving(true)
    try {
      await onSave({
        openTime, closeTime, closedWeekdays,
        slotIntervalMinutes: settings?.slotIntervalMinutes ?? 30,
        slotCapacity: Number(slotCapacity),
        minAdvanceHours: Number(minAdvanceHours),
        maxAdvanceDays: Number(maxAdvanceDays),
        reminderLeadMinutes: Number(reminderLeadMinutes),
        bufferMinutes: Number(bufferMinutes),
        blackoutDates: blackoutDates.map((item) => ({ date: item.date.trim(), reason: item.reason?.trim() ?? '' })).filter((item) => item.date),
      })
    } catch {
      onError()
    } finally {
      setIsSaving(false)
    }
  }
  return {
    applyPreset, blackoutDates, bufferMinutes, closedWeekdays, closeTime, handleSave, isSaving,
    maxAdvanceDays, minAdvanceHours, openTime, reminderLeadMinutes, setBlackoutDates,
    setBufferMinutes, setClosedWeekdays, setCloseTime, setMaxAdvanceDays,
    setMinAdvanceHours, setOpenTime, setReminderLeadMinutes, setSlotCapacity, slotCapacity,
  }
}
