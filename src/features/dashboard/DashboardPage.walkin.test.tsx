import { fireEvent, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { addDaysToISODate, todayISO } from '../../utils/dateFormat'
import { installDashboardPageHooks, mockedAdminApi, renderPage } from './DashboardPage.testSetup'

installDashboardPageHooks()

describe('DashboardPage.walkin', () => {
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

})
