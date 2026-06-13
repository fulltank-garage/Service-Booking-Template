import { act, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { describe, expect, it } from 'vitest'
import { installDashboardPageHooks, mockedAdminApi, realtimeState, renderPage } from './DashboardPage.testSetup'

installDashboardPageHooks()

describe('DashboardPage.settings-services', () => {
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
