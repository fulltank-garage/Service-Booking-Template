import { render, screen } from '@testing-library/react'
import { ThemeProvider } from '@mui/material/styles'
import { describe, expect, it, vi } from 'vitest'
import { DashboardPage } from './DashboardPage'
import { appTheme } from '../../theme/theme'

vi.stubGlobal('WebSocket', class {
  addEventListener = vi.fn()
  close = vi.fn()
})

const renderPage = () =>
  render(
    <ThemeProvider theme={appTheme}>
      <DashboardPage
        adminEmail="admin@example.com"
        adminName="FULLTANK Garage Admin"
        applyAppUpdate={vi.fn()}
        hasPendingAppUpdate={false}
        onLogout={vi.fn()}
      />
    </ThemeProvider>,
  )

describe('DashboardPage', () => {
  it('renders dashboard summary and booking table from fallback data', async () => {
    renderPage()
    expect(await screen.findByText('จัดการคิวจองบริการ')).toBeInTheDocument()
    expect(await screen.findAllByText('FULLTANK Garage Admin')).not.toHaveLength(0)
    expect(await screen.findByText('คิวทั้งหมด')).toBeInTheDocument()
    expect(screen.queryByText('รายการจองล่าสุด')).not.toBeInTheDocument()
  })
})
