import { act, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@mui/material/styles'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import { appTheme } from '../../theme/theme'
import { adminApi } from '../../api/adminApi'
import type { AdminNotification, AdminRealtimeEvent } from '../../types/admin'

const realtimeState = vi.hoisted(() => ({
  options: null as null | {
    onEvent?: (event: AdminRealtimeEvent) => void
    onRefresh?: () => void | Promise<void>
  },
}))

vi.mock('../../api/adminApi', () => ({
  adminApi: {
    listBookings: vi.fn(),
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
    mockedAdminApi.getBookingSummary.mockReset()
    mockedAdminApi.getPushHealth.mockReset()
    mockedAdminApi.createBooking.mockReset()
    mockedAdminApi.exportBookings.mockReset()
    mockedAdminApi.updateBookingSettings.mockReset()
    mockedAdminApi.deleteBooking.mockReset()
    mockedAdminApi.markNotificationRead.mockReset()
    mockedAdminApi.updateBooking.mockReset()
    mockedAdminApi.updateBookingStatus.mockReset()
    mockedAdminApi.updateService.mockReset()
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
      today: {
        date: '2026-06-06',
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
        total: 0,
      },
      tomorrow: {
        date: '2026-06-07',
        pending: 0,
        confirmed: 0,
        completed: 0,
        cancelled: 0,
        noShow: 0,
        total: 0,
      },
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
    mockedAdminApi.exportBookings.mockResolvedValue(new Blob(['booking_code']))
  })

  afterEach(() => {
    vi.unstubAllGlobals()
  })

  it('opens bookings as the first admin page', async () => {
    mockedAdminApi.listBookings.mockResolvedValue([])
    mockedAdminApi.listNotifications.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([])

    renderPage()
    expect(await screen.findAllByText('รายการจอง')).not.toHaveLength(0)
    expect(await screen.findAllByText('FULLTANK Garage Admin')).not.toHaveLength(0)
    expect(await screen.findByText('ยังไม่มีรายการจอง')).toBeInTheDocument()
    expect(screen.queryByText('รายการจองล่าสุด')).not.toBeInTheDocument()
  })

  it('keeps the newest created booking at the top of the booking list', async () => {
    mockedAdminApi.listBookings.mockResolvedValue([
      {
        id: 'booking-old',
        serviceId: 'service-1',
        bookingCode: 'Q-1006-0001',
        customerName: 'สมชาย',
        phone: '0890000000',
        bookingDate: '2026-06-06',
        slotTime: '17:00',
        status: 'pending',
        createdAt: '2026-06-05T01:00:00.000Z',
      },
      {
        id: 'booking-new',
        serviceId: 'service-1',
        bookingCode: 'Q-1006-0002',
        customerName: 'สมหญิง',
        phone: '0891111111',
        bookingDate: '2026-06-06',
        slotTime: '09:00',
        status: 'pending',
        createdAt: '2026-06-05T02:00:00.000Z',
      },
    ])
    mockedAdminApi.listNotifications.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([])

    renderPage()

    const table = await screen.findByTestId('booking-table')
    const rows = within(table).getAllByRole('row')
    expect(rows[1]).toHaveTextContent('Q-1006-0002')
    expect(rows[2]).toHaveTextContent('Q-1006-0001')
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
    expect(await screen.findByText('ยังไม่มีรายการจอง')).toBeInTheDocument()

    await act(async () => {
      await realtimeState.options?.onRefresh?.()
    })

    expect(await screen.findByRole('status')).toHaveTextContent('มีคิวจองใหม่')
  })

  it('does not duplicate booking push notifications from realtime events', async () => {
    const notificationConstructor = vi.fn()
    Object.defineProperty(notificationConstructor, 'permission', {
      configurable: true,
      value: 'granted',
    })
    vi.stubGlobal('Notification', notificationConstructor)
    mockedAdminApi.listBookings.mockResolvedValue([])
    mockedAdminApi.listNotifications.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([])

    renderPage()
    expect(await screen.findByText('ยังไม่มีรายการจอง')).toBeInTheDocument()

    act(() => {
      realtimeState.options?.onEvent?.({
        type: 'booking.created',
        notification: {
          id: 'notification-new',
          type: 'booking.created',
          title: 'มีคิวจองใหม่',
          body: 'Pachara จองเวลา 16:30 วันที่ 6 มิ.ย. 2569',
          url: '/bookings',
          isRead: false,
          bookingId: 'booking-new',
          createdAt: '2026-06-06T09:06:00.000Z',
        },
      })
    })

    expect(await screen.findByRole('status')).toHaveTextContent('มีคิวจองใหม่')
    expect(notificationConstructor).not.toHaveBeenCalled()
  })

  it('renders the notification history menu again', async () => {
    mockedAdminApi.listBookings.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([])
    mockedAdminApi.listNotifications.mockResolvedValue([])

    renderPage()
    expect(await screen.findByText('ยังไม่มีรายการจอง')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'รายการแจ้งเตือน' })).toBeInTheDocument()
  })

  it('shows unread notification count on the notifications menu', async () => {
    mockedAdminApi.listBookings.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([])
    mockedAdminApi.listNotifications.mockResolvedValue([
      {
        id: 'notification-unread',
        type: 'booking.created',
        title: 'มีคิวจองใหม่',
        body: 'รายการใหม่',
        url: '/bookings',
        isRead: false,
        bookingId: 'booking-new',
        createdAt: '2026-06-05T02:00:00.000Z',
      },
    ])

    renderPage()
    expect(await screen.findAllByLabelText('1 รายการแจ้งเตือนที่ยังไม่อ่าน')).not.toHaveLength(0)
  })

  it('opens notifications after saving settings even when notification timestamps are missing', async () => {
    const user = userEvent.setup()
    const settings = {
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
    }
    mockedAdminApi.listBookings.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([])
    mockedAdminApi.listNotifications.mockResolvedValue([
      {
        id: 'notification-missing-date',
        type: 'booking_settings.updated',
        title: 'อัปเดตการตั้งค่าร้าน',
        body: 'ตั้งค่าร้านถูกบันทึกแล้ว',
        url: '/settings',
        isRead: false,
        createdAt: undefined as unknown as string,
      },
    ])
    mockedAdminApi.getBookingSettings.mockResolvedValue(settings)
    mockedAdminApi.updateBookingSettings.mockResolvedValue(settings)

    renderPage()
    expect(await screen.findByText('ยังไม่มีรายการจอง')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'การตั้งค่าร้าน' }))
    await user.click(await screen.findByRole('button', { name: 'บันทึกตั้งค่า' }))
    await user.click(screen.getByRole('button', { name: 'รายการแจ้งเตือน' }))

    expect(await screen.findByRole('heading', { name: 'รายการแจ้งเตือน' })).toBeInTheDocument()
    expect(await screen.findByText('อัปเดตการตั้งค่าร้าน')).toBeInTheDocument()
  })

  it('saves shop times and reminder lead from dropdown controls', async () => {
    const user = userEvent.setup()
    mockedAdminApi.listBookings.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([])
    mockedAdminApi.listNotifications.mockResolvedValue([])
    mockedAdminApi.updateBookingSettings.mockImplementation(async (payload) => payload)

    renderPage()
    expect(await screen.findByText('ยังไม่มีรายการจอง')).toBeInTheDocument()

    await user.click(screen.getByRole('button', { name: 'การตั้งค่าร้าน' }))
    await user.click(await screen.findByLabelText('เวลาเปิดร้าน'))
    await user.click(await screen.findByRole('option', { name: '10:30' }))
    await user.click(screen.getByLabelText('เวลาปิดร้าน'))
    await user.click(await screen.findByRole('option', { name: '18:30' }))
    await user.click(screen.getByLabelText('เตือนก่อนนัด'))
    await user.click(await screen.findByRole('option', { name: '2 ชั่วโมงก่อนนัด' }))
    await user.click(screen.getByRole('button', { name: 'บันทึกตั้งค่า' }))

    await waitFor(() => {
      expect(mockedAdminApi.updateBookingSettings).toHaveBeenCalledWith(expect.objectContaining({
        openTime: '10:30',
        closeTime: '18:30',
        reminderLeadMinutes: 120,
      }))
    })
  })

  it('removes a booking when a realtime delete event arrives', async () => {
    mockedAdminApi.listBookings.mockResolvedValue([
      {
        id: 'booking-1',
        serviceId: 'service-1',
        bookingCode: 'Q-1006-0001',
        customerName: 'สมชาย',
        phone: '0890000000',
        bookingDate: '2026-06-06',
        slotTime: '10:00',
        status: 'pending',
        createdAt: '2026-06-05T02:00:00.000Z',
      },
    ])
    mockedAdminApi.listNotifications.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([])

    renderPage()
    expect(await screen.findAllByText('สมชาย')).not.toHaveLength(0)

    act(() => {
      realtimeState.options?.onEvent?.({ type: 'booking.deleted', bookingId: 'booking-1' })
    })

    await waitFor(() => {
      expect(screen.queryAllByText('สมชาย')).toHaveLength(0)
    })
  })

  it('removes a booking from a filtered list when its status no longer matches', async () => {
    const user = userEvent.setup()
    mockedAdminApi.listBookings.mockResolvedValue([
      {
        id: 'booking-1',
        serviceId: 'service-1',
        bookingCode: 'Q-1006-0001',
        customerName: 'สมชาย',
        phone: '0890000000',
        bookingDate: '2026-06-10',
        slotTime: '10:00',
        status: 'pending',
        createdAt: '2026-06-05T02:00:00.000Z',
      },
    ])
    mockedAdminApi.listNotifications.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([])
    mockedAdminApi.updateBookingStatus.mockResolvedValue({
      id: 'booking-1',
      serviceId: 'service-1',
      bookingCode: 'Q-1006-0001',
      customerName: 'สมชาย',
      phone: '0890000000',
      bookingDate: '2026-06-06',
      slotTime: '10:00',
      status: 'confirmed',
      createdAt: '2026-06-05T02:00:00.000Z',
    })

    renderPage()
    expect(await screen.findAllByText('สมชาย')).not.toHaveLength(0)

    await user.click(screen.getByLabelText('กรองสถานะ'))
    await user.click(await screen.findByRole('option', { name: 'รอจัดการ' }))
    await waitFor(() => {
      expect(mockedAdminApi.listBookings).toHaveBeenLastCalledWith(expect.objectContaining({ status: 'pending' }))
    })

    await user.click(screen.getAllByRole('button', { name: 'ยืนยัน' })[0])

    await waitFor(() => {
      expect(screen.queryAllByText('สมชาย')).toHaveLength(0)
    })
    expect(mockedAdminApi.updateBookingStatus).toHaveBeenCalledWith('booking-1', 'confirmed')
  })

  it('marks an active booking as no-show from the booking list', async () => {
    const user = userEvent.setup()
    mockedAdminApi.listBookings.mockResolvedValue([
      {
        id: 'booking-1',
        serviceId: 'service-1',
        bookingCode: 'Q-1006-0001',
        customerName: 'สมชาย',
        phone: '0890000000',
        bookingDate: '2026-06-06',
        slotTime: '10:00',
        status: 'confirmed',
        createdAt: '2026-06-05T02:00:00.000Z',
      },
    ])
    mockedAdminApi.listNotifications.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([])
    mockedAdminApi.updateBookingStatus.mockResolvedValue({
      id: 'booking-1',
      serviceId: 'service-1',
      bookingCode: 'Q-1006-0001',
      customerName: 'สมชาย',
      phone: '0890000000',
      bookingDate: '2026-06-06',
      slotTime: '10:00',
      status: 'no_show',
      createdAt: '2026-06-05T02:00:00.000Z',
    })

    renderPage()
    expect(await screen.findAllByText('สมชาย')).not.toHaveLength(0)

    await user.click(screen.getAllByRole('button', { name: 'เพิ่มเติม' })[0])
    await user.click(await screen.findByRole('button', { name: 'ไม่มาตามนัด' }))

    await waitFor(() => {
      expect(mockedAdminApi.updateBookingStatus).toHaveBeenCalledWith('booking-1', 'no_show')
    })
    expect(await screen.findAllByText('ไม่มาตามนัด')).not.toHaveLength(0)
  })

  it('adds a service when a realtime service event arrives', async () => {
    const user = userEvent.setup()
    mockedAdminApi.listBookings.mockResolvedValue([])
    mockedAdminApi.listNotifications.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([])

    renderPage()
    expect(await screen.findByText('ยังไม่มีรายการจอง')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'บริการของร้าน' }))
    expect(await screen.findAllByText('ยังไม่มีรายการบริการ')).not.toHaveLength(0)

    act(() => {
      realtimeState.options?.onEvent?.({
        type: 'service.created',
        service: {
          id: 'service-1',
          nameTh: 'ล้างรถ',
          nameEn: 'Car wash',
          descriptionTh: 'ล้างรถภายนอก',
          durationMinutes: 30,
          priceCents: 25000,
          accentColor: '#FF008C',
          isActive: true,
        },
      })
    })

    expect(await screen.findAllByText('ล้างรถ')).not.toHaveLength(0)
  })

  it('lets an inactive shop service switch back on', async () => {
    const user = userEvent.setup()
    mockedAdminApi.listBookings.mockResolvedValue([])
    mockedAdminApi.listNotifications.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([
      {
        id: 'service-inactive',
        nameTh: 'ทำเล็บเจล',
        nameEn: 'Gel nail',
        descriptionTh: 'ทำเล็บเจลสีพื้น',
        durationMinutes: 45,
        priceCents: 35000,
        accentColor: '#FF008C',
        isActive: false,
      },
    ])
    mockedAdminApi.updateService.mockResolvedValue({
      id: 'service-inactive',
      nameTh: 'ทำเล็บเจล',
      nameEn: 'Gel nail',
      descriptionTh: 'ทำเล็บเจลสีพื้น',
      durationMinutes: 45,
      priceCents: 35000,
      accentColor: '#FF008C',
      isActive: true,
    })

    renderPage()
    expect(await screen.findByText('ยังไม่มีรายการจอง')).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'บริการของร้าน' }))
    expect(await screen.findAllByText('ทำเล็บเจล')).not.toHaveLength(0)
    const switches = await screen.findAllByRole('switch')
    const serviceSwitch = switches[switches.length - 1]
    await user.click(serviceSwitch)

    await waitFor(() => {
      expect(mockedAdminApi.updateService).toHaveBeenCalledWith(
        'service-inactive',
        expect.objectContaining({ isActive: true }),
      )
    })
    expect(await screen.findAllByText('เปิดใช้งาน')).not.toHaveLength(0)
  })
})
