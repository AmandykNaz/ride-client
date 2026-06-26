import type { RideOrderStatus, RideRequestStatus, TripType } from '../../../types/domain'

export type RideServiceType = 'INTERCITY_RIDE' | 'PARCEL'
export type RideType = 'SHARED' | 'FULL'

export type CreateRideRequestPayload = {
  serviceType: RideServiceType
  rideType?: RideType
  originCityId: number
  destinationCityId: number
  originText: string
  destinationText: string
  passengersCount?: number
  requestedPrice?: number
  comment?: string
}

export type RideRequest = {
  id: string
  backendId?: string
  localId?: string
  status: RideRequestStatus
  serviceType: string
  rideType?: TripType | string
  time: string
  type: TripType
  passengersCount: number
  from: string
  to: string
  originCityId?: number
  originCityName?: string
  originRegionName?: string | null
  originAddress?: string
  destinationCityId?: number
  destinationCityName?: string
  destinationRegionName?: string | null
  destinationAddress?: string
  date: string
  price: number
  originText: string
  destinationText: string
  pickupAddress?: string
  dropoffAddress?: string
  comment: string
  createdAt: string
  expiresAt?: string
  offersCount: number
  selectedOfferId?: string
  raw: unknown
}

export type RideOffer = {
  id: string
  requestId?: string
  status?: 'pending' | 'accepted' | 'rejected' | string
  driverName: string
  rating: number
  tripsCount: number
  carModel: string
  carColor: string
  plate: string
  etaMinutes: number
  originalPrice: number
  offeredPrice: number
  isCustomOffer: boolean
  comment: string
  raw: unknown
}

export type RideOfferListResponse = {
  items: RideOffer[]
  raw: unknown
}

export type AcceptRideOfferResponse =
  | RideOrder
  | {
      order?: unknown
      rideOrder?: unknown
      request?: unknown
      rideRequest?: unknown
      raw?: unknown
    }

export type RideOrderEvent = {
  id: string
  orderId?: string
  status: RideOrderStatus | string
  message: string
  createdAt: string
  raw: unknown
}

export type RideOrder = {
  id: string
  requestId?: string
  status: RideOrderStatus | string
  serviceType: string
  rideType?: TripType | string
  from: string
  to: string
  originCityId?: number
  originCityName?: string
  originRegionName?: string | null
  originAddress?: string
  destinationCityId?: number
  destinationCityName?: string
  destinationRegionName?: string | null
  destinationAddress?: string
  date: string
  price: number
  originText: string
  destinationText: string
  pickupAddress?: string
  dropoffAddress?: string
  agreedPrice: number
  driverName: string
  driverPhone: string
  driverRating: number
  carModel: string
  carColor: string
  plate: string
  createdAt: string
  updatedAt?: string
  raw: unknown
}

export type PassengerRideOrdersResponse = {
  items: RideOrder[]
  raw: unknown
}

export type RideOrderEventsResponse = {
  items: RideOrderEvent[]
  raw: unknown
}

export type PassengerRideRequestsResponse = {
  items: RideRequest[]
  raw: unknown
}

export type PassengerRideOffersResponse = {
  items: RideOffer[]
  raw: unknown
}

export type PassengerOrdersResponse = {
  items: RideOrder[]
  raw: unknown
}
