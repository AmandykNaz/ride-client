/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, useEffect, useReducer, useRef, type ReactNode } from 'react'

import { defaultScreenByRole } from '../navigation/navigation'
import { formatKzt } from '../lib/format'
import { BackendApiError, BackendAuthError } from '../shared/api/backend'
import { getRideAccessToken, clearRideAccessToken, clearRideAuthSession } from '../shared/auth/tokenStorage'
import {
  getPassengerMe,
  isPassengerProfileComplete,
  toRidePassengerProfile,
} from '../features/passenger/api/passenger.api'
import { refreshRideSession, logoutRideSession } from '../features/ride-auth/api/ride-auth.api'
import {
  cancelRideRequest,
  acceptRideOffer,
  createRideRequest,
  getPassengerOrders,
  getRideRequestOffers,
  getPassengerRequests,
  getRideOrder,
  getRideOrderEvents,
  getRideRequest,
  mapOrderToActiveRide,
  rejectRideOffer,
} from '../features/passenger/api/passenger-rides.api'
import {
  acceptRideRequestPrice,
  counterOfferRideRequest,
  createDriverApplication,
  getActiveDriverOrder,
  getActiveDriverRecheck,
  getDriverFeed,
  getDriverMe,
  getDriverOffers,
  getDriverOrders,
  submitDriverApplication as submitDriverApplicationApi,
  setDriverOnline as setDriverOnlineApi,
  updateDriverApplication,
  updateDriverOrderStatus,
  withdrawDriverOffer as withdrawDriverOfferApi,
} from '../features/driver/api/driver.api'
import {
    createDriverTopUpRequest as createDriverTopUpRequestApi,
    cancelTopUpRequest as cancelTopUpRequestApi,
    getDriverTopUpRequests,
    getDriverWallet,
    getDriverWalletTransactions,
    uploadTopUpReceipt as uploadTopUpReceiptApi,
} from '../features/driver/api/driver-wallet.api'
import {
  createRideOrderComplaint as createRideOrderComplaintApi,
  getDriverComplaints,
  getPassengerComplaints,
  getRideOrderComplaints,
} from '../features/ride-safety/api/ride-complaints.api'
import {
  createRideOrderReview as createRideOrderReviewApi,
  getDriverReviewSummary,
  getDriverReviews,
  getPassengerReviewSummary,
  getPassengerReviews,
  getRideOrderReviews,
} from '../features/ride-safety/api/ride-reviews.api'
import type {
  DriverTopUpRequest as DriverTopUpRequestApi,
  DriverWallet as DriverWalletApi,
  DriverWalletTransaction as DriverWalletTransactionApi,
} from '../features/driver/api/driver-wallet.types'
import type { RideComplaint as RideComplaintApi } from '../features/ride-safety/api/ride-complaints.types'
import type { RideReview as RideReviewApi, RideReviewSummary as RideReviewSummaryApi } from '../features/ride-safety/api/ride-reviews.types'
import type {
  RideOrder as PassengerRideOrder,
  RideOrderEvent as PassengerRideOrderEvent,
  RideRequest as PassengerRideRequest,
  RideType,
} from '../features/passenger/api/passenger-rides.types'
import type {
  ActiveRide,
  ActiveParcelStatus,
  ActiveRideStatus,
  AppScreen,
  DriverApplicationDocument,
  DriverActiveOrder,
  DriverActiveOrderStatus,
  DriverApplicationDraft,
  DriverApplicationStep,
  DriverCounterOffer,
  DriverFeedOrder,
  DriverOffer,
  DriverProfile,
  DriverVehicle,
  DriverVerificationStatus,
  RideDriverRecheck,
  PassengerHistoryItem,
  PassengerProfile,
  PassengerStatus,
  ParcelDraft,
  ParcelOrder,
  ParcelRequest,
  RideDraft,
  DriverWallet,
  WalletTransaction,
  TopUpRequest,
  TopUpRequestMethod,
  UserRole,
} from '../types/domain'
import { DRIVER_VEHICLE_BODY_TYPES } from '../types/domain'
import { canDriverGoOnline, getDriverWalletShortfall } from '../features/driver/driver-status'
import type { CreateRideRequestPayload } from '../features/passenger/api/passenger-rides.types'
import type { CreateRideReviewPayload } from '../features/ride-safety/api/ride-reviews.types'
import type { CreateRideComplaintPayload } from '../features/ride-safety/api/ride-complaints.types'

type PassengerOrdersTab = 'rides' | 'parcels' | 'buses'
type PassengerFlow = 'ride' | 'parcel' | 'login' | 'driverRegistrationStart' | 'driverRegistrationResume' | null

type AppState = {
  role: UserRole
  passengerStatus: PassengerStatus
  driverVerificationStatus: DriverVerificationStatus
  currentScreen: AppScreen
  isMenuOpen: boolean
  passengerProfile: PassengerProfile | null
  driverProfile: DriverProfile | null
  rideDraft: RideDraft
  isRideLocationSheetOpen: boolean
  rideLocationSheetTarget: 'origin' | 'destination' | null
  parcelDraft: ParcelDraft
  driverApplicationDraft: DriverApplicationDraft
  driverRegistrationStep: DriverApplicationStep
  activeRecheck: RideDriverRecheck | null
  driverWallet: DriverWallet
  driverWalletTransactions: WalletTransaction[]
  driverTopUpRequests: TopUpRequest[]
  passengerReviewSummary: RideReviewSummaryApi | null
  driverReviewSummary: RideReviewSummaryApi | null
  passengerReviews: RideReviewApi[]
  driverReviews: RideReviewApi[]
  passengerComplaints: RideComplaintApi[]
  driverComplaints: RideComplaintApi[]
  orderReviews: RideReviewApi[]
  orderComplaints: RideComplaintApi[]
  driverFeedOrders: DriverFeedOrder[]
  driverOrders: DriverActiveOrder[]
  driverActiveOrder: DriverActiveOrder | null
  driverCounterOffers: DriverCounterOffer[]
  isDriverCounterOfferSheetOpen: boolean
  driverCounterOfferOrderId: string | null
  driverCounterOfferPrice: string
  driverCounterOfferComment: string
  isDriverFeedLoading: boolean
  isDriverActionLoading: boolean
  isDriverWalletLoading: boolean
  isDriverTopUpSubmitting: boolean
  isRideReviewSubmitting: boolean
  isRideComplaintSubmitting: boolean
  driverFlowError: string | null
  driverWalletError: string | null
  rideSafetyError: string | null
  isTopUpFormOpen: boolean
  isRideComplaintOpen: boolean
  topUpForm: {
    amount: string
    method: TopUpRequestMethod
    providerRef: string
    comment: string
    receiptFile: File | null
  }
  rideComplaintForm: {
    category: string
    message: string
  }
  activeRideRequest: PassengerRideRequest | null
  driverOffers: DriverOffer[]
  activeRide: ActiveRide | null
  activeRideEvents: PassengerRideOrderEvent[]
  passengerRideRequests: PassengerRideRequest[]
  passengerRideOrders: PassengerRideOrder[]
  isRideListLoading: boolean
  isPassengerOrdersLoading: boolean
  isRideRequestLoading: boolean
  isRideOffersLoading: boolean
  isRideActionLoading: boolean
  rideFlowError: string | null
  activeParcelRequest: ParcelRequest | null
  parcelOffers: DriverOffer[]
  activeParcelOrder: ParcelOrder | null
  passengerHistory: PassengerHistoryItem[]
  passengerOrdersTab: PassengerOrdersTab
  verifiedPhone: string
  pendingPassengerFlow: PassengerFlow
  isPhoneVerifySheetOpen: boolean
  isPassengerOnboardingOpen: boolean
  isPassengerRatingOpen: boolean
}

type AppContextValue = {
  state: AppState
  actions: {
    openMenu: () => void
    closeMenu: () => void
    toggleMenu: () => void
    setScreen: (screen: AppScreen) => void
    setRole: (role: UserRole, screen?: AppScreen) => void
    setPassengerStatus: (status: PassengerStatus) => void
    logout: () => void
    setDriverVerificationStatus: (status: DriverVerificationStatus) => void
    setPendingPassengerFlow: (flow: PassengerFlow) => void
    refreshPassengerRideSnapshot: () => Promise<void>
    startDriverRegistration: () => void
    updateDriverApplicationField: <K extends keyof DriverApplicationDraft>(
      field: K,
      value: DriverApplicationDraft[K],
    ) => void
    uploadDriverDocumentMock: (documentType: DriverApplicationDocument['type'], filePath?: string) => void
    nextDriverRegistrationStep: () => void
    prevDriverRegistrationStep: () => void
    submitDriverApplication: () => void
    demoApproveDriver: () => void
    demoRequestDriverChanges: (comment?: string) => void
    demoBlockDriver: (comment?: string) => void
    returnToPassengerMode: () => void
    editDriverApplicationAfterChanges: () => void
    toggleDriverOnlineStatus: () => void
    setDriverOnline: (online: boolean) => void
    refreshDriverSnapshot: () => Promise<void>
    refreshDriverWallet: () => Promise<void>
    refreshDriverWalletTransactions: () => Promise<void>
    refreshDriverTopUpRequests: () => Promise<void>
    refreshPassengerReviewSummary: () => Promise<void>
    refreshDriverReviewSummary: () => Promise<void>
    refreshPassengerReviews: () => Promise<void>
    refreshDriverReviews: () => Promise<void>
    refreshPassengerComplaints: () => Promise<void>
    refreshDriverComplaints: () => Promise<void>
    refreshOrderReviews: (orderId: string) => Promise<void>
    refreshOrderComplaints: (orderId: string) => Promise<void>
    refreshDriverFeed: () => Promise<void>
    refreshDriverOffers: () => Promise<void>
    refreshDriverOrders: () => Promise<void>
    createDriverTopUpRequest: (payload: {
      amount: number
      method: TopUpRequestMethod
      providerRef?: string
      comment?: string
    }) => Promise<TopUpRequest>
    uploadTopUpReceipt: (topUpRequestId: number, file: File) => Promise<TopUpRequest>
    cancelTopUpRequest: (topUpRequestId: number) => Promise<TopUpRequest>
    createOrderReview: (orderId: string, payload: CreateRideReviewPayload) => Promise<void>
    createOrderComplaint: (orderId: string, payload: CreateRideComplaintPayload) => Promise<void>
    withdrawDriverOffer: (offerId: string) => Promise<void>
    openTopUpForm: () => void
    closeTopUpForm: () => void
    updateTopUpForm: (patch: Partial<AppState['topUpForm']>) => void
    openRideComplaintSheet: (orderId?: string) => void
    closeRideComplaintSheet: () => void
    updateRideComplaintForm: (patch: Partial<AppState['rideComplaintForm']>) => void
    submitTopUpRequest: () => Promise<{
      request: TopUpRequest
      requestId: number
      receiptUploaded: boolean
      receiptUploadError?: string
    }>
    demoApproveTopUpRequest: (requestId: string) => void
    demoRejectTopUpRequest: (requestId: string) => void
    chargeCommissionForCompletedOrder: (orderId?: string) => void
    refundCommissionDemo: (orderId: string) => void
    blockDriverOrdersIfLowBalance: () => void
    openDriverCounterOfferSheet: (orderId: string) => void
    closeDriverCounterOfferSheet: () => void
    sendDriverCounterOffer: (price: number, comment: string) => void
    acceptDemoCounterOfferAsPassenger: (orderId?: string) => void
    acceptDriverFeedOrder: (orderId: string) => void
    driverOrderNextStatus: () => void
    cancelDriverActiveOrder: () => void
    clearCompletedDriverOrder: () => void
    updateRideDraft: (patch: Partial<RideDraft>) => void
    updateParcelDraft: (patch: Partial<ParcelDraft>) => void
    openPhoneVerifySheet: () => void
    openRideLocationSheet: (target: 'origin' | 'destination') => void
    closeRideLocationSheet: () => void
    openAuthSheet: (flow?: PassengerFlow) => void
    startLoginFlow: () => void
    refreshAuthenticatedSession: (phone?: string, flow?: PassengerFlow) => Promise<{
      passengerProfile: PassengerProfile | null
      driverProfile: DriverProfile | null
    }>
    closePhoneVerifySheet: () => void
    openPassengerOnboarding: () => void
    closePassengerOnboarding: () => void
    openPassengerRating: () => void
    closePassengerRating: () => void
    setPassengerOrdersTab: (tab: PassengerOrdersTab) => void
    setVerifiedPhone: (phone: string) => void
    startRideSearch: () => Promise<void>
    startParcelSearch: () => void
    createRideFromDraft: () => Promise<void>
    createParcelFromDraft: () => void
    acceptOffer: (offerId: string) => void
    rejectRideOffer: (offerId: string) => Promise<void>
    loadActiveRequestOffers: () => Promise<void>
    refreshActiveRideDetails: (orderId?: string) => Promise<void>
    rejectActiveRideOffer: (offerId: string) => Promise<void>
    acceptActiveRideOffer: (offerId: string) => Promise<void>
    acceptParcelOffer: (offerId: string) => void
    setActiveRideStatus: (status: ActiveRideStatus) => void
    setActiveParcelStatus: (status: ActiveParcelStatus) => void
    cancelActiveRide: () => Promise<void>
    cancelActiveParcel: () => void
    setPassengerProfile: (profile: PassengerProfile) => void
    completeRideAndOpenRating: () => void
    completeParcelAndOpenHistory: () => void
    submitRideRating: (rating: number, comment: string) => Promise<void>
    repeatRide: (ride: PassengerHistoryItem) => void
    repeatParcel: (parcel: PassengerHistoryItem) => void
  }
}

type AppAction =
  | { type: 'openMenu' }
  | { type: 'closeMenu' }
  | { type: 'toggleMenu' }
  | { type: 'setScreen'; screen: AppScreen }
  | { type: 'setRole'; role: UserRole; screen: AppScreen }
  | { type: 'setPassengerStatus'; status: PassengerStatus }
  | { type: 'resetPassengerSession' }
  | { type: 'clearTransientRideState' }
  | { type: 'setRideListLoading'; loading: boolean }
  | { type: 'setPassengerOrdersLoading'; loading: boolean }
  | { type: 'setRideRequestLoading'; loading: boolean }
  | { type: 'setRideOffersLoading'; loading: boolean }
  | { type: 'setRideActionLoading'; loading: boolean }
  | { type: 'setRideFlowError'; error: string | null }
  | { type: 'setDriverFeedLoading'; loading: boolean }
  | { type: 'setDriverActionLoading'; loading: boolean }
  | { type: 'setDriverFlowError'; error: string | null }
  | { type: 'setDriverWalletLoading'; loading: boolean }
  | { type: 'setDriverTopUpSubmitting'; loading: boolean }
  | { type: 'setRideReviewSubmitting'; loading: boolean }
  | { type: 'setRideComplaintSubmitting'; loading: boolean }
  | { type: 'setDriverWalletError'; error: string | null }
  | { type: 'setRideSafetyError'; error: string | null }
  | {
      type: 'setDriverWalletSnapshot'
      driverWallet: DriverWallet
      driverWalletTransactions: WalletTransaction[]
      driverTopUpRequests: TopUpRequest[]
    }
  | { type: 'setDriverWallet'; driverWallet: DriverWallet }
  | { type: 'setDriverWalletTransactions'; driverWalletTransactions: WalletTransaction[] }
  | { type: 'setDriverTopUpRequests'; driverTopUpRequests: TopUpRequest[] }
  | { type: 'setPassengerReviewSummary'; passengerReviewSummary: RideReviewSummaryApi | null }
  | { type: 'setDriverReviewSummary'; driverReviewSummary: RideReviewSummaryApi | null }
  | { type: 'setPassengerReviews'; passengerReviews: RideReviewApi[] }
  | { type: 'setDriverReviews'; driverReviews: RideReviewApi[] }
  | { type: 'setPassengerComplaints'; passengerComplaints: RideComplaintApi[] }
  | { type: 'setDriverComplaints'; driverComplaints: RideComplaintApi[] }
  | { type: 'setOrderReviews'; orderReviews: RideReviewApi[] }
  | { type: 'setOrderComplaints'; orderComplaints: RideComplaintApi[] }
  | { type: 'openRideComplaintSheet'; orderId?: string }
  | { type: 'closeRideComplaintSheet' }
  | { type: 'updateRideComplaintForm'; patch: Partial<AppState['rideComplaintForm']> }
  | { type: 'setPassengerRideRequests'; requests: PassengerRideRequest[] }
  | { type: 'setPassengerRideOrders'; orders: PassengerRideOrder[] }
  | { type: 'setActiveRideEvents'; events: PassengerRideOrderEvent[] }
  | {
      type: 'setDriverSnapshot'
      driverVerificationStatus: DriverVerificationStatus
      driverProfile: DriverProfile | null
      activeRecheck: RideDriverRecheck | null
      driverApplicationDraft: DriverApplicationDraft
      driverFeedOrders: DriverFeedOrder[]
      driverOrders: DriverActiveOrder[]
      driverCounterOffers: DriverCounterOffer[]
      driverActiveOrder: DriverActiveOrder | null
      currentScreen?: AppScreen
    }
  | { type: 'setDriverFeedOrders'; orders: DriverFeedOrder[] }
  | { type: 'setDriverCounterOffers'; offers: DriverCounterOffer[] }
  | { type: 'setDriverOrders'; orders: DriverActiveOrder[] }
  | { type: 'setDriverActiveOrder'; order: DriverActiveOrder | null; currentScreen?: AppScreen }
  | {
      type: 'setPassengerRideSnapshot'
      passengerRideRequests: PassengerRideRequest[]
      passengerRideOrders: PassengerRideOrder[]
      activeRideRequest: PassengerRideRequest | null
      driverOffers: DriverOffer[]
      activeRide: ActiveRide | null
      activeRideEvents: PassengerRideOrderEvent[]
      currentScreen?: AppScreen
      clearCurrentRide?: boolean
    }
  | {
      type: 'setDriverVerificationStatus'
      status: DriverVerificationStatus
    }
  | { type: 'setPendingPassengerFlow'; flow: PassengerFlow }
  | { type: 'startDriverRegistration' }
  | {
      type: 'updateDriverApplicationField'
      field: keyof DriverApplicationDraft
      value: DriverApplicationDraft[keyof DriverApplicationDraft]
    }
  | {
      type: 'uploadDriverDocumentMock'
      documentType: DriverApplicationDocument['type']
      filePath?: string
    }
  | { type: 'nextDriverRegistrationStep' }
  | { type: 'prevDriverRegistrationStep' }
  | { type: 'submitDriverApplication' }
  | { type: 'demoApproveDriver' }
  | { type: 'demoRequestDriverChanges'; comment?: string }
  | { type: 'demoBlockDriver'; comment?: string }
  | { type: 'returnToPassengerMode' }
  | { type: 'editDriverApplicationAfterChanges' }
  | { type: 'toggleDriverOnlineStatus' }
  | { type: 'setDriverOnline'; online: boolean }
  | { type: 'openTopUpForm' }
  | { type: 'closeTopUpForm' }
  | { type: 'updateTopUpForm'; patch: Partial<AppState['topUpForm']> }
  | { type: 'submitTopUpRequest' }
  | { type: 'demoApproveTopUpRequest'; requestId: string }
  | { type: 'demoRejectTopUpRequest'; requestId: string }
  | { type: 'chargeCommissionForCompletedOrder'; orderId?: string }
  | { type: 'refundCommissionDemo'; orderId: string }
  | { type: 'blockDriverOrdersIfLowBalance' }
  | { type: 'openDriverCounterOfferSheet'; orderId: string }
  | { type: 'closeDriverCounterOfferSheet' }
  | { type: 'sendDriverCounterOffer'; price: number; comment: string }
  | { type: 'acceptDemoCounterOfferAsPassenger'; orderId?: string }
  | { type: 'acceptDriverFeedOrder'; orderId: string }
  | { type: 'driverOrderNextStatus' }
  | { type: 'cancelDriverActiveOrder' }
  | { type: 'clearCompletedDriverOrder' }
  | { type: 'updateRideDraft'; patch: Partial<RideDraft> }
  | { type: 'openRideLocationSheet'; target: 'origin' | 'destination' }
  | { type: 'closeRideLocationSheet' }
  | { type: 'updateParcelDraft'; patch: Partial<ParcelDraft> }
  | { type: 'openPhoneVerifySheet' }
  | { type: 'openAuthSheet'; flow?: PassengerFlow }
  | { type: 'closePhoneVerifySheet' }
  | { type: 'openPassengerOnboarding' }
  | { type: 'closePassengerOnboarding' }
  | { type: 'openPassengerRating' }
  | { type: 'closePassengerRating' }
  | { type: 'setPassengerOrdersTab'; tab: PassengerOrdersTab }
  | { type: 'setVerifiedPhone'; phone: string }
  | { type: 'setPassengerProfile'; profile: PassengerProfile }
  | { type: 'startRideSearch' }
  | { type: 'startParcelSearch' }
  | { type: 'createRideFromDraft' }
  | { type: 'createParcelFromDraft' }
  | { type: 'acceptOffer'; offerId: string }
  | { type: 'acceptParcelOffer'; offerId: string }
  | { type: 'setActiveRideStatus'; status: ActiveRideStatus }
  | { type: 'setActiveParcelStatus'; status: ActiveParcelStatus }
  | { type: 'cancelActiveRide' }
  | { type: 'cancelActiveParcel' }
  | { type: 'completeRideAndOpenRating' }
  | { type: 'completePassengerRideAfterReview'; history: PassengerHistoryItem }
  | { type: 'completeParcelAndOpenHistory' }
  | { type: 'submitRideRating'; rating: number; comment: string }
  | { type: 'repeatRide'; ride: PassengerHistoryItem }
  | { type: 'repeatParcel'; parcel: PassengerHistoryItem }

function assertNever(value: never): never {
  throw new Error(`Unexpected action: ${JSON.stringify(value)}`)
}

function makeId(prefix: string) {
  return `${prefix}-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}

function defaultRideDraft(): RideDraft {
  return {
    from: '',
    to: '',
    originCityId: undefined,
    originCityName: '',
    originRegionName: '',
    originAddress: '',
    destinationCityId: undefined,
    destinationCityName: '',
    destinationRegionName: '',
    destinationAddress: '',
    date: '',
    time: '',
    type: 'shared',
    passengersCount: 1,
    comment: '',
    price: '',
  }
}

function defaultParcelDraft(): ParcelDraft {
  return {
    senderName: '',
    senderPhone: '',
    receiverName: '',
    receiverPhone: '',
    from: '',
    to: '',
    size: 'SMALL',
    weightKg: 2,
    description: '',
    photoAttached: false,
    price: 0,
  }
}

function defaultDriverApplicationDraft(): DriverApplicationDraft {
  return {
    step: 1,
    fullName: '',
    phone: '',
    city: '',
    cityId: '',
    frequentRoutes: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePlate: '',
    vehicleColor: '',
    vehicleSeats: '',
    vehicleBodyType: DRIVER_VEHICLE_BODY_TYPES[0],
    documents: [
      { type: 'DRIVER_LICENSE_FRONT', filePath: '' },
      { type: 'DRIVER_LICENSE_BACK', filePath: '' },
      { type: 'VEHICLE_REGISTRATION', filePath: '' },
      { type: 'CAR_FRONT_PHOTO', filePath: '' },
      { type: 'CAR_BACK_PHOTO', filePath: '' },
      { type: 'INTERIOR_PHOTO', filePath: '' },
      { type: 'TRUNK_PHOTO', filePath: '' },
    ],
  }
}

function makeDriverProfileFromApplication(
  application: DriverApplicationDraft,
): DriverProfile {
  const vehicle: DriverVehicle = {
    brand: application.vehicleBrand,
    model: application.vehicleModel,
    year: application.vehicleYear,
    plate: application.vehiclePlate,
    color: application.vehicleColor,
    seats: application.vehicleSeats,
    bodyType: application.vehicleBodyType,
  }

  return {
    id: `driver-${Date.now()}`,
    fullName: application.fullName,
    phone: application.phone,
    city: application.city,
    rating: 5,
    tripsCount: 0,
    verificationStatus: 'APPROVED',
    balance: 0,
    minBalance: 1000,
    isOnline: false,
    vehicle,
  }
}

function cloneDriverApplicationDraft(
  application: DriverApplicationDraft,
): DriverApplicationDraft {
  return {
    ...application,
    documents: application.documents.map((document) => ({ ...document })),
  }
}

function hasRealDriverApplicationDocuments(documents: unknown): boolean {
  if (!Array.isArray(documents)) return false

  const requiredDocumentTypes = [
    'DRIVER_LICENSE_FRONT',
    'DRIVER_LICENSE_BACK',
    'VEHICLE_REGISTRATION',
    'CAR_FRONT_PHOTO',
  ] as const

  return requiredDocumentTypes.every((requiredType) => {
    const document = documents.find((item) => {
      if (typeof item !== 'object' || item === null || Array.isArray(item)) return false
      return (item as Record<string, unknown>).type === requiredType
    }) as Record<string, unknown> | undefined

    if (!document) return false

    if (typeof document !== 'object' || document === null || Array.isArray(document)) {
      return false
    }

    const record = document as Record<string, unknown>
    return (
      typeof record.type === 'string' &&
      record.type.trim().length > 0 &&
      typeof record.filePath === 'string' &&
      record.filePath.trim().length > 0
    )
  })
}

function nextDriverOrderStatus(
  status: DriverActiveOrderStatus,
): DriverActiveOrderStatus {
  switch (status) {
    case 'DRIVER_ASSIGNED':
      return 'DRIVER_ON_WAY'
    case 'DRIVER_ON_WAY':
      return 'DRIVER_ARRIVED'
    case 'DRIVER_ARRIVED':
      return 'IN_PROGRESS'
    case 'IN_PROGRESS':
      return 'COMPLETED'
    default:
      return status
  }
}

function defaultDriverWallet(): DriverWallet {
  return {
    balance: 1500,
    minBalance: 1000,
    currency: 'KZT',
    canGoOnline: true,
    missingAmount: 0,
    isBlocked: false,
    blockedReason: '',
    transactions: [],
    topUpRequests: [],
    chargedOrderIds: [],
  }
}

function syncDriverWalletAccessState(wallet: DriverWallet): DriverWallet {
  const missingAmount = getDriverWalletShortfall(wallet)
  const canGoOnline = canDriverGoOnline(wallet)

  return {
    ...wallet,
    missingAmount,
    canGoOnline,
  }
}

function mapWalletResponseToState(wallet: DriverWalletApi): DriverWallet {
  return syncDriverWalletAccessState({
    balance: wallet.balance,
    minBalance: wallet.minimumBalance,
    currency: wallet.currency,
    canGoOnline: wallet.canGoOnline,
    missingAmount: wallet.missingAmount,
    isBlocked: wallet.isBlocked,
    blockedReason: wallet.blockedReason,
    transactions: [],
    topUpRequests: [],
    chargedOrderIds: [],
  })
}

function mapWalletTransactionResponseToState(
  transaction: DriverWalletTransactionApi,
): WalletTransaction {
  const metadata = transaction.metadata ?? null
  return {
    id: transaction.id,
    type: transaction.type as WalletTransaction['type'],
    amount: transaction.amount,
    status: transaction.status as WalletTransaction['status'],
    title: transaction.title || transaction.description || transaction.comment || transaction.type,
    description: transaction.description,
    comment: transaction.comment,
    reason: transaction.reason,
    referenceNumber: transaction.referenceNumber,
    actorName: transaction.actorName,
    actorEmail: transaction.actorEmail,
    metadata,
    createdAt: transaction.createdAt,
    balanceBefore: transaction.balanceBefore,
    balanceAfter: transaction.balanceAfter,
    publicCode: transaction.publicCode,
    sourceType: transaction.sourceType,
    sourceId: transaction.sourceId,
    provider: transaction.provider,
    externalPaymentId: transaction.externalPaymentId,
    providerPayload: transaction.providerPayload,
  }
}

function mapTopUpRequestResponseToState(
  request: DriverTopUpRequestApi,
): TopUpRequest {
  return {
    id: request.id,
    amount: request.amount,
    method: request.method as TopUpRequestMethod,
    publicCode: request.publicCode,
    referenceNumber: request.referenceNumber,
    providerRef: request.providerRef,
    comment: request.comment,
    proofFilePath: request.proofFilePath,
    receiptFilePath: request.receiptFilePath,
    receiptFileName: request.receiptFileName,
    receiptMimeType: request.receiptMimeType,
    receiptSizeBytes: request.receiptSizeBytes,
    provider: request.provider,
    externalPaymentId: request.externalPaymentId,
    providerPayload: request.providerPayload,
    matchedAt: request.matchedAt,
    confirmedAt: request.confirmedAt,
    cancelledAt: request.cancelledAt,
    cancelledBy: request.cancelledBy,
    cancelReason: request.cancelReason,
    reviewReason: request.reviewReason,
    status: request.status as TopUpRequest['status'],
    createdAt: request.createdAt,
    updatedAt: request.updatedAt,
    reviewedAt: request.reviewedAt,
    rejectionReason: request.rejectionReason,
  }
}

function mergeTopUpRequestRecords(previous: TopUpRequest, next: TopUpRequest): TopUpRequest {
  return {
    ...previous,
    ...next,
    publicCode: next.publicCode || previous.publicCode,
    referenceNumber: next.referenceNumber || previous.referenceNumber,
    providerRef: next.providerRef || previous.providerRef,
    comment: next.comment || previous.comment,
    proofFilePath: next.proofFilePath || previous.proofFilePath,
    receiptFilePath: next.receiptFilePath || previous.receiptFilePath,
    receiptFileName: next.receiptFileName || previous.receiptFileName,
    receiptMimeType: next.receiptMimeType || previous.receiptMimeType,
    provider: next.provider || previous.provider,
    externalPaymentId: next.externalPaymentId || previous.externalPaymentId,
    matchedAt: next.matchedAt || previous.matchedAt,
    confirmedAt: next.confirmedAt || previous.confirmedAt,
    cancelledAt: next.cancelledAt || previous.cancelledAt,
    cancelledBy: next.cancelledBy || previous.cancelledBy,
    cancelReason: next.cancelReason || previous.cancelReason,
    reviewReason: next.reviewReason || previous.reviewReason,
    reviewedAt: next.reviewedAt || previous.reviewedAt,
    rejectionReason: next.rejectionReason || previous.rejectionReason,
  }
}

function mergeTopUpRequestsById(existing: TopUpRequest[], next: TopUpRequest[]): TopUpRequest[] {
  const byId = new Map(existing.map((request) => [request.id, request]))

  return next.map((request) => {
    const previous = byId.get(request.id)
    if (!previous) {
      return request
    }

    return {
      ...mergeTopUpRequestRecords(previous, request),
    }
  })
}

function mapReviewResponseToState(review: RideReviewApi): RideReviewApi {
  return {
    ...review,
  }
}

function mapComplaintResponseToState(complaint: RideComplaintApi): RideComplaintApi {
  return {
    ...complaint,
  }
}

function syncDriverProfileWithWallet(
  profile: DriverProfile | null,
  wallet: DriverWallet,
): DriverProfile | null {
  if (!profile) return profile

  return {
    ...profile,
    balance: wallet.balance,
    minBalance: wallet.minBalance,
    isOnline: profile.isOnline && canDriverGoOnline(wallet),
    blockedReason: profile.blockedReason?.trim() || wallet.blockedReason?.trim() || profile.blockedReason,
  }
}

function makeWalletTransaction(params: {
  type: WalletTransaction['type']
  amount: number
  title: string
  description?: string
  comment?: string
  reason?: string
  referenceNumber?: string
  actorName?: string
  actorEmail?: string
  metadata?: Record<string, unknown> | null
  sourceOrderId?: string
  sourceTopUpRequestId?: string
  balanceBefore?: number
  balanceAfter?: number
}): WalletTransaction {
  return {
    id: makeId('txn'),
    status: 'APPROVED',
    createdAt: new Date().toISOString(),
    ...params,
  }
}

function formatTopUpMethod(method: TopUpRequestMethod) {
  if (method === 'KASPI') return 'Kaspi'
  if (method === 'HALYK') return 'Halyk'
  if (method === 'CASH') return 'Наличные'
  return 'Other'
}

function canAccessDriverOrders(state: Pick<AppState, 'driverVerificationStatus' | 'driverWallet'>) {
  return (
    state.driverVerificationStatus === 'APPROVED' &&
    canDriverGoOnline(state.driverWallet)
  )
}

function createTopUpRequestFromForm(
  form: AppState['topUpForm'],
): TopUpRequest {
  const now = new Date().toISOString()
  return {
    id: makeId('topup'),
    amount: Number(form.amount),
    method: form.method,
    providerRef: form.providerRef.trim(),
    comment: form.comment.trim(),
    status: 'PENDING_UPLOAD',
    createdAt: now,
    updatedAt: now,
  }
}

function chargeCommissionIfNeeded(
  state: AppState,
  orderId?: string,
): Pick<AppState, 'driverWallet' | 'driverActiveOrder' | 'driverProfile'> {
  const activeOrder = state.driverActiveOrder
  if (!activeOrder) {
    return {
      driverWallet: state.driverWallet,
      driverActiveOrder: state.driverActiveOrder,
      driverProfile: state.driverProfile,
    }
  }

  if (orderId && activeOrder.sourceOrderId !== orderId) {
    return {
      driverWallet: state.driverWallet,
      driverActiveOrder: state.driverActiveOrder,
      driverProfile: state.driverProfile,
    }
  }

  if (activeOrder.commissionCharged || state.driverWallet.chargedOrderIds.includes(activeOrder.sourceOrderId)) {
    return {
      driverWallet: state.driverWallet,
      driverActiveOrder: state.driverActiveOrder,
      driverProfile: state.driverProfile,
    }
  }

  const commission = Math.round(activeOrder.price * 0.08)
  const beforeBalance = state.driverWallet.balance
  const afterBalance = beforeBalance - commission

  const transaction = makeWalletTransaction({
    type: 'COMMISSION_CHARGED',
    amount: -commission,
    title: 'Комиссия за заказ',
    description: `${activeOrder.from} → ${activeOrder.to}`,
    sourceOrderId: activeOrder.sourceOrderId,
  })

  const updatedWallet: DriverWallet = {
    ...state.driverWallet,
    balance: afterBalance,
    transactions: [transaction, ...state.driverWallet.transactions],
    chargedOrderIds: [...state.driverWallet.chargedOrderIds, activeOrder.sourceOrderId],
  }
  const syncedWallet = syncDriverWalletAccessState(updatedWallet)

  return {
    driverWallet: syncedWallet,
    driverActiveOrder: {
      ...activeOrder,
      commissionCharged: true,
      completedBalanceBefore: beforeBalance,
      completedBalanceAfter: afterBalance,
    },
    driverProfile: syncDriverProfileWithWallet(state.driverProfile, syncedWallet),
  }
}

function isOpenRideRequestStatus(status: PassengerRideRequest['status']) {
  return status === 'SEARCHING' || status === 'OFFERED'
}

function isActiveRideOrderStatus(status: string) {
  return [
    'DRIVER_ASSIGNED',
    'DRIVER_ON_WAY',
    'DRIVER_ARRIVED',
    'IN_PROGRESS',
    'DISPUTE',
  ].includes(status)
}

function pickActiveRideRequest(requests: PassengerRideRequest[]) {
  return (
    requests.find((item) => isOpenRideRequestStatus(item.status)) ??
    requests[0] ??
    null
  )
}

function pickActiveRideOrder(orders: PassengerRideOrder[]) {
  return (
    orders.find((item) => isActiveRideOrderStatus(item.status)) ??
    orders[0] ??
    null
  )
}

function getBackendRideRequestId(request: Pick<PassengerRideRequest, 'id' | 'backendId' | 'localId'> | null | undefined) {
  const candidate = request?.backendId ?? request?.id
  return typeof candidate === 'string' && /^\d+$/.test(candidate.trim()) ? candidate.trim() : null
}

function toBackendRideType(rideType: RideDraft['type']): RideType {
  return rideType === 'full' ? 'FULL' : 'SHARED'
}

function trimRideLocationText(value?: string | null) {
  return value?.trim() || ''
}

function buildRideLocationText(cityName?: string | null, address?: string | null) {
  const trimmedCity = trimRideLocationText(cityName)
  const trimmedAddress = trimRideLocationText(address)

  if (!trimmedCity) return ''
  if (!trimmedAddress) return trimmedCity

  return `${trimmedCity}, ${trimmedAddress}`
}

function buildRideRequestPayload(rideDraft: RideDraft): CreateRideRequestPayload {
  const requestedPrice = Number(rideDraft.price)

  return {
    serviceType: 'INTERCITY_RIDE',
    rideType: toBackendRideType(rideDraft.type),
    originCityId: rideDraft.originCityId as number,
    destinationCityId: rideDraft.destinationCityId as number,
    originText: buildRideLocationText(rideDraft.originCityName, rideDraft.originAddress),
    destinationText: buildRideLocationText(rideDraft.destinationCityName, rideDraft.destinationAddress),
    passengersCount: rideDraft.passengersCount,
    requestedPrice: Number.isFinite(requestedPrice) ? requestedPrice : undefined,
    comment: rideDraft.comment.trim(),
  }
}

function appReducer(state: AppState, action: AppAction): AppState {
  switch (action.type) {
    case 'openMenu':
      return { ...state, isMenuOpen: true }
    case 'closeMenu':
      return { ...state, isMenuOpen: false }
    case 'toggleMenu':
      return { ...state, isMenuOpen: !state.isMenuOpen }
    case 'setScreen':
      return { ...state, currentScreen: action.screen, isMenuOpen: false }
    case 'setRole':
      return {
        ...clearTransientRideState(state),
        role: action.role,
        currentScreen: action.screen,
      }
    case 'setPassengerStatus':
      return { ...state, passengerStatus: action.status }
    case 'resetPassengerSession':
      return createInitialState()
    case 'clearTransientRideState':
      return clearTransientRideState(state)
    case 'setRideListLoading':
      return { ...state, isRideListLoading: action.loading }
    case 'setPassengerOrdersLoading':
      return { ...state, isPassengerOrdersLoading: action.loading }
    case 'setRideRequestLoading':
      return { ...state, isRideRequestLoading: action.loading }
    case 'setRideOffersLoading':
      return { ...state, isRideOffersLoading: action.loading }
    case 'setRideActionLoading':
      return { ...state, isRideActionLoading: action.loading }
    case 'setRideFlowError':
      return { ...state, rideFlowError: action.error }
    case 'setDriverFeedLoading':
      return { ...state, isDriverFeedLoading: action.loading }
    case 'setDriverActionLoading':
      return { ...state, isDriverActionLoading: action.loading }
    case 'setDriverFlowError':
      return { ...state, driverFlowError: action.error }
    case 'setDriverWalletLoading':
      return { ...state, isDriverWalletLoading: action.loading }
    case 'setDriverTopUpSubmitting':
      return { ...state, isDriverTopUpSubmitting: action.loading }
    case 'setRideReviewSubmitting':
      return { ...state, isRideReviewSubmitting: action.loading }
    case 'setRideComplaintSubmitting':
      return { ...state, isRideComplaintSubmitting: action.loading }
    case 'setDriverWalletError':
      return { ...state, driverWalletError: action.error }
    case 'setRideSafetyError':
      return { ...state, rideSafetyError: action.error }
    case 'setPassengerReviewSummary':
      return { ...state, passengerReviewSummary: action.passengerReviewSummary }
    case 'setDriverReviewSummary':
      return { ...state, driverReviewSummary: action.driverReviewSummary }
    case 'setPassengerReviews':
      return { ...state, passengerReviews: action.passengerReviews }
    case 'setDriverReviews':
      return { ...state, driverReviews: action.driverReviews }
    case 'setPassengerComplaints':
      return { ...state, passengerComplaints: action.passengerComplaints }
    case 'setDriverComplaints':
      return { ...state, driverComplaints: action.driverComplaints }
    case 'setOrderReviews':
      return { ...state, orderReviews: action.orderReviews }
    case 'setOrderComplaints':
      return { ...state, orderComplaints: action.orderComplaints }
    case 'openRideComplaintSheet':
      return {
        ...state,
        isRideComplaintOpen: true,
        rideSafetyError: null,
        rideComplaintForm: {
          ...state.rideComplaintForm,
          category: 'other',
          message: '',
        },
      }
    case 'closeRideComplaintSheet':
      return {
        ...state,
        isRideComplaintOpen: false,
        rideSafetyError: null,
        rideComplaintForm: {
          category: 'other',
          message: '',
        },
      }
    case 'updateRideComplaintForm':
      return {
        ...state,
        rideComplaintForm: { ...state.rideComplaintForm, ...action.patch },
      }
    case 'setPassengerRideRequests':
      return { ...state, passengerRideRequests: action.requests }
    case 'setPassengerRideOrders':
      return { ...state, passengerRideOrders: action.orders }
    case 'setActiveRideEvents':
      return { ...state, activeRideEvents: action.events }
    case 'setDriverSnapshot': {
      const isApprovedDriver = action.driverVerificationStatus === 'APPROVED'
      return {
        ...state,
        driverVerificationStatus: action.driverVerificationStatus,
        driverProfile: action.driverProfile,
        activeRecheck: action.activeRecheck,
        driverApplicationDraft: action.driverApplicationDraft,
        driverFeedOrders: isApprovedDriver ? dedupeById(action.driverFeedOrders) : [],
        driverOrders: isApprovedDriver ? dedupeById(action.driverOrders) : [],
        driverCounterOffers: isApprovedDriver ? action.driverCounterOffers : [],
        driverActiveOrder: isApprovedDriver ? action.driverActiveOrder : null,
        currentScreen: action.currentScreen ?? state.currentScreen,
        driverFlowError: null,
      }
    }
    case 'setDriverWalletSnapshot':
      return {
        ...state,
        driverWallet: action.driverWallet,
        driverWalletTransactions: action.driverWalletTransactions,
        driverTopUpRequests: mergeTopUpRequestsById(state.driverTopUpRequests, action.driverTopUpRequests),
        driverProfile: syncDriverProfileWithWallet(state.driverProfile, action.driverWallet),
        driverFlowError: null,
        driverWalletError: null,
      }
    case 'setDriverWallet':
      return {
        ...state,
        driverWallet: action.driverWallet,
        driverProfile: syncDriverProfileWithWallet(state.driverProfile, action.driverWallet),
        driverFlowError: null,
        driverWalletError: null,
      }
    case 'setDriverWalletTransactions':
      return {
        ...state,
        driverWalletTransactions: action.driverWalletTransactions,
        driverFlowError: null,
        driverWalletError: null,
      }
    case 'setDriverTopUpRequests':
      return {
        ...state,
        driverTopUpRequests: mergeTopUpRequestsById(state.driverTopUpRequests, action.driverTopUpRequests),
        driverFlowError: null,
        driverWalletError: null,
      }
    case 'setDriverFeedOrders':
      return { ...state, driverFeedOrders: dedupeById(action.orders) }
    case 'setDriverCounterOffers':
      return { ...state, driverCounterOffers: action.offers }
    case 'setDriverOrders':
      return { ...state, driverOrders: dedupeById(action.orders) }
    case 'setDriverActiveOrder':
      return {
        ...state,
        driverActiveOrder: action.order,
        currentScreen: action.currentScreen ?? state.currentScreen,
      }
    case 'setPassengerRideSnapshot':
      return {
        ...state,
        passengerRideRequests: action.passengerRideRequests,
        passengerRideOrders: action.passengerRideOrders,
        activeRideRequest: action.activeRideRequest,
        driverOffers: action.driverOffers as DriverOffer[],
        activeRide: action.clearCurrentRide ? null : action.activeRide,
        activeRideEvents: action.activeRideEvents,
        currentScreen: action.currentScreen ?? state.currentScreen,
      }
    case 'setDriverVerificationStatus':
      return {
        ...state,
        driverVerificationStatus: action.status,
        driverProfile:
          action.status === 'APPROVED' && state.driverProfile
            ? syncDriverProfileWithWallet(
                { ...state.driverProfile, verificationStatus: 'APPROVED' },
                state.driverWallet,
              )
            : state.driverProfile,
      }
    case 'setPendingPassengerFlow':
      return { ...state, pendingPassengerFlow: action.flow }
    case 'startDriverRegistration':
      if (!getRideAccessToken()) {
        return {
          ...state,
          isPhoneVerifySheetOpen: true,
          pendingPassengerFlow: 'driverRegistrationStart',
        }
      }

      if (
        state.driverVerificationStatus === 'PENDING_REVIEW' ||
        state.driverVerificationStatus === 'APPROVED' ||
        state.driverVerificationStatus === 'BLOCKED' ||
        state.driverVerificationStatus === 'SUSPENDED'
      ) {
        return {
          ...state,
          role: 'driver',
          currentScreen: 'driverDashboard',
          isMenuOpen: false,
        }
      }

      return {
        ...state,
        role: 'driver',
        currentScreen: 'driverRegistration',
        isMenuOpen: false,
        driverVerificationStatus: 'DRAFT',
        driverRegistrationStep: 1,
        driverApplicationDraft: {
          ...cloneDriverApplicationDraft(state.driverApplicationDraft),
          step: 1,
          fullName:
            state.driverProfile?.fullName || state.driverApplicationDraft.fullName,
          phone: state.driverProfile?.phone || state.driverApplicationDraft.phone,
          city: state.driverProfile?.city || state.driverApplicationDraft.city,
        },
      }
    case 'updateDriverApplicationField': {
      return {
        ...state,
        driverApplicationDraft: {
          ...state.driverApplicationDraft,
          [action.field]: action.value,
        } as DriverApplicationDraft,
      }
    }
    case 'uploadDriverDocumentMock':
      if (!import.meta.env.DEV) return state
      return {
        ...state,
        driverApplicationDraft: {
          ...state.driverApplicationDraft,
          documents: state.driverApplicationDraft.documents.map((document) =>
            document.type === action.documentType
              ? {
                  ...document,
                  filePath:
                    (action.filePath ?? document.filePath) ||
                    `/mock/ride/driver-docs/${document.type.toLowerCase()}.jpg`,
                }
              : document,
          ),
        },
      }
    case 'nextDriverRegistrationStep':
      return {
        ...state,
        driverRegistrationStep: Math.min(
          5,
          (state.driverRegistrationStep + 1) as DriverApplicationStep,
        ) as DriverApplicationStep,
        driverApplicationDraft: {
          ...state.driverApplicationDraft,
          step: Math.min(
            5,
            (state.driverRegistrationStep + 1) as DriverApplicationStep,
          ) as DriverApplicationStep,
        },
        driverVerificationStatus: 'DRAFT',
        currentScreen: 'driverRegistration',
      }
    case 'prevDriverRegistrationStep':
      return {
        ...state,
        driverRegistrationStep: Math.max(
          1,
          (state.driverRegistrationStep - 1) as DriverApplicationStep,
        ) as DriverApplicationStep,
        driverApplicationDraft: {
          ...state.driverApplicationDraft,
          step: Math.max(
            1,
            (state.driverRegistrationStep - 1) as DriverApplicationStep,
          ) as DriverApplicationStep,
        },
        currentScreen: 'driverRegistration',
      }
    case 'submitDriverApplication':
      return {
        ...state,
        driverVerificationStatus: 'PENDING_REVIEW',
        driverApplicationDraft: {
          ...state.driverApplicationDraft,
          submittedAt: new Date().toISOString(),
        },
        currentScreen: 'driverDashboard',
        isMenuOpen: false,
      }
    case 'demoApproveDriver': {
      if (!import.meta.env.DEV) return state
      const approvedProfile = makeDriverProfileFromApplication(state.driverApplicationDraft)
      const wallet = {
        ...state.driverWallet,
        balance: state.driverWallet.balance || approvedProfile.balance || 0,
        minBalance: state.driverWallet.minBalance || approvedProfile.minBalance || 0,
      }
      const syncedWallet = syncDriverWalletAccessState(wallet)

      return {
        ...state,
        driverVerificationStatus: 'APPROVED',
        driverProfile: syncDriverProfileWithWallet(
          {
            ...approvedProfile,
            balance: syncedWallet.balance,
            minBalance: syncedWallet.minBalance,
          },
          syncedWallet,
        ),
        driverWallet: syncedWallet,
        currentScreen: 'driverDashboard',
        isMenuOpen: false,
        role: 'driver',
      }
    }
    case 'demoRequestDriverChanges':
      if (!import.meta.env.DEV) return state
      return {
        ...state,
        driverVerificationStatus: 'NEEDS_CHANGES',
        driverApplicationDraft: {
          ...state.driverApplicationDraft,
          moderatorComment:
            action.comment ??
            'Проверьте фото документов и заполните госномер без сокращений.',
          changesRequestedReason:
            action.comment ??
            'Проверьте фото документов и заполните госномер без сокращений.',
        },
        currentScreen: 'driverDashboard',
        isMenuOpen: false,
        role: 'driver',
      }
    case 'demoBlockDriver':
      if (!import.meta.env.DEV) return state
      return {
        ...state,
        driverVerificationStatus: 'BLOCKED',
        driverApplicationDraft: {
          ...state.driverApplicationDraft,
          moderatorComment:
            action.comment ?? 'Временная блокировка за нарушение правил модерации.',
          blockedReason:
            action.comment ?? 'Временная блокировка за нарушение правил модерации.',
        },
        currentScreen: 'driverDashboard',
        isMenuOpen: false,
        role: 'driver',
      }
    case 'returnToPassengerMode':
      return {
        ...state,
        role: 'passenger',
        currentScreen: defaultScreenByRole.passenger,
        isMenuOpen: false,
      }
    case 'editDriverApplicationAfterChanges':
      return {
        ...state,
        driverVerificationStatus: 'DRAFT',
        currentScreen: 'driverRegistration',
        driverRegistrationStep: Math.max(
          2,
          state.driverApplicationDraft.step,
        ) as DriverApplicationStep,
        driverApplicationDraft: {
          ...state.driverApplicationDraft,
          step: Math.max(2, state.driverApplicationDraft.step) as DriverApplicationStep,
        } as DriverApplicationDraft,
      }
    case 'toggleDriverOnlineStatus':
      if (state.driverVerificationStatus !== 'APPROVED') return state
      return {
        ...state,
        driverProfile: state.driverProfile
          ? {
              ...state.driverProfile,
              isOnline:
                state.driverWallet.isBlocked !== true &&
                (state.driverWallet.canGoOnline ?? state.driverWallet.balance >= state.driverWallet.minBalance)
                  ? !state.driverProfile.isOnline
                  : false,
            }
          : state.driverProfile,
      }
    case 'setDriverOnline':
      if (state.driverVerificationStatus !== 'APPROVED') return state
      return {
        ...state,
        driverProfile: state.driverProfile
          ? {
              ...state.driverProfile,
              isOnline:
                action.online &&
                state.driverWallet.isBlocked !== true &&
                (state.driverWallet.canGoOnline ?? state.driverWallet.balance >= state.driverWallet.minBalance),
            }
          : state.driverProfile,
      }
    case 'openTopUpForm':
      return { ...state, isTopUpFormOpen: true }
    case 'closeTopUpForm':
      return {
        ...state,
        isTopUpFormOpen: false,
        topUpForm: {
          amount: '',
          method: 'KASPI_TRANSFER',
          providerRef: '',
          comment: '',
          receiptFile: null,
        },
      }
    case 'updateTopUpForm':
      return {
        ...state,
        topUpForm: { ...state.topUpForm, ...action.patch },
      }
    case 'submitTopUpRequest': {
      const amount = Number(state.topUpForm.amount)
      if (!Number.isFinite(amount) || amount <= 0) {
        return state
      }

      const request = createTopUpRequestFromForm(state.topUpForm)

      return {
        ...state,
        driverWallet: {
          ...state.driverWallet,
          topUpRequests: [request, ...state.driverWallet.topUpRequests],
        },
        driverTopUpRequests: [request, ...state.driverTopUpRequests],
        isTopUpFormOpen: false,
        topUpForm: {
          amount: '',
          method: 'KASPI_TRANSFER',
          providerRef: '',
          comment: '',
          receiptFile: null,
        },
      }
    }
    case 'demoApproveTopUpRequest': {
      if (!import.meta.env.DEV) return state
      const request = state.driverTopUpRequests.find((item) => item.id === action.requestId)
      if (!request || request.status !== 'PENDING_REVIEW') return state

      const updatedRequest = {
        ...request,
        status: 'APPROVED' as const,
        reviewedAt: new Date().toISOString(),
      }

      const updatedWallet: DriverWallet = {
        ...state.driverWallet,
        balance: state.driverWallet.balance + request.amount,
        missingAmount: Math.max(0, state.driverWallet.minBalance - (state.driverWallet.balance + request.amount)),
        canGoOnline: state.driverWallet.balance + request.amount >= state.driverWallet.minBalance,
        transactions: [
          makeWalletTransaction({
            type: 'TOP_UP_APPROVED',
            amount: request.amount,
            title: 'Пополнение баланса',
            description: `${formatTopUpMethod(request.method)} · ${request.providerRef || request.referenceNumber || ''}`,
            comment: request.comment,
            sourceTopUpRequestId: request.id,
          }),
          ...state.driverWallet.transactions,
        ],
        topUpRequests: state.driverWallet.topUpRequests.map((item) =>
          item.id === request.id ? updatedRequest : item,
        ),
      }

      return {
        ...state,
        driverWallet: updatedWallet,
        driverWalletTransactions: updatedWallet.transactions,
        driverTopUpRequests: state.driverTopUpRequests.map((item) =>
          item.id === request.id ? updatedRequest : item,
        ),
        driverProfile: syncDriverProfileWithWallet(state.driverProfile, updatedWallet),
      }
    }
    case 'demoRejectTopUpRequest': {
      if (!import.meta.env.DEV) return state
      const request = state.driverTopUpRequests.find((item) => item.id === action.requestId)
      if (!request || request.status !== 'PENDING_REVIEW') return state

      return {
        ...state,
        driverWallet: {
          ...state.driverWallet,
          topUpRequests: state.driverWallet.topUpRequests.map((item) =>
            item.id === request.id
              ? {
                  ...item,
                  status: 'REJECTED',
                  reviewedAt: new Date().toISOString(),
                  rejectionReason: 'Платеж не найден',
                }
              : item,
          ),
        },
        driverTopUpRequests: state.driverTopUpRequests.map((item) =>
          item.id === request.id
            ? {
                ...item,
                status: 'REJECTED',
                reviewedAt: new Date().toISOString(),
                rejectionReason: 'Платеж не найден',
              }
            : item,
        ),
      }
    }
    case 'chargeCommissionForCompletedOrder': {
      if (!import.meta.env.DEV) return state
      const result = chargeCommissionIfNeeded(state, action.orderId)

      if (result.driverWallet === state.driverWallet && result.driverActiveOrder === state.driverActiveOrder) {
        return state
      }

      const lowBalance = result.driverWallet.balance < result.driverWallet.minBalance

      return {
        ...state,
        driverWallet: result.driverWallet,
        driverActiveOrder: result.driverActiveOrder
          ? { ...result.driverActiveOrder, status: 'COMPLETED' }
          : result.driverActiveOrder,
        driverProfile: lowBalance
          ? result.driverProfile
            ? { ...result.driverProfile, isOnline: false }
            : result.driverProfile
          : result.driverProfile,
      }
    }
    case 'refundCommissionDemo': {
      if (!import.meta.env.DEV) return state
      const activeOrder = state.driverActiveOrder
      if (!activeOrder || activeOrder.sourceOrderId !== action.orderId) return state

      const commission = Math.round(activeOrder.price * 0.08)
  const alreadyRefunded = state.driverWallet.transactions.some(
      (item) =>
        (item.type === 'COMMISSION_REFUND' || item.type === 'REFUND') &&
        item.sourceOrderId === action.orderId,
      )

      if (alreadyRefunded) return state

      const updatedWallet: DriverWallet = {
        ...state.driverWallet,
        balance: state.driverWallet.balance + commission,
        transactions: [
          makeWalletTransaction({
            type: 'REFUND',
            amount: commission,
            title: 'Возврат комиссии',
            description: `${activeOrder.from} → ${activeOrder.to}`,
            sourceOrderId: action.orderId,
          }),
          ...state.driverWallet.transactions,
        ],
      }
      const syncedWallet = syncDriverWalletAccessState(updatedWallet)

      return {
        ...state,
        driverWallet: syncedWallet,
        driverProfile: syncDriverProfileWithWallet(state.driverProfile, syncedWallet),
      }
    }
    case 'blockDriverOrdersIfLowBalance':
      return {
        ...state,
        driverProfile:
          state.driverProfile && state.driverWallet.balance < state.driverWallet.minBalance
            ? { ...state.driverProfile, isOnline: false }
            : state.driverProfile,
      }
    case 'openDriverCounterOfferSheet': {
      const order = state.driverFeedOrders.find((item) => item.id === action.orderId)

      if (!canAccessDriverOrders(state) || state.driverActiveOrder) {
        return state
      }

      return {
        ...state,
        isDriverCounterOfferSheetOpen: true,
        driverCounterOfferOrderId: action.orderId,
        driverCounterOfferPrice: order ? String(order.requestedPrice) : '',
        driverCounterOfferComment: '',
      }
    }
    case 'closeDriverCounterOfferSheet':
      return {
        ...state,
        isDriverCounterOfferSheetOpen: false,
        driverCounterOfferOrderId: null,
        driverCounterOfferPrice: '',
        driverCounterOfferComment: '',
      }
    case 'sendDriverCounterOffer': {
      if (!state.driverCounterOfferOrderId || !canAccessDriverOrders(state) || state.driverActiveOrder) return state
      const order = state.driverFeedOrders.find(
        (item) => item.id === state.driverCounterOfferOrderId,
      )

      if (!order) return state

      const offer: DriverCounterOffer = {
        id: makeId('counter-offer'),
        orderId: order.id,
        driverName: state.driverProfile?.fullName || state.driverApplicationDraft.fullName || 'Демо водитель',
        offeredPrice: action.price,
        originalPrice: order.requestedPrice,
        comment: action.comment,
        status: 'pending',
      }

      return {
        ...state,
        driverFeedOrders: state.driverFeedOrders.map((item) =>
          item.id === order.id ? { ...item, status: 'offered' } : item,
        ),
        driverCounterOffers: [
          ...state.driverCounterOffers.filter((item) => item.orderId !== order.id),
          offer,
        ],
        driverCounterOfferPrice: String(action.price),
        driverCounterOfferComment: action.comment,
        isDriverCounterOfferSheetOpen: false,
        driverCounterOfferOrderId: null,
      }
    }
    case 'acceptDemoCounterOfferAsPassenger': {
      return state
    }
    case 'acceptDriverFeedOrder': {
      return state
    }
    case 'driverOrderNextStatus': {
      if (!import.meta.env.DEV) return state
      if (!state.driverActiveOrder) return state

      const nextStatus = nextDriverOrderStatus(state.driverActiveOrder.status)

      if (state.driverActiveOrder.status === 'IN_PROGRESS' && nextStatus === 'COMPLETED') {
        const result = chargeCommissionIfNeeded(state)
        const lowBalance = result.driverWallet.balance < result.driverWallet.minBalance

        return {
          ...state,
          driverWallet: result.driverWallet,
          driverActiveOrder: result.driverActiveOrder
            ? { ...result.driverActiveOrder, status: 'COMPLETED' }
            : result.driverActiveOrder,
          driverProfile: lowBalance
            ? result.driverProfile
              ? { ...result.driverProfile, isOnline: false }
              : result.driverProfile
            : result.driverProfile,
        }
      }

      return {
        ...state,
        driverActiveOrder: {
          ...state.driverActiveOrder,
          status: nextStatus,
        },
      }
    }
    case 'cancelDriverActiveOrder':
      return {
        ...state,
        driverActiveOrder: state.driverActiveOrder
          ? { ...state.driverActiveOrder, status: 'CANCELLED' }
          : state.driverActiveOrder,
      }
    case 'clearCompletedDriverOrder':
      return {
        ...state,
        driverActiveOrder: null,
        currentScreen: 'driverDashboard',
      }
    case 'updateRideDraft':
      return { ...state, rideDraft: { ...state.rideDraft, ...action.patch } }
    case 'openRideLocationSheet':
      return {
        ...state,
        isRideLocationSheetOpen: true,
        rideLocationSheetTarget: action.target,
        rideFlowError: null,
      }
    case 'closeRideLocationSheet':
      return {
        ...state,
        isRideLocationSheetOpen: false,
        rideLocationSheetTarget: null,
        rideFlowError: null,
      }
    case 'updateParcelDraft':
      return { ...state, parcelDraft: { ...state.parcelDraft, ...action.patch } }
    case 'openPhoneVerifySheet':
      return { ...state, isPhoneVerifySheetOpen: true }
    case 'openAuthSheet':
      return {
        ...state,
        isPhoneVerifySheetOpen: true,
        pendingPassengerFlow: action.flow ?? 'login',
      }
    case 'closePhoneVerifySheet':
      return { ...state, isPhoneVerifySheetOpen: false }
    case 'openPassengerOnboarding':
      if (state.role !== 'passenger' || state.currentScreen.startsWith('driver')) {
        return state
      }
      return { ...state, isPassengerOnboardingOpen: true, isPhoneVerifySheetOpen: false }
    case 'closePassengerOnboarding':
      return { ...state, isPassengerOnboardingOpen: false }
    case 'openPassengerRating':
      return { ...state, isPassengerRatingOpen: true }
    case 'closePassengerRating':
      return { ...state, isPassengerRatingOpen: false, rideSafetyError: null }
    case 'setPassengerOrdersTab':
      return { ...state, passengerOrdersTab: action.tab, currentScreen: 'passengerOrders' }
    case 'setVerifiedPhone':
      return { ...state, verifiedPhone: action.phone }
    case 'setPassengerProfile':
      return {
        ...state,
        passengerProfile: action.profile,
        passengerStatus: 'PHONE_VERIFIED',
      }
    case 'createRideFromDraft':
    case 'startRideSearch':
      return {
        ...state,
        pendingPassengerFlow: null,
      }
    case 'createParcelFromDraft':
    case 'startParcelSearch':
      return {
        ...state,
        pendingPassengerFlow: null,
      }
    case 'acceptOffer': {
      if (!state.activeRideRequest) return state
      const offer = state.driverOffers.find((item) => item.id === action.offerId)

      if (!offer) return state

      return {
        ...state,
        activeRideRequest: {
          ...state.activeRideRequest,
          status: 'CONVERTED_TO_ORDER',
          selectedOfferId: offer.id,
        },
        activeRide: {
          id: makeId('ride'),
          requestId: state.activeRideRequest.id,
          status: 'DRIVER_ASSIGNED',
          driverName: offer.driverName,
          driverPhone: '+7 700 000 00 00',
          driverRating: offer.rating,
          carModel: offer.carModel,
          carColor: offer.carColor,
          plate: offer.plate,
          from: state.rideDraft.from,
          to: state.rideDraft.to,
          price: offer.isCustomOffer ? offer.offeredPrice : offer.originalPrice,
        },
        currentScreen: 'passengerActiveRide',
      }
    }
    case 'acceptParcelOffer': {
      if (!import.meta.env.DEV) return state
      if (!state.activeParcelRequest) return state
      const offer = state.parcelOffers.find((item) => item.id === action.offerId)

      if (!offer) return state

      return {
        ...state,
        activeParcelRequest: {
          ...state.activeParcelRequest,
          status: 'CONVERTED_TO_ORDER',
          selectedOfferId: offer.id,
        },
        activeParcelOrder: {
          id: makeId('parcel'),
          requestId: state.activeParcelRequest.id,
          status: 'DRIVER_ASSIGNED',
          driverName: offer.driverName,
          driverPhone: '+7 700 000 00 00',
          driverRating: offer.rating,
          carModel: offer.carModel,
          carColor: offer.carColor,
          plate: offer.plate,
          from: state.parcelDraft.from,
          to: state.parcelDraft.to,
          price: offer.isCustomOffer ? offer.offeredPrice : offer.originalPrice,
          receiverName: state.parcelDraft.receiverName,
          receiverPhone: state.parcelDraft.receiverPhone,
          description: state.parcelDraft.description,
        },
        currentScreen: 'activeParcel',
      }
    }
    case 'setActiveRideStatus':
      if (!import.meta.env.DEV) return state
      return {
        ...state,
        activeRide: state.activeRide
          ? {
              ...state.activeRide,
              status: action.status,
            }
          : state.activeRide,
      }
    case 'setActiveParcelStatus':
      if (!import.meta.env.DEV) return state
      return {
        ...state,
        activeParcelOrder: state.activeParcelOrder
          ? {
              ...state.activeParcelOrder,
              status: action.status,
            }
          : state.activeParcelOrder,
      }
    case 'cancelActiveRide': {
      const cancelledHistory: PassengerHistoryItem | null = state.activeRideRequest
        ? {
            id: makeId('hist'),
            category: 'ride',
            from: state.activeRideRequest.from,
            to: state.activeRideRequest.to,
            date: state.activeRideRequest.date,
            price: state.activeRideRequest.price,
            status: 'cancelled',
            driverName: state.activeRide?.driverName,
          }
        : null

      return {
        ...state,
        passengerHistory: cancelledHistory
          ? [cancelledHistory, ...state.passengerHistory]
          : state.passengerHistory,
        activeRideRequest: null,
        activeRide: null,
        driverOffers: [],
        currentScreen: 'passengerOrders',
        passengerOrdersTab: 'rides',
      }
    }
    case 'cancelActiveParcel': {
      if (!import.meta.env.DEV) return state
      const cancelledHistory: PassengerHistoryItem | null = state.activeParcelRequest
        ? {
            id: makeId('hist'),
            category: 'parcel',
            from: state.activeParcelRequest.from,
            to: state.activeParcelRequest.to,
            date: new Date().toISOString().slice(0, 10),
            price: state.activeParcelRequest.price,
            status: 'cancelled',
            driverName: state.activeParcelOrder?.driverName,
            receiverName: state.activeParcelRequest.receiverName,
            receiverPhone: state.activeParcelRequest.receiverPhone,
            description: state.activeParcelRequest.description,
            size: state.activeParcelRequest.size,
            weightKg: state.activeParcelRequest.weightKg,
          }
        : null

      return {
        ...state,
        passengerHistory: cancelledHistory
          ? [cancelledHistory, ...state.passengerHistory]
          : state.passengerHistory,
        activeParcelRequest: null,
        activeParcelOrder: null,
        parcelOffers: [],
        currentScreen: 'passengerOrders',
        passengerOrdersTab: 'parcels',
      }
    }
    case 'completeRideAndOpenRating':
      if (!import.meta.env.DEV) return state
      return {
        ...state,
        activeRide: state.activeRide
          ? { ...state.activeRide, status: 'COMPLETED' }
          : state.activeRide,
        isPassengerRatingOpen: true,
      }
    case 'completePassengerRideAfterReview':
      return {
        ...state,
        passengerHistory: [action.history, ...state.passengerHistory],
        passengerProfile: state.passengerProfile
          ? {
              ...state.passengerProfile,
              tripsCount: state.passengerProfile.tripsCount + 1,
            }
          : state.passengerProfile,
        activeRideRequest: null,
        activeRide: null,
        driverOffers: [],
        currentScreen: 'passengerOrders',
        passengerOrdersTab: 'rides',
        isPassengerRatingOpen: false,
      }
    case 'completeParcelAndOpenHistory': {
      if (!import.meta.env.DEV) return state
      if (!state.activeParcelRequest || !state.activeParcelOrder) return state
      const completedParcelOrder = {
        ...state.activeParcelOrder,
        status: 'COMPLETED',
      }

      const completedHistory: PassengerHistoryItem = {
        id: makeId('hist'),
        category: 'parcel',
        from: state.activeParcelRequest.from,
        to: state.activeParcelRequest.to,
        date: new Date().toISOString().slice(0, 10),
        price: completedParcelOrder.price,
        status: 'completed',
        driverName: completedParcelOrder.driverName,
        receiverName: state.activeParcelRequest.receiverName,
        receiverPhone: state.activeParcelRequest.receiverPhone,
        description: state.activeParcelRequest.description,
        size: state.activeParcelRequest.size,
        weightKg: state.activeParcelRequest.weightKg,
      }

      return {
        ...state,
        passengerHistory: [completedHistory, ...state.passengerHistory],
        activeParcelRequest: null,
        activeParcelOrder: null,
        parcelOffers: [],
        currentScreen: 'passengerOrders',
        passengerOrdersTab: 'parcels',
      }
    }
    case 'submitRideRating': {
      if (!state.activeRideRequest) return state

      const completedHistory: PassengerHistoryItem = {
        id: makeId('hist'),
        category: 'ride',
        from: state.activeRideRequest.from,
        to: state.activeRideRequest.to,
        date: state.activeRideRequest.date,
        price: state.activeRide?.price ?? state.activeRideRequest.price,
        status: 'completed',
        driverName: state.activeRide?.driverName,
      }

      return {
        ...state,
        passengerHistory: [completedHistory, ...state.passengerHistory],
        passengerProfile: state.passengerProfile
          ? {
              ...state.passengerProfile,
              tripsCount: state.passengerProfile.tripsCount + 1,
            }
          : state.passengerProfile,
        activeRideRequest: null,
        activeRide: null,
        driverOffers: [],
        currentScreen: 'passengerOrders',
        passengerOrdersTab: 'rides',
        isPassengerRatingOpen: false,
      }
    }
    case 'repeatRide': {
      const rideDraft: RideDraft = {
        from: action.ride.from,
        to: action.ride.to,
        originCityId: undefined,
        originCityName: action.ride.from,
        originRegionName: '',
        originAddress: '',
        destinationCityId: undefined,
        destinationCityName: action.ride.to,
        destinationRegionName: '',
        destinationAddress: '',
        date: state.rideDraft.date,
        time: state.rideDraft.time,
        type: 'shared',
        passengersCount: 1,
        comment: '',
        price: String(action.ride.price),
      }

      return {
        ...state,
        rideDraft,
        currentScreen: 'passengerOrder',
        passengerOrdersTab: 'rides',
      }
    }
    case 'repeatParcel': {
      const parcelDraft: ParcelDraft = {
        senderName: state.parcelDraft.senderName,
        senderPhone: state.parcelDraft.senderPhone,
        receiverName: action.parcel.receiverName ?? state.parcelDraft.receiverName,
        receiverPhone: action.parcel.receiverPhone ?? state.parcelDraft.receiverPhone,
        from: action.parcel.from,
        to: action.parcel.to,
        size: state.parcelDraft.size,
        weightKg: state.parcelDraft.weightKg,
        description: action.parcel.description ?? '',
        photoAttached: state.parcelDraft.photoAttached,
        price: action.parcel.price,
      }

      return {
        ...state,
        parcelDraft,
        currentScreen: 'passengerParcels',
        passengerOrdersTab: 'parcels',
      }
    }
    default:
      return assertNever(action)
  }
}

function createInitialState(): AppState {
  return {
  role: 'passenger',
  passengerStatus: 'GUEST',
  driverVerificationStatus: 'NOT_STARTED',
  currentScreen: defaultScreenByRole.passenger,
  isMenuOpen: false,
  passengerProfile: null,
  driverProfile: null,
  rideDraft: defaultRideDraft(),
  isRideLocationSheetOpen: false,
  rideLocationSheetTarget: null,
  parcelDraft: defaultParcelDraft(),
  driverApplicationDraft: defaultDriverApplicationDraft(),
  driverRegistrationStep: 1,
  activeRecheck: null,
  driverWallet: defaultDriverWallet(),
  driverWalletTransactions: [],
  driverTopUpRequests: [],
  driverFeedOrders: [],
  driverOrders: [],
  driverActiveOrder: null,
  driverCounterOffers: [],
  isDriverCounterOfferSheetOpen: false,
  driverCounterOfferOrderId: null,
  driverCounterOfferPrice: '',
  driverCounterOfferComment: '',
  isDriverFeedLoading: false,
  isDriverActionLoading: false,
  isDriverWalletLoading: false,
  isDriverTopUpSubmitting: false,
  isRideReviewSubmitting: false,
  isRideComplaintSubmitting: false,
  driverFlowError: null,
  driverWalletError: null,
  rideSafetyError: null,
  isTopUpFormOpen: false,
  isRideComplaintOpen: false,
  topUpForm: {
    amount: '',
    method: 'KASPI_TRANSFER',
    providerRef: '',
    comment: '',
    receiptFile: null,
  },
  rideComplaintForm: {
    category: 'other',
    message: '',
  },
  activeRideRequest: null,
  driverOffers: [],
  activeRide: null,
  activeRideEvents: [],
  passengerRideRequests: [],
  passengerRideOrders: [],
  passengerReviewSummary: null,
  driverReviewSummary: null,
  passengerReviews: [],
  driverReviews: [],
  passengerComplaints: [],
  driverComplaints: [],
  orderReviews: [],
  orderComplaints: [],
  isRideListLoading: false,
  isPassengerOrdersLoading: false,
  isRideRequestLoading: false,
  isRideOffersLoading: false,
  isRideActionLoading: false,
  rideFlowError: null,
  activeParcelRequest: null,
  parcelOffers: [],
  activeParcelOrder: null,
  passengerHistory: [],
  passengerOrdersTab: 'rides',
  verifiedPhone: '',
  pendingPassengerFlow: null,
  isPhoneVerifySheetOpen: false,
  isPassengerOnboardingOpen: false,
  isPassengerRatingOpen: false,
  }
}

function clearTransientRideState(state: AppState): AppState {
  return {
    ...state,
    isMenuOpen: false,
    isDriverFeedLoading: false,
    isDriverActionLoading: false,
    isDriverWalletLoading: false,
    isDriverTopUpSubmitting: false,
    isRideReviewSubmitting: false,
    isRideComplaintSubmitting: false,
    driverFeedOrders: [],
    driverOrders: [],
    driverActiveOrder: null,
    driverCounterOffers: [],
    isDriverCounterOfferSheetOpen: false,
    driverCounterOfferOrderId: null,
    driverCounterOfferPrice: '',
    driverCounterOfferComment: '',
    activeRideRequest: null,
    driverOffers: [],
    activeRide: null,
    activeRideEvents: [],
    passengerRideRequests: [],
    passengerRideOrders: [],
    activeParcelRequest: null,
    parcelOffers: [],
    activeParcelOrder: null,
    rideFlowError: null,
    driverFlowError: null,
    driverWalletError: null,
    rideSafetyError: null,
    isRideListLoading: false,
    isPassengerOrdersLoading: false,
    isRideRequestLoading: false,
    isRideOffersLoading: false,
    isRideActionLoading: false,
    isPhoneVerifySheetOpen: false,
    isRideLocationSheetOpen: false,
    rideLocationSheetTarget: null,
    isPassengerOnboardingOpen: false,
    isPassengerRatingOpen: false,
    pendingPassengerFlow: null,
  }
}

function dedupeById<T extends { id: string }>(items: T[]) {
  const seen = new Set<string>()
  const deduped: T[] = []

  for (const item of items) {
    if (seen.has(item.id)) continue
    seen.add(item.id)
    deduped.push(item)
  }

  return deduped
}

const AppStateContext = createContext<AppContextValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, undefined as never, createInitialState)
  const didHydrateRef = useRef(false)
  const loadedRideTokenRef = useRef<string | null>(null)
  const loadedDriverTokenRef = useRef<string | null>(null)
  const driverApplicationIdRef = useRef<string | null>(null)
  const passengerOnboardingDismissedRef = useRef(false)

  const refreshPassengerRideSnapshot = async () => {
    const token = getRideAccessToken()

    if (!token) {
      loadedRideTokenRef.current = null
      dispatch({
        type: 'setPassengerRideSnapshot',
        passengerRideRequests: [],
        passengerRideOrders: [],
        activeRideRequest: null,
        driverOffers: [],
        activeRide: null,
        activeRideEvents: [],
        clearCurrentRide: true,
        currentScreen: defaultScreenByRole.passenger,
      })
      return
    }

    dispatch({ type: 'setRideListLoading', loading: true })
    dispatch({ type: 'setPassengerOrdersLoading', loading: true })
    dispatch({ type: 'setRideFlowError', error: null })

    try {
      const [requestsResponse, ordersResponse] = await Promise.all([
        getPassengerRequests(),
        getPassengerOrders(),
      ])
      const passengerRideRequests = requestsResponse.items
      const passengerRideOrders = ordersResponse.items
      const selectedRequest = pickActiveRideRequest(passengerRideRequests)
      const selectedRequestBackendId = getBackendRideRequestId(selectedRequest)
      const detailedRequest = selectedRequestBackendId
        ? await getRideRequest(selectedRequestBackendId).catch(() => selectedRequest)
        : selectedRequest
      const activeRideRequest =
        detailedRequest && isOpenRideRequestStatus(detailedRequest.status)
          ? detailedRequest
          : null
      const activeRideOrder = pickActiveRideOrder(passengerRideOrders)
      const detailedOrder = activeRideOrder
        ? await getRideOrder(activeRideOrder.id).catch(() => activeRideOrder)
        : null
      const orderEvents = activeRideOrder
        ? (await getRideOrderEvents(activeRideOrder.id).catch(() => ({ items: [] }))).items
        : []
      const activeRide =
        detailedOrder && isActiveRideOrderStatus(detailedOrder.status)
          ? mapOrderToActiveRide(detailedOrder)
          : null

      dispatch({
        type: 'setPassengerRideSnapshot',
        passengerRideRequests,
        passengerRideOrders,
        activeRideRequest: activeRideRequest ?? (activeRide ? detailedRequest ?? selectedRequest : null),
        driverOffers: [],
        activeRide,
        activeRideEvents: orderEvents,
        currentScreen: activeRide
          ? 'passengerActiveRide'
          : activeRideRequest
            ? 'passengerOffers'
            : defaultScreenByRole.passenger,
        clearCurrentRide: !activeRide && !activeRideRequest,
      })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        throw error
      }

      dispatch({
        type: 'setRideFlowError',
        error: error instanceof Error ? error.message : 'Не удалось загрузить ride state.',
      })
    } finally {
      dispatch({ type: 'setRideListLoading', loading: false })
      dispatch({ type: 'setPassengerOrdersLoading', loading: false })
    }
  }

  useEffect(() => {
    const token = getRideAccessToken()
    if (!token || state.role !== 'passenger' || state.currentScreen.startsWith('driver')) return

    const needsPassengerOnboarding =
      state.passengerStatus === 'PHONE_VERIFIED' &&
      !isPassengerProfileComplete(state.passengerProfile) &&
      !passengerOnboardingDismissedRef.current

    if (needsPassengerOnboarding && !state.isPassengerOnboardingOpen) {
      dispatch({ type: 'openPassengerOnboarding' })
    }
  }, [
    dispatch,
    state.isPassengerOnboardingOpen,
    state.currentScreen,
    state.passengerProfile,
    state.passengerStatus,
    state.role,
  ])

  const loadActiveRequestOffers = async () => {
    const activeRequest = state.activeRideRequest
    const activeRequestBackendId = getBackendRideRequestId(activeRequest)

    if (!activeRequest || !isOpenRideRequestStatus(activeRequest.status)) {
      dispatch({ type: 'setRideOffersLoading', loading: false })
      dispatch({
        type: 'setPassengerRideSnapshot',
        passengerRideRequests: state.passengerRideRequests,
        passengerRideOrders: state.passengerRideOrders,
        activeRideRequest: state.activeRideRequest,
        driverOffers: [],
        activeRide: state.activeRide,
        activeRideEvents: state.activeRideEvents,
      })
      return
    }

    if (!activeRequestBackendId) {
      console.warn('[ride] loadActiveRequestOffers: skipping polling for non-numeric request id', activeRequest.id)
      dispatch({ type: 'setRideOffersLoading', loading: false })
      dispatch({
        type: 'setPassengerRideSnapshot',
        passengerRideRequests: state.passengerRideRequests,
        passengerRideOrders: state.passengerRideOrders,
        activeRideRequest: activeRequest,
        driverOffers: [],
        activeRide: state.activeRide,
        activeRideEvents: state.activeRideEvents,
      })
      return
    }

    dispatch({ type: 'setRideOffersLoading', loading: true })
    dispatch({ type: 'setRideFlowError', error: null })

    try {
      const response = await getRideRequestOffers(activeRequestBackendId)
      dispatch({
        type: 'setPassengerRideSnapshot',
        passengerRideRequests: state.passengerRideRequests,
        passengerRideOrders: state.passengerRideOrders,
        activeRideRequest: activeRequest,
        driverOffers: response.items,
        activeRide: state.activeRide,
        activeRideEvents: state.activeRideEvents,
      })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        throw error
      }

      dispatch({
        type: 'setRideFlowError',
        error: error instanceof Error ? error.message : 'Не удалось загрузить предложения.',
      })
    } finally {
      dispatch({ type: 'setRideOffersLoading', loading: false })
    }
  }

  const refreshActiveRideDetails = async (orderId?: string) => {
    const activeRideOrderId = orderId ?? state.activeRide?.id

    if (!activeRideOrderId) return

    dispatch({ type: 'setPassengerOrdersLoading', loading: true })
    dispatch({ type: 'setRideFlowError', error: null })

    try {
      const [detailedOrder, eventsResponse] = await Promise.all([
        getRideOrder(activeRideOrderId),
        getRideOrderEvents(activeRideOrderId),
      ])
      const activeRide = mapOrderToActiveRide(detailedOrder)
      const activeRideEvents = eventsResponse.items
      const isActive = isActiveRideOrderStatus(detailedOrder.status)

      dispatch({
        type: 'setPassengerRideSnapshot',
        passengerRideRequests: state.passengerRideRequests,
        passengerRideOrders: [
          detailedOrder,
          ...state.passengerRideOrders.filter((item) => item.id !== detailedOrder.id),
        ],
        activeRideRequest: state.activeRideRequest,
        driverOffers: state.driverOffers,
        activeRide: isActive ? activeRide : null,
        activeRideEvents,
        currentScreen:
          state.currentScreen === 'passengerActiveRide' && !isActive
            ? 'passengerOrders'
            : state.currentScreen,
      })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setRideFlowError',
        error: error instanceof Error ? error.message : 'Не удалось обновить поездку.',
      })
    } finally {
      dispatch({ type: 'setPassengerOrdersLoading', loading: false })
    }
  }

  useEffect(() => {
    const token = getRideAccessToken()

    if (!token) {
      loadedRideTokenRef.current = null
      return
    }

    if (loadedRideTokenRef.current === token) {
      return
    }

    loadedRideTokenRef.current = token
    void refreshPassengerRideSnapshot()
  }, [state.passengerProfile?.id, state.passengerStatus, state.verifiedPhone])

  const logoutPassengerSession = () => {
    void logoutRideSession()
    clearRideAuthSession()
    loadedRideTokenRef.current = null
    loadedDriverTokenRef.current = null
    driverApplicationIdRef.current = null
    passengerOnboardingDismissedRef.current = false
    dispatch({ type: 'resetPassengerSession' })
  }

  const startPassengerRideSearch = async () => {
    if (state.passengerStatus === 'PHONE_VERIFIED' && !isPassengerProfileComplete(state.passengerProfile)) {
      dispatch({
        type: 'setRideFlowError',
        error: 'Заполните имя и город, чтобы создать заявку.',
      })

      if (!passengerOnboardingDismissedRef.current) {
        dispatch({ type: 'openPassengerOnboarding' })
      }
      return
    }

    const originCityId = state.rideDraft.originCityId
    const destinationCityId = state.rideDraft.destinationCityId
    const originCityName = trimRideLocationText(state.rideDraft.originCityName)
    const destinationCityName = trimRideLocationText(state.rideDraft.destinationCityName)
    const originText = buildRideLocationText(originCityName, state.rideDraft.originAddress)
    const destinationText = buildRideLocationText(destinationCityName, state.rideDraft.destinationAddress)

    if (!originCityId || !originCityName) {
      dispatch({
        type: 'setRideFlowError',
        error: 'Выберите город отправления.',
      })
      return
    }

    if (!destinationCityId || !destinationCityName) {
      dispatch({
        type: 'setRideFlowError',
        error: 'Выберите город прибытия.',
      })
      return
    }

    if (originCityId === destinationCityId) {
      dispatch({
        type: 'setRideFlowError',
        error: 'Город отправления и прибытия должны отличаться.',
      })
      return
    }

    if (!originText || !destinationText) {
      dispatch({
        type: 'setRideFlowError',
        error: 'Проверьте выбранные города и адреса.',
      })
      return
    }

    const requestedPrice = Number(state.rideDraft.price)
    if (!Number.isFinite(requestedPrice) || requestedPrice <= 0) {
      dispatch({
        type: 'setRideFlowError',
        error: 'Укажите цену заявки',
      })
      return
    }

    dispatch({ type: 'setRideRequestLoading', loading: true })
    dispatch({ type: 'setRideFlowError', error: null })

    try {
      await createRideRequest({
        ...buildRideRequestPayload(state.rideDraft),
        requestedPrice,
      })
      await refreshPassengerRideSnapshot()
    } catch (error) {
      if (error instanceof BackendAuthError) {
        logoutPassengerSession()
        return
      }

      if (error instanceof BackendApiError && error.status === 409) {
        await refreshPassengerRideSnapshot().catch(() => null)
        return
      }

      const message =
        error instanceof BackendApiError
          ? 'Не удалось создать заявку. Проверьте данные.'
          : error instanceof Error
            ? error.message
            : 'Не удалось создать заявку.'

      dispatch({
        type: 'setRideFlowError',
        error: message,
      })
    } finally {
      dispatch({ type: 'setRideRequestLoading', loading: false })
    }
  }

  const acceptActiveRideOffer = async (offerId: string) => {
    dispatch({ type: 'setRideActionLoading', loading: true })
    dispatch({ type: 'setRideFlowError', error: null })

    try {
      const acceptedOrder = await acceptRideOffer(offerId)
      const detailedOrder = await getRideOrder(acceptedOrder.id).catch(() => acceptedOrder)
      const activeRide = mapOrderToActiveRide(detailedOrder)
      const activeRideEvents = (await getRideOrderEvents(detailedOrder.id).catch(() => ({ items: [] }))).items

      dispatch({
        type: 'setPassengerRideSnapshot',
        passengerRideRequests: state.passengerRideRequests.map((item) =>
          item.id === state.activeRideRequest?.id
            ? {
                ...item,
                status: 'CONVERTED_TO_ORDER',
                selectedOfferId: offerId,
              }
            : item,
        ),
        passengerRideOrders: [
          detailedOrder,
          ...state.passengerRideOrders.filter((item) => item.id !== detailedOrder.id),
        ],
        activeRideRequest: state.activeRideRequest
          ? {
              ...state.activeRideRequest,
              status: 'CONVERTED_TO_ORDER',
              selectedOfferId: offerId,
            }
          : state.activeRideRequest,
        driverOffers: [],
        activeRide,
        activeRideEvents,
        currentScreen: 'passengerActiveRide',
      })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setRideFlowError',
        error: error instanceof Error ? error.message : 'Не удалось принять предложение.',
      })
    } finally {
      dispatch({ type: 'setRideActionLoading', loading: false })
    }
  }

  const rejectActiveRideOffer = async (offerId: string) => {
    dispatch({ type: 'setRideActionLoading', loading: true })
    dispatch({ type: 'setRideFlowError', error: null })

    try {
      await rejectRideOffer(offerId)
      await loadActiveRequestOffers()
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setRideFlowError',
        error: error instanceof Error ? error.message : 'Не удалось отклонить предложение.',
      })
    } finally {
      dispatch({ type: 'setRideActionLoading', loading: false })
    }
  }

  const cancelPassengerRideRequest = async () => {
    if (!state.activeRideRequest || !isOpenRideRequestStatus(state.activeRideRequest.status)) {
      return
    }

    const activeRequestBackendId = getBackendRideRequestId(state.activeRideRequest)
    if (!activeRequestBackendId) {
      console.warn('[ride] cancelPassengerRideRequest: skipping cancel for non-numeric request id', state.activeRideRequest.id)
      return
    }

    dispatch({ type: 'setRideActionLoading', loading: true })
    dispatch({ type: 'setRideFlowError', error: null })

    try {
      const cancelledRequest = await cancelRideRequest(activeRequestBackendId)

      dispatch({
        type: 'setPassengerRideSnapshot',
        passengerRideRequests: [
          cancelledRequest,
          ...state.passengerRideRequests.filter((item) => item.id !== cancelledRequest.id),
        ],
        passengerRideOrders: [],
        activeRideRequest: null,
        driverOffers: [],
        activeRide: null,
        activeRideEvents: [],
        currentScreen: 'passengerOrder',
        clearCurrentRide: true,
      })

      void refreshPassengerRideSnapshot()
    } catch (error) {
      if (error instanceof BackendAuthError) {
        logoutPassengerSession()
        return
      }

      dispatch({
        type: 'setRideFlowError',
        error: error instanceof Error ? error.message : 'Не удалось отменить заявку.',
      })
    } finally {
      dispatch({ type: 'setRideActionLoading', loading: false })
    }
  }

  const refreshDriverFeed = useCallback(async (force = false) => {
    if (!force && (state.driverVerificationStatus !== 'APPROVED' || !state.driverProfile?.isOnline)) {
      return
    }

    dispatch({ type: 'setDriverFeedLoading', loading: true })
    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      const response = await getDriverFeed()
      dispatch({ type: 'setDriverFeedOrders', orders: response.items })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setDriverFlowError',
        error: error instanceof Error ? error.message : 'Не удалось загрузить ленту водителя.',
      })
    } finally {
      dispatch({ type: 'setDriverFeedLoading', loading: false })
    }
  }, [dispatch, state.driverProfile?.isOnline, state.driverVerificationStatus])

  const refreshDriverWallet = useCallback(async (force = false) => {
    if (!force && state.driverVerificationStatus !== 'APPROVED') {
      return
    }

    dispatch({ type: 'setDriverWalletLoading', loading: true })
    dispatch({ type: 'setDriverWalletError', error: null })

    try {
      const wallet = await getDriverWallet()
      dispatch({
        type: 'setDriverWallet',
        driverWallet: mapWalletResponseToState(wallet),
      })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setDriverWalletError',
        error: error instanceof Error ? error.message : 'Не удалось загрузить wallet.',
      })
    } finally {
      dispatch({ type: 'setDriverWalletLoading', loading: false })
    }
  }, [dispatch, state.driverVerificationStatus])

  const refreshDriverWalletTransactions = useCallback(async (force = false) => {
    if (!force && state.driverVerificationStatus !== 'APPROVED') {
      return
    }

    dispatch({ type: 'setDriverWalletLoading', loading: true })
    dispatch({ type: 'setDriverWalletError', error: null })

    try {
      const response = await getDriverWalletTransactions({ take: 20, skip: 0 })
      const transactions = response.items.map(mapWalletTransactionResponseToState)

      dispatch({
        type: 'setDriverWalletTransactions',
        driverWalletTransactions: transactions,
      })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setDriverWalletError',
        error: error instanceof Error ? error.message : 'Не удалось загрузить transactions.',
      })
    } finally {
      dispatch({ type: 'setDriverWalletLoading', loading: false })
    }
  }, [dispatch, state.driverVerificationStatus])

  const refreshDriverTopUpRequests = useCallback(async (force = false) => {
    if (!force && state.driverVerificationStatus !== 'APPROVED') {
      return
    }

    dispatch({ type: 'setDriverWalletLoading', loading: true })
    dispatch({ type: 'setDriverWalletError', error: null })

    try {
      const response = await getDriverTopUpRequests({ take: 20, skip: 0 })
      const topUpRequests = response.items.map(mapTopUpRequestResponseToState)

      dispatch({
        type: 'setDriverTopUpRequests',
        driverTopUpRequests: topUpRequests,
      })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setDriverWalletError',
        error: error instanceof Error ? error.message : 'Не удалось загрузить top-up requests.',
      })
    } finally {
      dispatch({ type: 'setDriverWalletLoading', loading: false })
    }
  }, [dispatch, state.driverVerificationStatus])

  const refreshPassengerReviewSummary = useCallback(async () => {
    const token = getRideAccessToken()
    if (!token) return

    try {
      const summary = await getPassengerReviewSummary()
      dispatch({ type: 'setPassengerReviewSummary', passengerReviewSummary: summary })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
      }
    }
  }, [dispatch])

  const refreshDriverReviewSummary = useCallback(async () => {
    if (state.driverVerificationStatus !== 'APPROVED') return

    try {
      const summary = await getDriverReviewSummary()
      dispatch({ type: 'setDriverReviewSummary', driverReviewSummary: summary })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
      }
    }
  }, [dispatch, state.driverVerificationStatus])

  const refreshPassengerReviews = useCallback(async () => {
    const token = getRideAccessToken()
    if (!token) return

    try {
      const response = await getPassengerReviews({ take: 10, skip: 0 })
      dispatch({
        type: 'setPassengerReviews',
        passengerReviews: response.items.map(mapReviewResponseToState),
      })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
      }
    }
  }, [dispatch])

  const refreshDriverReviews = useCallback(async () => {
    if (state.driverVerificationStatus !== 'APPROVED') return

    try {
      const response = await getDriverReviews({ take: 10, skip: 0 })
      dispatch({
        type: 'setDriverReviews',
        driverReviews: response.items.map(mapReviewResponseToState),
      })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
      }
    }
  }, [dispatch, state.driverVerificationStatus])

  const refreshPassengerComplaints = useCallback(async () => {
    const token = getRideAccessToken()
    if (!token) return

    try {
      const response = await getPassengerComplaints({ take: 10, skip: 0 })
      dispatch({
        type: 'setPassengerComplaints',
        passengerComplaints: response.items.map(mapComplaintResponseToState),
      })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
      }
    }
  }, [dispatch])

  const refreshDriverComplaints = useCallback(async () => {
    if (state.driverVerificationStatus !== 'APPROVED') return

    try {
      const response = await getDriverComplaints({ take: 10, skip: 0 })
      dispatch({
        type: 'setDriverComplaints',
        driverComplaints: response.items.map(mapComplaintResponseToState),
      })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
      }
    }
  }, [dispatch, state.driverVerificationStatus])

  const refreshOrderReviews = useCallback(async (orderId: string) => {
    try {
      const response = await getRideOrderReviews(orderId)
      dispatch({
        type: 'setOrderReviews',
        orderReviews: response.items.map(mapReviewResponseToState),
      })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
      }
    }
  }, [dispatch])

  const refreshOrderComplaints = useCallback(async (orderId: string) => {
    try {
      const response = await getRideOrderComplaints(orderId)
      dispatch({
        type: 'setOrderComplaints',
        orderComplaints: response.items.map(mapComplaintResponseToState),
      })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
      }
    }
  }, [dispatch])

  useEffect(() => {
    if (!state.passengerProfile?.id) return

    void Promise.all([
      refreshPassengerReviewSummary(),
      refreshPassengerReviews(),
      refreshPassengerComplaints(),
    ])
  }, [
    refreshPassengerComplaints,
    refreshPassengerReviewSummary,
    refreshPassengerReviews,
    state.passengerProfile?.id,
  ])

  useEffect(() => {
    if (state.role !== 'driver' || state.driverVerificationStatus !== 'APPROVED') return

    void Promise.all([
      refreshDriverReviewSummary(),
      refreshDriverReviews(),
      refreshDriverComplaints(),
    ])
  }, [
    refreshDriverComplaints,
    refreshDriverReviewSummary,
    refreshDriverReviews,
    state.driverVerificationStatus,
    state.role,
  ])

  const refreshDriverOffers = useCallback(async (force = false) => {
    if (!force && state.driverVerificationStatus !== 'APPROVED') {
      return
    }

    try {
      const response = await getDriverOffers()
      dispatch({ type: 'setDriverCounterOffers', offers: response.items })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setDriverFlowError',
        error: error instanceof Error ? error.message : 'Не удалось загрузить предложения водителя.',
      })
    }
  }, [dispatch, state.driverVerificationStatus])

  const refreshDriverOrders = useCallback(async (force = false) => {
    if (!force && state.driverVerificationStatus !== 'APPROVED') {
      return
    }

    try {
      const [ordersResponse, activeOrderResponse] = await Promise.all([
        getDriverOrders(),
        getActiveDriverOrder().catch(() => null),
      ])

      const activeOrder =
        activeOrderResponse &&
        activeOrderResponse.status !== 'COMPLETED' &&
        activeOrderResponse.status !== 'CANCELLED'
          ? activeOrderResponse
          : null

      dispatch({ type: 'setDriverOrders', orders: ordersResponse.items })
      dispatch({ type: 'setDriverActiveOrder', order: activeOrder })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setDriverFlowError',
        error: error instanceof Error ? error.message : 'Не удалось загрузить заказы водителя.',
      })
    }
  }, [dispatch, state.driverVerificationStatus])

  const refreshDriverSnapshot = useCallback(async (screenOverride?: AppScreen) => {
    const token = getRideAccessToken()

    if (!token) {
      loadedDriverTokenRef.current = null
      return
    }

    try {
      const me = await getDriverMe()
      const currentApplication = me.currentApplication ?? me.application ?? null
      driverApplicationIdRef.current = me.applicationId ?? currentApplication?.id ?? null
      let activeRecheck = me.activeRecheck ?? null
      if (activeRecheck && !activeRecheck.id) {
        activeRecheck = await getActiveDriverRecheck().catch(() => null)
      }

      const verificationStatus =
        me.verificationStatus === 'NOT_STARTED' && state.driverVerificationStatus === 'DRAFT'
          ? 'DRAFT'
          : me.verificationStatus

      dispatch({
        type: 'setDriverSnapshot',
        driverVerificationStatus: verificationStatus,
        driverProfile: me.profile
          ? {
              ...me.profile,
              verificationStatus: me.profile.verificationStatus ?? verificationStatus,
              isOnline: me.isOnline,
              blockedReason: me.profile.blockedReason?.trim() || me.wallet?.blockedReason?.trim() || me.profile.blockedReason,
            }
          : state.driverProfile,
        driverApplicationDraft: currentApplication ? { ...state.driverApplicationDraft, ...currentApplication } : state.driverApplicationDraft,
        activeRecheck,
        driverFeedOrders: state.driverFeedOrders,
        driverOrders: state.driverOrders,
        driverCounterOffers: state.driverCounterOffers,
        driverActiveOrder: state.driverActiveOrder,
        currentScreen:
          verificationStatus === 'PENDING_REVIEW'
            ? 'driverDashboard'
            : screenOverride ?? state.currentScreen,
      })

      if (me.wallet) {
        const walletTransactions = Array.isArray(me.wallet.transactions)
          ? me.wallet.transactions.map(mapWalletTransactionResponseToState)
          : state.driverWallet.transactions
        const topUpRequests = Array.isArray(me.wallet.topUpRequests)
          ? me.wallet.topUpRequests.map(mapTopUpRequestResponseToState)
          : state.driverWallet.topUpRequests

        dispatch({
          type: 'setDriverWalletSnapshot',
          driverWallet: syncDriverWalletAccessState({
            balance: me.wallet.balance ?? 0,
            minBalance: me.wallet.minimumBalance ?? 0,
            currency: me.wallet.currency ?? 'KZT',
            canGoOnline: !me.wallet.isBlocked,
            missingAmount: 0,
            isBlocked: me.wallet.isBlocked ?? false,
            blockedReason: me.wallet.blockedReason ?? '',
            transactions: walletTransactions,
            topUpRequests,
            chargedOrderIds: state.driverWallet.chargedOrderIds,
          }),
          driverWalletTransactions: walletTransactions,
          driverTopUpRequests: topUpRequests,
        })
      }

      if (verificationStatus === 'APPROVED') {
        await Promise.all([
          refreshDriverWallet(true),
          refreshDriverWalletTransactions(true),
          refreshDriverTopUpRequests(true),
          refreshDriverReviewSummary(),
          refreshDriverReviews(),
          refreshDriverComplaints(),
          refreshDriverFeed(true),
          refreshDriverOffers(true),
          refreshDriverOrders(true),
        ])
      }
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setDriverFlowError',
        error: error instanceof Error ? error.message : 'Не удалось загрузить driver state.',
      })
    }
  }, [
    dispatch,
    refreshDriverFeed,
    refreshDriverOffers,
    refreshDriverOrders,
    state.currentScreen,
    state.driverActiveOrder,
    state.driverApplicationDraft,
    state.driverCounterOffers,
    state.driverFeedOrders,
    state.driverOrders,
    state.driverProfile,
    state.driverWallet,
    state.driverVerificationStatus,
    refreshDriverTopUpRequests,
    refreshDriverWallet,
    refreshDriverWalletTransactions,
    refreshDriverReviewSummary,
    refreshDriverReviews,
    refreshDriverComplaints,
  ])

  const refreshAuthenticatedSession = async (
    phone?: string,
    flow: PassengerFlow = 'login',
  ) => {
    const token = getRideAccessToken()
    if (!token) return { passengerProfile: null, driverProfile: null }

    passengerOnboardingDismissedRef.current = false
    dispatch({ type: 'resetPassengerSession' })

    let passengerProfile: PassengerProfile | null = null
    let driverProfile: DriverProfile | null = null

    try {
      const me = await getPassengerMe()
      passengerProfile = toRidePassengerProfile(me, phone || state.verifiedPhone || '')
      dispatch({ type: 'setPassengerProfile', profile: passengerProfile })
      if (passengerProfile.phone) {
        dispatch({ type: 'setVerifiedPhone', phone: passengerProfile.phone })
      }
    } catch {
      // Best effort: passenger profile may be absent for driver login-only flow.
    }

    const driverMe = await getDriverMe().catch(() => null)

    if (driverMe) {
      const currentApplication = driverMe.currentApplication ?? driverMe.application ?? null
      driverApplicationIdRef.current = driverMe.applicationId ?? currentApplication?.id ?? null
      let activeRecheck = driverMe.activeRecheck ?? null
      if (activeRecheck && !activeRecheck.id) {
        activeRecheck = await getActiveDriverRecheck().catch(() => null)
      }

      const verificationStatus =
        driverMe.verificationStatus === 'NOT_STARTED' && state.driverVerificationStatus === 'DRAFT'
          ? 'DRAFT'
          : driverMe.verificationStatus

      driverProfile = driverMe.profile
        ? {
            ...driverMe.profile,
            verificationStatus,
            isOnline: driverMe.isOnline,
          }
        : null

      dispatch({
        type: 'setDriverSnapshot',
        driverVerificationStatus: verificationStatus,
        driverProfile,
        driverApplicationDraft: currentApplication ? { ...state.driverApplicationDraft, ...currentApplication } : state.driverApplicationDraft,
        activeRecheck,
        driverFeedOrders: state.driverFeedOrders,
        driverOrders: state.driverOrders,
        driverCounterOffers: state.driverCounterOffers,
        driverActiveOrder: state.driverActiveOrder,
        currentScreen:
          verificationStatus === 'PENDING_REVIEW'
            ? 'driverDashboard'
            : state.currentScreen,
      })

      if (verificationStatus === 'APPROVED') {
        await Promise.all([
          refreshDriverWallet(true),
          refreshDriverWalletTransactions(true),
          refreshDriverTopUpRequests(true),
          refreshDriverReviewSummary(),
          refreshDriverReviews(),
          refreshDriverComplaints(),
          refreshDriverFeed(true),
          refreshDriverOffers(true),
          refreshDriverOrders(true),
        ])
      }
    }

    if (flow === 'login' && driverMe) {
      dispatch({
        type: 'setRole',
        role: 'driver',
        screen: driverMe.verificationStatus === 'PENDING_REVIEW' ? 'driverDashboard' : 'driverProfile',
      })
    } else if (flow === 'login' && passengerProfile) {
      dispatch({ type: 'setRole', role: 'passenger', screen: 'passengerProfile' })
    }

    return { passengerProfile, driverProfile }
  }

  useEffect(() => {
    if (didHydrateRef.current) return
    didHydrateRef.current = true

    const token = getRideAccessToken()

    if (token) {
      void refreshAuthenticatedSession(undefined, 'login')
      return
    }

    void refreshRideSession()
      .then(() => refreshAuthenticatedSession(undefined, 'login'))
      .catch(() => {
        // No active auth session. Stay guest.
      })
    // Mount-only hydrate; auth refresh is intentionally run once.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  const saveDriverApplication = async () => {
    const application = state.driverApplicationDraft
    const shouldUpdate =
      Boolean(driverApplicationIdRef.current) &&
      (state.driverVerificationStatus === 'NEEDS_CHANGES' ||
        (state.driverVerificationStatus === 'DRAFT' && !state.driverApplicationDraft.submittedAt))

    if (shouldUpdate) {
      await updateDriverApplication(application)
      return
    }

    const created = await createDriverApplication(application)
    driverApplicationIdRef.current = created.applicationId ?? created.application?.id ?? null
  }

  const submitDriverApplicationAction = async () => {
    dispatch({ type: 'setDriverActionLoading', loading: true })
    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      if (
        state.driverVerificationStatus !== 'DRAFT' &&
        state.driverVerificationStatus !== 'NEEDS_CHANGES'
      ) {
        await refreshDriverSnapshot('driverDashboard')
        return
      }

      await saveDriverApplication()
      if (!hasRealDriverApplicationDocuments(state.driverApplicationDraft.documents)) {
        dispatch({
          type: 'setDriverFlowError',
          error: 'Для отправки заявки загрузите документы',
        })
        return
      }

      const submitted = await submitDriverApplicationApi()
      driverApplicationIdRef.current = submitted.applicationId ?? submitted.application?.id ?? driverApplicationIdRef.current

      dispatch({
        type: 'setDriverSnapshot',
        driverVerificationStatus: submitted.verificationStatus,
        driverProfile: submitted.profile ?? state.driverProfile,
        driverApplicationDraft: submitted.application ? { ...state.driverApplicationDraft, ...submitted.application } : state.driverApplicationDraft,
        activeRecheck: state.activeRecheck,
        driverFeedOrders: state.driverFeedOrders,
        driverOrders: state.driverOrders,
        driverCounterOffers: state.driverCounterOffers,
        driverActiveOrder: state.driverActiveOrder,
        currentScreen: 'driverDashboard',
      })

      await refreshDriverSnapshot('driverDashboard')
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      if (error instanceof BackendApiError && /pending review/i.test(error.message)) {
        dispatch({ type: 'setDriverFlowError', error: null })
        await refreshDriverSnapshot('driverDashboard')
        return
      }

      dispatch({
        type: 'setDriverFlowError',
        error: error instanceof Error ? error.message : 'Не удалось отправить заявку водителя.',
      })
    } finally {
      dispatch({ type: 'setDriverActionLoading', loading: false })
    }
  }

  const toggleDriverOnlineStatusAction = async () => {
    if (!state.driverProfile) return
    if (state.driverVerificationStatus !== 'APPROVED') {
      dispatch({
        type: 'setDriverFlowError',
        error: 'Профиль водителя заблокирован или недоступен.',
      })
      return
    }

    const nextOnline = !state.driverProfile.isOnline
    if (nextOnline && !canDriverGoOnline(state.driverWallet)) {
      dispatch({
        type: 'setDriverFlowError',
        error: `Пополните баланс минимум до ${formatKzt(state.driverWallet.minBalance)} чтобы выйти на линию.`,
      })
      return
    }

    dispatch({ type: 'setDriverActionLoading', loading: true })
    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      const result = await setDriverOnlineApi(nextOnline)
      dispatch({
        type: 'setDriverSnapshot',
        driverVerificationStatus: result.verificationStatus,
        driverProfile: result.profile ?? state.driverProfile,
        driverApplicationDraft: result.application ?? state.driverApplicationDraft,
        activeRecheck: state.activeRecheck,
        driverFeedOrders: state.driverFeedOrders,
        driverOrders: state.driverOrders,
        driverCounterOffers: state.driverCounterOffers,
        driverActiveOrder: state.driverActiveOrder,
        currentScreen: state.currentScreen,
      })

      if (result.isOnline) {
        void refreshDriverFeed(true)
      }
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setDriverFlowError',
        error: error instanceof Error ? error.message : 'Не удалось обновить online статус.',
      })
    } finally {
      dispatch({ type: 'setDriverActionLoading', loading: false })
    }
  }

  const setDriverOnlineAction = async (online: boolean) => {
    if (!state.driverProfile) return
    if (state.driverVerificationStatus !== 'APPROVED') {
      dispatch({
        type: 'setDriverFlowError',
        error: 'Профиль водителя заблокирован или недоступен.',
      })
      return
    }
    if (state.driverProfile.isOnline === online) return
    if (online && !canDriverGoOnline(state.driverWallet)) {
      dispatch({
        type: 'setDriverFlowError',
        error: `Пополните баланс минимум до ${formatKzt(state.driverWallet.minBalance)} чтобы выйти на линию.`,
      })
      return
    }

    dispatch({ type: 'setDriverActionLoading', loading: true })
    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      const result = await setDriverOnlineApi(online)
      dispatch({
        type: 'setDriverSnapshot',
        driverVerificationStatus: result.verificationStatus,
        driverProfile: result.profile ?? state.driverProfile,
        driverApplicationDraft: result.application ?? state.driverApplicationDraft,
        activeRecheck: state.activeRecheck,
        driverFeedOrders: state.driverFeedOrders,
        driverOrders: state.driverOrders,
        driverCounterOffers: state.driverCounterOffers,
        driverActiveOrder: state.driverActiveOrder,
        currentScreen: state.currentScreen,
      })

      if (result.isOnline) {
        void refreshDriverFeed(true)
      }
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setDriverFlowError',
        error: error instanceof Error ? error.message : 'Не удалось обновить online статус.',
      })
    } finally {
      dispatch({ type: 'setDriverActionLoading', loading: false })
    }
  }

  const createDriverTopUpRequestAction = async (payload: {
    amount: number
    method: TopUpRequestMethod
    providerRef?: string
    comment?: string
  }): Promise<TopUpRequest> => {
    if (state.driverVerificationStatus !== 'APPROVED') {
      throw new Error('Профиль водителя недоступен.')
    }

    dispatch({ type: 'setDriverTopUpSubmitting', loading: true })
    dispatch({ type: 'setDriverWalletError', error: null })

    try {
      const created = await createDriverTopUpRequestApi(payload)
      const request = mapTopUpRequestResponseToState(created)

      dispatch({
        type: 'setDriverTopUpRequests',
        driverTopUpRequests: [request, ...state.driverTopUpRequests.filter((item) => item.id !== request.id)],
      })

      await Promise.all([
        refreshDriverWallet(true),
        refreshDriverTopUpRequests(true),
      ])

      return request
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        throw error
      }

      dispatch({
        type: 'setDriverWalletError',
        error: error instanceof Error ? error.message : 'Не удалось создать заявку на пополнение.',
      })
      throw error
    } finally {
      dispatch({ type: 'setDriverTopUpSubmitting', loading: false })
    }
  }

  const uploadTopUpReceiptAction = async (topUpRequestId: number, file: File): Promise<TopUpRequest> => {
    if (state.driverVerificationStatus !== 'APPROVED') {
      throw new Error('Профиль водителя недоступен.')
    }

    dispatch({ type: 'setDriverTopUpSubmitting', loading: true })
    dispatch({ type: 'setDriverWalletError', error: null })

    try {
      const uploaded = await uploadTopUpReceiptApi(topUpRequestId, file)
      const request = mapTopUpRequestResponseToState(uploaded)

      dispatch({
        type: 'setDriverTopUpRequests',
        driverTopUpRequests: [request, ...state.driverTopUpRequests.filter((item) => item.id !== request.id)],
      })

      await Promise.all([
        refreshDriverWallet(true),
        refreshDriverTopUpRequests(true),
      ])

      return request
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        throw error
      }
      throw error
    } finally {
      dispatch({ type: 'setDriverTopUpSubmitting', loading: false })
    }
  }

  const cancelTopUpRequestAction = async (topUpRequestId: number): Promise<TopUpRequest> => {
    if (state.driverVerificationStatus !== 'APPROVED') {
      throw new Error('Профиль водителя недоступен.')
    }

    dispatch({ type: 'setDriverTopUpSubmitting', loading: true })
    dispatch({ type: 'setDriverWalletError', error: null })

    try {
      const cancelled = await cancelTopUpRequestApi(topUpRequestId)
      const request = mapTopUpRequestResponseToState(cancelled)

      dispatch({
        type: 'setDriverTopUpRequests',
        driverTopUpRequests: [request, ...state.driverTopUpRequests.filter((item) => item.id !== request.id)],
      })

      await Promise.all([
        refreshDriverWallet(true),
        refreshDriverTopUpRequests(true),
      ])

      return request
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        throw error
      }

      dispatch({
        type: 'setDriverWalletError',
        error: error instanceof Error ? error.message : 'Не удалось отменить заявку.',
      })
      throw error
    } finally {
      dispatch({ type: 'setDriverTopUpSubmitting', loading: false })
    }
  }

  const createOrderReviewAction = async (
    orderId: string,
    payload: CreateRideReviewPayload,
  ) => {
    dispatch({ type: 'setRideReviewSubmitting', loading: true })
    dispatch({ type: 'setRideSafetyError', error: null })

    try {
      await createRideOrderReviewApi(orderId, payload)

      if (state.activeRide?.id === orderId && state.activeRideRequest) {
        const completedHistory: PassengerHistoryItem = {
          id: makeId('hist'),
          category: 'ride',
          from: state.activeRideRequest.from,
          to: state.activeRideRequest.to,
          date: state.activeRideRequest.date,
          price: state.activeRide?.price ?? state.activeRideRequest.price,
          status: 'completed',
          driverName: state.activeRide?.driverName,
        }
        dispatch({
          type: 'completePassengerRideAfterReview',
          history: completedHistory,
        })
      }

      dispatch({ type: 'closePassengerRating' })

      await Promise.all([
        refreshOrderReviews(orderId),
        state.activeRide ? refreshPassengerReviewSummary().then(() => refreshPassengerReviews()) : Promise.resolve(),
        state.driverActiveOrder ? refreshDriverReviewSummary().then(() => refreshDriverReviews()) : Promise.resolve(),
      ])
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setRideSafetyError',
        error: error instanceof Error ? error.message : 'Не удалось сохранить отзыв.',
      })
      throw error
    } finally {
      dispatch({ type: 'setRideReviewSubmitting', loading: false })
    }
  }

  const createOrderComplaintAction = async (
    orderId: string,
    payload: CreateRideComplaintPayload,
  ) => {
    dispatch({ type: 'setRideComplaintSubmitting', loading: true })
    dispatch({ type: 'setRideSafetyError', error: null })

    try {
      const complaint = await createRideOrderComplaintApi(orderId, payload)
      dispatch({
        type: 'setOrderComplaints',
        orderComplaints: [mapComplaintResponseToState(complaint), ...state.orderComplaints.filter((item) => item.id !== complaint.id)],
      })

      await Promise.all([
        refreshOrderComplaints(orderId),
        state.role === 'driver' ? refreshDriverComplaints() : refreshPassengerComplaints(),
      ])

      dispatch({ type: 'closeRideComplaintSheet' })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setRideSafetyError',
        error: error instanceof Error ? error.message : 'Не удалось отправить complaint.',
      })
      throw error
    } finally {
      dispatch({ type: 'setRideComplaintSubmitting', loading: false })
    }
  }

  const acceptDriverFeedOrderAction = async (orderId: string) => {
    if (state.driverActiveOrder || !canAccessDriverOrders(state)) return

    dispatch({ type: 'setDriverActionLoading', loading: true })
    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      await acceptRideRequestPrice(orderId)
      const activeOrder = await getActiveDriverOrder().catch(() => null)
      dispatch({
        type: 'setDriverFeedOrders',
        orders: state.driverFeedOrders.filter((item) => item.id !== orderId),
      })
      dispatch({
        type: 'setDriverActiveOrder',
        order: activeOrder,
        currentScreen: 'driverOrders',
      })

      void refreshDriverFeed(true)
      void refreshDriverOffers(true)
      void refreshDriverOrders(true)
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setDriverFlowError',
        error: error instanceof Error ? error.message : 'Не удалось принять заказ.',
      })
    } finally {
      dispatch({ type: 'setDriverActionLoading', loading: false })
    }
  }

  const sendDriverCounterOfferAction = async (price: number, comment: string) => {
    if (!state.driverCounterOfferOrderId || !canAccessDriverOrders(state) || state.driverActiveOrder) return

    dispatch({ type: 'setDriverActionLoading', loading: true })
    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      const offer = await counterOfferRideRequest(state.driverCounterOfferOrderId, {
        price,
        comment,
      })

      dispatch({
        type: 'setDriverFeedOrders',
        orders: state.driverFeedOrders.map((item) =>
          item.id === state.driverCounterOfferOrderId ? { ...item, status: 'offered' } : item,
        ),
      })
      dispatch({
        type: 'setDriverCounterOffers',
        offers: [
          ...state.driverCounterOffers.filter((item) => item.orderId !== state.driverCounterOfferOrderId),
          offer,
        ],
      })

      void refreshDriverFeed(true)
      void refreshDriverOffers(true)
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setDriverFlowError',
        error: error instanceof Error ? error.message : 'Не удалось отправить counter offer.',
      })
    } finally {
      dispatch({ type: 'setDriverActionLoading', loading: false })
    }
  }

  const withdrawDriverOfferAction = async (offerId: string) => {
    dispatch({ type: 'setDriverActionLoading', loading: true })
    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      await withdrawDriverOfferApi(offerId)
      dispatch({
        type: 'setDriverCounterOffers',
        offers: state.driverCounterOffers.filter((item) => item.id !== offerId),
      })

      void refreshDriverFeed(true)
      void refreshDriverOffers(true)
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setDriverFlowError',
        error: error instanceof Error ? error.message : 'Не удалось отозвать предложение.',
      })
    } finally {
      dispatch({ type: 'setDriverActionLoading', loading: false })
    }
  }

  const driverOrderNextStatusAction = async () => {
    if (!state.driverActiveOrder) return

    const nextStatus =
      state.driverActiveOrder.status === 'DRIVER_ASSIGNED'
        ? 'DRIVER_ON_WAY'
        : state.driverActiveOrder.status === 'DRIVER_ON_WAY'
          ? 'DRIVER_ARRIVED'
          : state.driverActiveOrder.status === 'DRIVER_ARRIVED'
            ? 'IN_PROGRESS'
            : state.driverActiveOrder.status === 'IN_PROGRESS'
              ? 'COMPLETED'
              : null

    if (!nextStatus) return

    dispatch({ type: 'setDriverActionLoading', loading: true })
    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      const updated = await updateDriverOrderStatus(state.driverActiveOrder.id, {
        status: nextStatus,
      })

      dispatch({
        type: 'setDriverOrders',
        orders: state.driverOrders.map((item) =>
          item.id === state.driverActiveOrder?.id ? updated : item,
        ),
      })
      dispatch({ type: 'setDriverActiveOrder', order: updated })

      void refreshDriverOrders(true)
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setDriverFlowError',
        error: error instanceof Error ? error.message : 'Не удалось обновить статус заказа.',
      })
    } finally {
      dispatch({ type: 'setDriverActionLoading', loading: false })
    }
  }

  const cancelDriverActiveOrderAction = async () => {
    if (!state.driverActiveOrder) return

    dispatch({ type: 'setDriverActionLoading', loading: true })
    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      const updated = await updateDriverOrderStatus(state.driverActiveOrder.id, {
        status: 'CANCELLED',
      })

      dispatch({
        type: 'setDriverOrders',
        orders: state.driverOrders.map((item) =>
          item.id === state.driverActiveOrder?.id ? updated : item,
        ),
      })
      dispatch({ type: 'setDriverActiveOrder', order: updated })

      void refreshDriverOrders(true)
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setDriverFlowError',
        error: error instanceof Error ? error.message : 'Не удалось отменить заказ.',
      })
    } finally {
      dispatch({ type: 'setDriverActionLoading', loading: false })
    }
  }

  useEffect(() => {
    const token = getRideAccessToken()

    if (!token || state.role !== 'driver') {
      loadedDriverTokenRef.current = null
      driverApplicationIdRef.current = null
      return
    }

    if (loadedDriverTokenRef.current === token) {
      return
    }

    loadedDriverTokenRef.current = token
    void refreshDriverSnapshot()
  }, [state.role, refreshDriverSnapshot])

  useEffect(() => {
    if (state.role !== 'driver') return

    const refetchDriverSnapshot = () => {
      void refreshDriverSnapshot()
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshDriverSnapshot()
      }
    }

    window.addEventListener('focus', refetchDriverSnapshot)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', refetchDriverSnapshot)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [state.role, refreshDriverSnapshot])

  useEffect(() => {
    if (state.role !== 'driver' || state.driverVerificationStatus !== 'APPROVED') {
      return
    }

    void refreshDriverOffers(true)
    void refreshDriverOrders(true)

    if (state.driverProfile?.isOnline) {
      void refreshDriverFeed(true)
    }

    const feedInterval = state.driverProfile?.isOnline
      ? window.setInterval(() => {
          void refreshDriverFeed(true)
        }, 8000)
      : null

    const ordersInterval = state.driverActiveOrder
      ? window.setInterval(() => {
          void refreshDriverOrders(true)
        }, 12000)
      : null

    return () => {
      if (feedInterval) window.clearInterval(feedInterval)
      if (ordersInterval) window.clearInterval(ordersInterval)
    }
  }, [
    state.role,
    state.driverVerificationStatus,
    state.driverProfile?.isOnline,
    state.driverActiveOrder?.id,
    state.driverActiveOrder,
    refreshDriverFeed,
    refreshDriverOffers,
    refreshDriverOrders,
  ])

  const value: AppContextValue = {
    state,
    actions: {
      openMenu: () => dispatch({ type: 'openMenu' }),
      closeMenu: () => dispatch({ type: 'closeMenu' }),
      toggleMenu: () => dispatch({ type: 'toggleMenu' }),
      setScreen: (screen) => dispatch({ type: 'setScreen', screen }),
      setRole: (role, screen = defaultScreenByRole[role]) =>
        dispatch({ type: 'setRole', role, screen }),
      setPassengerStatus: (status) =>
        dispatch({ type: 'setPassengerStatus', status }),
      logout: logoutPassengerSession,
      setDriverVerificationStatus: (status) =>
        dispatch({ type: 'setDriverVerificationStatus', status }),
      setPendingPassengerFlow: (flow) =>
        dispatch({ type: 'setPendingPassengerFlow', flow }),
      refreshPassengerRideSnapshot: () => refreshPassengerRideSnapshot(),
      refreshDriverSnapshot: () => refreshDriverSnapshot(),
      refreshDriverWallet: () => refreshDriverWallet(),
      refreshDriverWalletTransactions: () => refreshDriverWalletTransactions(),
      refreshDriverTopUpRequests: () => refreshDriverTopUpRequests(),
      refreshPassengerReviewSummary: () => refreshPassengerReviewSummary(),
      refreshDriverReviewSummary: () => refreshDriverReviewSummary(),
      refreshPassengerReviews: () => refreshPassengerReviews(),
      refreshDriverReviews: () => refreshDriverReviews(),
      refreshPassengerComplaints: () => refreshPassengerComplaints(),
      refreshDriverComplaints: () => refreshDriverComplaints(),
      refreshOrderReviews: (orderId) => refreshOrderReviews(orderId),
      refreshOrderComplaints: (orderId) => refreshOrderComplaints(orderId),
      refreshDriverFeed: () => refreshDriverFeed(),
      refreshDriverOffers: () => refreshDriverOffers(),
      refreshDriverOrders: () => refreshDriverOrders(),
      startDriverRegistration: () => dispatch({ type: 'startDriverRegistration' }),
      updateDriverApplicationField: (field, value) =>
        dispatch({ type: 'updateDriverApplicationField', field, value }),
      uploadDriverDocumentMock: (documentType, filePath) =>
        dispatch({ type: 'uploadDriverDocumentMock', documentType, filePath }),
      nextDriverRegistrationStep: () =>
        dispatch({ type: 'nextDriverRegistrationStep' }),
      prevDriverRegistrationStep: () =>
        dispatch({ type: 'prevDriverRegistrationStep' }),
      submitDriverApplication: () => submitDriverApplicationAction(),
      demoApproveDriver: () => dispatch({ type: 'demoApproveDriver' }),
      demoRequestDriverChanges: (comment) =>
        dispatch({ type: 'demoRequestDriverChanges', comment }),
      demoBlockDriver: (comment) => dispatch({ type: 'demoBlockDriver', comment }),
      returnToPassengerMode: () => dispatch({ type: 'returnToPassengerMode' }),
      editDriverApplicationAfterChanges: () =>
        dispatch({ type: 'editDriverApplicationAfterChanges' }),
      toggleDriverOnlineStatus: () => toggleDriverOnlineStatusAction(),
      setDriverOnline: (online) => setDriverOnlineAction(online),
      openTopUpForm: () => dispatch({ type: 'openTopUpForm' }),
      closeTopUpForm: () => dispatch({ type: 'closeTopUpForm' }),
      updateTopUpForm: (patch) => dispatch({ type: 'updateTopUpForm', patch }),
      openRideComplaintSheet: (orderId) =>
        dispatch({ type: 'openRideComplaintSheet', orderId }),
      closeRideComplaintSheet: () => dispatch({ type: 'closeRideComplaintSheet' }),
      updateRideComplaintForm: (patch) =>
        dispatch({ type: 'updateRideComplaintForm', patch }),
      submitTopUpRequest: async () => {
        const request = await createDriverTopUpRequestAction({
          amount: Number(state.topUpForm.amount),
          method: state.topUpForm.method,
          providerRef: state.topUpForm.providerRef.trim() || undefined,
          comment: state.topUpForm.comment.trim() || undefined,
        })

        const requestId = Number(request.id)
        if (!Number.isFinite(requestId) || requestId <= 0) {
          throw new Error('Заявка создана, но не удалось определить её номер для загрузки чека.')
        }

        if (!state.topUpForm.receiptFile) {
          return {
            request,
            requestId,
            receiptUploaded: false,
          }
        }

        try {
          await uploadTopUpReceiptAction(requestId, state.topUpForm.receiptFile)
          return {
            request,
            requestId,
            receiptUploaded: true,
          }
        } catch (error) {
          return {
            request,
            requestId,
            receiptUploaded: false,
            receiptUploadError: error instanceof Error ? error.message : 'Не удалось загрузить чек.',
          }
        }
      },
      createDriverTopUpRequest: (payload) => createDriverTopUpRequestAction(payload),
      uploadTopUpReceipt: (topUpRequestId, file) => uploadTopUpReceiptAction(topUpRequestId, file),
      cancelTopUpRequest: (topUpRequestId) => cancelTopUpRequestAction(topUpRequestId),
      createOrderReview: (orderId, payload) => createOrderReviewAction(orderId, payload),
      createOrderComplaint: (orderId, payload) => createOrderComplaintAction(orderId, payload),
      demoApproveTopUpRequest: (requestId) =>
        dispatch({ type: 'demoApproveTopUpRequest', requestId }),
      demoRejectTopUpRequest: (requestId) =>
        dispatch({ type: 'demoRejectTopUpRequest', requestId }),
      chargeCommissionForCompletedOrder: (orderId) =>
        dispatch({ type: 'chargeCommissionForCompletedOrder', orderId }),
      refundCommissionDemo: (orderId) =>
        dispatch({ type: 'refundCommissionDemo', orderId }),
      blockDriverOrdersIfLowBalance: () =>
        dispatch({ type: 'blockDriverOrdersIfLowBalance' }),
      openDriverCounterOfferSheet: (orderId) =>
        dispatch({ type: 'openDriverCounterOfferSheet', orderId }),
      closeDriverCounterOfferSheet: () =>
        dispatch({ type: 'closeDriverCounterOfferSheet' }),
      sendDriverCounterOffer: (price, comment) =>
        sendDriverCounterOfferAction(price, comment),
      acceptDemoCounterOfferAsPassenger: (orderId) =>
        dispatch({ type: 'acceptDemoCounterOfferAsPassenger', orderId }),
      acceptDriverFeedOrder: (orderId) => acceptDriverFeedOrderAction(orderId),
      withdrawDriverOffer: (offerId) => withdrawDriverOfferAction(offerId),
      driverOrderNextStatus: () => driverOrderNextStatusAction(),
      cancelDriverActiveOrder: () => cancelDriverActiveOrderAction(),
      clearCompletedDriverOrder: () =>
        dispatch({ type: 'clearCompletedDriverOrder' }),
      updateRideDraft: (patch) => dispatch({ type: 'updateRideDraft', patch }),
      openRideLocationSheet: (target) =>
        dispatch({ type: 'openRideLocationSheet', target }),
      closeRideLocationSheet: () => dispatch({ type: 'closeRideLocationSheet' }),
      updateParcelDraft: (patch) =>
        dispatch({ type: 'updateParcelDraft', patch }),
      openPhoneVerifySheet: () => dispatch({ type: 'openPhoneVerifySheet' }),
      openAuthSheet: (flow) => dispatch({ type: 'openAuthSheet', flow }),
      startLoginFlow: () => dispatch({ type: 'openAuthSheet', flow: 'login' }),
      refreshAuthenticatedSession: (phone, flow) => refreshAuthenticatedSession(phone, flow),
      closePhoneVerifySheet: () => dispatch({ type: 'closePhoneVerifySheet' }),
      openPassengerOnboarding: () => {
        passengerOnboardingDismissedRef.current = false
        dispatch({ type: 'openPassengerOnboarding' })
      },
      closePassengerOnboarding: () => {
        passengerOnboardingDismissedRef.current = true
        dispatch({ type: 'closePassengerOnboarding' })
      },
      openPassengerRating: () => dispatch({ type: 'openPassengerRating' }),
      closePassengerRating: () => dispatch({ type: 'closePassengerRating' }),
      setPassengerOrdersTab: (tab) =>
        dispatch({ type: 'setPassengerOrdersTab', tab }),
      setVerifiedPhone: (phone) => dispatch({ type: 'setVerifiedPhone', phone }),
      startRideSearch: () => startPassengerRideSearch(),
      startParcelSearch: () => dispatch({ type: 'startParcelSearch' }),
      createRideFromDraft: () => startPassengerRideSearch(),
      createParcelFromDraft: () => dispatch({ type: 'createParcelFromDraft' }),
      acceptOffer: (offerId) => {
        void acceptActiveRideOffer(offerId)
      },
      rejectRideOffer: (offerId) => rejectActiveRideOffer(offerId),
      loadActiveRequestOffers: () => loadActiveRequestOffers(),
      refreshActiveRideDetails: (orderId) => refreshActiveRideDetails(orderId),
      rejectActiveRideOffer: (offerId) => rejectActiveRideOffer(offerId),
      acceptActiveRideOffer: (offerId) => acceptActiveRideOffer(offerId),
      acceptParcelOffer: (offerId) =>
        dispatch({ type: 'acceptParcelOffer', offerId }),
      setActiveRideStatus: (status) =>
        dispatch({ type: 'setActiveRideStatus', status }),
      setActiveParcelStatus: (status) =>
        dispatch({ type: 'setActiveParcelStatus', status }),
      cancelActiveRide: () => cancelPassengerRideRequest(),
      cancelActiveParcel: () => dispatch({ type: 'cancelActiveParcel' }),
      setPassengerProfile: (profile) =>
        dispatch({ type: 'setPassengerProfile', profile }),
      completeRideAndOpenRating: () =>
        dispatch({ type: 'completeRideAndOpenRating' }),
      completeParcelAndOpenHistory: () =>
        dispatch({ type: 'completeParcelAndOpenHistory' }),
      submitRideRating: (rating, comment) => {
        const orderId = state.activeRide?.id ?? state.driverActiveOrder?.id

        if (!orderId) return Promise.resolve()

        return createOrderReviewAction(orderId, { rating, comment })
      },
      repeatRide: (ride) => dispatch({ type: 'repeatRide', ride }),
      repeatParcel: (parcel) => dispatch({ type: 'repeatParcel', parcel }),
    },
  }

  return <AppStateContext.Provider value={value}>{children}</AppStateContext.Provider>
}

export function useAppState() {
  const context = useContext(AppStateContext)

  if (!context) {
    throw new Error('useAppState must be used within AppStateProvider')
  }

  return context.state
}

export function useAppActions() {
  const context = useContext(AppStateContext)

  if (!context) {
    throw new Error('useAppActions must be used within AppStateProvider')
  }

  return context.actions
}
