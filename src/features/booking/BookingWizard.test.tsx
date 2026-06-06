import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { StrictMode } from 'react'
import { ThemeProvider } from '@mui/material/styles'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { BookingWizard } from './BookingWizard'
import { appTheme } from '../../theme/theme'
import { bookingApi } from '../../api/bookingApi'
import { resetBookingBootstrapForTests } from './bookingBootstrap'

vi.mock('../../api/bookingApi', () => ({
  bookingApi: {
    listServices: vi.fn(),
    getBookingRules: vi.fn(),
    listAvailability: vi.fn(),
    createBooking: vi.fn(),
  },
}))

const mockedBookingApi = vi.mocked(bookingApi)

const renderWizard = () =>
  render(
    <ThemeProvider theme={appTheme}>
      <BookingWizard lineProfile={null} />
    </ThemeProvider>,
  )

const renderWizardStrict = () =>
  render(
    <StrictMode>
      <ThemeProvider theme={appTheme}>
        <BookingWizard lineProfile={null} />
      </ThemeProvider>
    </StrictMode>,
  )

const renderWizardWithLineProfile = () =>
  render(
    <ThemeProvider theme={appTheme}>
      <BookingWizard lineProfile={{ userId: 'line-user-1', displayName: 'สมชาย' }} />
    </ThemeProvider>,
  )

describe('BookingWizard', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetBookingBootstrapForTests()
  })

  it('creates a booking from API data', async () => {
    mockedBookingApi.listServices.mockResolvedValue([
      {
        id: 'service-1',
        nameTh: 'บริการทดสอบ',
        nameEn: 'Test Service',
        descriptionTh: 'บริการสำหรับทดสอบ',
        durationMinutes: 30,
        priceCents: 0,
        accentColor: '#FF008C',
        isActive: true,
      },
    ])
    mockedBookingApi.getBookingRules.mockResolvedValue({
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
    mockedBookingApi.listAvailability.mockResolvedValue([
      { time: '10:00', booked: 0, capacity: 1, available: true },
      { time: '10:30', booked: 1, capacity: 1, available: false },
    ])
    mockedBookingApi.createBooking.mockResolvedValue({
      id: 'booking-1',
      bookingCode: 'SB-TEST-0001',
      serviceId: 'service-1',
      customerName: 'สมชาย',
      phone: '0890000000',
      bookingDate: '2026-06-10',
      slotTime: '10:00',
      status: 'pending',
      createdAt: '2026-06-10T03:00:00.000Z',
    })

    const user = userEvent.setup()
    renderWizard()

    await screen.findByRole('heading', { name: 'จองคิว' })
    expect(screen.getByText('1 บริการ')).toBeInTheDocument()
    expect(screen.getByText('2 วันเวลา')).toBeInTheDocument()
    expect(screen.getByText('3 ข้อมูลติดต่อ')).toBeInTheDocument()
    expect(screen.getByText('เลือกวันที่')).toBeInTheDocument()
    expect(screen.getByText('เลือกบริการของคุณ')).toBeInTheDocument()
    await user.click(screen.getByLabelText('บริการ'))
    await user.click(await screen.findByRole('option', { name: 'บริการทดสอบ' }))
    await user.type(screen.getByLabelText('ชื่อผู้จอง'), 'สมชาย')
    await user.type(screen.getByLabelText('เบอร์โทร'), '0890000000')
    await user.type(screen.getByLabelText(/หมายเหตุ/), 'ขอที่นั่งริมหน้าต่าง')

    const submitButton = screen.getByRole('button', { name: 'จองคิว' })
    await waitFor(() => expect(submitButton).toBeEnabled())
    await user.click(submitButton)

    expect(mockedBookingApi.createBooking).toHaveBeenCalledWith(expect.objectContaining({ notes: 'ขอที่นั่งริมหน้าต่าง' }))
    expect(await screen.findByText('จองคิวเรียบร้อย')).toBeInTheDocument()
  })

  it('deduplicates initial booking data loads under StrictMode', async () => {
    mockedBookingApi.listServices.mockResolvedValue([
      {
        id: 'service-1',
        nameTh: 'บริการทดสอบ',
        nameEn: 'Test Service',
        descriptionTh: 'บริการสำหรับทดสอบ',
        durationMinutes: 30,
        priceCents: 0,
        accentColor: '#FF008C',
        isActive: true,
      },
    ])
    mockedBookingApi.getBookingRules.mockResolvedValue({
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

    const serviceCallsBeforeRender = mockedBookingApi.listServices.mock.calls.length
    const rulesCallsBeforeRender = mockedBookingApi.getBookingRules.mock.calls.length
    renderWizardStrict()

    expect(await screen.findByText('เลือกบริการของคุณ')).toBeInTheDocument()
    expect(mockedBookingApi.listServices.mock.calls.length - serviceCallsBeforeRender).toBeLessThanOrEqual(1)
    expect(mockedBookingApi.getBookingRules.mock.calls.length - rulesCallsBeforeRender).toBeLessThanOrEqual(1)
  })

  it('uses the LINE profile name in the form without showing it above the calendar', async () => {
    mockedBookingApi.listServices.mockResolvedValue([])
    mockedBookingApi.getBookingRules.mockResolvedValue({
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

    renderWizardWithLineProfile()

    expect(await screen.findByRole('heading', { name: 'จองคิว' })).toBeInTheDocument()
    expect(screen.queryByText('สมชาย')).not.toBeInTheDocument()
    expect(screen.getByLabelText('ชื่อจาก LINE')).toHaveValue('สมชาย')
  })

  it('disables recurring closed weekdays on the booking calendar', async () => {
    mockedBookingApi.listServices.mockResolvedValue([])
    mockedBookingApi.getBookingRules.mockResolvedValue({
      openTime: '09:00',
      closeTime: '17:00',
      slotIntervalMinutes: 30,
      slotCapacity: 1,
      closedWeekdays: '0',
      minAdvanceHours: 0,
      maxAdvanceDays: 60,
      reminderLeadMinutes: 1440,
      bufferMinutes: 0,
      blackoutDates: [],
    })

    renderWizard()

    expect(await screen.findByRole('heading', { name: 'จองคิว' })).toBeInTheDocument()
    expect(screen.getByLabelText('7 มิถุนายน')).toBeDisabled()
  })
})
