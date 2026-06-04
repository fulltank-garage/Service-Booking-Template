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
      <DashboardPage adminEmail="admin@example.com" onLogout={vi.fn()} />
    </ThemeProvider>,
  )

describe('DashboardPage', () => {
  it('renders dashboard summary and booking table from fallback data', async () => {
    renderPage()
    expect(await screen.findByRole('heading', { level: 1, name: 'จัดการคิวจองบริการ' })).toBeInTheDocument()
    expect(await screen.findByText('รายการจองล่าสุด')).toBeInTheDocument()
    expect(await screen.findByText('SB-20260610-1201')).toBeInTheDocument()
  })
})
