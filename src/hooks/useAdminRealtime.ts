import { useEffect } from 'react'
import { wsBaseURL } from '../api/httpClient'
import { authStorage } from '../features/auth/authStorage'
import type { AdminNotification, AdminRealtimeEvent } from '../types/admin'

export type RealtimeStatus = 'connecting' | 'connected' | 'reconnecting' | 'off'

type UseAdminRealtimeOptions = {
  onEvent: (event: AdminRealtimeEvent) => void
  onLegacyNotification?: (notification: AdminNotification) => void
  onRefresh?: () => void
  onStatus?: (status: RealtimeStatus) => void
}

export function useAdminRealtime({ onEvent, onLegacyNotification, onRefresh, onStatus }: UseAdminRealtimeOptions) {
  useEffect(() => {
    if (!('WebSocket' in window)) return

    const token = authStorage.getToken()
    if (!token) return

    let socket: WebSocket | null = null
    let retryTimer: ReturnType<typeof setTimeout> | null = null
    let retryCount = 0
    let isClosed = false
    let isConnecting = false

    const clearRetry = () => {
      if (retryTimer) {
        clearTimeout(retryTimer)
        retryTimer = null
      }
    }

    const isSocketLive = () =>
      socket?.readyState === WebSocket.OPEN || socket?.readyState === WebSocket.CONNECTING

    const connect = () => {
      if (isClosed || isConnecting || isSocketLive()) return

      isConnecting = true
      onStatus?.(retryCount === 0 ? 'connecting' : 'reconnecting')

      try {
        const nextSocket = new WebSocket(`${wsBaseURL}/ws/admin?token=${encodeURIComponent(token)}`)
        socket = nextSocket

        nextSocket.addEventListener('open', () => {
          retryCount = 0
          isConnecting = false
          onStatus?.('connected')
          onRefresh?.()
        })

        nextSocket.addEventListener('message', (event) => {
          try {
            const payload = JSON.parse(event.data) as AdminRealtimeEvent | AdminNotification
            if ('type' in payload && ('notification' in payload || 'booking' in payload)) {
              onEvent(payload as AdminRealtimeEvent)
              return
            }
            onLegacyNotification?.(payload as AdminNotification)
          } catch {
            // Ignore malformed realtime payloads from development tools.
          }
        })

        nextSocket.addEventListener('error', () => {
          nextSocket.close()
        })

        nextSocket.addEventListener('close', () => {
          isConnecting = false
          if (isClosed) return

          retryCount += 1
          onStatus?.('reconnecting')
          retryTimer = setTimeout(connect, Math.min(1000 * retryCount, 10_000))
        })
      } catch {
        isConnecting = false
        retryCount += 1
        onStatus?.('reconnecting')
        retryTimer = setTimeout(connect, Math.min(1000 * retryCount, 10_000))
      }
    }

    const reconnect = () => {
      if (isClosed || document.visibilityState === 'hidden' || isSocketLive()) return

      clearRetry()
      onStatus?.('reconnecting')
      retryTimer = setTimeout(connect, 100)
    }

    const handleActiveRefresh = () => {
      if (document.visibilityState !== 'hidden') {
        onRefresh?.()
        reconnect()
      }
    }

    connect()
    window.addEventListener('focus', handleActiveRefresh)
    window.addEventListener('online', handleActiveRefresh)
    document.addEventListener('visibilitychange', handleActiveRefresh)
    return () => {
      isClosed = true
      clearRetry()
      window.removeEventListener('focus', handleActiveRefresh)
      window.removeEventListener('online', handleActiveRefresh)
      document.removeEventListener('visibilitychange', handleActiveRefresh)
      onStatus?.('off')
      socket?.close()
    }
  }, [onEvent, onLegacyNotification, onRefresh, onStatus])
}
