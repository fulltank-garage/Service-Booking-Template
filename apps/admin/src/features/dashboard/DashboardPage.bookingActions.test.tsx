import { screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { todayISO } from '../../utils/dateFormat'
import { installDashboardPageHooks, mockedAdminApi, renderPage } from './DashboardPage.testSetup'

installDashboardPageHooks()

describe('DashboardPage.bookingActions', () => {
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

})
