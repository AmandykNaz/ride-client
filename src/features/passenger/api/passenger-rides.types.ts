import type { ActiveRideStatus, RideRequestStatus, TripType } from '../../../types/domain'

export type CreateRideRequestPayload = {
  serviceType: 'ride'
  rideType?: TripType
  originText: string
  destinationText: string
  pickupAddress?: string
  dropoffAddress?: string
  price?: number
  comment?: string
}

export type RideRequest = {
  id: string
  status: RideRequestStatus
  serviceType: string
  rideType?: TripType | string
  time: string
  type: TripType
  passengersCount: number
  from: string
  to: string
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
  status: ActiveRideStatus | string
  message: string
  createdAt: string
  raw: unknown
}

export type RideOrder = {
  id: string
  requestId?: string
  status: ActiveRideStatus | string
  serviceType: string
  rideType?: TripType | string
  from: string
  to: string
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
