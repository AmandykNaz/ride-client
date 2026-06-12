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

export type ParcelSize = 'small' | 'medium' | 'large'

export type ParcelDraft = {
  senderName: string
  senderPhone: string
  receiverName: string
  receiverPhone: string
  from: string
  to: string
  size: ParcelSize
  weightKg?: number
  description: string
  photoAttached: boolean
  price: number
}

export type ParcelRequest = ParcelDraft & {
  id: string
  status: ParcelRequestStatus
  selectedOfferId?: string
}

export type ParcelOrder = {
  id: string
  requestId: string
  status: ActiveParcelStatus
  driverName: string
  driverPhone: string
  driverRating: number
  carModel: string
  carColor: string
  plate: string
  from: string
  to: string
  price: number
  receiverName: string
  receiverPhone: string
  description: string
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

export type ParcelRequestStatus = RideRequestStatus

export type ActiveParcelStatus = Exclude<
  ParcelRequestStatus,
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
  receiverName?: string
  receiverPhone?: string
  description?: string
  size?: ParcelSize
  weightKg?: number
}

export type AppScreen =
  | 'passengerOrder'
  | 'passengerOffers'
  | 'passengerActiveRide'
  | 'parcelOffers'
  | 'activeParcel'
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
