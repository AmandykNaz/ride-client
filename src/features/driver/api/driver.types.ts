import type {
  DriverActiveOrder,
  DriverApplicationDraft,
  DriverCounterOffer,
  DriverFeedOrder,
  DriverProfile,
  DriverVerificationStatus,
} from '../../../types/domain'

export type RideDriverVehicle = {
  brand?: string
  model?: string
  year?: string
  plate?: string
  color?: string
  seats?: string | number
  bodyType?: string
}

export type RideDriverApplication = {
  id?: string
  status?: string
  fullName?: string
  phone?: string
  city?: string
  frequentRoutes?: string
  vehicleBrand?: string
  vehicleModel?: string
  vehicleYear?: string
  vehiclePlate?: string
  vehicleColor?: string
  vehicleSeats?: string | number
  vehicleBodyType?: string
  documents?: Record<string, boolean>
  submittedAt?: string
  moderatorComment?: string
  raw?: unknown
}

export type RideDriverProfile = {
  id?: string
  fullName?: string
  phone?: string
  city?: string
  rating?: number
  tripsCount?: number
  balance?: number
  minBalance?: number
  isOnline?: boolean
  verificationStatus?: string
  vehicle?: RideDriverVehicle | null
  raw?: unknown
}

export type RideDriverMe = {
  profile?: RideDriverProfile | null
  application?: RideDriverApplication | null
  applicationId?: string
  verificationStatus?: DriverVerificationStatus | string
  isOnline?: boolean
  raw: unknown
}

export type RideDriverFeedRequest = {
  id?: string
  category?: DriverFeedOrder['category'] | string
  title?: string
  from?: string
  to?: string
  date?: string
  time?: string
  requestedPrice?: number
  price?: number
  passengersCount?: number
  rideType?: DriverFeedOrder['rideType'] | string
  parcelSize?: DriverFeedOrder['parcelSize'] | string
  parcelDescription?: string
  senderName?: string
  receiverName?: string
  receiverPhone?: string
  clientName?: string
  clientPhone?: string
  comment?: string
  createdAt?: string
  createdMinutesAgo?: number
  status?: DriverFeedOrder['status'] | string
  raw?: unknown
}

export type RideDriverOffer = {
  id?: string
  orderId?: string
  status?: DriverCounterOffer['status'] | string
  driverName?: string
  offeredPrice?: number
  originalPrice?: number
  comment?: string
  createdAt?: string
  request?: RideDriverFeedRequest | null
  raw?: unknown
}

export type RideDriverOrderStatus =
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ON_WAY'
  | 'DRIVER_ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTE'
  | string

export type RideDriverOrder = {
  id?: string
  requestId?: string
  sourceOrderId?: string
  status?: RideDriverOrderStatus
  category?: DriverActiveOrder['category'] | string
  from?: string
  to?: string
  date?: string
  time?: string
  price?: number
  agreedPrice?: number
  requestedPrice?: number
  originText?: string
  destinationText?: string
  pickupAddress?: string
  dropoffAddress?: string
  clientName?: string
  clientPhone?: string
  driverName?: string
  driverPhone?: string
  driverRating?: number
  carModel?: string
  carColor?: string
  plate?: string
  rideType?: DriverActiveOrder['rideType'] | string
  passengersCount?: number
  parcelSize?: DriverActiveOrder['parcelSize'] | string
  parcelDescription?: string
  senderName?: string
  receiverName?: string
  receiverPhone?: string
  commissionPreview?: number
  completedBalanceBefore?: number
  completedBalanceAfter?: number
  commissionCharged?: boolean
  createdAt?: string
  updatedAt?: string
  raw?: unknown
}

export type DriverApplicationPayload = {
  fullName?: string
  phone?: string
  city?: string
  frequentRoutes?: string
  vehicleBrand?: string
  vehicleModel?: string
  vehicleYear?: string
  vehiclePlate?: string
  vehicleColor?: string
  vehicleSeats?: string
  vehicleBodyType?: string
  documents?: Record<string, boolean>
  vehicle?: RideDriverVehicle
}

export type DriverCounterOfferPayload = {
  price: number
  offeredPrice?: number
  comment?: string
}

export type DriverOrderStatusPayload = {
  status: RideDriverOrderStatus
}

export type DriverMeViewModel = {
  profile: DriverProfile | null
  application: DriverApplicationDraft & {
    id?: string
    step?: number
    submittedAt?: string
    moderatorComment?: string
    status?: DriverVerificationStatus | string
  }
  applicationId?: string
  verificationStatus: DriverVerificationStatus
  isOnline: boolean
  raw: unknown
}

export type DriverFeedViewModel = DriverFeedOrder
export type DriverOfferViewModel = DriverCounterOffer
export type DriverOrderViewModel = DriverActiveOrder
