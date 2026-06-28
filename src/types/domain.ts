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
  | 'SUSPENDED'

export type RideRequestStatus =
  | 'SEARCHING'
  | 'OFFERED'
  | 'ACCEPTED'
  | 'CANCELLED'
  | 'EXPIRED'
  | 'CONVERTED_TO_ORDER'

export type RideOrderStatus =
  | 'DRIVER_ASSIGNED'
  | 'DRIVER_ON_WAY'
  | 'DRIVER_ARRIVED'
  | 'IN_PROGRESS'
  | 'COMPLETED'
  | 'CANCELLED'
  | 'DISPUTE'

export type WalletTransactionType =
  | 'TOP_UP_APPROVED'
  | 'COMMISSION_CHARGED'
  | 'COMMISSION_REFUND'
  | 'REFUND'
  | 'MANUAL_ADJUSTMENT'

export type WalletTransactionStatus = 'PENDING' | 'APPROVED' | 'REJECTED' | 'FAILED'

export type WalletTransaction = {
  id: string
  type: WalletTransactionType
  amount: number
  status: WalletTransactionStatus
  title: string
  description?: string
  comment?: string
  reason?: string
  referenceNumber?: string
  actorName?: string
  actorEmail?: string
  metadata?: Record<string, unknown> | null
  createdAt: string
  balanceBefore?: number
  balanceAfter?: number
  publicCode?: string
  sourceType?: string
  sourceId?: number
  provider?: string
  externalPaymentId?: string
  providerPayload?: Record<string, unknown> | null
  sourceOrderId?: string
  sourceTopUpRequestId?: string
}

export type TopUpRequestStatus =
  | 'PENDING_UPLOAD'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'

export type TopUpRequestMethod =
  | 'KASPI'
  | 'KASPI_TRANSFER'
  | 'KASPI_QR'
  | 'HALYK'
  | 'CASH'
  | 'OTHER'

export type TopUpRequest = {
  id: string
  amount: number
  method: TopUpRequestMethod
  publicCode?: string
  referenceNumber?: string
  providerRef?: string
  comment?: string
  proofFilePath?: string
  receiptFilePath?: string
  receiptFileName?: string
  receiptMimeType?: string
  receiptSizeBytes?: number
  provider?: string
  externalPaymentId?: string
  providerPayload?: Record<string, unknown> | null
  matchedAt?: string | null
  confirmedAt?: string | null
  cancelledAt?: string | null
  cancelledBy?: string | null
  cancelReason?: string | null
  reviewReason?: string | null
  screenshotAttached?: boolean
  status: TopUpRequestStatus
  createdAt: string
  updatedAt: string
  reviewedAt?: string | null
  rejectionReason?: string | null
}

export type DriverWallet = {
  balance: number
  minBalance: number
  currency?: string
  canGoOnline?: boolean
  missingAmount?: number
  isBlocked?: boolean
  blockedReason?: string
  transactions: WalletTransaction[]
  topUpRequests: TopUpRequest[]
  chargedOrderIds: string[]
}

export type TripType = 'shared' | 'full'

export type RideHistoryCategory = 'ride' | 'parcel' | 'bus'

export type RideHistoryStatus = 'completed' | 'cancelled'

export type PassengerProfile = {
  id?: string
  name: string
  phone: string
  cityId?: number | null
  cityName: string
  cityRegionName?: string | null
  city: string
  rating: number
  tripsCount: number
}

export type DriverVehicleBodyType =
  | 'sedan'
  | 'suv'
  | 'minivan'
  | 'alphard'
  | 'van'
  | 'truck'
  | 'other'

export const DRIVER_VEHICLE_BODY_TYPES: DriverVehicleBodyType[] = [
  'sedan',
  'suv',
  'minivan',
  'alphard',
  'van',
  'truck',
  'other',
]

export type DriverVehicleBodyTypeApi =
  | 'SEDAN'
  | 'SUV'
  | 'MINIVAN'
  | 'ALPHARD'
  | 'VAN'
  | 'TRUCK'
  | 'OTHER'

export type RideVehicleBrandOption = {
  id: number
  name: string
  slug: string
  country?: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type RideVehicleModelOption = {
  id: number
  brandId: number
  name: string
  slug: string
  defaultBodyTypeCode?: DriverVehicleBodyTypeApi | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type RideVehicleColorOption = {
  id: number
  name: string
  slug: string
  hex?: string | null
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export type RideVehicleBodyTypeOption = {
  id: number
  code: DriverVehicleBodyTypeApi
  nameRu: string
  isActive: boolean
  sortOrder: number
  createdAt: string
  updatedAt: string
}

export const DRIVER_VEHICLE_BODY_TYPE_API_MAP: Record<DriverVehicleBodyType, DriverVehicleBodyTypeApi> = {
  sedan: 'SEDAN',
  suv: 'SUV',
  minivan: 'MINIVAN',
  alphard: 'ALPHARD',
  van: 'VAN',
  truck: 'TRUCK',
  other: 'OTHER',
}

export type DriverVehicle = {
  brandId?: number
  modelId?: number
  colorId?: number
  brand: string
  brandName?: string
  model: string
  modelName?: string
  year: string
  plate: string
  plateNumber?: string
  color: string
  colorName?: string
  seats: string
  seatsCount?: number
  bodyType: DriverVehicleBodyType
  bodyTypeCode?: DriverVehicleBodyTypeApi
}

export type DriverProfile = {
  id?: string
  fullName: string
  phone: string
  city: string
  cityName?: string
  rating: number
  tripsCount: number
  verificationStatus: DriverVerificationStatus
  balance?: number
  minBalance?: number
  isOnline: boolean
  blockedAt?: string
  blockedReason?: string
  vehicle?: DriverVehicle
  documents?: DriverApplicationDocument[] | null
}

export type DriverApplicationDocumentType =
  | 'DRIVER_LICENSE_FRONT'
  | 'DRIVER_LICENSE_BACK'
  | 'VEHICLE_REGISTRATION'
  | 'CAR_FRONT_PHOTO'
  | 'CAR_BACK_PHOTO'
  | 'INTERIOR_PHOTO'
  | 'TRUNK_PHOTO'
  | 'OTHER'

export type DriverApplicationDocument = {
  id?: string
  type: DriverApplicationDocumentType
  filePath: string
  fileName?: string
  mimeType?: string
  sizeBytes?: number
}

export type RideDriverRecheckType =
  | 'VEHICLE_PHOTOS'
  | 'SELFIE'
  | 'DOCUMENTS'
  | 'VEHICLE_AND_SELFIE'

export type RideDriverRecheckStatus =
  | 'PENDING_UPLOAD'
  | 'PENDING_REVIEW'
  | 'APPROVED'
  | 'REJECTED'
  | 'CANCELLED'
  | 'EXPIRED'

export type RideDriverRecheckFileType =
  | 'SELFIE'
  | 'CAR_FRONT_PHOTO'
  | 'CAR_BACK_PHOTO'
  | 'INTERIOR_PHOTO'
  | 'TRUNK_PHOTO'
  | 'DRIVER_LICENSE_FRONT'
  | 'DRIVER_LICENSE_BACK'
  | 'VEHICLE_REGISTRATION'

export type RideDriverRecheckFile = {
  id?: number
  type: RideDriverRecheckFileType
  filePath?: string
  fileName?: string
  mimeType?: string
  sizeBytes?: number
  uploadedAt?: string
  raw?: unknown
}

export type RideDriverRecheck = {
  id: number
  driverProfileId?: number | null
  applicationId?: number | null
  status: RideDriverRecheckStatus
  type: RideDriverRecheckType
  reason?: string | null
  dueAt?: string | null
  submittedAt?: string | null
  reviewedAt?: string | null
  reviewReason?: string | null
  files: RideDriverRecheckFile[]
  raw?: unknown
}

export type DriverApplicationHistoryItem = {
  action: string
  actorLabel?: string | null
  statusFrom?: string | null
  statusTo?: string | null
  reason?: string | null
  message?: string | null
  createdAt: string
}

export type DriverApplicationStep = 1 | 2 | 3 | 4 | 5

export type DriverApplicationDraft = {
  id?: string
  step: DriverApplicationStep
  fullName: string
  phone: string
  city: string
  cityId?: string
  frequentRoutes: string
  vehicleBrandId?: number
  vehicleBrand: string
  vehicleModelId?: number
  vehicleModel: string
  vehicleYear: string
  vehiclePlate: string
  vehicleColorId?: number
  vehicleColor: string
  vehicleSeats: string
  vehicleBodyType: DriverVehicleBodyType
  documents: DriverApplicationDocument[]
  submittedAt?: string
  moderatorComment?: string
  changesRequestedReason?: string
  rejectionReason?: string
  blockedReason?: string
  history?: DriverApplicationHistoryItem[]
}

export type DriverFeedOrderCategory = 'ride' | 'parcel'

export type DriverFeedOrderStatus = 'available' | 'offered' | 'accepted' | 'cancelled'

export type DriverFeedOrder = {
  id: string
  category: DriverFeedOrderCategory
  title: string
  from: string
  to: string
  date: string
  time: string
  requestedPrice: number
  passengersCount?: number
  rideType?: TripType
  parcelSize?: ParcelSize
  parcelDescription?: string
  senderName?: string
  receiverName?: string
  receiverPhone?: string
  clientName: string
  clientPhone: string
  comment?: string
  createdMinutesAgo: number
  status: DriverFeedOrderStatus
}

export type DriverCounterOfferStatus = 'pending' | 'accepted' | 'rejected'

export type DriverCounterOffer = {
  id: string
  orderId: string
  driverName: string
  offeredPrice: number
  originalPrice: number
  comment: string
  status: DriverCounterOfferStatus
}

export type DriverActiveOrderStatus = RideOrderStatus

export type DriverActiveOrder = {
  id: string
  sourceOrderId: string
  category: DriverFeedOrderCategory
  status: DriverActiveOrderStatus
  from: string
  to: string
  originText?: string
  destinationText?: string
  price: number
  agreedPrice?: number
  commissionAmount?: number
  contactUnlocked?: boolean
  canCallPassenger?: boolean
  canCallDriver?: boolean
  clientName: string
  clientPhone: string
  requestedPrice: number
  driverOfferedPrice?: number
  commissionPreview?: number
  completedBalanceBefore?: number
  completedBalanceAfter?: number
  commissionCharged?: boolean
  rideType?: TripType
  passengersCount?: number
  parcelSize?: ParcelSize
  parcelDescription?: string
  senderName?: string
  receiverName?: string
  receiverPhone?: string
}

export type RideDraft = {
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
  time: string
  type: TripType
  passengersCount: number
  comment: string
  price: string
}

export type ParcelSize = 'SMALL' | 'MEDIUM' | 'LARGE' | 'OVERSIZED'

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
  backendId?: string
  localId?: string
  status: RideRequestStatus
  selectedOfferId?: string
}

export type ActiveRide = {
  id: string
  requestId: string
  status: ActiveRideStatus
  contactUnlocked?: boolean
  canCallDriver?: boolean
  canCallPassenger?: boolean
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

export type ActiveRideStatus = RideOrderStatus

export type ParcelRequestStatus = RideRequestStatus

export type ActiveParcelStatus = RideOrderStatus

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
  | 'driverRegistration'
  | 'driverDashboard'
  | 'driverFeed'
  | 'driverOrders'
  | 'driverBalance'
  | 'driverProfile'
  | 'safety'
  | 'support'
  | 'settings'
  | 'busesComingSoon'
