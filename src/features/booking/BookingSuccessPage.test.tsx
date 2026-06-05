import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { StrictMode } from 'react'
import { describe, expect, it, vi } from 'vitest'
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

describe('BookingSuccessPage', () => {
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
})
