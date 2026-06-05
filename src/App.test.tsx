import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { appTheme } from './theme/theme'
import { initializeLiff } from './integrations/liff'

vi.mock('./integrations/liff', () => ({
  closeLiffWindow: vi.fn(),
  initializeLiff: vi.fn(),
}))

vi.mock('./api/bookingApi', () => ({
  bookingApi: {
    listServices: vi.fn().mockResolvedValue([
      {
        id: 'service-1',
        nameTh: 'ทำเล็บเจลสีพื้น',
        nameEn: 'Gel Color',
        descriptionTh: 'ทาเล็บเจลสีพื้น',
        durationMinutes: 45,
        priceCents: 35000,
        accentColor: '#FF008C',
        isActive: true,
      },
    ]),
    getBookingRules: vi.fn().mockResolvedValue({
      openTime: '09:00',
      closeTime: '17:00',
      slotIntervalMinutes: 30,
      slotCapacity: 1,
      closedWeekdays: '',
      minAdvanceHours: 0,
      maxAdvanceDays: 60,
      reminderLeadMinutes: 1440,
      blackoutDates: [],
    }),
    listAvailability: vi.fn().mockResolvedValue([]),
    createBooking: vi.fn(),
    cancelBooking: vi.fn(),
    latestBookingByLineUser: vi.fn().mockResolvedValue({
      id: 'booking-1',
      bookingCode: 'SB-TEST-0001',
      serviceId: 'service-1',
      customerName: 'สมชาย',
      phone: '0890000000',
      lineUserId: 'line-user-1',
      bookingDate: '2026-06-10',
      slotTime: '10:00',
      status: 'pending',
      createdAt: '2026-06-10T03:00:00.000Z',
    }),
  },
}))

const mockedInitializeLiff = vi.mocked(initializeLiff)

const renderApp = () =>
  render(
    <ThemeProvider theme={appTheme}>
      <App />
    </ThemeProvider>,
  )

const renderAppStrict = () =>
  render(
    <StrictMode>
      <ThemeProvider theme={appTheme}>
        <App />
      </ThemeProvider>
    </StrictMode>,
  )

describe('App routing', () => {
  beforeEach(() => {
    mockedInitializeLiff.mockReset()
    mockedInitializeLiff.mockResolvedValue(null)
    window.history.replaceState({}, '', '/')
  })

  it('does not start LIFF login on the shop services route', async () => {
    window.history.replaceState({}, '', '/services')

    renderApp()

    expect(await screen.findByText('ทำเล็บเจลสีพื้น')).toBeInTheDocument()
    expect(mockedInitializeLiff).not.toHaveBeenCalled()
  })

  it('uses the LIFF state path before rendering the first customer page', async () => {
    window.history.replaceState({}, '', '/?liff.state=%2Fservices')

    renderApp()

    expect(await screen.findByText('ทำเล็บเจลสีพื้น')).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'จองคิว' })).not.toBeInTheDocument()
    expect(mockedInitializeLiff).not.toHaveBeenCalled()
  })

  it('uses the LIFF state success path before rendering the first customer page', async () => {
    window.history.replaceState({}, '', '/?liff.state=%2Fbooking%2Fsuccess')

    renderApp()

    expect(await screen.findByRole('heading', { name: 'ยังไม่พบข้อมูลการจอง' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'จองคิว' })).not.toBeInTheDocument()
    expect(mockedInitializeLiff).toHaveBeenCalledTimes(1)
  })

  it('starts LIFF only on customer booking routes', async () => {
    renderApp()

    await screen.findByRole('heading', { name: 'จองคิว' })
    expect(mockedInitializeLiff).toHaveBeenCalledTimes(1)
  })

  it('deduplicates LIFF bootstrap on rich menu booking entry under StrictMode', async () => {
    window.history.replaceState({}, '', '/?liff.state=%2Fbooking')
    mockedInitializeLiff.mockResolvedValue({ userId: 'line-user-1', displayName: 'สมชาย' })

    renderAppStrict()

    await screen.findByRole('heading', { name: 'จองคิว' })
    expect(mockedInitializeLiff).toHaveBeenCalledTimes(1)
  })

  it('deduplicates LIFF bootstrap on rich menu booking detail entry under StrictMode', async () => {
    window.history.replaceState({}, '', '/?liff.state=%2Fbooking%2Fsuccess')
    mockedInitializeLiff.mockResolvedValue({ userId: 'line-user-1', displayName: 'สมชาย' })

    renderAppStrict()

    expect(await screen.findByText('SB-TEST-0001')).toBeInTheDocument()
    expect(mockedInitializeLiff).toHaveBeenCalledTimes(1)
  })
})
