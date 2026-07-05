import type { DriverCallOutcome, RideOrderStatus, RideRequestStatus, TripType } from '../../../types/domain'

export type RideServiceType = 'INTERCITY_RIDE' | 'PARCEL'
export type RideType = 'SHARED' | 'FULL'
export type RideRequestTimingMode = 'NOW' | 'SCHEDULED'

export type CreateRideRequestPayload = {
  serviceType: RideServiceType
  rideType?: RideType
  timingMode: RideRequestTimingMode
  scheduledAt?: string | null
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
  closedExternally?: {
    at?: string
    note?: string
    contactUnlockId?: string
    driverProfileId?: string
    driverName?: string
    driverPhone?: string
    driverAvatarUrl?: string
    vehicleName?: string
    vehiclePlateNumber?: string
    vehicleColorName?: string
  }
  serviceType: string
  rideType?: TripType | string
  timingMode?: RideRequestTimingMode
  scheduledAt?: string | null
  scheduledDate?: string
  scheduledTime?: string
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
  priceUpdatedAt?: string
  cancelledAt?: string | null
  cancelledBy?: string | null
  cancelReasonCode?: string | null
  cancelReasonText?: string | null
  cancelReasonLabel?: string | null
  searchRemainingSeconds?: number
  expiresAt?: string
  offersCount: number
  selectedOfferId?: string
  raw: unknown
}

export type RideOffer = {
  id: string
  backendId?: string
  requestId?: string
  driverId?: string
  status?: 'pending' | 'accepted' | 'rejected' | string
  currency?: string
  driverName: string
  driverAvatarUrl?: string
  rating: number
  tripsCount: number
  carModel: string
  carColor: string
  colorName?: string
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

export type RidePassengerRequestContactUnlock = {
  contactUnlockId: string
  driverProfileId?: string
  driverName: string
  driverPhone: string
  driverAvatarUrl?: string
  vehicleName?: string
  vehiclePlateNumber?: string
  vehicleColorName?: string
  openedAt: string
  callOutcome?: DriverCallOutcome
  callOutcomeAt?: string
  callOutcomeNote?: string | null
  raw: unknown
}

export type RidePassengerRequestContactUnlocksResponse = {
  requestId: string
  items: RidePassengerRequestContactUnlock[]
  raw: unknown
}

export type CloseRideRequestExternallyPayload = {
  contactUnlockId: string
  note?: string
}

export type CloseRideRequestExternallyResult = {
  requestId: string
  status: RideRequestStatus | string
  closedExternallyAt?: string
  contactUnlockId?: string
  driverProfileId?: string
  driverName?: string
  driverPhone?: string
  driverAvatarUrl?: string
  vehicleName?: string
  vehiclePlateNumber?: string
  vehicleColorName?: string
  note?: string
  raw: unknown
}

export type CancelRideRequestPayload = {
  reasonCode?: string | null
  reasonText?: string | null
}

export type AcceptRideOfferResponse =
  | {
      order?: unknown
      rideOrder?: unknown
      offer?: unknown
      rideOffer?: unknown
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
  offerId?: string
  requestId?: string
  status: RideOrderStatus | string
  serviceType: string
  currency?: string
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
  contactUnlocked?: boolean
  canCallDriver?: boolean
  driverName: string
  driverPhone: string
  driverAvatarUrl?: string
  driverRating: number
  carModel: string
  carColor: string
  plate: string
  createdAt: string
  updatedAt?: string
  raw: unknown
}

export type AcceptRideOfferResult = {
  order: RideOrder
  request: RideRequest | null
  offer: RideOffer | null
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
