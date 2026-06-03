import { render, screen, waitFor } from '@testing-library/react'
import userEvent from '@testing-library/user-event'
import { ThemeProvider } from '@mui/material/styles'
import { describe, expect, it } from 'vitest'
import { BookingWizard } from './BookingWizard'
import { appTheme } from '../../theme/theme'

const renderWizard = () =>
  render(
    <ThemeProvider theme={appTheme}>
      <BookingWizard lineProfile={null} />
    </ThemeProvider>,
  )

describe('BookingWizard', () => {
  it('creates a booking from the mock fallback flow', async () => {
    const user = userEvent.setup()
    renderWizard()

    await screen.findByText('จองคิวเข้าใช้บริการ')
    await user.type(screen.getByLabelText('ชื่อผู้จอง'), 'สมชาย')
    await user.type(screen.getByLabelText('เบอร์โทร'), '0890000000')

    const submitButton = screen.getByRole('button', { name: /ยืนยันการจอง/i })
    await waitFor(() => expect(submitButton).toBeEnabled())
    await user.click(submitButton)

    expect(await screen.findByText('จองคิวเรียบร้อย')).toBeInTheDocument()
  })
})
