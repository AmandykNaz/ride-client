import type {
  DriverCallOutcome,
  DriverActiveOrder,
  DriverApplicationDraft,
  DriverApplicationHistoryItem,
  DriverCounterOffer,
  DriverFeedOrder,
  DriverProfile,
  DriverVehicleBodyType,
  DriverVehicleBodyTypeApi,
  DriverVerificationStatus,
  RideDriverRecheck,
  RideDriverRecheckFile,
  RideDriverRecheckFileType,
  RideDriverRecheckStatus,
  RideDriverRecheckType,
  RideOrderStatus,
} from '../../../types/domain'
import type {
  DriverTopUpRequest,
  DriverWalletTransaction,
} from './driver-wallet.types'

export type {
  RideVehicleBodyTypeOption,
  RideVehicleBrandOption,
  RideVehicleColorOption,
  RideVehicleModelOption,
} from '../../../types/domain'

export type RideDriverVehicle = {
  brandId?: number
  modelId?: number
  colorId?: number
  brand?: string
  brandName?: string
  model?: string
  modelName?: string
  year?: string
  plate?: string
  plateNumber?: string
  color?: string
  colorName?: string
  seats?: string | number
  seatsCount?: number
  bodyType?: DriverVehicleBodyType | DriverVehicleBodyTypeApi
  bodyTypeCode?: DriverVehicleBodyTypeApi
}

export type RideDriverApplicationDocument = {
  id?: string
  type?: string
  filePath?: string
  url?: string
  name?: string
  status?: string
  fileName?: string
  mimeType?: string
  sizeBytes?: number
  raw?: unknown
}

export type {
  RideDriverRecheck,
  RideDriverRecheckFile,
  RideDriverRecheckFileType,
  RideDriverRecheckStatus,
  RideDriverRecheckType,
}

export type RideDriverApplicationHistoryItem = DriverApplicationHistoryItem & {
  actorType?: string
  metadata?: Record<string, unknown> | null
  id?: string
}

export type RideDriverApplication = {
  id?: string
  status?: string
  fullName?: string
  phone?: string
  city?: string
  cityName?: string
  cityId?: string
  frequentRoutes?: string
  vehicleSnapshot?: Record<string, unknown> | null
  vehicleBrandId?: number
  vehicleBrand?: string
  vehicleModelId?: number
  vehicleModel?: string
  vehicleYear?: string
  vehiclePlate?: string
  vehicleColorId?: number
  vehicleColor?: string
  vehicleSeats?: string | number
  vehicleBodyType?: DriverVehicleBodyTypeApi
  documents?: RideDriverApplicationDocument[]
  submittedAt?: string
  moderatorComment?: string
  changesRequestedReason?: string
  history?: RideDriverApplicationHistoryItem[]
  rejectionReason?: string
  blockedReason?: string
  raw?: unknown
}

export type RideCity = {
  id: number
  name: string
  code?: string
  pickupEnabled: boolean
  dropoffEnabled: boolean
}

export type RideDriverCustomer = {
  id?: string
  name?: string
  fullName?: string
  phone?: string
  city?: string
  cityId?: string
  rating?: number
  tripsCount?: number
  raw?: unknown
}

export type RideDriverDriverProfile = {
  id?: string
  name?: string
  fullName?: string
  phone?: string
  city?: string
  cityId?: string
  rating?: number
  tripsCount?: number
  balance?: number
  minBalance?: number
  isOnline?: boolean
  verificationStatus?: string
  vehicle?: RideDriverVehicle | null
  raw?: unknown
}

export type RideDriverProfile = {
  id?: string
  fullName?: string
  phone?: string
  city?: string
  cityName?: string
  rating?: number
  tripsCount?: number
  balance?: number
  minBalance?: number
  isOnline?: boolean
  verificationStatus?: string
  blockedAt?: string
  blockedReason?: string
  vehicle?: RideDriverVehicle | null
  documents?: RideDriverApplicationDocument[] | null
  raw?: unknown
}

export type RideDriverMe = {
  customer?: RideDriverCustomer | null
  driverProfile?: RideDriverDriverProfile | null
  profile?: RideDriverProfile | null
  application?: RideDriverApplication | null
  currentApplication?: RideDriverApplication | null
  applicationId?: string
  vehicle?: RideDriverVehicle | null
  vehicles?: RideDriverVehicle[] | null
  wallet?: {
    id?: string
    balance?: number
    minimumBalance?: number
    currency?: string
    isBlocked?: boolean
    blockedReason?: string | null
    transactions?: DriverWalletTransaction[] | null
    topUpRequests?: DriverTopUpRequest[] | null
  } | null
  documents?: RideDriverApplicationDocument[] | null
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
  contactUnlocked?: boolean
  canCallPassenger?: boolean
  callOutcome?: DriverCallOutcome | string
  callOutcomeAt?: string
  callOutcomeNote?: string
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
  | RideOrderStatus
  | string

export type RideDriverRequestHistoryItem = {
  requestId: string
  orderId?: string
  contactUnlockId?: string
  status?: string
  originText?: string
  destinationText?: string
  requestedPrice?: number
  createdAt?: string
  scheduledAt?: string
  passengerName?: string | null
  passengerPhone?: string | null
  contactOpenedAt?: string
  callOutcome?: DriverCallOutcome | string
  callOutcomeAt?: string
  callOutcomeNote?: string
  closedExternallyAt?: string
  raw?: unknown
}

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
  cityId?: string
  frequentRoutes?: string
  vehicleBrand?: string
  vehicleBrandId?: number
  vehicleModel?: string
  vehicleModelId?: number
  vehicleYear?: number
  vehiclePlate?: string
  vehiclePlateNumber?: string
  vehicleColor?: string
  vehicleColorId?: number
  vehicleSeats?: string
  vehicleSeatsCount?: number
  vehicleBodyType?: string
  documents?: RideDriverApplicationDocument[]
  vehicle?: {
    brandId?: number
    modelId?: number
    colorId?: number
    brand?: string
    model?: string
    year?: number
    plateNumber?: string
    color?: string
    seatsCount?: number
    bodyTypeCode?: DriverVehicleBodyTypeApi
    bodyType?: DriverVehicleBodyTypeApi
  }
}

export type DriverCounterOfferPayload = {
  price: string
  comment?: string
}

export type DriverOrderStatusPayload = {
  status: RideDriverOrderStatus
}

export type RideRequestContactUnlockResult = {
  requestId: string
  passengerName: string | null
  phone: string
  remainingContacts: number
  alreadyUnlocked: boolean
}

export type RideRequestContactOutcomePayload = {
  outcome: DriverCallOutcome
  note?: string
}

export type RideRequestContactOutcomeResult = {
  requestId: string
  contactUnlockId?: string
  callOutcome: DriverCallOutcome
  callOutcomeAt?: string
  callOutcomeNote?: string
  passengerName: string | null
  phone: string
}

export type DriverMeViewModel = {
  profile: DriverProfile | null
  application: DriverApplicationDraft & {
    id?: string
    step?: number
    submittedAt?: string
    moderatorComment?: string
    status?: DriverVerificationStatus | string
    history?: DriverApplicationHistoryItem[]
  }
  currentApplication: DriverApplicationDraft | null
  applicationHistory?: DriverApplicationHistoryItem[]
  applicationId?: string
  vehicle?: RideDriverVehicle | null
  vehicles?: RideDriverVehicle[]
  wallet?: {
    id?: string
    balance?: number
    minimumBalance?: number
    currency?: string
    isBlocked?: boolean
    blockedReason?: string | null
    transactions?: DriverWalletTransaction[] | null
    topUpRequests?: DriverTopUpRequest[] | null
  } | null
  documents?: RideDriverApplicationDocument[] | null
  activeRecheck?: RideDriverRecheck | null
  verificationStatus: DriverVerificationStatus
  isOnline: boolean
  raw: unknown
}

export type DriverFeedViewModel = DriverFeedOrder
export type DriverOfferViewModel = DriverCounterOffer
export type DriverOrderViewModel = DriverActiveOrder
