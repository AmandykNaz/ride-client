const RIDE_STORAGE_KEYS = ['ride_access_token', 'ride-auth-token', 'ride_auth_token']

function canUseStorage() {
  return typeof window !== 'undefined'
}

function clearStorageKeys(storage: Storage | undefined, keys: string[]) {
  if (!storage) return

  for (const key of keys) {
    try {
      storage.removeItem(key)
    } catch {
      // Ignore storage write failures in restricted browser contexts.
    }
  }
}

export function getRideAccessToken() {
  if (!canUseStorage()) return null

  try {
    const legacyKeys = RIDE_STORAGE_KEYS.slice(1)

    for (const key of RIDE_STORAGE_KEYS) {
      const localToken = window.localStorage.getItem(key)
      if (localToken) {
        if (key !== RIDE_STORAGE_KEYS[0]) {
          window.localStorage.setItem(RIDE_STORAGE_KEYS[0], localToken)
        }
        for (const legacyKey of legacyKeys) {
          window.localStorage.removeItem(legacyKey)
          window.sessionStorage.removeItem(legacyKey)
        }
        return localToken
      }

      const sessionToken = window.sessionStorage.getItem(key)
      if (sessionToken) {
        window.localStorage.setItem(RIDE_STORAGE_KEYS[0], sessionToken)
        for (const legacyKey of legacyKeys) {
          window.sessionStorage.removeItem(legacyKey)
          window.localStorage.removeItem(legacyKey)
        }
        return sessionToken
      }
    }

    return null
  } catch {
    return null
  }
}

export function setRideAccessToken(token: string) {
  if (!canUseStorage()) return

  try {
    window.localStorage.setItem(RIDE_STORAGE_KEYS[0], token)
    clearStorageKeys(window.localStorage, RIDE_STORAGE_KEYS.slice(1))
    clearStorageKeys(window.sessionStorage, RIDE_STORAGE_KEYS.slice(1))
  } catch {
    // Ignore storage write failures in restricted browser contexts.
  }
}

export function clearRideAccessToken() {
  clearRideAuthSession()
}

export function clearRideAuthSession() {
  if (!canUseStorage()) return

  try {
    clearStorageKeys(window.localStorage, RIDE_STORAGE_KEYS)
    clearStorageKeys(window.sessionStorage, RIDE_STORAGE_KEYS)
  } catch {
    // Ignore storage write failures in restricted browser contexts.
  }
}
