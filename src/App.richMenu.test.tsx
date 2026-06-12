import { act, render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { StrictMode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { bookingApi } from './api/bookingApi'
import { resetCustomerSessionForTests } from './appLiffSession'
import { resetBookingBootstrapForTests } from './features/booking/bookingBootstrap'
import { initializeLiff } from './integrations/liff'
import { appTheme } from './theme/theme'

vi.mock('./integrations/liff', () => ({ closeLiffWindow: vi.fn(), initializeLiff: vi.fn() }))
vi.mock('./api/bookingApi', () => ({
  bookingApi: {
    cancelBooking: vi.fn(),
    createBooking: vi.fn(),
    getBookingRules: vi.fn().mockResolvedValue(defaultRules()),
    latestBookingByLineUser: vi.fn().mockResolvedValue(defaultBooking()),
    listAvailability: vi.fn().mockResolvedValue([]),
    listServices: vi.fn().mockResolvedValue([defaultService()]),
  },
}))

const mockedInitializeLiff = vi.mocked(initializeLiff)
const mockedBookingApi = vi.mocked(bookingApi)
const renderAppStrict = () => render(<StrictMode><ThemeProvider theme={appTheme}><App /></ThemeProvider></StrictMode>)
const renderApp = () => render(<ThemeProvider theme={appTheme}><App /></ThemeProvider>)
const createDeferred = <T,>() => {
  let resolve!: (value: T) => void
  const promise = new Promise<T>((nextResolve) => {
    resolve = nextResolve
  })
  return { promise, resolve }
}

describe('App rich menu routing', () => {
  beforeEach(() => {
    resetCustomerSessionForTests()
    resetBookingBootstrapForTests()
    window.localStorage.clear()
    mockedInitializeLiff.mockReset()
    mockedBookingApi.listServices.mockClear()
    mockedBookingApi.getBookingRules.mockClear()
    mockedBookingApi.latestBookingByLineUser.mockReset()
    mockedBookingApi.latestBookingByLineUser.mockResolvedValue(defaultBooking())
    window.history.replaceState({}, '', '/')
  })

  it('keeps rich menu booking entry on one loading surface until booking data is ready', async () => {
    window.history.replaceState({}, '', '/?liff.state=%2Fbooking')
    const liffProfile = createDeferred<{ userId: string; displayName: string } | null>()
    const services = createDeferred<Awaited<ReturnType<typeof bookingApi.listServices>>>()
    const rules = createDeferred<Awaited<ReturnType<typeof bookingApi.getBookingRules>>>()
    mockedInitializeLiff.mockReturnValue(liffProfile.promise)
    mockedBookingApi.listServices.mockReturnValue(services.promise)
    mockedBookingApi.getBookingRules.mockReturnValue(rules.promise)

    renderAppStrict()
    expect(screen.getByTestId('customer-page-skeleton')).toBeInTheDocument()
    await act(async () => {
      liffProfile.resolve({ userId: 'line-user-1', displayName: 'สมชาย' })
      await liffProfile.promise
    })
    await waitFor(() => expect(mockedBookingApi.listServices).toHaveBeenCalledTimes(1))
    expect(screen.getByTestId('customer-page-skeleton')).toBeInTheDocument()
    expect(screen.queryByTestId('booking-wizard-skeleton')).not.toBeInTheDocument()
    await act(async () => {
      services.resolve([defaultService()])
      rules.resolve(defaultRules())
      await Promise.all([services.promise, rules.promise])
    })
    expect(await screen.findByRole('heading', { name: 'จองคิว' })).toBeInTheDocument()
    expect(screen.queryByTestId('customer-page-skeleton')).not.toBeInTheDocument()
  })

  it('deduplicates LIFF bootstrap on rich menu booking detail entry under StrictMode', async () => {
    window.history.replaceState({}, '', '/?liff.state=%2Fbooking%2Fsuccess')
    mockedInitializeLiff.mockResolvedValue({ userId: 'line-user-1', displayName: 'สมชาย' })
    renderAppStrict()
    expect(await screen.findByText('SB-TEST-0001')).toBeInTheDocument()
    expect(mockedInitializeLiff.mock.calls.length).toBeLessThanOrEqual(1)
    expect(mockedBookingApi.latestBookingByLineUser.mock.calls.length).toBeLessThanOrEqual(1)
  })

  it('keeps rich menu booking details and cache in sync after admin confirms a booking', async () => {
    window.history.replaceState({}, '', '/?liff.state=%2Fbooking%2Fsuccess')
    mockedInitializeLiff.mockResolvedValue({ userId: 'line-user-sync', displayName: 'สมชาย' })
    mockedBookingApi.latestBookingByLineUser.mockResolvedValueOnce(defaultBooking('pending')).mockResolvedValueOnce(defaultBooking('confirmed'))
    renderApp()
    expect(await screen.findByText('ร้านได้รับคิวแล้ว')).toBeInTheDocument()
    window.dispatchEvent(new Event('focus'))
    expect(await screen.findByText('ร้านยืนยันคิวแล้ว')).toBeInTheDocument()
    await waitFor(() => expect(JSON.parse(window.localStorage.getItem('bookingQueue.latestBooking') ?? '{}').status).toBe('confirmed'))
  })
})

function defaultService() {
  return { id: 'service-1', nameTh: 'ทำเล็บเจลสีพื้น', nameEn: 'Gel Color', descriptionTh: 'ทาเล็บเจลสีพื้น', durationMinutes: 45, priceCents: 35000, accentColor: '#FF008C', isActive: true }
}

function defaultRules() {
  return { openTime: '09:00', closeTime: '17:00', slotIntervalMinutes: 30, slotCapacity: 1, closedWeekdays: '', minAdvanceHours: 0, maxAdvanceDays: 60, reminderLeadMinutes: 1440, bufferMinutes: 0, blackoutDates: [] }
}

function defaultBooking(status: 'pending' | 'confirmed' = 'pending') {
  return { id: 'booking-sync', bookingCode: 'SB-TEST-0001', serviceId: 'service-1', customerName: 'สมชาย', phone: '0890000000', lineUserId: 'line-user-sync', bookingDate: '2026-06-10', slotTime: '10:00', status, createdAt: '2026-06-10T03:00:00.000Z' }
}
