import { render } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { afterEach, beforeEach, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import { appTheme } from '../../theme/theme'
import { adminApi } from '../../api/adminApi'
import type { AdminRealtimeEvent } from '../../types/admin'

const hoisted = vi.hoisted(() => ({
  realtimeState: {
    options: null as null | {
      onEvent?: (event: AdminRealtimeEvent) => void
      onRefresh?: () => void | Promise<void>
    },
  },
}))

export const realtimeState = hoisted.realtimeState

vi.mock('../../api/adminApi', () => ({
  adminApi: {
    listBookings: vi.fn(),
    listAvailability: vi.fn(),
    listNotifications: vi.fn(),
    listServices: vi.fn(),
    getBookingSettings: vi.fn(),
    getBookingSummary: vi.fn(),
    getPushHealth: vi.fn(),
    createBooking: vi.fn(),
    exportBookings: vi.fn(),
    updateBookingSettings: vi.fn(),
    deleteBooking: vi.fn(),
    markNotificationRead: vi.fn(),
    updateBooking: vi.fn(),
    updateBookingStatus: vi.fn(),
    updateService: vi.fn(),
  },
}))

vi.mock('../../hooks/useAdminRealtime', () => ({
  useAdminRealtime: vi.fn((options) => {
    hoisted.realtimeState.options = options
  }),
}))

export const mockedAdminApi = vi.mocked(adminApi)

export const renderPage = () =>
  render(
    <ThemeProvider theme={appTheme}>
      <DashboardPage
        adminEmail="admin@example.com"
        adminName="FULLTANK Garage Admin"
        applyAppUpdate={vi.fn()}
        hasPendingAppUpdate={false}
        onLogout={vi.fn()}
      />
    </ThemeProvider>,
  )

export function setupDashboardPageTest() {
  window.localStorage.clear()
  realtimeState.options = null
  Object.values(mockedAdminApi).forEach((mock) => mock.mockReset())
  mockedAdminApi.getBookingSettings.mockResolvedValue({
    openTime: '09:00',
    closeTime: '17:00',
    slotIntervalMinutes: 30,
    slotCapacity: 1,
    closedWeekdays: '',
    minAdvanceHours: 0,
    maxAdvanceDays: 60,
    reminderLeadMinutes: 1440,
    bufferMinutes: 0,
    blackoutDates: [],
  })
  mockedAdminApi.getBookingSummary.mockResolvedValue({
    today: { date: '2026-06-06', pending: 0, confirmed: 0, completed: 0, cancelled: 0, noShow: 0, total: 0 },
    tomorrow: { date: '2026-06-07', pending: 0, confirmed: 0, completed: 0, cancelled: 0, noShow: 0, total: 0 },
  })
  mockedAdminApi.getPushHealth.mockResolvedValue({
    configured: true,
    validKeys: true,
    senderReady: true,
    subscriptionCount: 1,
    recommendation: 'push_ready',
  })
  mockedAdminApi.createBooking.mockResolvedValue({
    id: 'booking-created',
    serviceId: 'service-1',
    bookingCode: 'Q-1006-9999',
    customerName: 'ลูกค้า Walk-in',
    phone: '0800000000',
    bookingDate: '2026-06-06',
    slotTime: '09:00',
    status: 'pending',
    createdAt: '2026-06-06T01:00:00.000Z',
  })
  mockedAdminApi.listAvailability.mockResolvedValue([
    { time: '09:00', available: true, capacity: 1, booked: 0 },
    { time: '10:00', available: true, capacity: 1, booked: 0 },
    { time: '11:00', available: true, capacity: 1, booked: 0 },
  ])
  mockedAdminApi.exportBookings.mockResolvedValue(new Blob(['booking_code']))
}

export function installDashboardPageHooks() {
  beforeEach(setupDashboardPageTest)
  afterEach(() => vi.unstubAllGlobals())
}
