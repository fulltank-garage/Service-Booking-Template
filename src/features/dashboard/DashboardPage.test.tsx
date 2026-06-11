import { act, fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@mui/material/styles'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import { appTheme } from '../../theme/theme'
import { adminApi } from '../../api/adminApi'
import { addDaysToISODate, todayISO } from '../../utils/dateFormat'
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
    window.localStorage.clear()
    realtimeState.options = null
    mockedAdminApi.listBookings.mockReset()
    mockedAdminApi.listAvailability.mockReset()
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
    mockedAdminApi.listAvailability.mockResolvedValue([
      { time: '09:00', available: true, capacity: 1, booked: 0 },
      { time: '10:00', available: true, capacity: 1, booked: 0 },
      { time: '11:00', available: true, capacity: 1, booked: 0 },
    ])
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

  it('explains booking statuses and shows the next actionable booking', async () => {
    const bookingDate = todayISO()
    mockedAdminApi.listBookings.mockResolvedValue([
      {
        id: 'booking-next',
        serviceId: 'service-1',
        bookingCode: 'Q-NEXT',
        customerName: 'สมชาย',
        phone: '0890000000',
        bookingDate,
        slotTime: '10:00',
        status: 'pending',
        createdAt: '2026-06-05T02:00:00.000Z',
      },
    ])
    mockedAdminApi.listNotifications.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('ต้องจัดการตอนนี้')).toBeInTheDocument()
    expect(screen.getByText('คิวถัดไป')).toBeInTheDocument()
    expect(screen.getByText('คิวอื่นของวันนี้')).toBeInTheDocument()
    expect(screen.getAllByText(/สมชาย/).length).toBeGreaterThan(0)
    expect(screen.getByText(/รอจัดการ = ลูกค้าจองเข้ามาแล้ว/)).toBeInTheDocument()
    expect(screen.getByText(/ยืนยันแล้ว = ร้านรับคิวนี้แล้ว/)).toBeInTheDocument()
    expect(screen.getByText(/เสร็จสิ้น = ร้านทำคิวนี้เสร็จแล้ว/)).toBeInTheDocument()
  })

  it('shows a focused today mode for the next active booking', async () => {
    mockedAdminApi.listBookings.mockResolvedValue([
      {
        id: 'booking-next',
        serviceId: 'service-1',
        bookingCode: 'Q-NEXT',
        customerName: 'สมชาย',
        phone: '0890000000',
        bookingDate: todayISO(),
        slotTime: '10:00',
        status: 'pending',
        createdAt: '2026-06-05T02:00:00.000Z',
      },
      {
        id: 'booking-later',
        serviceId: 'service-1',
        bookingCode: 'Q-LATER',
        customerName: 'สมหญิง',
        phone: '0891111111',
        bookingDate: todayISO(),
        slotTime: '12:00',
        status: 'confirmed',
        createdAt: '2026-06-05T03:00:00.000Z',
      },
    ])
    mockedAdminApi.listNotifications.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([])

    renderPage()

    expect(await screen.findByText('วันนี้ต้องทำอะไร')).toBeInTheDocument()
    expect(screen.getByText(/โฟกัสคิวถัดไป/)).toBeInTheDocument()
    expect(screen.getAllByText(/สมชาย/).length).toBeGreaterThan(0)
    expect(screen.getAllByRole('button', { name: 'รับคิวนี้' }).length).toBeGreaterThan(0)
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
    window.localStorage.setItem('service-booking-admin-simple-mode', 'false')
    mockedAdminApi.listBookings.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([])
    mockedAdminApi.listNotifications.mockResolvedValue([])

    renderPage()
    expect(await screen.findByText('ยังไม่มีรายการจอง')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'รายการแจ้งเตือน' })).toBeInTheDocument()
  })

  it('shows unread notification count on the notifications menu', async () => {
    window.localStorage.setItem('service-booking-admin-simple-mode', 'false')
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
    window.localStorage.setItem('service-booking-admin-simple-mode', 'false')
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
    expect(await screen.findByText('แก้ไขตั้งค่าร้านแล้ว')).toBeInTheDocument()
  })

  it('shows shop-friendly notification diagnostics', async () => {
    window.localStorage.setItem('service-booking-admin-simple-mode', 'false')
    mockedAdminApi.listBookings.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([])
    mockedAdminApi.listNotifications.mockResolvedValue([])

    renderPage()
    expect(await screen.findByText('ยังไม่มีรายการจอง')).toBeInTheDocument()
    await userEvent.click(screen.getByRole('button', { name: 'รายการแจ้งเตือน' }))

    expect(await screen.findByRole('button', { name: 'ตรวจแจ้งเตือนเครื่องนี้' })).toBeInTheDocument()
    expect(screen.getByText(/เครื่องนี้พร้อมรับแจ้งเตือน/)).toBeInTheDocument()
    expect(screen.getAllByText(/เปิดจาก Home Screen/).length).toBeGreaterThan(0)
    expect(screen.getByText('1 เปิดจาก Home Screen')).toBeInTheDocument()
    expect(screen.getByText('2 อนุญาตแจ้งเตือน')).toBeInTheDocument()
    expect(screen.getByText('3 เซิร์ฟเวอร์พร้อมส่ง')).toBeInTheDocument()
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
    expect(await screen.findByText('เวลาร้าน')).toBeInTheDocument()
    expect(screen.getByText('จำนวนคิว')).toBeInTheDocument()
    expect(screen.getByText('แจ้งเตือน')).toBeInTheDocument()
    expect(screen.getByText('วันหยุด')).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ใช้ค่าร้านเล็ก' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ใช้ค่าร้านกลาง' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'ใช้ค่าร้านใหญ่' })).toBeInTheDocument()
    expect(screen.getByText(/ร้านเล็ก = 1 ช่าง/)).toBeInTheDocument()
    expect(screen.getByText(/ร้านกลาง = 2 ช่าง/)).toBeInTheDocument()
    expect(screen.getByText(/ร้านใหญ่ = 4 ช่าง/)).toBeInTheDocument()
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

    await user.click(screen.getAllByRole('button', { name: 'รับคิวนี้' })[0])
    await user.click(await screen.findByRole('button', { name: 'ยืนยันรับคิว' }))

    await waitFor(() => {
      expect(screen.queryAllByText('สมชาย')).toHaveLength(0)
    })
    expect(mockedAdminApi.updateBookingStatus).toHaveBeenCalledWith('booking-1', 'confirmed')
  })

  it('marks an active booking as no-show from the booking list', async () => {
    const user = userEvent.setup()
    window.localStorage.setItem('service-booking-admin-simple-mode', 'false')
    const bookingDate = todayISO()
    mockedAdminApi.listBookings.mockResolvedValue([
      {
        id: 'booking-1',
        serviceId: 'service-1',
        bookingCode: 'Q-1006-0001',
        customerName: 'สมชาย',
        phone: '0890000000',
        bookingDate,
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
      bookingDate,
      slotTime: '10:00',
      status: 'no_show',
      createdAt: '2026-06-05T02:00:00.000Z',
    })

    renderPage()
    expect(await screen.findAllByText('สมชาย')).not.toHaveLength(0)

    await user.click(screen.getAllByRole('button', { name: 'เพิ่มเติม' })[0])
    await user.click(await screen.findByRole('button', { name: 'ไม่มาตามนัด' }))
    expect(await screen.findByText(/ใช้เมื่อเลยเวลานัดแล้วลูกค้าไม่มา/)).toBeInTheDocument()
    await user.click(await screen.findByRole('button', { name: 'บันทึกไม่มาตามนัด' }))

    await waitFor(() => {
      expect(mockedAdminApi.updateBookingStatus).toHaveBeenCalledWith('booking-1', 'no_show')
    })
    expect(await screen.findAllByText('ไม่มาตามนัด')).not.toHaveLength(0)
  })

  it('guides staff to add only required walk-in booking fields first', async () => {
    const user = userEvent.setup()
    mockedAdminApi.listBookings.mockResolvedValue([])
    mockedAdminApi.listNotifications.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([
      {
        id: 'service-1',
        nameTh: 'ทำเล็บเจล',
        nameEn: 'Gel nail',
        descriptionTh: 'ทำเล็บเจลสีพื้น',
        durationMinutes: 45,
        priceCents: 35000,
        accentColor: '#FF008C',
        isActive: true,
      },
    ])

    renderPage()
    expect(await screen.findByText('ยังไม่มีรายการจอง')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'เพิ่มคิวโทร/หน้าร้าน' })[0])

    expect(await screen.findByText('กรอกเฉพาะข้อมูลจำเป็นก่อน')).toBeInTheDocument()
    expect(screen.getByText('ข้อมูลจำเป็น')).toBeInTheDocument()
    expect(screen.getByText('รายละเอียดเพิ่มเติม (ไม่บังคับ)')).toBeInTheDocument()
  })

  it('creates a walk-in booking with service time and phone first', async () => {
    const user = userEvent.setup()
    mockedAdminApi.listBookings.mockResolvedValue([])
    mockedAdminApi.listNotifications.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([
      {
        id: 'service-1',
        nameTh: 'ทำเล็บเจล',
        nameEn: 'Gel nail',
        descriptionTh: 'ทำเล็บเจลสีพื้น',
        durationMinutes: 45,
        priceCents: 35000,
        accentColor: '#FF008C',
        isActive: true,
      },
    ])

    renderPage()
    expect(await screen.findByText('ยังไม่มีรายการจอง')).toBeInTheDocument()
    await user.click(screen.getAllByRole('button', { name: 'เพิ่มคิวโทร/หน้าร้าน' })[0])
    await user.type((await screen.findAllByLabelText('เบอร์โทร'))[0], '0890000000')
    await user.click(screen.getAllByLabelText('เวลา')[0])
    await user.click(await screen.findByRole('option', { name: '10:00' }))
    await user.click(screen.getByRole('button', { name: 'บันทึกคิว' }))

    await waitFor(() => {
      expect(mockedAdminApi.listAvailability).toHaveBeenCalledWith('service-1', expect.any(String))
      expect(mockedAdminApi.createBooking).toHaveBeenCalledWith(expect.objectContaining({
        serviceId: 'service-1',
        customerName: 'ลูกค้า Walk-in',
        phone: '0890000000',
        slotTime: '10:00',
      }))
    })
  })

  it('uses service availability for walk-in booking times', async () => {
    const user = userEvent.setup()
    mockedAdminApi.listBookings.mockResolvedValue([])
    mockedAdminApi.listNotifications.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([
      {
        id: 'service-1',
        nameTh: 'ทำเล็บเจล',
        nameEn: 'Gel nail',
        descriptionTh: 'ทำเล็บเจลสีพื้น',
        durationMinutes: 45,
        priceCents: 35000,
        accentColor: '#FF008C',
        isActive: true,
      },
    ])
    mockedAdminApi.listAvailability.mockResolvedValue([
      { time: '09:45', available: true, capacity: 1, booked: 0 },
      { time: '10:30', available: false, capacity: 1, booked: 1 },
    ])

    renderPage()
    await user.click((await screen.findAllByRole('button', { name: 'เพิ่มคิวโทร/หน้าร้าน' }))[0])
    await screen.findByText('กรอกเฉพาะข้อมูลจำเป็นก่อน')
    await waitFor(() => {
      expect(screen.getAllByRole('combobox', { name: 'เวลา' }).some((item) => item.textContent?.includes('09:45'))).toBe(true)
    })
    const timeSelect = screen.getAllByRole('combobox', { name: 'เวลา' }).find((item) => item.textContent?.includes('09:45'))
    expect(timeSelect).toBeTruthy()
    await user.click(timeSelect!)

    expect(await screen.findByRole('option', { name: '09:45' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '10:30' })).toHaveAttribute('aria-disabled', 'true')
  })

  it('explains unavailable walk-in booking dates before loading times', async () => {
    const user = userEvent.setup()
    const today = todayISO()
    const tomorrow = addDaysToISODate(today, 1)
    const yesterday = addDaysToISODate(today, -1)
    const todayWeekday = new Date(`${today}T00:00:00`).getDay()

    mockedAdminApi.getBookingSettings.mockResolvedValue({
      openTime: '09:00',
      closeTime: '17:00',
      slotIntervalMinutes: 30,
      slotCapacity: 1,
      closedWeekdays: String(todayWeekday),
      minAdvanceHours: 0,
      maxAdvanceDays: 60,
      reminderLeadMinutes: 1440,
      bufferMinutes: 0,
      blackoutDates: [{ date: tomorrow, reason: 'อบรมทีม' }],
    })
    mockedAdminApi.listBookings.mockResolvedValue([])
    mockedAdminApi.listNotifications.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([
      {
        id: 'service-1',
        nameTh: 'ทำเล็บเจล',
        nameEn: 'Gel nail',
        descriptionTh: 'ทำเล็บเจลสีพื้น',
        durationMinutes: 45,
        priceCents: 35000,
        accentColor: '#FF008C',
        isActive: true,
      },
    ])

    renderPage()
    await user.click((await screen.findAllByRole('button', { name: 'เพิ่มคิวโทร/หน้าร้าน' }))[0])

    expect(await screen.findByText(new RegExp(`ร้านหยุดทุก`))).toBeInTheDocument()
    const dateInput = screen.getAllByLabelText('วันที่').find((item) => item.getAttribute('min') === today)
    expect(dateInput).toBeTruthy()
    expect(dateInput).toHaveAttribute('min', today)

    fireEvent.change(dateInput!, { target: { value: yesterday } })
    expect(await screen.findByText('เลือกย้อนหลังไม่ได้ กรุณาเลือกวันนี้หรือวันถัดไป')).toBeInTheDocument()

    fireEvent.change(dateInput!, { target: { value: tomorrow } })
    expect(await screen.findByText('วันหยุดเฉพาะวันที่: อบรมทีม')).toBeInTheDocument()
    expect(mockedAdminApi.listAvailability).not.toHaveBeenCalled()
  })

  it('marks the demo booking checklist as complete without creating a real booking', async () => {
    const user = userEvent.setup()
    mockedAdminApi.listBookings.mockResolvedValue([])
    mockedAdminApi.listNotifications.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([
      {
        id: 'service-1',
        nameTh: 'ทำเล็บเจล',
        nameEn: 'Gel nail',
        descriptionTh: 'ทำเล็บเจลสีพื้น',
        durationMinutes: 45,
        priceCents: 35000,
        accentColor: '#FF008C',
        isActive: true,
      },
    ])

    renderPage()
    expect(await screen.findByText(/เหลือ 1 ขั้นตอน/)).toBeInTheDocument()
    await user.click(screen.getByRole('button', { name: 'บันทึกว่าลองแล้ว' }))

    expect(mockedAdminApi.createBooking).not.toHaveBeenCalled()
    await waitFor(() => expect(screen.queryByText(/เหลือ 1 ขั้นตอน/)).not.toBeInTheDocument())
    expect(window.localStorage.getItem('service-booking-admin-demo-booking-complete')).toBe('true')
  })

  it('shows shop-language actions for active bookings', async () => {
    mockedAdminApi.listBookings.mockResolvedValue([
      {
        id: 'booking-1',
        serviceId: 'service-1',
        bookingCode: 'Q-1006-0001',
        customerName: 'สมชาย',
        phone: '0890000000',
        bookingDate: todayISO(),
        slotTime: '10:00',
        status: 'pending',
        createdAt: '2026-06-05T02:00:00.000Z',
      },
      {
        id: 'booking-2',
        serviceId: 'service-1',
        bookingCode: 'Q-1006-0002',
        customerName: 'สมหญิง',
        phone: '0891111111',
        bookingDate: todayISO(),
        slotTime: '11:00',
        status: 'confirmed',
        createdAt: '2026-06-05T03:00:00.000Z',
      },
    ])
    mockedAdminApi.listNotifications.mockResolvedValue([])
    mockedAdminApi.listServices.mockResolvedValue([])

    renderPage()

    expect(await screen.findAllByRole('button', { name: 'รับคิวนี้' })).not.toHaveLength(0)
    expect(screen.getAllByRole('button', { name: 'บันทึกว่าเสร็จแล้ว' })).not.toHaveLength(0)
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
