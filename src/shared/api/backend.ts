import { clearRideAuthSession, getRideAccessToken, setRideAccessToken } from '../auth/tokenStorage'

export const API_BASE_URL =
  (import.meta.env.VITE_API_BASE_URL?.trim() || 'http://localhost:4000/api/v1')

if (import.meta.env.DEV) {
  console.debug(
    '[backend] API base URL:',
    API_BASE_URL,
    import.meta.env.VITE_API_BASE_URL ? '(from VITE_API_BASE_URL)' : '(using fallback)',
  )
}

type BackendEnvelope<T> = {
  success: boolean
  message: string
  data: T
}

type BackendMethod = 'GET' | 'POST' | 'PATCH'

type BackendRequestOptions = {
  method: BackendMethod
  body?: unknown
  skipAuth?: boolean
  headers?: HeadersInit
  skipRefresh?: boolean
}

export class BackendApiError extends Error {
  status?: number
  code?: string

  constructor(message: string, status?: number, code?: string) {
    super(message)
    this.name = 'BackendApiError'
    this.status = status
    this.code = code
  }
}

export class BackendAuthError extends BackendApiError {
  constructor(message = 'Session expired') {
    super(message, 401, 'AUTH_REQUIRED')
    this.name = 'BackendAuthError'
  }
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function getErrorMessage(value: unknown, fallback: string) {
  if (typeof value === 'string' && value.trim()) {
    return value
  }

  if (isPlainObject(value)) {
    const nestedMessage = value.message ?? value.error ?? value.detail
    if (typeof nestedMessage === 'string' && nestedMessage.trim()) {
      return nestedMessage
    }
  }

  return fallback
}

async function parseResponseBody(response: Response) {
  const text = await response.text()

  if (!text) return null

  try {
    return JSON.parse(text) as unknown
  } catch {
    return text
  }
}

function buildHeaders(skipAuth?: boolean, headers?: HeadersInit, includeJsonContentType = true) {
  const requestHeaders = new Headers(headers)
  if (includeJsonContentType) {
    requestHeaders.set('Content-Type', 'application/json')
  }

  if (!skipAuth) {
    const token = getRideAccessToken()
    if (token) {
      requestHeaders.set('Authorization', `Bearer ${token}`)
    }
  }

  return requestHeaders
}

type RideAuthRefreshPayload = {
  accessToken?: string
  token?: string
  [key: string]: unknown
}

let authRefreshPromise: Promise<RideAuthRefreshPayload | null> | null = null

function resolveAccessToken(value: unknown) {
  if (!isPlainObject(value)) return ''

  const accessToken = value.accessToken ?? value.token
  return typeof accessToken === 'string' && accessToken.trim() ? accessToken : ''
}

async function performRideAuthRefresh() {
  if (authRefreshPromise) {
    return authRefreshPromise
  }

  authRefreshPromise = (async () => {
    let response: Response

    try {
      response = await fetch(`${API_BASE_URL}/ride/auth/refresh`, {
        method: 'POST',
        credentials: 'include',
      })
    } catch {
      return null
    }

    const parsed = (await parseResponseBody(response)) as RideAuthRefreshPayload | string | null
    const isEnvelope = isPlainObject(parsed) && 'success' in parsed && 'data' in parsed
    const payload = isEnvelope ? (parsed.data as RideAuthRefreshPayload) : (parsed as RideAuthRefreshPayload | null)

    if (!response.ok || (isEnvelope && !parsed.success)) {
      if (response.status === 401) {
        clearRideAuthSession()
      }

      return null
    }

    const accessToken = resolveAccessToken(payload)
    if (accessToken) {
      setRideAccessToken(accessToken)
    }

    return payload ?? null
  })().finally(() => {
    authRefreshPromise = null
  })

  return authRefreshPromise
}

export async function refreshRideAuthSession() {
  const refreshed = await performRideAuthRefresh()
  const accessToken = resolveAccessToken(refreshed)

  if (!accessToken) {
    throw new BackendAuthError('Session expired. Please sign in again.')
  }

  return refreshed ?? { accessToken }
}

export async function logoutRideAuthSession() {
  try {
    await fetch(`${API_BASE_URL}/ride/auth/logout`, {
      method: 'POST',
      credentials: 'include',
    })
  } catch {
    // Best effort; local session is cleared below.
  } finally {
    clearRideAuthSession()
  }
}

async function requestBackend<T>(
  path: string,
  { method, body, skipAuth, headers, skipRefresh }: BackendRequestOptions,
): Promise<T> {
  const isFormData = typeof FormData !== 'undefined' && body instanceof FormData
  let response: Response

  try {
    response = await fetch(`${API_BASE_URL}${path}`, {
      method,
      headers: buildHeaders(skipAuth, headers, !isFormData),
      credentials: 'include',
      body: body === undefined ? undefined : isFormData ? body : JSON.stringify(body),
    })
  } catch (error) {
    throw new BackendApiError(
      'Backend недоступен. Проверьте VITE_API_BASE_URL и запущен ли backend.',
      undefined,
      error instanceof Error ? error.name : undefined,
    )
  }

  const parsed = (await parseResponseBody(response)) as Partial<BackendEnvelope<T>> | T | string | null
  const isEnvelope = isPlainObject(parsed) && 'success' in parsed && 'data' in parsed
  const retryEligible = !skipAuth && !skipRefresh

  if (!response.ok) {
    if (response.status === 401) {
      if (retryEligible) {
        const refreshed = await performRideAuthRefresh()
        const refreshedToken = resolveAccessToken(refreshed)

        if (refreshedToken) {
          return requestBackend<T>(path, { method, body, skipAuth, headers, skipRefresh: true })
        }
      }

      clearRideAuthSession()
      throw new BackendAuthError(
        getErrorMessage(
          isEnvelope ? parsed.message : parsed,
          'Сессия истекла. Войдите снова.',
        ),
      )
    }

    throw new BackendApiError(
      getErrorMessage(
        isEnvelope ? parsed.message : parsed,
        `Request failed with status ${response.status}`,
      ),
      response.status,
    )
  }

  if (isEnvelope) {
    if (!parsed.success) {
      const message = getErrorMessage(parsed.message, 'Backend request failed')
      if (response.status === 401) {
        clearRideAuthSession()
        throw new BackendAuthError(message)
      }

      throw new BackendApiError(message, response.status)
    }

    if (parsed.data === undefined) {
      throw new BackendApiError('Backend response did not include data', response.status)
    }

    return parsed.data
  }

  return parsed as T
}

export function backendGet<T>(path: string) {
  return requestBackend<T>(path, { method: 'GET' })
}

export function backendPost<T>(
  path: string,
  body?: unknown,
  options?: Pick<BackendRequestOptions, 'skipAuth' | 'headers'>,
) {
  return requestBackend<T>(path, { method: 'POST', body, ...options })
}

export function backendPatch<T>(
  path: string,
  body?: unknown,
  options?: Pick<BackendRequestOptions, 'skipAuth' | 'headers'>,
) {
  return requestBackend<T>(path, { method: 'PATCH', body, ...options })
}
