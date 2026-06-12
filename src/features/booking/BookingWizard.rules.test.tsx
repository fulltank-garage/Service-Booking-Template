import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { bookingApi } from '../../api/bookingApi'
import { appTheme } from '../../theme/theme'
import { BookingWizard } from './BookingWizard'
import { resetBookingBootstrapForTests } from './bookingBootstrap'

vi.mock('../../api/bookingApi', () => ({
  bookingApi: {
    createBooking: vi.fn(),
    getBookingRules: vi.fn(),
    listAvailability: vi.fn(),
    listServices: vi.fn(),
  },
}))

const mockedBookingApi = vi.mocked(bookingApi)
const renderWizard = () => render(<ThemeProvider theme={appTheme}><BookingWizard lineProfile={null} /></ThemeProvider>)
const renderWizardWithLineProfile = () =>
  render(<ThemeProvider theme={appTheme}><BookingWizard lineProfile={{ userId: 'line-user-1', displayName: 'สมชาย' }} /></ThemeProvider>)

describe('BookingWizard booking rules', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    resetBookingBootstrapForTests()
  })

  it('uses the LINE profile name in the form without showing it above the calendar', async () => {
    mockedBookingApi.listServices.mockResolvedValue([])
    mockedBookingApi.getBookingRules.mockResolvedValue(defaultRules())

    renderWizardWithLineProfile()

    expect(await screen.findByRole('heading', { name: 'จองคิว' })).toBeInTheDocument()
    expect(screen.queryByText('สมชาย')).not.toBeInTheDocument()
    expect(screen.getByLabelText('ชื่อจาก LINE')).toHaveValue('สมชาย')
  })

  it('disables recurring closed weekdays on the booking calendar', async () => {
    mockedBookingApi.listServices.mockResolvedValue([])
    mockedBookingApi.getBookingRules.mockResolvedValue({ ...defaultRules(), closedWeekdays: '0' })

    renderWizard()

    expect(await screen.findByRole('heading', { name: 'จองคิว' })).toBeInTheDocument()
    expect(screen.getByLabelText('7 มิถุนายน')).toBeDisabled()
  })
})

function defaultRules() {
  return {
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
}
