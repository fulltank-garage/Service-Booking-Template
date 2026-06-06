import { render, screen, waitFor } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { StrictMode } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { BookingSuccessPage } from './BookingSuccessPage'
import { appTheme } from '../../theme/theme'
import { bookingApi } from '../../api/bookingApi'

vi.mock('../../api/bookingApi', () => ({
  bookingApi: {
    latestBookingByLineUser: vi.fn(),
    listAvailability: vi.fn(),
    cancelBooking: vi.fn(),
    rescheduleBooking: vi.fn(),
  },
}))

vi.mock('../../integrations/liff', () => ({
  closeLiffWindow: vi.fn(),
}))

const mockedBookingApi = vi.mocked(bookingApi)

const renderBookingSuccessPage = (props: Partial<Parameters<typeof BookingSuccessPage>[0]> = {}) =>
  render(
    <ThemeProvider theme={appTheme}>
      <BookingSuccessPage
        fallbackBooking={null}
        lineProfile={{ userId: 'line-user-1', displayName: 'สมชาย' }}
        onBookingCancelled={vi.fn()}
        {...props}
      />
    </ThemeProvider>,
  )

describe('BookingSuccessPage', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('deduplicates latest booking loads under StrictMode', async () => {
    mockedBookingApi.latestBookingByLineUser.mockResolvedValue({
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
    })

    render(
      <StrictMode>
        <ThemeProvider theme={appTheme}>
          <BookingSuccessPage
            fallbackBooking={null}
            lineProfile={{ userId: 'line-user-1', displayName: 'สมชาย' }}
            onBookingCancelled={vi.fn()}
          />
        </ThemeProvider>
      </StrictMode>,
    )

    expect(await screen.findByText('SB-TEST-0001')).toBeInTheDocument()
    expect(mockedBookingApi.latestBookingByLineUser).toHaveBeenCalledTimes(1)
  })

  it('leaves the booking details page when the booking is removed while the page is open', async () => {
    const onBookingCancelled = vi.fn()

    mockedBookingApi.latestBookingByLineUser
      .mockResolvedValueOnce({
        id: 'booking-2',
        bookingCode: 'SB-TEST-0002',
        serviceId: 'service-1',
        customerName: 'สมชาย',
        phone: '0890000000',
        lineUserId: 'line-user-refresh',
        bookingDate: '2026-06-10',
        slotTime: '10:00',
        status: 'pending',
        createdAt: '2026-06-10T03:00:00.000Z',
      })
      .mockRejectedValueOnce({ isAxiosError: true, response: { status: 404 } })

    renderBookingSuccessPage({
      lineProfile: { userId: 'line-user-refresh', displayName: 'สมชาย' },
      onBookingCancelled,
    })

    expect(await screen.findByText('SB-TEST-0002')).toBeInTheDocument()

    window.dispatchEvent(new Event('focus'))

    await waitFor(() => expect(onBookingCancelled).toHaveBeenCalledTimes(1))
  })
})
