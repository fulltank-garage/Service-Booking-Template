import { act, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { todayISO } from '../../utils/dateFormat'
import { installDashboardPageHooks, mockedAdminApi, realtimeState, renderPage } from './DashboardPage.testSetup'

installDashboardPageHooks()

describe('DashboardPage.bookings', () => {
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


})
