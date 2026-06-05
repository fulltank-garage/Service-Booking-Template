import { act, render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import { appTheme } from '../../theme/theme'
import { adminApi } from '../../api/adminApi'
import type { AdminNotification } from '../../types/admin'

const realtimeState = vi.hoisted(() => ({
  options: null as null | { onRefresh?: () => void | Promise<void> },
}))

vi.mock('../../api/adminApi', () => ({
  adminApi: {
    listBookings: vi.fn(),
    listNotifications: vi.fn(),
    listServices: vi.fn(),
    getBookingSettings: vi.fn(),
    updateBookingSettings: vi.fn(),
    markNotificationRead: vi.fn(),
  },
}))

vi.mock('../../hooks/useAdminRealtime', () => ({
  useAdminRealtime: vi.fn((options) => {
    realtimeState.options = options
  }),
}))

const mockedAdminApi = vi.mocked(adminApi)

const renderPage = () =>
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

describe('DashboardPage', () => {
  beforeEach(() => {
    realtimeState.options = null
    mockedAdminApi.listBookings.mockReset()
    mockedAdminApi.listNotifications.mockReset()
    mockedAdminApi.listServices.mockReset()
    mockedAdminApi.getBookingSettings.mockReset()
    mockedAdminApi.updateBookingSettings.mockReset()
    mockedAdminApi.markNotificationRead.mockReset()
    mockedAdminApi.getBookingSettings.mockResolvedValue({
      openTime: '09:00',
      closeTime: '17:00',
      slotIntervalMinutes: 30,
      slotCapacity: 1,
      closedWeekdays: '',
    })
  })

  it('renders dashboard summary from API data', async () => {
    mockedAdminApi.listBookings.mockResolvedValue([])
    mockedAdminApi.listNotifications.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([])

    renderPage()
    expect(await screen.findByText('จัดการคิวจองบริการ')).toBeInTheDocument()
    expect(await screen.findAllByText('FULLTANK Garage Admin')).not.toHaveLength(0)
    expect(await screen.findByText('คิวทั้งหมด')).toBeInTheDocument()
    expect(screen.queryByText('รายการจองล่าสุด')).not.toBeInTheDocument()
  })

  it('shows a new booking notice when refresh after reconnect finds an unread notification', async () => {
    const oldNotification: AdminNotification = {
      id: 'notification-old',
      type: 'booking.created',
      title: 'มีคิวจองใหม่',
      body: 'รายการเดิม',
      url: '/bookings',
      isRead: false,
      bookingId: 'booking-old',
      createdAt: '2026-06-05T01:00:00.000Z',
    }
    const newNotification: AdminNotification = {
      id: 'notification-new',
      type: 'booking.created',
      title: 'มีคิวจองใหม่',
      body: 'รายการใหม่',
      url: '/bookings',
      isRead: false,
      bookingId: 'booking-new',
      createdAt: '2026-06-05T02:00:00.000Z',
    }

    mockedAdminApi.listBookings.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([])
    mockedAdminApi.listNotifications
      .mockResolvedValueOnce([oldNotification])
      .mockResolvedValueOnce([newNotification, oldNotification])

    renderPage()
    expect(await screen.findByText('คิวทั้งหมด')).toBeInTheDocument()

    await act(async () => {
      await realtimeState.options?.onRefresh?.()
    })

    expect(await screen.findByRole('status')).toHaveTextContent('มีคิวจองใหม่')
  })

  it('does not render a notification history menu', async () => {
    mockedAdminApi.listBookings.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([])
    mockedAdminApi.listNotifications.mockResolvedValue([])

    renderPage()
    expect(await screen.findByText('คิวทั้งหมด')).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'รายการแจ้งเตือน' })).not.toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'รายการแจ้งเตือน' })).not.toBeInTheDocument()
  })
})
