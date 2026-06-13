const authTokenKey = 'service-booking-admin-token'
const authEmailKey = 'service-booking-admin-email'
const authNameKey = 'service-booking-admin-name'
const authExpiresAtKey = 'service-booking-admin-expires-at'

export type StoredAdminSession = {
  email: string
  expiresAt: string
  name: string
  token: string
}

export const authStorage = {
  getSession: (): StoredAdminSession | null => {
    const token = window.localStorage.getItem(authTokenKey)
    const email = window.localStorage.getItem(authEmailKey)
    const expiresAt = window.localStorage.getItem(authExpiresAtKey) ?? ''
    const name = window.localStorage.getItem(authNameKey) || 'Service Booking Admin'
    if (!token || !email) return null
    return { email, expiresAt, name, token }
  },

  getToken: () => window.localStorage.getItem(authTokenKey) ?? '',

  getExpiresAt: () => window.localStorage.getItem(authExpiresAtKey) ?? '',

  setSession: (session: StoredAdminSession) => {
    window.localStorage.setItem(authTokenKey, session.token)
    window.localStorage.setItem(authEmailKey, session.email)
    window.localStorage.setItem(authExpiresAtKey, session.expiresAt)
    window.localStorage.setItem(authNameKey, session.name)
  },

  clear: () => {
    window.localStorage.removeItem(authTokenKey)
    window.localStorage.removeItem(authEmailKey)
    window.localStorage.removeItem(authExpiresAtKey)
    window.localStorage.removeItem(authNameKey)
  },
}
