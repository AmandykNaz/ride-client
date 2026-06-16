import { backendPost, logoutRideAuthSession, refreshRideAuthSession } from '../../../shared/api/backend'
import { setRideAccessToken } from '../../../shared/auth/tokenStorage'

export type RideCustomer = {
  id?: string
  phone?: string
  name?: string
  passwordConfigured?: boolean
  city?: string
  rating?: number
  tripsCount?: number
  [key: string]: unknown
}

export type RideAuthSessionResponse = {
  accessToken?: string
  token?: string
  customer?: RideCustomer
  user?: RideCustomer
  passenger?: RideCustomer
  passengerProfile?: Record<string, unknown>
  driverProfile?: Record<string, unknown> | null
  devCode?: string
  [key: string]: unknown
}

export type RideAuthRequestOtpResponse = {
  devCode?: string
  message?: string
  [key: string]: unknown
}

export type RideAuthPasswordPayload = {
  phone: string
  password: string
}

export type RideAuthResetPasswordPayload = RideAuthPasswordPayload & {
  code: string
}

function resolveRideAccessToken(response: RideAuthSessionResponse) {
  return response.accessToken || response.token || ''
}

export function normalizeRidePhone(phone: string) {
  const digits = phone.replace(/\D/g, '')

  if (!digits) return ''

  if (digits.length === 10) {
    return `+7${digits}`
  }

  if (digits.length === 11 && digits.startsWith('8')) {
    return `+7${digits.slice(1)}`
  }

  if (digits.length === 11 && digits.startsWith('7')) {
    return `+${digits}`
  }

  return `+${digits}`
}

export async function requestRideOtp(phone: string) {
  const normalizedPhone = normalizeRidePhone(phone)

  return backendPost<RideAuthRequestOtpResponse>(
    '/ride/auth/request-otp',
    { phone: normalizedPhone },
    {
      skipAuth: true,
    },
  )
}

export async function verifyRideOtp(phone: string, code: string) {
  const normalizedPhone = normalizeRidePhone(phone)
  const response = await backendPost<RideAuthSessionResponse>(
    '/ride/auth/verify-otp',
    {
      phone: normalizedPhone,
      code,
    },
    {
      skipAuth: true,
    },
  )
  const accessToken = resolveRideAccessToken(response)

  if (!accessToken) {
    throw new Error('Backend did not return an access token')
  }

  setRideAccessToken(accessToken)

  return {
    ...response,
    accessToken,
  }
}

export async function loginRide(phone: string, password: string) {
  const normalizedPhone = normalizeRidePhone(phone)
  const response = await backendPost<RideAuthSessionResponse>(
    '/ride/auth/login',
    {
      phone: normalizedPhone,
      password,
    } satisfies RideAuthPasswordPayload,
    {
      skipAuth: true,
    },
  )
  const accessToken = resolveRideAccessToken(response)

  if (!accessToken) {
    throw new Error('Backend did not return an access token')
  }

  setRideAccessToken(accessToken)

  return {
    ...response,
    accessToken,
  }
}

export async function setRidePassword(password: string) {
  const response = await backendPost<RideAuthSessionResponse>(
    '/ride/auth/set-password',
    {
      password,
    },
  )
  const accessToken = resolveRideAccessToken(response)

  if (!accessToken) {
    throw new Error('Backend did not return an access token')
  }

  setRideAccessToken(accessToken)

  return {
    ...response,
    accessToken,
  }
}

export async function requestRidePasswordResetOtp(phone: string) {
  const normalizedPhone = normalizeRidePhone(phone)

  return backendPost<RideAuthRequestOtpResponse>(
    '/ride/auth/request-password-reset-otp',
    {
      phone: normalizedPhone,
    },
    {
      skipAuth: true,
    },
  )
}

export async function resetRidePassword(phone: string, code: string, password: string) {
  const normalizedPhone = normalizeRidePhone(phone)
  const response = await backendPost<RideAuthSessionResponse>(
    '/ride/auth/reset-password',
    {
      phone: normalizedPhone,
      code,
      password,
    } satisfies RideAuthResetPasswordPayload,
    {
      skipAuth: true,
    },
  )
  const accessToken = resolveRideAccessToken(response)

  if (!accessToken) {
    throw new Error('Backend did not return an access token')
  }

  setRideAccessToken(accessToken)

  return {
    ...response,
    accessToken,
  }
}

export async function refreshRideSession() {
  const response = await refreshRideAuthSession()
  const accessToken = resolveRideAccessToken(response as RideAuthSessionResponse)

  if (!accessToken) {
    throw new Error('Session expired')
  }

  return {
    ...(response as RideAuthSessionResponse),
    accessToken,
  }
}

export async function logoutRideSession() {
  await logoutRideAuthSession()
}
