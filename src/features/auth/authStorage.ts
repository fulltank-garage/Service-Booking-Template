const authTokenKey = 'service-booking-admin-token'
const authEmailKey = 'service-booking-admin-email'

export type StoredAdminSession = {
  email: string
  token: string
}

export const authStorage = {
  getSession: (): StoredAdminSession | null => {
    const token = window.localStorage.getItem(authTokenKey)
    const email = window.localStorage.getItem(authEmailKey)
    if (!token || !email) return null
    return { email, token }
  },

  getToken: () => window.localStorage.getItem(authTokenKey) ?? '',

  setSession: (session: StoredAdminSession) => {
    window.localStorage.setItem(authTokenKey, session.token)
    window.localStorage.setItem(authEmailKey, session.email)
  },

  clear: () => {
    window.localStorage.removeItem(authTokenKey)
    window.localStorage.removeItem(authEmailKey)
  },
}
