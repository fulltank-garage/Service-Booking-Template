import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@mui/material/styles'
import { describe, expect, it, vi } from 'vitest'
import { BookingWizard } from './BookingWizard'
import { appTheme } from '../../theme/theme'
import { bookingApi } from '../../api/bookingApi'

vi.mock('../../api/bookingApi', () => ({
  bookingApi: {
    listServices: vi.fn(),
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

describe('BookingWizard', () => {
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

    await screen.findByText('จองคิว')
    expect(screen.getByText('เลือกวันที่')).toBeInTheDocument()
    await user.type(screen.getByLabelText('ชื่อผู้จอง'), 'สมชาย')
    await user.type(screen.getByLabelText('เบอร์โทร'), '0890000000')

    const submitButton = screen.getByRole('button', { name: /ยืนยันการจอง/i })
    await waitFor(() => expect(submitButton).toBeEnabled())
    await user.click(submitButton)

    expect(await screen.findByText('จองคิวเรียบร้อย')).toBeInTheDocument()
  })
})
