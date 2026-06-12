import type { CustomerPage } from '../types/navigation'

const getLiffStatePath = () => {
  const liffState = new URLSearchParams(window.location.search).get('liff.state')
  if (!liffState) {
    return ''
  }

  try {
    const decodedPath = decodeURIComponent(liffState)
    return decodedPath.startsWith('/') ? decodedPath.split('?')[0] : ''
  } catch {
    return liffState.startsWith('/') ? liffState.split('?')[0] : ''
  }
}

export const getCurrentCustomerPage = (): CustomerPage => {
  const path = getLiffStatePath() || window.location.pathname
  if (path === '/services') return 'services'
  if (path === '/booking/success') return 'success'
  return 'booking'
}
