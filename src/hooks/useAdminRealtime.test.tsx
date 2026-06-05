import { act, renderHook } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { authStorage } from '../features/auth/authStorage'
import { useAdminRealtime } from './useAdminRealtime'
import type { AdminRealtimeEvent } from '../types/admin'

type Listener = (event?: MessageEvent) => void

class MockWebSocket {
  static CONNECTING = 0
  static OPEN = 1
  static CLOSING = 2
  static CLOSED = 3

  static instances: MockWebSocket[] = []

  readyState = MockWebSocket.CONNECTING
  private listeners = new Map<string, Listener[]>()

  constructor(public url: string) {
    MockWebSocket.instances.push(this)
  }

  addEventListener(type: string, listener: Listener) {
    this.listeners.set(type, [...(this.listeners.get(type) ?? []), listener])
  }

  close() {
    this.readyState = MockWebSocket.CLOSED
  }

  emitOpen() {
    this.readyState = MockWebSocket.OPEN
    this.emit('open')
  }

  emitMessage(payload: unknown) {
    this.emit('message', new MessageEvent('message', { data: JSON.stringify(payload) }))
  }

  private emit(type: string, event?: MessageEvent) {
    for (const listener of this.listeners.get(type) ?? []) {
      listener(event)
    }
  }
}

describe('useAdminRealtime', () => {
  beforeEach(() => {
    MockWebSocket.instances = []
    authStorage.setSession({
      email: 'admin@example.com',
      name: 'FULLTANK Garage Admin',
      token: 'test-token',
    })
    vi.stubGlobal('WebSocket', MockWebSocket)
  })

  afterEach(() => {
    authStorage.clear()
    vi.unstubAllGlobals()
  })

  it('routes booking settings updates as realtime events instead of legacy notifications', () => {
    const onEvent = vi.fn()
    const onLegacyNotification = vi.fn()

    renderHook(() =>
      useAdminRealtime({
        onEvent,
        onLegacyNotification,
      }),
    )

    const socket = MockWebSocket.instances[0]
    const event: AdminRealtimeEvent = {
      type: 'booking_settings.updated',
      settings: {
        openTime: '09:00',
        closeTime: '17:00',
        slotIntervalMinutes: 30,
        slotCapacity: 1,
        closedWeekdays: '',
        minAdvanceHours: 0,
        maxAdvanceDays: 60,
        reminderLeadMinutes: 1440,
        blackoutDates: [],
      },
    }

    act(() => {
      socket.emitMessage(event)
    })

    expect(onEvent).toHaveBeenCalledWith(event)
    expect(onLegacyNotification).not.toHaveBeenCalled()
  })
})
