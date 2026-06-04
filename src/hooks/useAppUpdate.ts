import { useCallback, useEffect, useRef, useState } from 'react'

const serviceWorkerPath = '/admin-sw.js'
const updateCheckIntervalMs = 60_000

const readAssetVersion = (root: ParentNode) =>
  Array.from(root.querySelectorAll<HTMLLinkElement | HTMLScriptElement>('script[src^="/assets/"], link[href^="/assets/"]'))
    .map((element) => {
      const assetUrl = element instanceof HTMLScriptElement ? element.src : element.href
      return new URL(assetUrl, window.location.origin).pathname
    })
    .filter(Boolean)
    .sort()
    .join('|')

const getLoadedAppVersion = () => readAssetVersion(document)

const getRemoteAppVersion = async () => {
  const response = await fetch(`${window.location.origin}/?app-version=${Date.now()}`, {
    cache: 'no-store',
    headers: { 'Cache-Control': 'no-cache' },
  })

  if (!response.ok) return ''

  const html = await response.text()
  const snapshot = new DOMParser().parseFromString(html, 'text/html')
  return readAssetVersion(snapshot)
}

export function useAppUpdate() {
  const [hasPendingAppUpdate, setHasPendingAppUpdate] = useState(false)
  const [isInitialUpdateCheckDone, setIsInitialUpdateCheckDone] = useState(false)
  const registrationRef = useRef<ServiceWorkerRegistration | null>(null)
  const watchedRegistrationsRef = useRef(new Set<ServiceWorkerRegistration>())
  const isApplyingRef = useRef(false)

  const showUpdatePrompt = useCallback((registration?: ServiceWorkerRegistration) => {
    if (registration) {
      registrationRef.current = registration
    }
    setHasPendingAppUpdate(true)
  }, [])

  const watchRegistration = useCallback(
    (registration: ServiceWorkerRegistration) => {
      registrationRef.current = registration

      if (registration.waiting && navigator.serviceWorker.controller) {
        showUpdatePrompt(registration)
      }

      if (watchedRegistrationsRef.current.has(registration)) {
        return
      }
      watchedRegistrationsRef.current.add(registration)

      registration.addEventListener('updatefound', () => {
        const nextWorker = registration.installing
        if (!nextWorker) return

        nextWorker.addEventListener('statechange', () => {
          if (nextWorker.state === 'installed' && navigator.serviceWorker.controller) {
            showUpdatePrompt(registration)
          }
        })
      })
    },
    [showUpdatePrompt],
  )

  const checkForUpdate = useCallback(() => {
    const loadedVersion = getLoadedAppVersion()

    void getRemoteAppVersion()
      .then((remoteVersion) => {
        if (loadedVersion && remoteVersion && remoteVersion !== loadedVersion) {
          showUpdatePrompt()
        }
      })
      .catch(() => undefined)

    if (!('serviceWorker' in navigator)) {
      return
    }

    navigator.serviceWorker
      .getRegistration(serviceWorkerPath)
      .then((registration) => {
        if (!registration) return undefined
        watchRegistration(registration)
        return registration.update()
      })
      .catch(() => undefined)
  }, [showUpdatePrompt, watchRegistration])

  const applyAppUpdate = useCallback(() => {
    const waitingWorker = registrationRef.current?.waiting
    isApplyingRef.current = true

    if (!waitingWorker) {
      window.location.reload()
      return
    }

    waitingWorker.postMessage({ type: 'SKIP_WAITING' })
  }, [])

  useEffect(() => {
    if (!('serviceWorker' in navigator)) {
      const unsupportedTimer = window.setTimeout(() => setIsInitialUpdateCheckDone(true), 0)
      return () => window.clearTimeout(unsupportedTimer)
    }

    const initialCheckTimer = window.setTimeout(() => setIsInitialUpdateCheckDone(true), 1_800)

    navigator.serviceWorker
      .register(serviceWorkerPath, { scope: '/' })
      .then((registration) => {
        watchRegistration(registration)
        return registration.update().finally(() => {
          checkForUpdate()
          window.setTimeout(() => setIsInitialUpdateCheckDone(true), 180)
        })
      })
      .catch(() => setIsInitialUpdateCheckDone(true))

    const handleControllerChange = () => {
      if (isApplyingRef.current) {
        window.location.reload()
        return
      }
      setHasPendingAppUpdate(true)
    }

    const handleActiveCheck = () => {
      if (!document.hidden) {
        checkForUpdate()
      }
    }

    const timer = window.setInterval(checkForUpdate, updateCheckIntervalMs)
    window.setTimeout(checkForUpdate, 1_500)
    navigator.serviceWorker.addEventListener('controllerchange', handleControllerChange)
    document.addEventListener('visibilitychange', handleActiveCheck)
    window.addEventListener('focus', handleActiveCheck)

    return () => {
      window.clearTimeout(initialCheckTimer)
      window.clearInterval(timer)
      navigator.serviceWorker.removeEventListener('controllerchange', handleControllerChange)
      document.removeEventListener('visibilitychange', handleActiveCheck)
      window.removeEventListener('focus', handleActiveCheck)
    }
  }, [checkForUpdate, watchRegistration])

  return { applyAppUpdate, checkForUpdate, hasPendingAppUpdate, isInitialUpdateCheckDone }
}
