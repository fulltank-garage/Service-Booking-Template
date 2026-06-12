import { act, screen } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it, vi } from 'vitest'
import type { AdminNotification } from '../../types/admin'
import { installDashboardPageHooks, mockedAdminApi, realtimeState, renderPage } from './DashboardPage.testSetup'

installDashboardPageHooks()

describe('DashboardPage.notifications', () => {
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

})
