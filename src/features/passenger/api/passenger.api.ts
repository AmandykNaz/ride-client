import { backendGet, backendPatch } from '../../../shared/api/backend'
import type { RideCustomer } from '../../ride-auth/api/ride-auth.api'

export type RidePassengerProfile = {
  id: string
  name: string
  phone: string
  cityId?: number | null
  cityName: string
  cityRegionName?: string | null
  city: string
  rating: number
  tripsCount: number
}

type RidePassengerProfileSource = Omit<RideCustomer, 'city'> & {
  id?: string | number
  fullName?: string
  cityId?: number | null
  cityName?: string | null
  cityRegionName?: string | null
  city?: {
    id?: number
    nameRu?: string
    regionName?: string | null
  } | null
  rating?: number
  tripsCount?: number
}

export type RidePassengerMe = RideCustomer & {
  customer?: RidePassengerProfileSource
  passengerProfile?: RidePassengerProfileSource
  profile?: RidePassengerProfileSource
  passenger?: RidePassengerProfileSource
  data?: RidePassengerProfileSource
}

export type RidePassengerMePayload = {
  name: string
  cityId: number
}

function toNumber(value: unknown, fallback: number) {
  return typeof value === 'number' && Number.isFinite(value) ? value : fallback
}

function toOptionalNumber(value: unknown) {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined
}

function toString(value: unknown, fallback = '') {
  return typeof value === 'string' && value.trim() ? value : fallback
}

function pickCustomerSource(me: RidePassengerMe) {
  return me.customer ?? me.profile ?? me.passenger ?? me.data ?? me
}

function pickPassengerProfileSource(me: RidePassengerMe) {
  return (me.passengerProfile ?? me.profile ?? me.passenger ?? me.data ?? me) as RidePassengerProfileSource
}

function buildCityDisplayName(cityName?: string | null, cityRegionName?: string | null) {
  const trimmedCity = cityName?.trim() || ''
  const trimmedRegion = cityRegionName?.trim() || ''

  if (!trimmedCity) return ''
  if (!trimmedRegion) return trimmedCity

  return `${trimmedCity} · ${trimmedRegion}`
}

export function isPassengerProfileComplete(
  profile:
    | {
        name?: string | null
        cityId?: number | null
        cityName?: string | null
        cityRegionName?: string | null
        city?: string | null
      }
    | null
    | undefined,
) {
  return Boolean(profile?.name?.trim() && typeof profile?.cityId === 'number' && profile.cityId > 0)
}

export function getPassengerCityDisplay(
  profile:
    | {
        cityName?: string | null
        cityRegionName?: string | null
        city?: string | null
      }
    | null
    | undefined,
) {
  return buildCityDisplayName(profile?.cityName ?? profile?.city, profile?.cityRegionName)
}

export function toRidePassengerProfile(
  me: RidePassengerMe,
  fallbackPhone = '',
): RidePassengerProfile {
  const customerSource = pickCustomerSource(me)
  const passengerProfileSource = me.passengerProfile ?? pickPassengerProfileSource(me)
  const cityId = toOptionalNumber(passengerProfileSource.cityId ?? passengerProfileSource.city?.id)
  const cityName = toString(
    passengerProfileSource.cityName ?? passengerProfileSource.city?.nameRu ?? customerSource.city,
    '',
  )
  const cityRegionName = toString(
    passengerProfileSource.cityRegionName ?? passengerProfileSource.city?.regionName,
    '',
  )

  return {
    id: toString(customerSource.id, `passenger-${Date.now()}`),
    name: toString(customerSource.name ?? customerSource.fullName, ''),
    phone: toString(customerSource.phone, fallbackPhone),
    cityId,
    cityName,
    cityRegionName,
    city: buildCityDisplayName(cityName, cityRegionName),
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
