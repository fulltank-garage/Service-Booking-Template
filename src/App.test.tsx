import { render, screen } from '@testing-library/react'
import { act } from 'react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { useAppUpdate } from './hooks/useAppUpdate'

vi.mock('./hooks/useAppUpdate', () => ({
  useAppUpdate: vi.fn(),
}))

vi.mock('./features/auth/LoginPage', () => ({
  LoginPage: () => <div>หน้าเข้าสู่ระบบ</div>,
}))

vi.mock('./features/dashboard/DashboardPage', () => ({
  DashboardPage: () => <div>หน้าระบบแอดมิน</div>,
}))

const mockedUseAppUpdate = vi.mocked(useAppUpdate)

describe('App startup', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    window.localStorage.clear()
    window.sessionStorage.clear()
  })

  afterEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('shows and applies an app update before entering the admin system', () => {
    const applyAppUpdate = vi.fn()

    mockedUseAppUpdate.mockReturnValue({
      applyAppUpdate,
      checkForUpdate: vi.fn(),
      clearApplyingAppUpdate: vi.fn(),
      hasPendingAppUpdate: true,
      isApplyingAppUpdate: false,
      isInitialUpdateCheckDone: true,
    })

    render(<App />)

    expect(screen.getByText('มีเวอร์ชันใหม่ กำลังอัปเดตแอป')).toBeInTheDocument()
    expect(screen.queryByText('หน้าเข้าสู่ระบบ')).not.toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(500)
    })

    expect(applyAppUpdate).toHaveBeenCalledTimes(1)
  })

  it('enters the login page after the initial check when no update is pending', () => {
    mockedUseAppUpdate.mockReturnValue({
      applyAppUpdate: vi.fn(),
      checkForUpdate: vi.fn(),
      clearApplyingAppUpdate: vi.fn(),
      hasPendingAppUpdate: false,
      isApplyingAppUpdate: false,
      isInitialUpdateCheckDone: true,
    })

    render(<App />)

    act(() => {
      vi.advanceTimersByTime(700)
    })

    expect(screen.getByText('หน้าเข้าสู่ระบบ')).toBeInTheDocument()
  })

  it('leaves the update splash after an app update reload finishes', () => {
    const clearApplyingAppUpdate = vi.fn()

    mockedUseAppUpdate.mockReturnValue({
      applyAppUpdate: vi.fn(),
      checkForUpdate: vi.fn(),
      clearApplyingAppUpdate,
      hasPendingAppUpdate: false,
      isApplyingAppUpdate: true,
      isInitialUpdateCheckDone: true,
    })

    render(<App />)

    expect(screen.getByText('มีเวอร์ชันใหม่ กำลังอัปเดตแอป')).toBeInTheDocument()

    act(() => {
      vi.advanceTimersByTime(900)
    })

    expect(clearApplyingAppUpdate).toHaveBeenCalledTimes(1)
    expect(screen.getByText('หน้าเข้าสู่ระบบ')).toBeInTheDocument()
  })
})
