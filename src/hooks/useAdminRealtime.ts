import { useEffect } from 'react'
import { wsBaseURL } from '../api/httpClient'
import type { AdminNotification } from '../types/admin'

type UseAdminRealtimeOptions = {
  onNotification: (notification: AdminNotification) => void
}

export function useAdminRealtime({ onNotification }: UseAdminRealtimeOptions) {
  useEffect(() => {
    if (!('WebSocket' in window)) return

    const ws = new WebSocket(`${wsBaseURL}/ws/admin`)
    ws.addEventListener('message', (event) => {
      try {
        onNotification(JSON.parse(event.data) as AdminNotification)
      } catch {
        // Ignore malformed realtime payloads from development tools.
      }
    })

    return () => {
      ws.close()
    }
  }, [onNotification])
}
