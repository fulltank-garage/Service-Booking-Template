import axios from 'axios'

export const digitsOnly = (value: string) => value.replace(/\D/g, '')

export const isActiveBookingError = (error: unknown) =>
  axios.isAxiosError(error) &&
  error.response?.status === 409 &&
  String(error.response.data?.error?.message ?? '').includes('active booking')
