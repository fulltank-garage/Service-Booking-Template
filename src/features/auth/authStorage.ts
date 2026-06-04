const authTokenKey = 'service-booking-admin-token'
const authEmailKey = 'service-booking-admin-email'
const authNameKey = 'service-booking-admin-name'

export type StoredAdminSession = {
  email: string
  name: string
  token: string
}

export const authStorage = {
  getSession: (): StoredAdminSession | null => {
    const token = window.localStorage.getItem(authTokenKey)
    const email = window.localStorage.getItem(authEmailKey)
    const name = window.localStorage.getItem(authNameKey) || 'Service Booking Admin'
    if (!token || !email) return null
    return { email, name, token }
  },

  getToken: () => window.localStorage.getItem(authTokenKey) ?? '',

  setSession: (session: StoredAdminSession) => {
    window.localStorage.setItem(authTokenKey, session.token)
    window.localStorage.setItem(authEmailKey, session.email)
    window.localStorage.setItem(authNameKey, session.name)
  },

  clear: () => {
    window.localStorage.removeItem(authTokenKey)
    window.localStorage.removeItem(authEmailKey)
    window.localStorage.removeItem(authNameKey)
  },
}
