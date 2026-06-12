export type UserRole = 'passenger' | 'driver'

export type PassengerStatus =
  | 'GUEST'
  | 'PHONE_VERIFIED'
  | 'LIMITED'
  | 'BLOCKED'

export type DriverVerificationStatus =
  | 'NOT_STARTED'
  | 'DRAFT'
  | 'PENDING_REVIEW'
  | 'NEEDS_CHANGES'
  | 'APPROVED'
  | 'BLOCKED'

export type RideRequestStatus =
  | 'DRAFT'
  | 'SEARCHING'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'DRIVER_COMING'
  | 'ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'

export type WalletTransactionType = 'TOP_UP' | 'COMMISSION' | 'REFUND' | 'ADJUSTMENT'

export type TopUpRequestStatus = 'PENDING' | 'APPROVED' | 'REJECTED'

export type TripType = 'shared' | 'full'

export type RideHistoryCategory = 'ride' | 'parcel' | 'bus'

export type RideHistoryStatus = 'completed' | 'cancelled'

export type PassengerProfile = {
  id?: string
  name: string
  phone: string
  city: string
  rating: number
  tripsCount: number
}

export type RideDraft = {
  from: string
  to: string
  date: string
  time: string
  type: TripType
  passengersCount: number
  comment: string
  price: number
}

export type DriverOffer = {
  id: string
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
}

export type RideRequest = RideDraft & {
  id: string
  status: RideRequestStatus
  selectedOfferId?: string
}

export type ActiveRide = {
  id: string
  requestId: string
  status: ActiveRideStatus
  driverName: string
  driverPhone: string
  driverRating: number
  carModel: string
  carColor: string
  plate: string
  from: string
  to: string
  price: number
}

export type ActiveRideStatus = Exclude<
  RideRequestStatus,
  'DRAFT' | 'SEARCHING' | 'OFFERED' | 'CANCELLED'
>

export type PassengerHistoryItem = {
  id: string
  category: RideHistoryCategory
  from: string
  to: string
  date: string
  price: number
  status: RideHistoryStatus
  driverName?: string
}

export type AppScreen =
  | 'passengerOrder'
  | 'passengerOffers'
  | 'passengerActiveRide'
  | 'passengerParcels'
  | 'passengerOrders'
  | 'passengerProfile'
  | 'driverDashboard'
  | 'driverFeed'
  | 'driverBalance'
  | 'driverProfile'
  | 'safety'
  | 'support'
  | 'settings'
  | 'busesComingSoon'
