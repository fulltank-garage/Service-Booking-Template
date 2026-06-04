import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { appTheme } from './theme/theme'
import { initializeLiff } from './integrations/liff'

vi.mock('./integrations/liff', () => ({
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
    listAvailability: vi.fn().mockResolvedValue([]),
    createBooking: vi.fn(),
    latestBookingByLineUser: vi.fn(),
  },
}))

const mockedInitializeLiff = vi.mocked(initializeLiff)

const renderApp = () =>
  render(
    <ThemeProvider theme={appTheme}>
      <App />
    </ThemeProvider>,
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
})
