import { backendGet, backendPatch } from '../../../shared/api/backend'
import type { RideCustomer } from '../../ride-auth/api/ride-auth.api'

export type RidePassengerProfile = {
  id: string
  name: string
  phone: string
  city: string
  rating: number
  tripsCount: number
}

export type RidePassengerMe = RideCustomer & {
  profile?: RideCustomer
  passenger?: RideCustomer
  data?: RideCustomer
}

export type RidePassengerMePayload = {
  name: string
  city: string
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function toString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function pickCustomerSource(me: RidePassengerMe) {
  return me.profile ?? me.passenger ?? me.data ?? me
}

export function toRidePassengerProfile(
  me: RidePassengerMe,
  fallbackPhone = '',
): RidePassengerProfile {
  const source = pickCustomerSource(me)

  return {
    id: toString(source.id, `passenger-${Date.now()}`),
    name: toString(source.name ?? source.fullName, ''),
    phone: toString(source.phone, fallbackPhone),
    city: toString(source.city, ''),
    rating: toNumber(source.rating, 5),
    tripsCount: toNumber(source.tripsCount, 0),
  }
}

export async function getPassengerMe() {
  return backendGet<RidePassengerMe>('/ride/passenger/me')
}

export async function updatePassengerMe(payload: RidePassengerMePayload) {
  return backendPatch<RidePassengerMe>('/ride/passenger/me', payload)
}
