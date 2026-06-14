import { backendPost } from '../../../shared/api/backend'
import { setRideAccessToken } from '../../../shared/auth/tokenStorage'

export type RideCustomer = {
  id?: string
  phone?: string
  name?: string
  city?: string
  rating?: number
  tripsCount?: number
  [key: string]: unknown
}

export type RideAuthVerifyResponse = {
  accessToken?: string
  token?: string
  customer?: RideCustomer
  user?: RideCustomer
  passenger?: RideCustomer
  devCode?: string
  [key: string]: unknown
}

export type RideAuthRequestOtpResponse = {
  devCode?: string
  message?: string
  [key: string]: unknown
}

function resolveRideAccessToken(response: RideAuthVerifyResponse) {
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
  const response = await backendPost<RideAuthVerifyResponse>(
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
