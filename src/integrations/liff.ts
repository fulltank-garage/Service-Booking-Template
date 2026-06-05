import liff from '@line/liff'

export type LineProfile = {
  userId: string
  displayName: string
  pictureUrl?: string
}

let profilePromise: Promise<LineProfile | null> | null = null
let loginStarted = false

export const initializeLiff = async (): Promise<LineProfile | null> => {
  const liffId = import.meta.env.VITE_LIFF_ID
  if (!liffId) {
    return null
  }

  profilePromise ??= (async () => {
    await liff.init({ liffId })
    if (!liff.isLoggedIn()) {
      if (!liff.isInClient()) {
        return null
      }
      if (!loginStarted) {
        loginStarted = true
        liff.login({ redirectUri: window.location.href })
      }
      return null
    }

    const profile = await liff.getProfile()
    return {
      userId: profile.userId,
      displayName: profile.displayName,
      pictureUrl: profile.pictureUrl,
    }
  })()

  return profilePromise
}

export const closeLiffWindow = () => {
  try {
    if (liff.isInClient()) {
      liff.closeWindow()
    }
  } catch {
    // Outside LINE clients the success page should stay open normally.
  }
}
