/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, useEffect, useReducer, useRef, type ReactNode } from 'react'

import { defaultScreenByRole } from '../navigation/navigation'
import { formatKzt } from '../lib/format'
import { BackendApiError, BackendAuthError } from '../shared/api/backend'
import { getRideAccessToken, clearRideAccessToken, clearRideAuthSession } from '../shared/auth/tokenStorage'
import {
  buildRideScheduledAt,
  isRideScheduledAtInFuture,
} from '../features/passenger/ride-schedule'
import {
  getPassengerMe,
  isPassengerProfileComplete,
  toRidePassengerProfile,
} from '../features/passenger/api/passenger.api'
import { refreshRideSession, logoutRideSession } from '../features/ride-auth/api/ride-auth.api'
import {
  cancelPassengerRideRequest,
  cancelPassengerRideOrder,
  acceptRideOffer,
  closeRideRequestExternally,
  createRideRequest,
  extendPassengerRideRequest,
  getPassengerRequestContactUnlocks,
  getPassengerOrders,
  getPassengerRideRequestOffers,
  getPassengerRequests,
  getRideOrder,
  getRideOrderEvents,
  getRideRequest,
  mapOrderToActiveRide,
  rejectRideOffer,
  updatePassengerRideRequestPrice,
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
  setRideRequestContactOutcome as setRideRequestContactOutcomeApi,
  submitDriverApplication as submitDriverApplicationApi,
  setDriverOnline as setDriverOnlineApi,
  unlockRideRequestContact as unlockRideRequestContactApi,
  updateDriverApplication,
  updateDriverOrderStatus,
  withdrawDriverOffer as withdrawDriverOfferApi,
} from '../features/driver/api/driver.api'
import {
  createDriverAnnouncement as createDriverAnnouncementApi,
  getDriverAnnouncements as getDriverAnnouncementsApi,
  normalizeAnnouncementId,
  updateDriverAnnouncement as updateDriverAnnouncementApi,
  updateDriverAnnouncementStatus as updateDriverAnnouncementStatusApi,
  type RideDriverAnnouncement,
  type RideDriverAnnouncementStatus,
} from '../features/announcements'
import {
    createDriverTopUpRequest as createDriverTopUpRequestApi,
    cancelTopUpRequest as cancelTopUpRequestApi,
    getDriverAccess,
    getDriverTopUpRequests,
    getDriverTariffs,
    getDriverWallet,
    getDriverWalletTransactions,
    purchaseDriverTariff as purchaseDriverTariffApi,
    uploadTopUpReceipt as uploadTopUpReceiptApi,
} from '../features/driver/api/driver-wallet.api'
import {
  createDriverRideRequestComplaint as createDriverRideRequestComplaintApi,
  createPassengerRideRequestComplaint as createPassengerRideRequestComplaintApi,
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
  DriverAccessSummary as DriverAccessSummaryApi,
  DriverTopUpRequest as DriverTopUpRequestApi,
  DriverWallet as DriverWalletApi,
  DriverWalletTransaction as DriverWalletTransactionApi,
  DriverTariff as DriverTariffApi,
} from '../features/driver/api/driver-wallet.types'
import type {
  RideRequestContactOutcomeResult,
  RideRequestContactUnlockResult,
} from '../features/driver/api/driver.types'
import type { RideComplaint as RideComplaintApi } from '../features/ride-safety/api/ride-complaints.types'
import type { RideReview as RideReviewApi, RideReviewSummary as RideReviewSummaryApi } from '../features/ride-safety/api/ride-reviews.types'
import type {
  RideOrder as PassengerRideOrder,
  RideOrderEvent as PassengerRideOrderEvent,
  CancelRideRequestPayload,
  CloseRideRequestExternallyResult,
  RidePassengerRequestContactUnlock,
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
  DriverCallOutcome,
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
import type { CreateRideComplaintPayload, CreateRideRequestComplaintPayload } from '../features/ride-safety/api/ride-complaints.types'

type PassengerOrdersTab = 'rides' | 'parcels' | 'buses'
type PassengerFlow = 'ride' | 'parcel' | 'login' | 'driverRegistrationStart' | 'driverRegistrationResume' | null
type DriverUnlockedContact = {
  phone: string
  passengerName: string | null
  remainingContacts: number
  callOutcome?: DriverCallOutcome
  callOutcomeAt?: string
  callOutcomeNote?: string
}

type RideComplaintTarget =
  | {
      targetType: 'ORDER'
      orderId: string
      reporterRole?: 'PASSENGER' | 'DRIVER'
      title?: string | null
      route?: string | null
    }
  | {
      targetType: 'REQUEST_CONTACT'
      requestId: string
      contactUnlockId?: string | null
      reporterRole: 'PASSENGER' | 'DRIVER'
      title?: string | null
      route?: string | null
    }

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
  driverAccess: DriverAccessSummaryApi | null
  driverTariffs: DriverTariffApi[]
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
  driverAnnouncements: RideDriverAnnouncement[]
  driverAnnouncementEditorId: string | null
  driverUnlockedContacts: Record<string, DriverUnlockedContact>
  driverOrders: DriverActiveOrder[]
  driverActiveOrder: DriverActiveOrder | null
  driverCounterOffers: DriverCounterOffer[]
  isDriverCounterOfferSheetOpen: boolean
  driverCounterOfferRequestId: string | null
  driverCounterOfferPrice: string
  driverCounterOfferComment: string
  isDriverFeedLoading: boolean
  isDriverActionLoading: boolean
  isDriverWalletLoading: boolean
  isDriverAccessLoading: boolean
  isDriverTopUpSubmitting: boolean
  isRideReviewSubmitting: boolean
  isRideComplaintSubmitting: boolean
  driverFlowError: string | null
  driverWalletError: string | null
  driverAccessError: string | null
  rideSafetyError: string | null
  rideSafetyNotice: string | null
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
    targetType: 'ORDER' | 'REQUEST_CONTACT'
    orderId: string | null
    requestId: string | null
    contactUnlockId: string | null
    reporterRole: 'PASSENGER' | 'DRIVER'
    title: string | null
    route: string | null
    category: string
    message: string
  }
  activeRideRequest: PassengerRideRequest | null
  passengerRequestContactUnlocksByRequestId: Record<string, RidePassengerRequestContactUnlock[]>
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
  rideFlowNotice: string | null
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
    refreshDriverAccess: () => Promise<void>
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
    refreshDriverAnnouncements: () => Promise<void>
    refreshDriverOffers: () => Promise<void>
    refreshDriverOrders: () => Promise<void>
    extendPassengerRideRequest: () => Promise<void>
    updatePassengerRideRequestPrice: (requestedPrice: number) => Promise<void>
    createDriverTopUpRequest: (payload: {
      amount: number
      method: TopUpRequestMethod
      providerRef?: string
      comment?: string
    }) => Promise<TopUpRequest>
    uploadTopUpReceipt: (topUpRequestId: number, file: File) => Promise<TopUpRequest>
    cancelTopUpRequest: (topUpRequestId: number) => Promise<TopUpRequest>
    createOrderReview: (orderId: string, payload: CreateRideReviewPayload) => Promise<void>
    submitRideComplaint: () => Promise<void>
    withdrawDriverOffer: (offerId: string) => Promise<void>
    openTopUpForm: () => void
    closeTopUpForm: () => void
    updateTopUpForm: (patch: Partial<AppState['topUpForm']>) => void
    openRideComplaintSheet: (target: RideComplaintTarget) => void
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
    openDriverCounterOfferSheet: (requestId: string) => void
    closeDriverCounterOfferSheet: () => void
    sendDriverCounterOffer: (price: string, comment: string) => Promise<DriverCounterOffer>
    openDriverAnnouncementEditor: (announcementId?: string | null) => void
    closeDriverAnnouncementEditor: () => void
    createDriverAnnouncement: (payload: {
      fromText: string
      toText: string
      scheduledAt: string
      pricePerSeat: number | string
      seatsAvailable: number | string
      comment?: string
      acceptsPassengers: boolean
      acceptsParcels: boolean
    }) => Promise<RideDriverAnnouncement>
    updateDriverAnnouncement: (
      id: string,
      payload: {
        fromText?: string
        toText?: string
        scheduledAt?: string
        pricePerSeat?: number | string
        seatsAvailable?: number | string
        comment?: string
        acceptsPassengers?: boolean
        acceptsParcels?: boolean
      },
    ) => Promise<RideDriverAnnouncement>
    updateDriverAnnouncementStatus: (
      id: string,
      status: RideDriverAnnouncementStatus,
    ) => Promise<RideDriverAnnouncement>
    unlockDriverRequestContact: (requestId: string) => Promise<RideRequestContactUnlockResult>
    setDriverRequestContactOutcome: (
      requestId: string,
      outcome: DriverCallOutcome,
      note?: string,
    ) => Promise<RideRequestContactOutcomeResult>
    acceptDemoCounterOfferAsPassenger: (orderId?: string) => void
    acceptDriverFeedOrder: (orderId: string) => void
    purchaseDriverTariff: (tariffId: string | number) => Promise<void>
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
    loadPassengerRequestContactUnlocks: (requestId: string) => Promise<void>
    refreshActiveRideDetails: (orderId?: string) => Promise<void>
    rejectActiveRideOffer: (offerId: string) => Promise<void>
    acceptActiveRideOffer: (offerId: string) => Promise<void>
    acceptParcelOffer: (offerId: string) => void
    setActiveRideStatus: (status: ActiveRideStatus) => void
    setActiveParcelStatus: (status: ActiveParcelStatus) => void
    cancelActiveRide: (payload?: CancelRideRequestPayload) => Promise<boolean>
    closePassengerRequestExternally: (
      requestId: string,
      contactUnlockId: string,
      note?: string,
    ) => Promise<void>
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
  | { type: 'setRideFlowNotice'; notice: string | null }
  | {
      type: 'setPassengerRequestContactUnlocks'
      requestId: string
      items: RidePassengerRequestContactUnlock[]
    }
  | {
      type: 'closePassengerRequestExternally'
      requestId: string
      note?: string
    }
  | { type: 'setDriverFeedLoading'; loading: boolean }
  | { type: 'setDriverActionLoading'; loading: boolean }
  | { type: 'setDriverFlowError'; error: string | null }
  | { type: 'setDriverAnnouncements'; announcements: RideDriverAnnouncement[] }
  | { type: 'setDriverAnnouncementEditorId'; announcementId: string | null }
  | { type: 'setDriverWalletLoading'; loading: boolean }
  | { type: 'setDriverAccessLoading'; loading: boolean }
  | { type: 'setDriverTopUpSubmitting'; loading: boolean }
  | { type: 'setRideReviewSubmitting'; loading: boolean }
  | { type: 'setRideComplaintSubmitting'; loading: boolean }
  | { type: 'setDriverWalletError'; error: string | null }
  | { type: 'setDriverAccessError'; error: string | null }
  | { type: 'setRideSafetyError'; error: string | null }
  | { type: 'setRideSafetyNotice'; notice: string | null }
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
  | { type: 'openRideComplaintSheet'; target: RideComplaintTarget }
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
  | {
      type: 'storeDriverUnlockedContact'
      requestId: string
      contact: DriverUnlockedContact
      alreadyUnlocked: boolean
      passengerName: string | null
    }
  | { type: 'setDriverCounterOffers'; offers: DriverCounterOffer[] }
  | { type: 'setDriverOrders'; orders: DriverActiveOrder[] }
  | { type: 'setDriverActiveOrder'; order: DriverActiveOrder | null; currentScreen?: AppScreen }
  | { type: 'setDriverAccess'; driverAccess: DriverAccessSummaryApi | null }
  | { type: 'setDriverTariffs'; driverTariffs: DriverTariffApi[] }
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
  | { type: 'openDriverCounterOfferSheet'; requestId: string }
  | { type: 'closeDriverCounterOfferSheet' }
  | { type: 'sendDriverCounterOffer'; price: string; comment: string }
  | { type: 'openDriverAnnouncementEditor'; announcementId?: string | null }
  | { type: 'closeDriverAnnouncementEditor' }
  | {
      type: 'setDriverRequestContactOutcome'
      requestId: string
      passengerName: string | null
      phone: string
      outcome: DriverCallOutcome
      outcomeAt?: string
      note?: string
    }
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
  | { type: 'setPassengerHistory'; history: PassengerHistoryItem[] }
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
    timingMode: 'immediate',
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

function resolveRideComplaintErrorMessage(error: unknown) {
  if (error instanceof BackendAuthError) {
    return 'Войдите заново.'
  }

  if (error instanceof BackendApiError) {
    const message = error.message.trim()

    if (message === 'Driver profile not found' || message === 'Passenger profile not found') {
      return 'Не удалось определить профиль для жалобы. Обновите экран или войдите заново.'
    }

    if (message === 'Ride driver contact unlock not found for this request') {
      return 'Не удалось определить открытый контакт по этой заявке.'
    }

    if (message) {
      return message
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Не удалось отправить жалобу.'
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

function mergeContactOutcomeIntoFeedOrder(
  order: DriverFeedOrder,
  unlockedContact?: DriverUnlockedContact,
): DriverFeedOrder {
  if (!unlockedContact) {
    return order
  }

  return {
    ...order,
    contactUnlocked: true,
    canCallPassenger: true,
    clientPhone: unlockedContact.phone,
    clientName: unlockedContact.passengerName ?? order.clientName,
    callOutcome: order.callOutcome ?? unlockedContact.callOutcome,
    callOutcomeAt: order.callOutcomeAt ?? unlockedContact.callOutcomeAt,
    callOutcomeNote: order.callOutcomeNote ?? unlockedContact.callOutcomeNote,
  }
}

function mergeUnlockedContactsIntoFeedOrders(
  orders: DriverFeedOrder[],
  unlockedContacts: Record<string, DriverUnlockedContact>,
) {
  return orders.map((order) => {
    const unlockedContact = unlockedContacts[order.id]
    return mergeContactOutcomeIntoFeedOrder(order, unlockedContact)
  })
}

function mergeUnlockedContactIntoActiveOrder(
  order: DriverActiveOrder | null,
  unlockedContacts: Record<string, DriverUnlockedContact>,
) {
  if (!order) return order

  const unlockedContact = unlockedContacts[order.sourceOrderId]
  if (!unlockedContact) {
    return order
  }

  return {
    ...order,
    contactUnlocked: true,
    canCallPassenger: true,
    clientPhone: unlockedContact.phone,
    clientName: unlockedContact.passengerName ?? order.clientName,
  }
}

function mergeDriverAccessRemainingContacts(
  access: DriverAccessSummaryApi | null,
  remainingContacts: number,
  alreadyUnlocked: boolean,
) {
  if (!access) return access

  const activePass = access.activePass
  const nextActivePass = activePass
    ? {
        ...activePass,
        remainingContactUnlocks: remainingContacts,
        usedContactUnlocks: alreadyUnlocked
          ? activePass.usedContactUnlocks
          : Math.max(0, activePass.usedContactUnlocks + 1),
      }
    : activePass

  return {
    ...access,
    remainingContactUnlocks: remainingContacts,
    activePass: nextActivePass,
  }
}

function getDriverContactUnlockErrorMessage(error: unknown) {
  if (error instanceof BackendApiError) {
    switch (error.code) {
      case 'NO_ACTIVE_PASS':
        return 'Доступ к заявкам закрыт. Купите тариф, чтобы открыть контакт пассажира.'
      case 'NO_CONTACTS_LEFT':
        return 'Контакты закончились. Купите тариф, чтобы открыть контакт пассажира.'
      case 'REQUEST_NOT_AVAILABLE':
        return 'Заявка уже недоступна. Обновите ленту.'
      case 'OWN_REQUEST_FORBIDDEN':
        return 'Нельзя открыть контакт по своей заявке.'
      default:
        return error.message || 'Не удалось открыть контакт. Попробуйте ещё раз.'
    }
  }

  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Не удалось открыть контакт. Попробуйте ещё раз.'
}

function getDriverContactOutcomeErrorMessage(error: unknown) {
  if (error instanceof BackendApiError) {
    switch (error.code) {
      case 'CONTACT_NOT_UNLOCKED':
        return 'Сначала откройте контакт пассажира.'
      case 'REQUEST_NOT_FOUND':
        return 'Заявка не найдена.'
      default:
        break
    }
  }

  return 'Не удалось сохранить результат звонка.'
}

function getDriverAnnouncementActionErrorMessage(
  error: unknown,
  fallback: string,
) {
  if (!(error instanceof Error) || !error.message.trim()) {
    return fallback
  }

  const uniqueParts = Array.from(
    new Set(
      error.message
        .split(/\r?\n|[;,]/)
        .map((part) => part.trim())
        .filter(Boolean),
    ),
  )
  const joined = uniqueParts.join('\n')

  if (
    /Validation failed \(numeric string is expected\)/i.test(joined) ||
    /property\s+.+\s+should\s+not\s+exist/i.test(joined)
  ) {
    return fallback
  }

  return joined || fallback
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

function canAccessDriverOrders(
  state: Pick<AppState, 'driverVerificationStatus' | 'driverWallet' | 'driverAccess'>,
) {
  if (state.driverVerificationStatus !== 'APPROVED') return false

  const monetizationMode = state.driverAccess?.monetizationMode ?? 'ORDER_COMMISSION'
  if (monetizationMode === 'ACCESS_SUBSCRIPTION') {
    return Boolean(state.driverAccess?.hasAccess)
  }

  if (monetizationMode === 'HYBRID') {
    return Boolean(state.driverAccess?.hasAccess) || canDriverGoOnline(state.driverWallet)
  }

  return canDriverGoOnline(state.driverWallet)
}

function getDriverAccessGateMessage(
  state: Pick<AppState, 'driverWallet' | 'driverAccess'>,
) {
  const monetizationMode = state.driverAccess?.monetizationMode ?? 'ORDER_COMMISSION'

  if (monetizationMode === 'ACCESS_SUBSCRIPTION' && !state.driverAccess?.hasAccess) {
    return state.driverAccess?.reason?.trim() || 'Доступ к заявкам закрыт. Купите тариф, чтобы продолжить работу.'
  }

  if (monetizationMode === 'HYBRID' && state.driverAccess && !state.driverAccess.hasAccess) {
    return state.driverAccess.reason?.trim() || 'Доступ к заявкам закрыт. Купите тариф, чтобы продолжить работу.'
  }

  return `Пополните баланс минимум до ${formatKzt(state.driverWallet.minBalance)} чтобы выйти на линию.`
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

function getClosePassengerRequestExternallyErrorMessage(error: unknown) {
  if (error instanceof BackendApiError) {
    if (error.status === 409) {
      return 'Заявку уже нельзя закрыть. Обновите экран.'
    }

    if (error.status === 404) {
      return 'Заявка не найдена или уже закрыта.'
    }
  }

  return error instanceof Error && error.message.trim()
    ? error.message
    : 'Не удалось закрыть заявку.'
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

function getBackendRideOrderId(order: Pick<PassengerRideOrder, 'id'> | Pick<ActiveRide, 'orderId'> | null | undefined) {
  const candidate = order && 'orderId' in order ? order.orderId : order?.id
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
  const isScheduled = rideDraft.timingMode === 'scheduled'
  const scheduledAt = isScheduled ? buildRideScheduledAt(rideDraft.date, rideDraft.time) : null
  const basePayload = {
    serviceType: 'INTERCITY_RIDE',
    rideType: toBackendRideType(rideDraft.type),
    timingMode: isScheduled ? 'SCHEDULED' : 'NOW',
    originCityId: rideDraft.originCityId as number,
    destinationCityId: rideDraft.destinationCityId as number,
    originText: buildRideLocationText(rideDraft.originCityName, rideDraft.originAddress),
    destinationText: buildRideLocationText(rideDraft.destinationCityName, rideDraft.destinationAddress),
    passengersCount: rideDraft.passengersCount,
    requestedPrice: Number.isFinite(requestedPrice) ? requestedPrice : undefined,
    comment: rideDraft.comment.trim(),
  } satisfies Omit<CreateRideRequestPayload, 'scheduledAt'>

  return isScheduled ? { ...basePayload, scheduledAt } : basePayload
}

function isRideRequestExpiredError(error: unknown) {
  if (!(error instanceof BackendApiError)) {
    return false
  }

  const normalizedMessage = String(error.message ?? '').toLowerCase()
  return error.status === 409 || error.status === 410 || normalizedMessage.includes('expired') || normalizedMessage.includes('истек')
}

function isPassengerOfferUnavailableError(error: unknown) {
  if (!(error instanceof BackendApiError)) {
    return false
  }

  const normalizedMessage = String(error.message ?? '').toLowerCase()
  return (
    error.status === 404 ||
    error.status === 409 ||
    error.status === 410 ||
    normalizedMessage.includes('only pending offer can be accepted') ||
    normalizedMessage.includes('only pending offer can be rejected') ||
    normalizedMessage.includes('ride offer not found')
  )
}

function getCreateRideRequestErrorMessage(error: unknown) {
  if (error instanceof BackendApiError) {
    if (error.message.trim()) {
      const normalizedMessage = error.message.toLowerCase()

      if (
        normalizedMessage.includes('цена должна быть от 500') ||
        normalizedMessage.includes('цена должна быть не больше 100 000') ||
        normalizedMessage.includes('цена должна быть числом') ||
        normalizedMessage.includes('укажите цену поездки') ||
        normalizedMessage.includes('время поездки должно быть минимум через 30 минут') ||
        normalizedMessage.includes('заявку можно создать максимум на 7 дней вперёд')
      ) {
        return error.message
      }

      if (normalizedMessage.includes('cannot post') || normalizedMessage.includes('not found')) {
        return 'Сервис создания заявки недоступен. Обновите backend и попробуйте снова.'
      }

      if (
        normalizedMessage.includes('scheduledat') ||
        normalizedMessage.includes('выберите будущее время поездки') ||
        normalizedMessage.includes('future') ||
        normalizedMessage.includes('must be a valid iso date string') ||
        normalizedMessage.includes('can not be in the past')
      ) {
        return 'Выберите будущее время поездки.'
      }
    }

    return 'Не удалось создать заявку. Проверьте данные.'
  }

  if (error instanceof Error) {
    const normalizedMessage = error.message.toLowerCase()

    if (
      normalizedMessage.includes('цена должна быть от 500') ||
      normalizedMessage.includes('цена должна быть не больше 100 000') ||
      normalizedMessage.includes('цена должна быть числом') ||
      normalizedMessage.includes('укажите цену поездки') ||
      normalizedMessage.includes('время поездки должно быть минимум через 30 минут') ||
      normalizedMessage.includes('заявку можно создать максимум на 7 дней вперёд')
    ) {
      return error.message
    }

    if (normalizedMessage.includes('cannot post') || normalizedMessage.includes('not found')) {
      return 'Сервис создания заявки недоступен. Обновите backend и попробуйте снова.'
    }

    if (
      normalizedMessage.includes('scheduledat') ||
      normalizedMessage.includes('будущее время') ||
      normalizedMessage.includes('future')
    ) {
      return 'Выберите будущее время поездки.'
    }
  }

  return 'Не удалось создать заявку. Проверьте данные.'
}

type RideRequestClientMeta = Pick<
  PassengerRideRequest,
  'timingMode' | 'scheduledAt' | 'scheduledDate' | 'scheduledTime' | 'priceUpdatedAt' | 'searchRemainingSeconds' | 'expiresAt'
>

function getRideRequestClientMeta(rideDraft: RideDraft): RideRequestClientMeta {
  if (rideDraft.timingMode === 'scheduled') {
    return {
      timingMode: 'SCHEDULED',
      scheduledAt: buildRideScheduledAt(rideDraft.date, rideDraft.time),
      scheduledDate: rideDraft.date.trim() || undefined,
      scheduledTime: rideDraft.time.trim() || undefined,
    }
  }

  return {
    timingMode: 'NOW',
    scheduledAt: null,
    scheduledDate: undefined,
    scheduledTime: undefined,
  }
}

function mergeRideRequestClientMeta(
  request: PassengerRideRequest,
  previous?: PassengerRideRequest | null,
): PassengerRideRequest {
  if (!previous) return request

  return {
    ...previous,
    ...request,
    timingMode: request.timingMode ?? previous.timingMode,
    scheduledAt: request.timingMode === 'NOW' ? null : request.scheduledAt ?? previous.scheduledAt,
    scheduledDate: request.timingMode === 'NOW' ? undefined : request.scheduledDate ?? previous.scheduledDate,
    scheduledTime: request.timingMode === 'NOW' ? undefined : request.scheduledTime ?? previous.scheduledTime,
    priceUpdatedAt: request.priceUpdatedAt ?? previous.priceUpdatedAt,
    cancelledAt: request.cancelledAt ?? previous.cancelledAt,
    cancelledBy: request.cancelledBy ?? previous.cancelledBy,
    cancelReasonCode: request.cancelReasonCode ?? previous.cancelReasonCode,
    cancelReasonText: request.cancelReasonText ?? previous.cancelReasonText,
    cancelReasonLabel: request.cancelReasonLabel ?? previous.cancelReasonLabel,
    searchRemainingSeconds: request.searchRemainingSeconds ?? previous.searchRemainingSeconds,
    expiresAt: request.expiresAt ?? previous.expiresAt,
  }
}

function mergeRideRequestCollections(
  nextRequests: PassengerRideRequest[],
  previousRequests: PassengerRideRequest[],
) {
  return nextRequests.map((request) => {
    const previous = previousRequests.find(
      (item) =>
        item.id === request.id ||
        (item.backendId && item.backendId === request.backendId) ||
        (item.localId && item.localId === request.localId),
    )

    return mergeRideRequestClientMeta(request, previous)
  })
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
    case 'setRideFlowNotice':
      return { ...state, rideFlowNotice: action.notice }
    case 'setDriverFeedLoading':
      return { ...state, isDriverFeedLoading: action.loading }
    case 'setDriverActionLoading':
      return { ...state, isDriverActionLoading: action.loading }
    case 'setDriverFlowError':
      return { ...state, driverFlowError: action.error }
    case 'setDriverAnnouncements':
      return { ...state, driverAnnouncements: action.announcements }
    case 'setDriverAnnouncementEditorId':
      return { ...state, driverAnnouncementEditorId: action.announcementId }
    case 'setDriverWalletLoading':
      return { ...state, isDriverWalletLoading: action.loading }
    case 'setDriverAccessLoading':
      return { ...state, isDriverAccessLoading: action.loading }
    case 'setDriverTopUpSubmitting':
      return { ...state, isDriverTopUpSubmitting: action.loading }
    case 'setRideReviewSubmitting':
      return { ...state, isRideReviewSubmitting: action.loading }
    case 'setRideComplaintSubmitting':
      return { ...state, isRideComplaintSubmitting: action.loading }
    case 'setDriverWalletError':
      return { ...state, driverWalletError: action.error }
    case 'setDriverAccessError':
      return { ...state, driverAccessError: action.error }
    case 'setRideSafetyError':
      return { ...state, rideSafetyError: action.error }
    case 'setRideSafetyNotice':
      return { ...state, rideSafetyNotice: action.notice }
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
        rideSafetyNotice: null,
        rideComplaintForm: {
          targetType: action.target.targetType,
          orderId: action.target.targetType === 'ORDER' ? action.target.orderId : null,
          requestId: action.target.targetType === 'REQUEST_CONTACT' ? action.target.requestId : null,
          contactUnlockId: action.target.targetType === 'REQUEST_CONTACT' ? action.target.contactUnlockId ?? null : null,
          reporterRole: action.target.reporterRole ?? (state.role === 'driver' ? 'DRIVER' : 'PASSENGER'),
          title: action.target.title?.trim() || null,
          route: action.target.route?.trim() || null,
          category: 'other',
          message: '',
        },
      }
    case 'closeRideComplaintSheet':
      return {
        ...state,
        isRideComplaintOpen: false,
        rideSafetyError: null,
        rideSafetyNotice: null,
        rideComplaintForm: {
          targetType: 'ORDER',
          orderId: null,
          requestId: null,
          contactUnlockId: null,
          reporterRole: state.role === 'driver' ? 'DRIVER' : 'PASSENGER',
          title: null,
          route: null,
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
        driverFeedOrders: isApprovedDriver ? dedupeById(mergeUnlockedContactsIntoFeedOrders(action.driverFeedOrders, state.driverUnlockedContacts)) : [],
        driverAnnouncements: isApprovedDriver ? state.driverAnnouncements : [],
        driverUnlockedContacts: isApprovedDriver ? state.driverUnlockedContacts : {},
        driverOrders: isApprovedDriver ? dedupeById(action.driverOrders) : [],
        driverCounterOffers: isApprovedDriver ? action.driverCounterOffers : [],
        driverActiveOrder: isApprovedDriver ? mergeUnlockedContactIntoActiveOrder(action.driverActiveOrder, state.driverUnlockedContacts) : null,
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
    case 'setDriverAccess':
      return {
        ...state,
        driverAccess: action.driverAccess,
        driverAccessError: null,
      }
    case 'setDriverTariffs':
      return {
        ...state,
        driverTariffs: action.driverTariffs,
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
      return {
        ...state,
        driverFeedOrders: dedupeById(mergeUnlockedContactsIntoFeedOrders(action.orders, state.driverUnlockedContacts)),
      }
    case 'storeDriverUnlockedContact': {
      const unlockedContacts = {
        ...state.driverUnlockedContacts,
        [action.requestId]: action.contact,
      }

      return {
        ...state,
        driverUnlockedContacts: unlockedContacts,
        driverAccess: mergeDriverAccessRemainingContacts(
          state.driverAccess,
          action.contact.remainingContacts,
          action.alreadyUnlocked,
        ),
        driverFeedOrders: state.driverFeedOrders.map((order) =>
          order.id === action.requestId
            ? mergeContactOutcomeIntoFeedOrder(
                {
                  ...order,
                  callOutcome: order.callOutcome ?? action.contact.callOutcome,
                  callOutcomeAt: order.callOutcomeAt ?? action.contact.callOutcomeAt,
                  callOutcomeNote: order.callOutcomeNote ?? action.contact.callOutcomeNote,
                },
                action.contact,
              )
            : order,
        ),
        driverActiveOrder:
          state.driverActiveOrder?.sourceOrderId === action.requestId
            ? {
                ...state.driverActiveOrder,
                contactUnlocked: true,
                canCallPassenger: true,
                clientPhone: action.contact.phone,
                clientName: action.passengerName ?? state.driverActiveOrder.clientName,
              }
            : state.driverActiveOrder,
      }
    }
    case 'setDriverRequestContactOutcome': {
      const previousContact = state.driverUnlockedContacts[action.requestId]
      const nextContact: DriverUnlockedContact = {
        phone: action.phone || previousContact?.phone || '',
        passengerName: action.passengerName ?? previousContact?.passengerName ?? null,
        remainingContacts: previousContact?.remainingContacts ?? state.driverAccess?.remainingContactUnlocks ?? 0,
        callOutcome: action.outcome,
        callOutcomeAt: action.outcomeAt,
        callOutcomeNote: action.note,
      }

      return {
        ...state,
        driverUnlockedContacts: {
          ...state.driverUnlockedContacts,
          [action.requestId]: nextContact,
        },
        driverFeedOrders: state.driverFeedOrders.map((order) =>
          order.id === action.requestId
            ? mergeContactOutcomeIntoFeedOrder(
                {
                  ...order,
                  callOutcome: action.outcome,
                  callOutcomeAt: action.outcomeAt,
                  callOutcomeNote: action.note,
                },
                nextContact,
              )
            : order,
        ),
      }
    }
    case 'setDriverCounterOffers':
      return { ...state, driverCounterOffers: action.offers }
    case 'setDriverOrders':
      return { ...state, driverOrders: dedupeById(action.orders) }
    case 'setDriverActiveOrder':
      return {
        ...state,
        driverActiveOrder: mergeUnlockedContactIntoActiveOrder(action.order, state.driverUnlockedContacts),
        currentScreen: action.currentScreen ?? state.currentScreen,
      }
    case 'setPassengerRequestContactUnlocks':
      return {
        ...state,
        passengerRequestContactUnlocksByRequestId: {
          ...state.passengerRequestContactUnlocksByRequestId,
          [action.requestId]: action.items,
        },
      }
    case 'closePassengerRequestExternally': {
      const request = state.passengerRideRequests.find((item) => item.id === action.requestId || item.backendId === action.requestId)

      return {
        ...state,
        passengerRideRequests: request
          ? [
              {
                ...request,
                status: 'CLOSED_EXTERNALLY',
              },
              ...state.passengerRideRequests.filter((item) => item.id !== request.id),
            ]
          : state.passengerRideRequests,
        activeRideRequest: null,
        driverOffers: [],
        passengerRequestContactUnlocksByRequestId: {
          ...state.passengerRequestContactUnlocksByRequestId,
          [action.requestId]: [],
        },
        currentScreen: 'passengerOrder',
        rideFlowNotice: 'Заявка закрыта. Вы договорились с водителем.',
      }
    }
    case 'setPassengerRideSnapshot':
      return {
        ...state,
        passengerRideRequests: mergeRideRequestCollections(action.passengerRideRequests, state.passengerRideRequests),
        passengerRideOrders: action.passengerRideOrders,
        activeRideRequest: action.activeRideRequest
          ? mergeRideRequestClientMeta(action.activeRideRequest, state.activeRideRequest)
          : action.activeRideRequest,
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
      const order = state.driverFeedOrders.find((item) => item.id === action.requestId)

      if (!canAccessDriverOrders(state) || state.driverActiveOrder) {
        return state
      }

      return {
        ...state,
        isDriverCounterOfferSheetOpen: true,
        driverCounterOfferRequestId: action.requestId,
        driverCounterOfferPrice: order ? String(order.requestedPrice) : '',
        driverCounterOfferComment: '',
      }
    }
    case 'closeDriverCounterOfferSheet':
      return {
        ...state,
        isDriverCounterOfferSheetOpen: false,
        driverCounterOfferRequestId: null,
        driverCounterOfferPrice: '',
        driverCounterOfferComment: '',
      }
    case 'openDriverAnnouncementEditor':
      return {
        ...state,
        currentScreen: 'driverAnnouncementEditor',
        driverAnnouncementEditorId: action.announcementId ?? null,
        isMenuOpen: false,
        driverFlowError: null,
      }
    case 'closeDriverAnnouncementEditor':
      return {
        ...state,
        currentScreen: 'driverAnnouncements',
        driverAnnouncementEditorId: null,
        isMenuOpen: false,
        driverFlowError: null,
      }
    case 'sendDriverCounterOffer': {
      if (!state.driverCounterOfferRequestId || !canAccessDriverOrders(state) || state.driverActiveOrder) return state
      const order = state.driverFeedOrders.find(
        (item) => item.id === state.driverCounterOfferRequestId,
      )

      if (!order) return state

      const offer: DriverCounterOffer = {
        id: makeId('counter-offer'),
        orderId: order.id,
        driverName: state.driverProfile?.fullName || state.driverApplicationDraft.fullName || 'Демо водитель',
        offeredPrice: Number(action.price),
        originalPrice: order.requestedPrice,
        comment: action.comment,
        status: 'pending',
      }

      return {
        ...state,
        driverFeedOrders: state.driverFeedOrders.map((item) =>
          item.id === order.id ? { ...item, status: 'offered' } : item,
        ),
        driverCounterOffers: [offer, ...state.driverCounterOffers],
        driverCounterOfferPrice: String(action.price),
        driverCounterOfferComment: action.comment,
        isDriverCounterOfferSheetOpen: false,
        driverCounterOfferRequestId: null,
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
      if (action.patch.timingMode === 'immediate') {
        return {
          ...state,
          rideDraft: {
            ...state.rideDraft,
            ...action.patch,
            timingMode: 'immediate',
            date: '',
            time: '',
          },
        }
      }

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
    case 'setPassengerHistory':
      return { ...state, passengerHistory: action.history }
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
          status: 'CONVERTED_TO_ORDER' as const,
          selectedOfferId: offer.id,
        },
        activeRide: {
          id: makeId('ride'),
          orderId: makeId('ride-order'),
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
        timingMode: state.rideDraft.timingMode,
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
  driverAccess: null,
  driverTariffs: [],
  driverWalletTransactions: [],
  driverTopUpRequests: [],
  driverFeedOrders: [],
  driverAnnouncements: [],
  driverAnnouncementEditorId: null,
  driverUnlockedContacts: {},
  driverOrders: [],
  driverActiveOrder: null,
  driverCounterOffers: [],
  isDriverCounterOfferSheetOpen: false,
  driverCounterOfferRequestId: null,
  driverCounterOfferPrice: '',
  driverCounterOfferComment: '',
  isDriverFeedLoading: false,
  isDriverActionLoading: false,
  isDriverWalletLoading: false,
  isDriverAccessLoading: false,
  isDriverTopUpSubmitting: false,
  isRideReviewSubmitting: false,
  isRideComplaintSubmitting: false,
  driverFlowError: null,
  driverWalletError: null,
  driverAccessError: null,
  rideSafetyError: null,
  rideSafetyNotice: null,
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
    targetType: 'ORDER',
    orderId: null,
    requestId: null,
    contactUnlockId: null,
    reporterRole: 'PASSENGER',
    title: null,
    route: null,
    category: 'other',
    message: '',
  },
  activeRideRequest: null,
  passengerRequestContactUnlocksByRequestId: {},
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
  rideFlowNotice: null,
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
    driverAnnouncements: [],
    driverAnnouncementEditorId: null,
    isDriverCounterOfferSheetOpen: false,
    driverCounterOfferRequestId: null,
    driverCounterOfferPrice: '',
    driverCounterOfferComment: '',
    activeRideRequest: null,
    passengerRequestContactUnlocksByRequestId: {},
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
  const stateRef = useRef(state)
  const driverSnapshotRequestRef = useRef<Promise<void> | null>(null)
  const driverSnapshotAutoRetryBlockedRef = useRef(false)

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
      dispatch({ type: 'setRideFlowNotice', notice: null })
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
      const refreshedRequest = await getRideRequest(activeRequestBackendId)
      const refreshedRequestWithMeta = mergeRideRequestClientMeta(refreshedRequest, activeRequest)

      if (!isOpenRideRequestStatus(refreshedRequestWithMeta.status)) {
        dispatch({
          type: 'setPassengerRideSnapshot',
          passengerRideRequests: [
            refreshedRequestWithMeta,
            ...state.passengerRideRequests.filter(
              (item) => item.id !== refreshedRequestWithMeta.id && item.backendId !== refreshedRequestWithMeta.backendId,
            ),
          ],
          passengerRideOrders: state.passengerRideOrders,
          activeRideRequest: refreshedRequestWithMeta,
          driverOffers: [],
          activeRide: state.activeRide,
          activeRideEvents: state.activeRideEvents,
        })
        return
      }

      const [response, contactUnlocksResponse] = await Promise.all([
        getPassengerRideRequestOffers(activeRequestBackendId),
        getPassengerRequestContactUnlocks(activeRequestBackendId).catch((error) => {
          if (error instanceof BackendApiError && error.status === 404) {
            return {
              requestId: activeRequestBackendId,
              items: [],
              raw: null,
            }
          }

          throw error
        }),
      ])
      dispatch({
        type: 'setPassengerRideSnapshot',
        passengerRideRequests: [
          refreshedRequestWithMeta,
          ...state.passengerRideRequests.filter(
            (item) => item.id !== refreshedRequestWithMeta.id && item.backendId !== refreshedRequestWithMeta.backendId,
          ),
        ],
        passengerRideOrders: state.passengerRideOrders,
        activeRideRequest: refreshedRequestWithMeta,
        driverOffers: response.items,
        activeRide: state.activeRide,
        activeRideEvents: state.activeRideEvents,
      })
      dispatch({
        type: 'setPassengerRequestContactUnlocks',
        requestId: contactUnlocksResponse.requestId || activeRequestBackendId,
        items: contactUnlocksResponse.items,
      })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        throw error
      }

      if (error instanceof BackendApiError && error.status === 404) {
        dispatch({
          type: 'setPassengerRideSnapshot',
          passengerRideRequests: state.passengerRideRequests,
          passengerRideOrders: state.passengerRideOrders,
          activeRideRequest: activeRequest,
          driverOffers: [],
          activeRide: state.activeRide,
          activeRideEvents: state.activeRideEvents,
        })
        dispatch({
          type: 'setRideFlowError',
          error: 'Заявка больше не найдена. Обновите экран.',
        })
        dispatch({
          type: 'setPassengerRequestContactUnlocks',
          requestId: activeRequestBackendId,
          items: [],
        })
        return
      }

      dispatch({
        type: 'setRideFlowError',
        error: error instanceof Error ? error.message : 'Не удалось загрузить предложения.',
      })
    } finally {
      dispatch({ type: 'setRideOffersLoading', loading: false })
    }
  }

  const loadPassengerRequestContactUnlocksAction = async (requestId: string) => {
    const normalizedRequestId = requestId.trim()

    if (!/^\d+$/.test(normalizedRequestId)) {
      dispatch({
        type: 'setPassengerRequestContactUnlocks',
        requestId,
        items: [],
      })
      return
    }

    try {
      const response = await getPassengerRequestContactUnlocks(normalizedRequestId)
      dispatch({
        type: 'setPassengerRequestContactUnlocks',
        requestId: response.requestId || normalizedRequestId,
        items: response.items,
      })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        throw error
      }

      if (error instanceof BackendApiError && error.status === 404) {
        dispatch({
          type: 'setPassengerRequestContactUnlocks',
          requestId: normalizedRequestId,
          items: [],
        })
        return
      }

      throw error
    }
  }

  const closePassengerRequestExternallyAction = async (
    requestId: string,
    contactUnlockId: string,
    note?: string,
  ): Promise<void> => {
    dispatch({ type: 'setRideActionLoading', loading: true })
    dispatch({ type: 'setRideFlowError', error: null })

    try {
      const result: CloseRideRequestExternallyResult = await closeRideRequestExternally(requestId, {
        contactUnlockId,
        note,
      })

      dispatch({
        type: 'closePassengerRequestExternally',
        requestId: result.requestId || requestId,
        note: result.note,
      })

      await refreshPassengerRideSnapshot().catch(() => null)
    } catch (error) {
      const message = getClosePassengerRequestExternallyErrorMessage(error)
      dispatch({
        type: 'setRideFlowError',
        error: message,
      })

      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        throw error
      }

      if (error instanceof BackendApiError && (error.status === 404 || error.status === 409)) {
        await refreshPassengerRideSnapshot().catch(() => null)
      }

      throw new Error(message, { cause: error })
    } finally {
      dispatch({ type: 'setRideActionLoading', loading: false })
    }
  }

  const refreshActiveRideDetails = async (orderId?: string) => {
    const activeRideOrderId = orderId ?? state.activeRide?.orderId
    const backendOrderId =
      activeRideOrderId && /^\d+$/.test(activeRideOrderId.trim()) ? activeRideOrderId.trim() : null

    if (!backendOrderId) {
      dispatch({
        type: 'setRideFlowError',
        error: 'Не удалось определить numeric id активного заказа.',
      })
      return
    }

    dispatch({ type: 'setPassengerOrdersLoading', loading: true })
    dispatch({ type: 'setRideFlowError', error: null })

    try {
      const [detailedOrder, eventsResponse] = await Promise.all([
        getRideOrder(backendOrderId),
        getRideOrderEvents(backendOrderId),
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
            ? 'passengerOrder'
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
    const originAddress = trimRideLocationText(state.rideDraft.originAddress)
    const destinationAddress = trimRideLocationText(state.rideDraft.destinationAddress)

    if (!originCityId || !originCityName || !originAddress) {
      dispatch({
        type: 'setRideFlowError',
        error: 'Выберите город и адрес отправления.',
      })
      return
    }

    if (!destinationCityId || !destinationCityName || !destinationAddress) {
      dispatch({
        type: 'setRideFlowError',
        error: 'Выберите город и адрес прибытия.',
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

  if (
    state.rideDraft.timingMode === 'scheduled' &&
    (!state.rideDraft.date.trim() ||
      !state.rideDraft.time.trim() ||
      !isRideScheduledAtInFuture(state.rideDraft.date, state.rideDraft.time))
  ) {
      dispatch({
        type: 'setRideFlowError',
        error: 'Выберите будущее время поездки.',
      })
      return
    }

    const requestedPrice = Number(state.rideDraft.price)
    if (!Number.isFinite(requestedPrice)) {
      dispatch({
        type: 'setRideFlowError',
        error: 'Цена должна быть числом.',
      })
      return
    }

    if (requestedPrice < 500) {
      dispatch({
        type: 'setRideFlowError',
        error: 'Цена должна быть от 500 ₸.',
      })
      return
    }

    if (requestedPrice > 100000) {
      dispatch({
        type: 'setRideFlowError',
        error: 'Цена должна быть не больше 100 000 ₸.',
      })
      return
    }

    dispatch({ type: 'setRideRequestLoading', loading: true })
    dispatch({ type: 'setRideFlowError', error: null })

    try {
      const createdRequest = await createRideRequest({
        ...buildRideRequestPayload(state.rideDraft),
        requestedPrice,
      })
      const createdRequestWithMeta = {
        ...createdRequest,
        ...getRideRequestClientMeta(state.rideDraft),
      }

      dispatch({
        type: 'setPassengerRideSnapshot',
        passengerRideRequests: [
          createdRequestWithMeta,
          ...state.passengerRideRequests.filter((item) => item.id !== createdRequestWithMeta.id),
        ],
        passengerRideOrders: state.passengerRideOrders,
        activeRideRequest: createdRequestWithMeta,
        driverOffers: [],
        activeRide: state.activeRide,
        activeRideEvents: state.activeRideEvents,
        currentScreen: 'passengerOffers',
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

      dispatch({
        type: 'setRideFlowError',
        error: getCreateRideRequestErrorMessage(error),
      })
    } finally {
      dispatch({ type: 'setRideRequestLoading', loading: false })
    }
  }

  const acceptActiveRideOffer = async (offerId: string) => {
    dispatch({ type: 'setRideActionLoading', loading: true })
    dispatch({ type: 'setRideFlowError', error: null })

    try {
      const acceptedResult = await acceptRideOffer(offerId)
      const acceptedOrderId = getBackendRideOrderId(acceptedResult.order)
      if (!acceptedOrderId) {
        throw new Error('Не удалось определить numeric id созданного заказа.')
      }

      const detailedOrder = await getRideOrder(acceptedOrderId).catch(() => acceptedResult.order)
      const activeRide = mapOrderToActiveRide(detailedOrder)
      const activeRideEvents = (await getRideOrderEvents(acceptedOrderId).catch(() => ({ items: [] }))).items
      const selectedOfferId = acceptedResult.offer?.id ?? offerId
      const nextActiveRideRequest: PassengerRideRequest | null =
        acceptedResult.request && state.activeRideRequest
          ? {
              ...state.activeRideRequest,
              ...acceptedResult.request,
              status: 'CONVERTED_TO_ORDER' as const,
              selectedOfferId,
            }
          : state.activeRideRequest
            ? {
                ...state.activeRideRequest,
                status: 'CONVERTED_TO_ORDER',
                selectedOfferId,
              }
            : state.activeRideRequest

      dispatch({
        type: 'setPassengerRideSnapshot',
        passengerRideRequests: state.passengerRideRequests.map((item) =>
          item.id === state.activeRideRequest?.id
            ? {
                ...item,
                status: 'CONVERTED_TO_ORDER' as const,
                selectedOfferId,
              }
            : item,
        ),
        passengerRideOrders: [
          detailedOrder,
          ...state.passengerRideOrders.filter((item) => item.id !== detailedOrder.id),
        ],
        activeRideRequest: nextActiveRideRequest,
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

      if (isPassengerOfferUnavailableError(error)) {
        await loadActiveRequestOffers().catch(() => null)
        dispatch({
          type: 'setRideFlowError',
          error: 'Это предложение уже неактуально. Обновили список.',
        })
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

      if (isPassengerOfferUnavailableError(error)) {
        await loadActiveRequestOffers().catch(() => null)
        dispatch({
          type: 'setRideFlowError',
          error: 'Это предложение уже неактуально. Обновили список.',
        })
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

  const extendPassengerRideRequestAction = async () => {
    const activeRequest = state.activeRideRequest
    const activeRequestBackendId = getBackendRideRequestId(activeRequest)

    if (!activeRequest || !activeRequestBackendId) {
      return
    }

    dispatch({ type: 'setRideActionLoading', loading: true })
    dispatch({ type: 'setRideFlowError', error: null })

    try {
      const extendedRequest = await extendPassengerRideRequest(activeRequestBackendId)
      dispatch({
        type: 'setPassengerRideSnapshot',
        passengerRideRequests: [
          extendedRequest,
          ...state.passengerRideRequests.filter(
            (item) => item.id !== extendedRequest.id && item.backendId !== extendedRequest.backendId,
          ),
        ],
        passengerRideOrders: state.passengerRideOrders,
        activeRideRequest: extendedRequest,
        driverOffers: state.driverOffers,
        activeRide: state.activeRide,
        activeRideEvents: state.activeRideEvents,
      })
      void loadActiveRequestOffers()
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setRideFlowError',
        error: isRideRequestExpiredError(error)
          ? 'Время поиска истекло. Сначала продлите поиск.'
          : error instanceof BackendApiError
            ? 'Не удалось продлить поиск. Попробуйте ещё раз.'
            : error instanceof Error
              ? error.message
            : 'Не удалось продлить поиск. Попробуйте еще раз.',
      })
    } finally {
      dispatch({ type: 'setRideActionLoading', loading: false })
    }
  }

  const updatePassengerRideRequestPriceAction = async (requestedPrice: number) => {
    const activeRequest = state.activeRideRequest
    const activeRequestBackendId = getBackendRideRequestId(activeRequest)

    if (!activeRequest || !activeRequestBackendId) {
      return
    }

    const nextRequestedPrice = Math.max(100, Math.trunc(requestedPrice))

    dispatch({ type: 'setRideActionLoading', loading: true })
    dispatch({ type: 'setRideFlowError', error: null })

    try {
      const updatedRequest = await updatePassengerRideRequestPrice(activeRequestBackendId, nextRequestedPrice)
      dispatch({
        type: 'setPassengerRideSnapshot',
        passengerRideRequests: [
          updatedRequest,
          ...state.passengerRideRequests.filter(
            (item) => item.id !== updatedRequest.id && item.backendId !== updatedRequest.backendId,
          ),
        ],
        passengerRideOrders: state.passengerRideOrders,
        activeRideRequest: updatedRequest,
        driverOffers: state.driverOffers,
        activeRide: state.activeRide,
        activeRideEvents: state.activeRideEvents,
      })
      void loadActiveRequestOffers()
      void refreshPassengerRideSnapshot()
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setRideFlowError',
        error: isRideRequestExpiredError(error)
          ? 'Время поиска истекло. Сначала продлите поиск.'
          : error instanceof BackendApiError
            ? 'Не удалось обновить цену поездки. Попробуйте ещё раз.'
            : error instanceof Error
              ? error.message
            : 'Не удалось обновить цену поездки.',
      })
    } finally {
      dispatch({ type: 'setRideActionLoading', loading: false })
    }
  }

  const cancelPassengerRideRequestAction = async (payload?: CancelRideRequestPayload): Promise<boolean> => {
    dispatch({ type: 'setRideActionLoading', loading: true })
    dispatch({ type: 'setRideFlowError', error: null })
    dispatch({ type: 'setRideFlowNotice', notice: null })

    try {
      const activeOrderBackendId = getBackendRideOrderId(state.activeRide)

      if (activeOrderBackendId) {
        const cancelledOrder = await cancelPassengerRideOrder(activeOrderBackendId, payload)
        const cancelledHistory: PassengerHistoryItem = {
          id: makeId('hist'),
          category: 'ride',
          from: state.activeRide?.from ?? state.activeRideRequest?.from ?? cancelledOrder.from,
          to: state.activeRide?.to ?? state.activeRideRequest?.to ?? cancelledOrder.to,
          date: state.activeRideRequest?.date ?? cancelledOrder.date,
          price: state.activeRide?.price ?? state.activeRideRequest?.price ?? cancelledOrder.price,
          status: 'cancelled',
          driverName: state.activeRide?.driverName ?? cancelledOrder.driverName,
        }

        dispatch({
          type: 'setPassengerHistory',
          history: [cancelledHistory, ...state.passengerHistory],
        })
        dispatch({
          type: 'setPassengerRideSnapshot',
          passengerRideRequests: state.passengerRideRequests.filter((item) => item.id !== state.activeRideRequest?.id),
          passengerRideOrders: [
            cancelledOrder,
            ...state.passengerRideOrders.filter((item) => item.id !== cancelledOrder.id),
          ],
          activeRideRequest: null,
          driverOffers: [],
          activeRide: null,
          activeRideEvents: [],
          clearCurrentRide: true,
          currentScreen: 'passengerOrder',
        })
        dispatch({ type: 'setRideFlowNotice', notice: 'Поездка отменена.' })

        void refreshPassengerRideSnapshot()
        return true
      }

      if (!state.activeRideRequest || !isOpenRideRequestStatus(state.activeRideRequest.status)) {
        return false
      }

      const activeRequestBackendId = getBackendRideRequestId(state.activeRideRequest)
      if (!activeRequestBackendId) {
        console.warn('[ride] cancelPassengerRideRequest: skipping cancel for non-numeric request id', state.activeRideRequest.id)
        return false
      }

      const cancelledRequest = await cancelPassengerRideRequest(activeRequestBackendId, payload)
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

      dispatch({
        type: 'setPassengerRideSnapshot',
        passengerRideRequests: [
          cancelledRequest,
          ...state.passengerRideRequests.filter(
            (item) => item.id !== cancelledRequest.id && item.backendId !== cancelledRequest.backendId,
          ),
        ],
        passengerRideOrders: state.passengerRideOrders,
        activeRideRequest: null,
        driverOffers: [],
        activeRide: null,
        activeRideEvents: [],
        clearCurrentRide: true,
        currentScreen: 'passengerOrder',
      })

      if (cancelledHistory) {
        dispatch({
          type: 'setPassengerHistory',
          history: [cancelledHistory, ...state.passengerHistory],
        })
      }

      dispatch({ type: 'setRideFlowNotice', notice: 'Поездка отменена.' })
      void refreshPassengerRideSnapshot()
      return true
    } catch (error) {
      if (error instanceof BackendAuthError) {
        logoutPassengerSession()
        return false
      }

      dispatch({
        type: 'setRideFlowError',
        error:
          error instanceof Error
            ? error.message
            : 'Не удалось отменить поездку. Попробуйте ещё раз.',
      })
      return false
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

  const refreshDriverAccess = useCallback(async (force = false) => {
    if (!force && state.driverVerificationStatus !== 'APPROVED') {
      return
    }

    dispatch({ type: 'setDriverAccessLoading', loading: true })
    dispatch({ type: 'setDriverAccessError', error: null })

    try {
      const [access, tariffs] = await Promise.all([
        getDriverAccess(),
        getDriverTariffs(),
      ])

      dispatch({ type: 'setDriverAccess', driverAccess: access })
      dispatch({
        type: 'setDriverTariffs',
        driverTariffs: tariffs.length > 0 ? tariffs : access.availableTariffs,
      })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setDriverAccessError',
        error: error instanceof Error ? error.message : 'Не удалось загрузить доступ и тарифы.',
      })
    } finally {
      dispatch({ type: 'setDriverAccessLoading', loading: false })
    }
  }, [dispatch, state.driverVerificationStatus])

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
      await refreshDriverAccess(true)
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
  }, [dispatch, refreshDriverAccess, state.driverVerificationStatus])

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
    if (
      state.role !== 'driver' ||
      state.driverVerificationStatus !== 'APPROVED' ||
      state.currentScreen === 'driverMyOrders'
    ) return

    void Promise.all([
      refreshDriverReviewSummary(),
      refreshDriverReviews(),
      refreshDriverComplaints(),
    ])
  }, [
    refreshDriverComplaints,
    refreshDriverReviewSummary,
    refreshDriverReviews,
    state.currentScreen,
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

  const refreshDriverAnnouncements = useCallback(async () => {
    if (state.role !== 'driver' || state.driverVerificationStatus !== 'APPROVED') {
      return
    }

    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      const response = await getDriverAnnouncementsApi()
      dispatch({ type: 'setDriverAnnouncements', announcements: response.items })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setDriverFlowError',
        error: error instanceof Error ? error.message : 'Не удалось загрузить объявления водителя.',
      })
    }
  }, [dispatch, state.driverVerificationStatus, state.role])

  const refreshDriverFeedRef = useRef(refreshDriverFeed)
  const refreshDriverOffersRef = useRef(refreshDriverOffers)
  const refreshDriverOrdersRef = useRef(refreshDriverOrders)
  const refreshDriverAnnouncementsRef = useRef(refreshDriverAnnouncements)
  const refreshDriverWalletRef = useRef(refreshDriverWallet)
  const refreshDriverWalletTransactionsRef = useRef(refreshDriverWalletTransactions)
  const refreshDriverTopUpRequestsRef = useRef(refreshDriverTopUpRequests)
  const refreshDriverReviewSummaryRef = useRef(refreshDriverReviewSummary)
  const refreshDriverReviewsRef = useRef(refreshDriverReviews)
  const refreshDriverComplaintsRef = useRef(refreshDriverComplaints)

  useEffect(() => {
    stateRef.current = state
  }, [state])

  useEffect(() => {
    refreshDriverFeedRef.current = refreshDriverFeed
    refreshDriverOffersRef.current = refreshDriverOffers
    refreshDriverOrdersRef.current = refreshDriverOrders
    refreshDriverAnnouncementsRef.current = refreshDriverAnnouncements
    refreshDriverWalletRef.current = refreshDriverWallet
    refreshDriverWalletTransactionsRef.current = refreshDriverWalletTransactions
    refreshDriverTopUpRequestsRef.current = refreshDriverTopUpRequests
    refreshDriverReviewSummaryRef.current = refreshDriverReviewSummary
    refreshDriverReviewsRef.current = refreshDriverReviews
    refreshDriverComplaintsRef.current = refreshDriverComplaints
  }, [
    refreshDriverComplaints,
    refreshDriverFeed,
    refreshDriverOffers,
    refreshDriverOrders,
    refreshDriverAnnouncements,
    refreshDriverReviewSummary,
    refreshDriverReviews,
    refreshDriverTopUpRequests,
    refreshDriverWallet,
    refreshDriverWalletTransactions,
  ])

  const refreshDriverSnapshot = useCallback(async (
    screenOverride?: AppScreen,
    options?: { manual?: boolean },
  ) => {
    const token = getRideAccessToken()
    const isManual = options?.manual ?? false

    if (!token) {
      loadedDriverTokenRef.current = null
      return
    }

    if (!isManual && driverSnapshotAutoRetryBlockedRef.current) {
      return
    }

    if (driverSnapshotRequestRef.current) {
      return driverSnapshotRequestRef.current
    }

    const snapshotRequest = (async () => {
      try {
        const me = await getDriverMe()
        const currentApplication = me.currentApplication ?? me.application ?? null
        const currentState = stateRef.current

        driverApplicationIdRef.current = me.applicationId ?? currentApplication?.id ?? null
        let activeRecheck = me.activeRecheck ?? null
        if (activeRecheck && !activeRecheck.id) {
          activeRecheck = await getActiveDriverRecheck().catch(() => null)
        }

        const verificationStatus =
          me.verificationStatus === 'NOT_STARTED' && currentState.driverVerificationStatus === 'DRAFT'
            ? 'DRAFT'
            : me.verificationStatus
        const nextScreen =
          verificationStatus === 'PENDING_REVIEW'
            ? 'driverDashboard'
            : screenOverride ?? currentState.currentScreen

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
            : currentState.driverProfile,
          driverApplicationDraft: currentApplication
            ? { ...currentState.driverApplicationDraft, ...currentApplication }
            : currentState.driverApplicationDraft,
          activeRecheck,
          driverFeedOrders: currentState.driverFeedOrders,
          driverOrders: currentState.driverOrders,
          driverCounterOffers: currentState.driverCounterOffers,
          driverActiveOrder: currentState.driverActiveOrder,
          currentScreen: nextScreen,
        })

        if (me.wallet) {
          const walletTransactions = Array.isArray(me.wallet.transactions)
            ? me.wallet.transactions.map(mapWalletTransactionResponseToState)
            : currentState.driverWallet.transactions
          const topUpRequests = Array.isArray(me.wallet.topUpRequests)
            ? me.wallet.topUpRequests.map(mapTopUpRequestResponseToState)
            : currentState.driverWallet.topUpRequests

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
              chargedOrderIds: currentState.driverWallet.chargedOrderIds,
            }),
            driverWalletTransactions: walletTransactions,
            driverTopUpRequests: topUpRequests,
          })
        }

        driverSnapshotAutoRetryBlockedRef.current = false

        if (verificationStatus === 'APPROVED' && nextScreen !== 'driverMyOrders') {
          await Promise.all([
            refreshDriverWalletRef.current(true),
            refreshDriverWalletTransactionsRef.current(true),
            refreshDriverTopUpRequestsRef.current(true),
            refreshDriverReviewSummaryRef.current(),
            refreshDriverReviewsRef.current(),
            refreshDriverComplaintsRef.current(),
            refreshDriverAnnouncementsRef.current(),
            refreshDriverFeedRef.current(true),
            refreshDriverOffersRef.current(true),
            refreshDriverOrdersRef.current(true),
          ])
        }
      } catch (error) {
        driverSnapshotAutoRetryBlockedRef.current = true

        if (error instanceof BackendAuthError) {
          clearRideAccessToken()
          dispatch({ type: 'resetPassengerSession' })
          return
        }

        dispatch({
          type: 'setDriverFlowError',
          error: error instanceof Error ? error.message : 'Не удалось загрузить driver state.',
        })
      } finally {
        driverSnapshotRequestRef.current = null
      }
    })()

    driverSnapshotRequestRef.current = snapshotRequest
    return snapshotRequest
  }, [dispatch])

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
          refreshDriverAnnouncements(),
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
        await refreshDriverSnapshot('driverDashboard', { manual: true })
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

      await refreshDriverSnapshot('driverDashboard', { manual: true })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      if (error instanceof BackendApiError && /pending review/i.test(error.message)) {
        dispatch({ type: 'setDriverFlowError', error: null })
        await refreshDriverSnapshot('driverDashboard', { manual: true })
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
    if (nextOnline && !canAccessDriverOrders(state)) {
      dispatch({
        type: 'setDriverFlowError',
        error: getDriverAccessGateMessage(state),
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
    if (online && !canAccessDriverOrders(state)) {
      dispatch({
        type: 'setDriverFlowError',
        error: getDriverAccessGateMessage(state),
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

  const purchaseDriverTariffAction = async (tariffId: string | number) => {
    if (state.driverVerificationStatus !== 'APPROVED') {
      throw new Error('Профиль водителя недоступен.')
    }

    dispatch({ type: 'setDriverAccessLoading', loading: true })
    dispatch({ type: 'setDriverAccessError', error: null })

    try {
      const purchased = await purchaseDriverTariffApi(tariffId)
      dispatch({ type: 'setDriverAccess', driverAccess: purchased })
      dispatch({
        type: 'setDriverTariffs',
        driverTariffs: purchased.availableTariffs,
      })

      await refreshDriverWallet(true)
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        throw error
      }

      dispatch({
        type: 'setDriverAccessError',
        error: error instanceof Error ? error.message : 'Не удалось купить тариф.',
      })
      throw error
    } finally {
      dispatch({ type: 'setDriverAccessLoading', loading: false })
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

      if (state.activeRide?.orderId === orderId && state.activeRideRequest) {
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

  const submitRideComplaintAction = async () => {
    dispatch({ type: 'setRideComplaintSubmitting', loading: true })
    dispatch({ type: 'setRideSafetyError', error: null })
    dispatch({ type: 'setRideSafetyNotice', notice: null })

    try {
      const targetType = state.rideComplaintForm.targetType
      const category = state.rideComplaintForm.category
      const message = state.rideComplaintForm.message.trim()
      const reporterRole = state.rideComplaintForm.reporterRole

      if (targetType === 'ORDER') {
        const orderId = state.rideComplaintForm.orderId
        if (!orderId) {
          throw new Error('Не удалось определить заказ для жалобы.')
        }

        const createdComplaint = await createRideOrderComplaintApi(orderId, {
          category,
          message,
        } satisfies CreateRideComplaintPayload)

        dispatch({
          type: 'setOrderComplaints',
          orderComplaints: [mapComplaintResponseToState(createdComplaint), ...state.orderComplaints.filter((item) => item.id !== createdComplaint.id)],
        })

        await refreshOrderComplaints(orderId)
      } else {
        const requestId = state.rideComplaintForm.requestId
        if (!requestId) {
          throw new Error('Не удалось определить заявку для жалобы.')
        }

        const payload = {
          reasonCode: category,
          message,
          contactUnlockId: state.rideComplaintForm.contactUnlockId ?? undefined,
        } satisfies CreateRideRequestComplaintPayload

        if (reporterRole === 'DRIVER') {
          await createDriverRideRequestComplaintApi(requestId, payload)
        } else {
          await createPassengerRideRequestComplaintApi(requestId, payload)
        }
      }

      await (reporterRole === 'DRIVER' ? refreshDriverComplaints() : refreshPassengerComplaints())

      dispatch({ type: 'setRideSafetyNotice', notice: 'Жалоба отправлена. Администратор проверит обращение.' })
      dispatch({ type: 'updateRideComplaintForm', patch: { message: '' } })
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      dispatch({
        type: 'setRideSafetyError',
        error: resolveRideComplaintErrorMessage(error),
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

      void refreshDriverAccess(true)
      void refreshDriverFeed(true)
      void refreshDriverOffers(true)
      void refreshDriverOrders(true)
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        return
      }

      if (error instanceof BackendApiError && error.status === 403) {
        dispatch({
          type: 'setDriverFlowError',
          error: error.message || 'Для отправки предложения купите тариф.',
        })
        void refreshDriverAccess(true)
        dispatch({ type: 'setScreen', screen: 'driverBalance' })
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

  const unlockDriverRequestContactAction = async (requestId: string): Promise<RideRequestContactUnlockResult> => {
    if (state.driverAccess?.hasAccess === false) {
      const error = new Error('Доступ к заявкам закрыт. Купите тариф, чтобы открыть контакт пассажира.')
      dispatch({ type: 'setDriverFlowError', error: error.message })
      throw error
    }

    if ((state.driverAccess?.remainingContactUnlocks ?? 0) <= 0 && !state.driverUnlockedContacts[requestId]) {
      const error = new Error('Контакты закончились. Купите тариф, чтобы открыть контакт пассажира.')
      dispatch({ type: 'setDriverFlowError', error: error.message })
      throw error
    }

    dispatch({ type: 'setDriverActionLoading', loading: true })
    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      const result = await unlockRideRequestContactApi(requestId)

      dispatch({
        type: 'storeDriverUnlockedContact',
        requestId: result.requestId,
        passengerName: result.passengerName,
        alreadyUnlocked: result.alreadyUnlocked,
        contact: {
          phone: result.phone,
          passengerName: result.passengerName,
          remainingContacts: result.remainingContacts,
        },
      })

      return result
    } catch (error) {
      const message = getDriverContactUnlockErrorMessage(error)
      dispatch({
        type: 'setDriverFlowError',
        error: message,
      })

      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
      } else if (error instanceof BackendApiError && ['NO_ACTIVE_PASS', 'NO_CONTACTS_LEFT'].includes(error.code ?? '')) {
        void refreshDriverAccess(true)
      } else if (error instanceof BackendApiError && error.code === 'REQUEST_NOT_AVAILABLE') {
        void refreshDriverFeed(true)
      }

      throw error
    } finally {
      dispatch({ type: 'setDriverActionLoading', loading: false })
    }
  }

  const setDriverRequestContactOutcomeAction = async (
    requestId: string,
    outcome: DriverCallOutcome,
    note?: string,
  ): Promise<RideRequestContactOutcomeResult> => {
    dispatch({ type: 'setDriverActionLoading', loading: true })
    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      const result = await setRideRequestContactOutcomeApi(requestId, { outcome, note })

      dispatch({
        type: 'setDriverRequestContactOutcome',
        requestId: result.requestId,
        passengerName: result.passengerName,
        phone: result.phone,
        outcome: result.callOutcome,
        outcomeAt: result.callOutcomeAt,
        note: result.callOutcomeNote,
      })

      return result
    } catch (error) {
      const message = getDriverContactOutcomeErrorMessage(error)
      dispatch({
        type: 'setDriverFlowError',
        error: message,
      })

      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
      } else if (error instanceof BackendApiError && error.code === 'REQUEST_NOT_FOUND') {
        void refreshDriverFeed(true)
      }

      throw new Error(message, { cause: error })
    } finally {
      dispatch({ type: 'setDriverActionLoading', loading: false })
    }
  }

  const sendDriverCounterOfferAction = async (price: string, comment: string): Promise<DriverCounterOffer> => {
    if (!state.driverCounterOfferRequestId || !canAccessDriverOrders(state) || state.driverActiveOrder) {
      throw new Error('Нельзя отправить предложение для этой заявки.')
    }

    dispatch({ type: 'setDriverActionLoading', loading: true })
    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      const offer = await counterOfferRideRequest(state.driverCounterOfferRequestId, {
        price,
        comment,
      })

      dispatch({
        type: 'setDriverFeedOrders',
        orders: state.driverFeedOrders.map((item) =>
          item.id === state.driverCounterOfferRequestId ? { ...item, status: 'offered' } : item,
        ),
      })
      dispatch({
        type: 'setDriverCounterOffers',
        offers: [
          offer,
          ...state.driverCounterOffers,
        ],
      })

      await Promise.all([
        refreshDriverAccess(true),
        refreshDriverFeed(true),
        refreshDriverOffers(true),
      ])
      return offer
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        throw error
      }

      if (error instanceof BackendApiError && error.status === 403) {
        dispatch({
          type: 'setDriverFlowError',
          error: error.message || 'Для отправки предложения купите тариф.',
        })
        void refreshDriverAccess(true)
        dispatch({ type: 'setScreen', screen: 'driverBalance' })
        throw error
      }

      dispatch({
        type: 'setDriverFlowError',
        error: error instanceof Error ? error.message : 'Не удалось отправить counter offer.',
      })
      throw error
    } finally {
      dispatch({ type: 'setDriverActionLoading', loading: false })
    }
  }

  const withdrawDriverOfferAction = async (offerId: string) => {
    dispatch({ type: 'setDriverActionLoading', loading: true })
    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      const offer = await withdrawDriverOfferApi(offerId)
      dispatch({
        type: 'setDriverCounterOffers',
        offers: [offer, ...state.driverCounterOffers.filter((item) => item.id !== offerId)],
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

  const openDriverAnnouncementEditorAction = (announcementId?: string | null) => {
    const normalizedId = announcementId == null ? null : normalizeAnnouncementId(announcementId)

    if (announcementId != null && !normalizedId) {
      dispatch({
        type: 'setDriverFlowError',
        error: 'Не удалось открыть объявление. Вернитесь к списку и попробуйте снова.',
      })
      return
    }

    dispatch({ type: 'openDriverAnnouncementEditor', announcementId: normalizedId })
  }

  const closeDriverAnnouncementEditorAction = () => {
    dispatch({ type: 'closeDriverAnnouncementEditor' })
  }

  const createDriverAnnouncementAction = async (payload: {
    fromText: string
    toText: string
    scheduledAt: string
    pricePerSeat: number | string
    seatsAvailable: number | string
    comment?: string
    acceptsPassengers: boolean
    acceptsParcels: boolean
  }): Promise<RideDriverAnnouncement> => {
    dispatch({ type: 'setDriverActionLoading', loading: true })
    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      const created = await createDriverAnnouncementApi(payload)

      dispatch({
        type: 'setDriverAnnouncements',
        announcements: [
          created,
          ...stateRef.current.driverAnnouncements.filter((item) => item.id !== created.id),
        ],
      })

      return created
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        throw error
      }

      dispatch({
        type: 'setDriverFlowError',
        error: getDriverAnnouncementActionErrorMessage(
          error,
          'Не удалось сохранить объявление. Проверьте данные и попробуйте снова.',
        ),
      })
      throw error
    } finally {
      dispatch({ type: 'setDriverActionLoading', loading: false })
    }
  }

  const updateDriverAnnouncementAction = async (
    id: string,
    payload: {
      fromText?: string
      toText?: string
      scheduledAt?: string
      pricePerSeat?: number | string
      seatsAvailable?: number | string
      comment?: string
      acceptsPassengers?: boolean
      acceptsParcels?: boolean
    },
  ): Promise<RideDriverAnnouncement> => {
    const normalizedId = normalizeAnnouncementId(id)
    if (!normalizedId) {
      const error = new Error('Не удалось открыть объявление. Вернитесь к списку и попробуйте снова.')
      dispatch({ type: 'setDriverFlowError', error: error.message })
      throw error
    }

    dispatch({ type: 'setDriverActionLoading', loading: true })
    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      const updated = await updateDriverAnnouncementApi(normalizedId, payload)

      dispatch({
        type: 'setDriverAnnouncements',
        announcements: stateRef.current.driverAnnouncements.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      })

      return updated
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        throw error
      }

      dispatch({
        type: 'setDriverFlowError',
        error: getDriverAnnouncementActionErrorMessage(
          error,
          'Не удалось сохранить объявление. Проверьте данные и попробуйте снова.',
        ),
      })
      throw error
    } finally {
      dispatch({ type: 'setDriverActionLoading', loading: false })
    }
  }

  const updateDriverAnnouncementStatusAction = async (
    id: string,
    status: RideDriverAnnouncementStatus,
  ): Promise<RideDriverAnnouncement> => {
    const normalizedId = normalizeAnnouncementId(id)
    if (!normalizedId) {
      const error = new Error('Не удалось открыть объявление. Вернитесь к списку и попробуйте снова.')
      dispatch({ type: 'setDriverFlowError', error: error.message })
      throw error
    }

    dispatch({ type: 'setDriverActionLoading', loading: true })
    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      const updated = await updateDriverAnnouncementStatusApi(normalizedId, status)

      dispatch({
        type: 'setDriverAnnouncements',
        announcements: stateRef.current.driverAnnouncements.map((item) =>
          item.id === updated.id ? updated : item,
        ),
      })

      return updated
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
        throw error
      }

      dispatch({
        type: 'setDriverFlowError',
        error: getDriverAnnouncementActionErrorMessage(
          error,
          'Не удалось обновить объявление. Попробуйте снова.',
        ),
      })
      throw error
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

      void refreshDriverAccess(true)
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
    void refreshDriverSnapshot(undefined, { manual: false })
  }, [state.role, refreshDriverSnapshot])

  useEffect(() => {
    if (state.role !== 'driver' || state.currentScreen === 'driverMyOrders') return

    const refetchDriverSnapshot = () => {
      void refreshDriverSnapshot(undefined, { manual: false })
    }

    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        void refreshDriverSnapshot(undefined, { manual: false })
      }
    }

    window.addEventListener('focus', refetchDriverSnapshot)
    document.addEventListener('visibilitychange', handleVisibilityChange)

    return () => {
      window.removeEventListener('focus', refetchDriverSnapshot)
      document.removeEventListener('visibilitychange', handleVisibilityChange)
    }
  }, [state.currentScreen, state.role, refreshDriverSnapshot])

  useEffect(() => {
    if (
      state.role !== 'driver' ||
      state.driverVerificationStatus !== 'APPROVED' ||
      state.currentScreen === 'driverMyOrders'
    ) {
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
    state.currentScreen,
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
      refreshDriverAccess: () => refreshDriverAccess(),
      refreshDriverSnapshot: () => refreshDriverSnapshot(undefined, { manual: true }),
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
      refreshDriverAnnouncements: () => refreshDriverAnnouncements(),
      refreshDriverOffers: () => refreshDriverOffers(),
      refreshDriverOrders: () => refreshDriverOrders(),
      extendPassengerRideRequest: () => extendPassengerRideRequestAction(),
      updatePassengerRideRequestPrice: (requestedPrice) =>
        updatePassengerRideRequestPriceAction(requestedPrice),
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
      openRideComplaintSheet: (target) =>
        dispatch({ type: 'openRideComplaintSheet', target }),
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
      submitRideComplaint: () => submitRideComplaintAction(),
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
      openDriverCounterOfferSheet: (requestId) =>
        dispatch({ type: 'openDriverCounterOfferSheet', requestId }),
      closeDriverCounterOfferSheet: () =>
        dispatch({ type: 'closeDriverCounterOfferSheet' }),
      sendDriverCounterOffer: (price, comment) =>
        sendDriverCounterOfferAction(price, comment),
      openDriverAnnouncementEditor: (announcementId) =>
        openDriverAnnouncementEditorAction(announcementId),
      closeDriverAnnouncementEditor: () =>
        closeDriverAnnouncementEditorAction(),
      createDriverAnnouncement: (payload) =>
        createDriverAnnouncementAction(payload),
      updateDriverAnnouncement: (id, payload) =>
        updateDriverAnnouncementAction(id, payload),
      updateDriverAnnouncementStatus: (id, status) =>
        updateDriverAnnouncementStatusAction(id, status),
      unlockDriverRequestContact: (requestId) =>
        unlockDriverRequestContactAction(requestId),
      setDriverRequestContactOutcome: (requestId, outcome, note) =>
        setDriverRequestContactOutcomeAction(requestId, outcome, note),
      acceptDemoCounterOfferAsPassenger: (orderId) =>
        dispatch({ type: 'acceptDemoCounterOfferAsPassenger', orderId }),
      acceptDriverFeedOrder: (orderId) => acceptDriverFeedOrderAction(orderId),
      purchaseDriverTariff: (tariffId) => purchaseDriverTariffAction(tariffId),
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
      loadPassengerRequestContactUnlocks: (requestId) => loadPassengerRequestContactUnlocksAction(requestId),
      refreshActiveRideDetails: (orderId) => refreshActiveRideDetails(orderId),
      rejectActiveRideOffer: (offerId) => rejectActiveRideOffer(offerId),
      acceptActiveRideOffer: (offerId) => acceptActiveRideOffer(offerId),
      acceptParcelOffer: (offerId) =>
        dispatch({ type: 'acceptParcelOffer', offerId }),
      setActiveRideStatus: (status) =>
        dispatch({ type: 'setActiveRideStatus', status }),
      setActiveParcelStatus: (status) =>
        dispatch({ type: 'setActiveParcelStatus', status }),
      cancelActiveRide: (payload) => cancelPassengerRideRequestAction(payload),
      closePassengerRequestExternally: (requestId, contactUnlockId, note) =>
        closePassengerRequestExternallyAction(requestId, contactUnlockId, note),
      cancelActiveParcel: () => dispatch({ type: 'cancelActiveParcel' }),
      setPassengerProfile: (profile) =>
        dispatch({ type: 'setPassengerProfile', profile }),
      completeRideAndOpenRating: () =>
        dispatch({ type: 'completeRideAndOpenRating' }),
      completeParcelAndOpenHistory: () =>
        dispatch({ type: 'completeParcelAndOpenHistory' }),
      submitRideRating: (rating, comment) => {
        const orderId = state.activeRide?.orderId ?? state.driverActiveOrder?.id

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
