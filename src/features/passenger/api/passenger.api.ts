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
  customer?: RideCustomer
  passengerProfile?: RideCustomer
  profile?: RideCustomer
  passenger?: RideCustomer
  data?: RideCustomer
}

export type RidePassengerMePayload = {
  name: string
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function toString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function pickCustomerSource(me: RidePassengerMe) {
  return me.customer ?? me.profile ?? me.passenger ?? me.data ?? me
}

function pickPassengerProfileSource(me: RidePassengerMe) {
  return me.passengerProfile ?? me.profile ?? me.passenger ?? me.data ?? me
}

export function isPassengerProfileComplete(
  profile: { name?: string | null; city?: string | null } | null | undefined,
) {
  return Boolean(profile?.name?.trim() && profile?.city?.trim())
}

export function toRidePassengerProfile(
  me: RidePassengerMe,
  fallbackPhone = '',
): RidePassengerProfile {
  const customerSource = pickCustomerSource(me)
  const passengerProfileSource = me.passengerProfile ?? pickPassengerProfileSource(me)

  return {
    id: toString(customerSource.id, `passenger-${Date.now()}`),
    name: toString(customerSource.name ?? customerSource.fullName, ''),
    phone: toString(customerSource.phone, fallbackPhone),
    city: toString(customerSource.city ?? passengerProfileSource.city, ''),
    rating: toNumber(passengerProfileSource.rating ?? customerSource.rating, 5),
    tripsCount: toNumber(passengerProfileSource.tripsCount ?? customerSource.tripsCount, 0),
  }
}

export async function getPassengerMe() {
  return backendGet<RidePassengerMe>('/ride/passenger/me')
}

export async function updatePassengerMe(payload: RidePassengerMePayload) {
  return backendPatch<RidePassengerMe>('/ride/passenger/me', payload)
}
