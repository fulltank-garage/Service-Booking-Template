import { act, render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { appTheme } from './theme/theme'
import { initializeLiff } from './integrations/liff'
import { bookingApi } from './api/bookingApi'
import { resetCustomerSessionForTests } from './appLiffSession'

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
const mockedBookingApi = vi.mocked(bookingApi)

const createDeferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

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
    resetCustomerSessionForTests()
    mockedInitializeLiff.mockReset()
    mockedInitializeLiff.mockResolvedValue(null)
    mockedBookingApi.listServices.mockClear()
    mockedBookingApi.getBookingRules.mockClear()
    mockedBookingApi.latestBookingByLineUser.mockClear()
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

    expect(await screen.findByRole('heading', { name: 'กรุณาเปิดผ่านแอป LINE' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'จองคิว' })).not.toBeInTheDocument()
    expect(mockedInitializeLiff).toHaveBeenCalledTimes(1)
  })

  it('starts LIFF only on customer booking routes', async () => {
    renderApp()

    await screen.findByRole('heading', { name: 'กรุณาเปิดผ่านแอป LINE' })
    expect(mockedInitializeLiff).toHaveBeenCalledTimes(1)
  })

  it('blocks browser access to the customer booking flow', async () => {
    mockedInitializeLiff.mockResolvedValue(null)

    renderAppStrict()

    expect(await screen.findByRole('heading', { name: 'กรุณาเปิดผ่านแอป LINE' })).toBeInTheDocument()
    expect(screen.queryByRole('heading', { name: 'จองคิว' })).not.toBeInTheDocument()
    expect(mockedBookingApi.listServices).not.toHaveBeenCalled()
    expect(mockedBookingApi.getBookingRules).not.toHaveBeenCalled()
  })

  it('waits for LIFF before rendering the rich menu booking detail page', async () => {
    window.history.replaceState({}, '', '/?liff.state=%2Fbooking%2Fsuccess')
    const liffProfile = createDeferred<{ userId: string; displayName: string } | null>()
    mockedInitializeLiff.mockReturnValue(liffProfile.promise)

    renderAppStrict()

    expect(screen.queryByRole('heading', { name: 'ยังไม่พบข้อมูลการจอง' })).not.toBeInTheDocument()

    await act(async () => {
      liffProfile.resolve({ userId: 'line-user-1', displayName: 'สมชาย' })
      await liffProfile.promise
    })

    expect(await screen.findByText('SB-TEST-0001')).toBeInTheDocument()
    expect(mockedInitializeLiff.mock.calls.length).toBeLessThanOrEqual(1)
    expect(mockedBookingApi.latestBookingByLineUser.mock.calls.length).toBeLessThanOrEqual(1)
  })

  it('deduplicates LIFF bootstrap on rich menu booking entry under StrictMode', async () => {
    window.history.replaceState({}, '', '/?liff.state=%2Fbooking')
    mockedInitializeLiff.mockResolvedValue({ userId: 'line-user-1', displayName: 'สมชาย' })

    renderAppStrict()

    await screen.findByRole('heading', { name: 'จองคิว' })
    expect(mockedInitializeLiff.mock.calls.length).toBeLessThanOrEqual(1)
    expect(mockedBookingApi.listServices.mock.calls.length).toBeLessThanOrEqual(1)
    expect(mockedBookingApi.getBookingRules.mock.calls.length).toBeLessThanOrEqual(1)
  })

  it('deduplicates LIFF bootstrap on rich menu booking detail entry under StrictMode', async () => {
    window.history.replaceState({}, '', '/?liff.state=%2Fbooking%2Fsuccess')
    mockedInitializeLiff.mockResolvedValue({ userId: 'line-user-1', displayName: 'สมชาย' })

    renderAppStrict()

    expect(await screen.findByText('SB-TEST-0001')).toBeInTheDocument()
    expect(mockedInitializeLiff.mock.calls.length).toBeLessThanOrEqual(1)
    expect(mockedBookingApi.latestBookingByLineUser.mock.calls.length).toBeLessThanOrEqual(1)
  })
})
