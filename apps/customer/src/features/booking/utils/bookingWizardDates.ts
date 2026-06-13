import type { BookingRules } from '../../../types/booking'

export type CalendarDay = {
  date: Date
  inMonth: boolean
  key: string
}

export const thaiMonths = [
  'มกราคม',
  'กุมภาพันธ์',
  'มีนาคม',
  'เมษายน',
  'พฤษภาคม',
  'มิถุนายน',
  'กรกฎาคม',
  'สิงหาคม',
  'กันยายน',
  'ตุลาคม',
  'พฤศจิกายน',
  'ธันวาคม',
]

export const weekdays = ['อา', 'จ', 'อ', 'พ', 'พฤ', 'ศ', 'ส']

export const todayISO = () => new Date().toISOString().slice(0, 10)

export const parseISODate = (value: string) => {
  const date = new Date(`${value}T00:00:00`)
  return Number.isFinite(date.getTime()) ? date : new Date()
}

export const toISODate = (date: Date) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

export const addDays = (date: Date, count: number) => {
  const next = new Date(date)
  next.setDate(next.getDate() + count)
  return next
}

export const addMonths = (date: Date, count: number) => new Date(date.getFullYear(), date.getMonth() + count, 1)

export const parseClosedWeekdays = (value?: string) =>
  new Set(
    (value ?? '')
      .split(',')
      .map((item) => Number(item.trim()))
      .filter((item) => Number.isInteger(item) && item >= 0 && item <= 6),
  )

export const isClosedBookingDate = (dateKey: string, closedWeekdays: Set<number>, blackoutDates: Set<string>) =>
  closedWeekdays.has(parseISODate(dateKey).getDay()) || blackoutDates.has(dateKey)

export const findFirstAvailableDate = (startKey: string, maxDateKey: string, closedWeekdays: Set<number>, blackoutDates: Set<string>) => {
  let current = parseISODate(startKey)
  const maxDate = parseISODate(maxDateKey)

  while (current <= maxDate) {
    const currentKey = toISODate(current)
    if (!isClosedBookingDate(currentKey, closedWeekdays, blackoutDates)) return currentKey
    current = addDays(current, 1)
  }

  return startKey
}

export const getDefaultBookingDate = (rules?: BookingRules | null) => {
  const startKey = todayISO()
  const maxDateKey = toISODate(addDays(parseISODate(startKey), rules?.maxAdvanceDays ?? 60))
  const closedWeekdays = parseClosedWeekdays(rules?.closedWeekdays)
  const blackoutDates = new Set((rules?.blackoutDates ?? []).map((item) => item.date))
  return findFirstAvailableDate(startKey, maxDateKey, closedWeekdays, blackoutDates)
}

export const buildCalendarDays = (monthDate: Date): CalendarDay[] => {
  const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1)
  const start = addDays(firstDay, -firstDay.getDay())

  return Array.from({ length: 42 }, (_, index) => {
    const date = addDays(start, index)
    return {
      date,
      inMonth: date.getMonth() === monthDate.getMonth(),
      key: toISODate(date),
    }
  })
}
