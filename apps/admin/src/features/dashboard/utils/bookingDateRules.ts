import type { BookingSettings } from '../../../types/admin'
import { addDaysToISODate, todayISO } from '../../../utils/dateFormat'

const weekdayLabels = ['วันอาทิตย์', 'วันจันทร์', 'วันอังคาร', 'วันพุธ', 'วันพฤหัสบดี', 'วันศุกร์', 'วันเสาร์']

const parseClosedWeekdays = (value?: string) =>
  new Set(
    (value ?? '')
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
      .map(Number)
      .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6),
  )

const parseISODate = (value: string) => new Date(`${value}T00:00:00`)

export const getBookingDateBlockReason = (dateKey: string, settings: BookingSettings | null) => {
  if (!dateKey) return 'กรุณาเลือกวันที่'
  const date = parseISODate(dateKey)
  if (!Number.isFinite(date.getTime())) return 'วันที่ไม่ถูกต้อง'
  if (dateKey < todayISO()) return 'เลือกย้อนหลังไม่ได้ กรุณาเลือกวันนี้หรือวันถัดไป'
  const maxAdvanceDays = settings?.maxAdvanceDays ?? 60
  if (dateKey > addDaysToISODate(todayISO(), maxAdvanceDays)) {
    return `เลือกได้ล่วงหน้าไม่เกิน ${maxAdvanceDays} วัน`
  }
  const blackoutDate = (settings?.blackoutDates ?? []).find((item) => item.date === dateKey)
  if (blackoutDate) {
    return blackoutDate.reason ? `วันหยุดเฉพาะวันที่: ${blackoutDate.reason}` : 'วันนี้เป็นวันหยุดเฉพาะวันที่'
  }
  if (parseClosedWeekdays(settings?.closedWeekdays).has(date.getDay())) {
    return `ร้านหยุดทุก${weekdayLabels[date.getDay()]}`
  }
  return ''
}
