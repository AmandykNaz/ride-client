const RIDE_ACCESS_TOKEN_KEY = 'ride_access_token'

function canUseStorage() {
  return typeof window !== 'undefined' && typeof window.localStorage !== 'undefined'
}

export function getRideAccessToken() {
  if (!canUseStorage()) return null

  try {
    return window.localStorage.getItem(RIDE_ACCESS_TOKEN_KEY)
  } catch {
    return null
  }
}

export function setRideAccessToken(token: string) {
  if (!canUseStorage()) return

  try {
    window.localStorage.setItem(RIDE_ACCESS_TOKEN_KEY, token)
  } catch {
    // Ignore storage write failures in restricted browser contexts.
  }
}

export function clearRideAccessToken() {
  if (!canUseStorage()) return

  try {
    window.localStorage.removeItem(RIDE_ACCESS_TOKEN_KEY)
  } catch {
    // Ignore storage write failures in restricted browser contexts.
  }
}
