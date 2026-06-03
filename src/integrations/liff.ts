import liff from '@line/liff'

export type LineProfile = {
  userId: string
  displayName: string
  pictureUrl?: string
}

export const initializeLiff = async (): Promise<LineProfile | null> => {
  const liffId = import.meta.env.VITE_LIFF_ID
  if (!liffId) {
    return null
  }

  await liff.init({ liffId })
  if (!liff.isLoggedIn()) {
    liff.login()
    return null
  }

  const profile = await liff.getProfile()
  return {
    userId: profile.userId,
    displayName: profile.displayName,
    pictureUrl: profile.pictureUrl,
  }
}
