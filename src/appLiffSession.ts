import { initializeLiff, type LineProfile } from './integrations/liff'

let liffBootstrapRequest: Promise<LineProfile | null> | null = null
let liffBootstrapProfile: LineProfile | null = null

export const initializeLiffOnce = () => {
  if (liffBootstrapProfile) {
    return Promise.resolve(liffBootstrapProfile)
  }
  liffBootstrapRequest ??= initializeLiff()
    .then((profile) => {
      if (profile) {
        liffBootstrapProfile = profile
      }
      return profile
    })
    .finally(() => {
      liffBootstrapRequest = null
    })
  return liffBootstrapRequest
}

export const resetCustomerSessionForTests = () => {
  liffBootstrapRequest = null
  liffBootstrapProfile = null
}
