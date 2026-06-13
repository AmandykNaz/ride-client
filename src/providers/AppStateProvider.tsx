/* eslint-disable react-refresh/only-export-components */

import { createContext, useCallback, useContext, useEffect, useReducer, useRef, type ReactNode } from 'react'

import { defaultScreenByRole } from '../navigation/navigation'
import { BackendAuthError } from '../shared/api/backend'
import { getRideAccessToken, clearRideAccessToken } from '../shared/auth/tokenStorage'
import { getPassengerMe, toRidePassengerProfile } from '../features/passenger/api/passenger.api'
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
import type {
  RideOrder as PassengerRideOrder,
  RideOrderEvent as PassengerRideOrderEvent,
  RideRequest as PassengerRideRequest,
} from '../features/passenger/api/passenger-rides.types'
import type {
  ActiveRide,
  ActiveParcelStatus,
  ActiveRideStatus,
  AppScreen,
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
  PassengerHistoryItem,
  PassengerProfile,
  PassengerStatus,
  ParcelDraft,
  ParcelOrder,
  ParcelRequest,
  ParcelRequestStatus,
  RideDraft,
  RideRequestStatus,
  DriverWallet,
  TopUpRequest,
  TopUpRequestMethod,
  WalletTransaction,
  UserRole,
} from '../types/domain'
import type { CreateRideRequestPayload } from '../features/passenger/api/passenger-rides.types'

type PassengerOrdersTab = 'rides' | 'parcels' | 'buses'
type PassengerFlow = 'ride' | 'parcel' | null

type AppState = {
  role: UserRole
  passengerStatus: PassengerStatus
  driverVerificationStatus: DriverVerificationStatus
  currentScreen: AppScreen
  isMenuOpen: boolean
  passengerProfile: PassengerProfile | null
  driverProfile: DriverProfile | null
  rideDraft: RideDraft
  parcelDraft: ParcelDraft
  driverApplicationDraft: DriverApplicationDraft
  driverRegistrationStep: DriverApplicationStep
  driverWallet: DriverWallet
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
  driverFlowError: string | null
  isTopUpFormOpen: boolean
  topUpForm: {
    amount: string
    method: TopUpRequestMethod
    referenceNumber: string
    screenshotAttached: boolean
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
    uploadDriverDocumentMock: (field: keyof DriverApplicationDraft['documents']) => void
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
    refreshDriverFeed: () => Promise<void>
    refreshDriverOffers: () => Promise<void>
    refreshDriverOrders: () => Promise<void>
    withdrawDriverOffer: (offerId: string) => Promise<void>
    openTopUpForm: () => void
    closeTopUpForm: () => void
    updateTopUpForm: (patch: Partial<AppState['topUpForm']>) => void
    submitTopUpRequest: () => void
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
    setActiveRideStatus: (status: RideRequestStatus) => void
    setActiveParcelStatus: (status: ParcelRequestStatus) => void
    cancelActiveRide: () => Promise<void>
    cancelActiveParcel: () => void
    setPassengerProfile: (profile: PassengerProfile) => void
    completeRideAndOpenRating: () => void
    completeParcelAndOpenHistory: () => void
    submitRideRating: (rating: number, comment: string) => void
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
  | { type: 'setRideListLoading'; loading: boolean }
  | { type: 'setPassengerOrdersLoading'; loading: boolean }
  | { type: 'setRideRequestLoading'; loading: boolean }
  | { type: 'setRideOffersLoading'; loading: boolean }
  | { type: 'setRideActionLoading'; loading: boolean }
  | { type: 'setRideFlowError'; error: string | null }
  | { type: 'setDriverFeedLoading'; loading: boolean }
  | { type: 'setDriverActionLoading'; loading: boolean }
  | { type: 'setDriverFlowError'; error: string | null }
  | { type: 'setPassengerRideRequests'; requests: PassengerRideRequest[] }
  | { type: 'setPassengerRideOrders'; orders: PassengerRideOrder[] }
  | { type: 'setActiveRideEvents'; events: PassengerRideOrderEvent[] }
  | {
      type: 'setDriverSnapshot'
      driverVerificationStatus: DriverVerificationStatus
      driverProfile: DriverProfile | null
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
      field: keyof DriverApplicationDraft['documents']
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
  | { type: 'updateParcelDraft'; patch: Partial<ParcelDraft> }
  | { type: 'openPhoneVerifySheet' }
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
  | { type: 'setActiveRideStatus'; status: RideRequestStatus }
  | { type: 'setActiveParcelStatus'; status: ParcelRequestStatus }
  | { type: 'cancelActiveRide' }
  | { type: 'cancelActiveParcel' }
  | { type: 'completeRideAndOpenRating' }
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
    from: 'Алматы',
    to: 'Шымкент',
    date: '2026-06-12',
    time: '08:00',
    type: 'shared',
    passengersCount: 1,
    comment: '',
    price: 12000,
  }
}

function defaultParcelDraft(): ParcelDraft {
  return {
    senderName: '',
    senderPhone: '',
    receiverName: '',
    receiverPhone: '',
    from: 'Алматы',
    to: 'Шымкент',
    size: 'small',
    weightKg: 2,
    description: '',
    photoAttached: false,
    price: 6000,
  }
}

function defaultDriverApplicationDraft(): DriverApplicationDraft {
  return {
    step: 1,
    fullName: '',
    phone: '',
    city: '',
    frequentRoutes: '',
    vehicleBrand: '',
    vehicleModel: '',
    vehicleYear: '',
    vehiclePlate: '',
    vehicleColor: '',
    vehicleSeats: '',
    vehicleBodyType: 'sedan',
    documents: {
      driverLicenseFront: false,
      driverLicenseBack: false,
      vehicleRegistration: false,
      carFrontPhoto: false,
      carBackPhoto: false,
      interiorPhoto: false,
      trunkPhoto: false,
    },
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
    documents: { ...application.documents },
  }
}

function makeMockOffers(price: number): DriverOffer[] {
  return [
    {
      id: makeId('offer'),
      driverName: 'Нурлан',
      rating: 4.9,
      tripsCount: 184,
      carModel: 'Toyota Camry 70',
      carColor: 'Белый',
      plate: '778 AAB 02',
      etaMinutes: 12,
      originalPrice: price,
      offeredPrice: price,
      isCustomOffer: false,
      comment: 'Без багажа, выезд через 10-15 минут.',
    },
    {
      id: makeId('offer'),
      driverName: 'Айбек',
      rating: 4.8,
      tripsCount: 92,
      carModel: 'Hyundai Elantra',
      carColor: 'Черный',
      plate: '313 KLM 01',
      etaMinutes: 18,
      originalPrice: price,
      offeredPrice: price - 1500,
      isCustomOffer: true,
      comment: 'Водитель предложил свою цену из-за свободного места.',
    },
    {
      id: makeId('offer'),
      driverName: 'Данияр',
      rating: 5,
      tripsCount: 243,
      carModel: 'Kia K5',
      carColor: 'Серый',
      plate: '616 ZZD 02',
      etaMinutes: 9,
      originalPrice: price,
      offeredPrice: price + 500,
      isCustomOffer: false,
      comment: 'Комфортная поездка с кондиционером и остановкой по пути.',
    },
  ]
}

function makeMockParcelOffers(price: number): DriverOffer[] {
  return [
    {
      id: makeId('parcel-offer'),
      driverName: 'Ерлан',
      rating: 4.9,
      tripsCount: 171,
      carModel: 'Toyota Prius',
      carColor: 'Белый',
      plate: '502 KAZ 02',
      etaMinutes: 11,
      originalPrice: price,
      offeredPrice: price,
      isCustomOffer: false,
      comment: 'Аккуратная доставка, есть место в багажнике.',
    },
    {
      id: makeId('parcel-offer'),
      driverName: 'Мадина',
      rating: 5,
      tripsCount: 88,
      carModel: 'Hyundai Tucson',
      carColor: 'Черный',
      plate: '778 MDM 01',
      etaMinutes: 16,
      originalPrice: price,
      offeredPrice: price - 500,
      isCustomOffer: true,
      comment: 'Водитель предложил цену ниже обычной.',
    },
    {
      id: makeId('parcel-offer'),
      driverName: 'Нурсултан',
      rating: 4.8,
      tripsCount: 232,
      carModel: 'Kia Sportage',
      carColor: 'Серый',
      plate: '313 NUR 02',
      etaMinutes: 8,
      originalPrice: price,
      offeredPrice: price + 300,
      isCustomOffer: false,
      comment: 'Быстрый выезд по маршруту.',
    },
  ]
}

function defaultDriverFeedOrders(): DriverFeedOrder[] {
  return [
    {
      id: 'feed-ride-1',
      category: 'ride',
      title: 'Межгород Алматы → Астана',
      from: 'Алматы',
      to: 'Астана',
      date: '2026-06-12',
      time: '09:30',
      requestedPrice: 14500,
      passengersCount: 2,
      rideType: 'shared',
      clientName: 'Айгерим',
      clientPhone: '+7 701 234 56 78',
      comment: 'Можно сделать короткую остановку на кофе.',
      createdMinutesAgo: 8,
      status: 'available',
    },
    {
      id: 'feed-parcel-1',
      category: 'parcel',
      title: 'Посылка Алматы → Караганда',
      from: 'Алматы',
      to: 'Караганда',
      date: '2026-06-12',
      time: '11:00',
      requestedPrice: 6200,
      parcelSize: 'medium',
      parcelDescription: 'Документы и небольшой короб.',
      senderName: 'Данияр',
      receiverName: 'Салтанат',
      receiverPhone: '+7 701 222 33 44',
      clientName: 'Данияр',
      clientPhone: '+7 707 555 22 11',
      comment: 'Нужна аккуратная доставка без пересорта.',
      createdMinutesAgo: 14,
      status: 'available',
    },
    {
      id: 'feed-ride-2',
      category: 'ride',
      title: 'Весь салон Шымкент → Тараз',
      from: 'Шымкент',
      to: 'Тараз',
      date: '2026-06-12',
      time: '15:20',
      requestedPrice: 9800,
      passengersCount: 3,
      rideType: 'full',
      clientName: 'Ержан',
      clientPhone: '+7 708 111 44 55',
      comment: 'Нужен полный салон для семьи с багажом.',
      createdMinutesAgo: 21,
      status: 'available',
    },
    {
      id: 'feed-parcel-2',
      category: 'parcel',
      title: 'Посылка Астана → Павлодар',
      from: 'Астана',
      to: 'Павлодар',
      date: '2026-06-12',
      time: '18:10',
      requestedPrice: 5400,
      parcelSize: 'small',
      parcelDescription: 'Подарочная коробка.',
      senderName: 'Жанна',
      receiverName: 'Марат',
      receiverPhone: '+7 705 333 44 55',
      clientName: 'Жанна',
      clientPhone: '+7 705 888 09 77',
      comment: 'Передать сегодня вечером.',
      createdMinutesAgo: 5,
      status: 'available',
    },
  ]
}

function makeDriverActiveOrder(
  order: DriverFeedOrder,
  price: number,
  driverOfferedPrice?: number,
): DriverActiveOrder {
  return {
    id: makeId('driver-order'),
    sourceOrderId: order.id,
    category: order.category,
    status: 'GOING_TO_CLIENT',
    from: order.from,
    to: order.to,
    price,
    clientName: order.clientName,
    clientPhone: order.clientPhone,
    requestedPrice: order.requestedPrice,
    driverOfferedPrice,
    commissionPreview: Math.round(price * 0.08),
    rideType: order.rideType,
    passengersCount: order.passengersCount,
    parcelSize: order.parcelSize,
    parcelDescription: order.parcelDescription,
    senderName: order.senderName,
    receiverName: order.receiverName,
    receiverPhone: order.receiverPhone,
  }
}

function nextDriverOrderStatus(
  status: DriverActiveOrderStatus,
): DriverActiveOrderStatus {
  switch (status) {
    case 'GOING_TO_CLIENT':
      return 'ARRIVED'
    case 'ARRIVED':
      return 'IN_PROGRESS'
    case 'IN_PROGRESS':
      return 'COMPLETED'
    case 'COMPLETED':
    case 'CANCELLED':
      return status
    default:
      return status
  }
}

function defaultDriverWallet(): DriverWallet {
  return {
    balance: 1500,
    minBalance: 1000,
    transactions: [],
    topUpRequests: [],
    chargedOrderIds: [],
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
  }
}

function makeWalletTransaction(params: {
  type: WalletTransaction['type']
  amount: number
  title: string
  description?: string
  sourceOrderId?: string
  sourceTopUpRequestId?: string
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
  return 'Наличные админу'
}

function canAccessDriverOrders(state: Pick<AppState, 'driverVerificationStatus' | 'driverWallet'>) {
  return (
    state.driverVerificationStatus === 'APPROVED' &&
    state.driverWallet.balance >= state.driverWallet.minBalance
  )
}

function createTopUpRequestFromForm(
  form: AppState['topUpForm'],
): TopUpRequest {
  return {
    id: makeId('topup'),
    amount: Number(form.amount),
    method: form.method,
    referenceNumber: form.referenceNumber.trim(),
    screenshotAttached: form.screenshotAttached,
    status: 'PENDING_REVIEW',
    createdAt: new Date().toISOString(),
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

  return {
    driverWallet: updatedWallet,
    driverActiveOrder: {
      ...activeOrder,
      commissionCharged: true,
      completedBalanceBefore: beforeBalance,
      completedBalanceAfter: afterBalance,
    },
    driverProfile: syncDriverProfileWithWallet(state.driverProfile, updatedWallet),
  }
}

function isOpenRideRequestStatus(status: RideRequestStatus) {
  return status === 'SEARCHING' || status === 'OFFERED' || status === 'ACCEPTED'
}

function isActiveRideOrderStatus(status: string) {
  return [
    'DRIVER_ASSIGNED',
    'DRIVER_ON_WAY',
    'DRIVER_ARRIVED',
    'IN_PROGRESS',
    'DISPUTE',
    'DRIVER_COMING',
    'ARRIVED',
    'ACCEPTED',
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

function buildRideRequestPayload(rideDraft: RideDraft): CreateRideRequestPayload {
  return {
    serviceType: 'ride',
    rideType: rideDraft.type,
    originText: rideDraft.from,
    destinationText: rideDraft.to,
    pickupAddress: rideDraft.from,
    dropoffAddress: rideDraft.to,
    price: rideDraft.price,
    comment: rideDraft.comment,
  }
}

function createActiveRideRequest(state: AppState): AppState {
  const requestId = makeId('req')
  const request: PassengerRideRequest = {
    id: requestId,
    serviceType: 'ride',
    rideType: state.rideDraft.type,
    time: state.rideDraft.time,
    type: state.rideDraft.type,
    passengersCount: state.rideDraft.passengersCount,
    status: 'SEARCHING',
    from: state.rideDraft.from,
    to: state.rideDraft.to,
    date: state.rideDraft.date,
    price: state.rideDraft.price,
    originText: state.rideDraft.from,
    destinationText: state.rideDraft.to,
    comment: state.rideDraft.comment,
    createdAt: new Date().toISOString(),
    offersCount: 0,
    raw: null,
  }

  return {
    ...state,
    activeRideRequest: request,
    driverOffers: makeMockOffers(state.rideDraft.price),
    currentScreen: 'passengerOffers',
    isPhoneVerifySheetOpen: false,
    isPassengerOnboardingOpen: false,
  }
}

function createActiveParcelRequest(state: AppState): AppState {
  const requestId = makeId('parcel-req')
  const request: ParcelRequest = {
    id: requestId,
    status: 'SEARCHING',
    ...state.parcelDraft,
  }

  return {
    ...state,
    activeParcelRequest: request,
    parcelOffers: makeMockParcelOffers(state.parcelDraft.price),
    currentScreen: 'parcelOffers',
    isPhoneVerifySheetOpen: false,
    isPassengerOnboardingOpen: false,
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
        ...state,
        role: action.role,
        currentScreen: action.screen,
        isMenuOpen: false,
      }
    case 'setPassengerStatus':
      return { ...state, passengerStatus: action.status }
    case 'resetPassengerSession':
      return {
        ...state,
        passengerStatus: 'GUEST',
        passengerProfile: null,
        driverVerificationStatus: 'NOT_STARTED',
        driverProfile: null,
        driverApplicationDraft: defaultDriverApplicationDraft(),
        driverRegistrationStep: 1,
        driverFeedOrders: defaultDriverFeedOrders(),
        driverOrders: [],
        driverActiveOrder: null,
        driverCounterOffers: [],
        isDriverCounterOfferSheetOpen: false,
        driverCounterOfferOrderId: null,
        driverCounterOfferPrice: '',
        driverCounterOfferComment: '',
        isDriverFeedLoading: false,
        isDriverActionLoading: false,
        driverFlowError: null,
        driverWallet: defaultDriverWallet(),
        verifiedPhone: '',
        pendingPassengerFlow: null,
        passengerRideRequests: [],
        passengerRideOrders: [],
        activeRideEvents: [],
        activeRideRequest: null,
        activeRide: null,
        driverOffers: [],
        isRideListLoading: false,
        isPassengerOrdersLoading: false,
        isRideRequestLoading: false,
        isRideOffersLoading: false,
        isRideActionLoading: false,
        rideFlowError: null,
        isPhoneVerifySheetOpen: false,
        isPassengerOnboardingOpen: false,
        isPassengerRatingOpen: false,
        currentScreen: defaultScreenByRole.passenger,
        role: 'passenger',
        isMenuOpen: false,
      }
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
    case 'setPassengerRideRequests':
      return { ...state, passengerRideRequests: action.requests }
    case 'setPassengerRideOrders':
      return { ...state, passengerRideOrders: action.orders }
    case 'setActiveRideEvents':
      return { ...state, activeRideEvents: action.events }
    case 'setDriverSnapshot':
      return {
        ...state,
        driverVerificationStatus: action.driverVerificationStatus,
        driverProfile: action.driverProfile,
        driverApplicationDraft: action.driverApplicationDraft,
        driverFeedOrders: action.driverFeedOrders,
        driverOrders: action.driverOrders,
        driverCounterOffers: action.driverCounterOffers,
        driverActiveOrder: action.driverActiveOrder,
        currentScreen: action.currentScreen ?? state.currentScreen,
        driverFlowError: null,
      }
    case 'setDriverFeedOrders':
      return { ...state, driverFeedOrders: action.orders }
    case 'setDriverCounterOffers':
      return { ...state, driverCounterOffers: action.offers }
    case 'setDriverOrders':
      return { ...state, driverOrders: action.orders }
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
      if (action.field === 'documents') {
        return state
      }

      return {
        ...state,
        driverApplicationDraft: {
          ...state.driverApplicationDraft,
          [action.field]: action.value,
        } as DriverApplicationDraft,
      }
    }
    case 'uploadDriverDocumentMock':
      return {
        ...state,
        driverApplicationDraft: {
          ...state.driverApplicationDraft,
          documents: {
            ...state.driverApplicationDraft.documents,
            [action.field]: !state.driverApplicationDraft.documents[action.field],
          },
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
      const approvedProfile = makeDriverProfileFromApplication(state.driverApplicationDraft)
      const wallet = {
        ...state.driverWallet,
        balance: state.driverWallet.balance || approvedProfile.balance,
        minBalance: state.driverWallet.minBalance || approvedProfile.minBalance,
      }

      return {
        ...state,
        driverVerificationStatus: 'APPROVED',
        driverProfile: syncDriverProfileWithWallet(
          {
            ...approvedProfile,
            balance: wallet.balance,
            minBalance: wallet.minBalance,
          },
          wallet,
        ),
        driverWallet: wallet,
        currentScreen: 'driverDashboard',
        isMenuOpen: false,
        role: 'driver',
      }
    }
    case 'demoRequestDriverChanges':
      return {
        ...state,
        driverVerificationStatus: 'NEEDS_CHANGES',
        driverApplicationDraft: {
          ...state.driverApplicationDraft,
          moderatorComment:
            action.comment ??
            'Проверьте фото документов и заполните госномер без сокращений.',
        },
        currentScreen: 'driverDashboard',
        isMenuOpen: false,
        role: 'driver',
      }
    case 'demoBlockDriver':
      return {
        ...state,
        driverVerificationStatus: 'BLOCKED',
        driverApplicationDraft: {
          ...state.driverApplicationDraft,
          moderatorComment:
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
      return {
        ...state,
        driverProfile: state.driverProfile
          ? {
              ...state.driverProfile,
              isOnline:
                state.driverWallet.balance >= state.driverWallet.minBalance
                  ? !state.driverProfile.isOnline
                  : false,
            }
          : state.driverProfile,
      }
    case 'setDriverOnline':
      return {
        ...state,
        driverProfile: state.driverProfile
          ? {
              ...state.driverProfile,
              isOnline: action.online && state.driverWallet.balance >= state.driverWallet.minBalance,
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
          method: 'KASPI',
          referenceNumber: '',
          screenshotAttached: false,
        },
      }
    case 'updateTopUpForm':
      return {
        ...state,
        topUpForm: { ...state.topUpForm, ...action.patch },
      }
    case 'submitTopUpRequest': {
      const amount = Number(state.topUpForm.amount)
      if (!Number.isFinite(amount) || amount <= 0 || !state.topUpForm.referenceNumber.trim()) {
        return state
      }

      const request = createTopUpRequestFromForm(state.topUpForm)

      return {
        ...state,
        driverWallet: {
          ...state.driverWallet,
          topUpRequests: [request, ...state.driverWallet.topUpRequests],
        },
        isTopUpFormOpen: false,
        topUpForm: {
          amount: '',
          method: 'KASPI',
          referenceNumber: '',
          screenshotAttached: false,
        },
      }
    }
    case 'demoApproveTopUpRequest': {
      const request = state.driverWallet.topUpRequests.find((item) => item.id === action.requestId)
      if (!request || request.status !== 'PENDING_REVIEW') return state

      const updatedRequest = {
        ...request,
        status: 'APPROVED' as const,
        reviewedAt: new Date().toISOString(),
      }

      const updatedWallet: DriverWallet = {
        ...state.driverWallet,
        balance: state.driverWallet.balance + request.amount,
        transactions: [
          makeWalletTransaction({
            type: 'TOP_UP_APPROVED',
            amount: request.amount,
            title: 'Пополнение баланса',
            description: `${formatTopUpMethod(request.method)} · ${request.referenceNumber}`,
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
        driverProfile: syncDriverProfileWithWallet(state.driverProfile, updatedWallet),
      }
    }
    case 'demoRejectTopUpRequest': {
      const request = state.driverWallet.topUpRequests.find((item) => item.id === action.requestId)
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
                  rejectReason: 'Платеж не найден',
                }
              : item,
          ),
        },
      }
    }
    case 'chargeCommissionForCompletedOrder': {
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
      const activeOrder = state.driverActiveOrder
      if (!activeOrder || activeOrder.sourceOrderId !== action.orderId) return state

      const commission = Math.round(activeOrder.price * 0.08)
      const alreadyRefunded = state.driverWallet.transactions.some(
        (item) => item.type === 'COMMISSION_REFUND' && item.sourceOrderId === action.orderId,
      )

      if (alreadyRefunded) return state

      const updatedWallet: DriverWallet = {
        ...state.driverWallet,
        balance: state.driverWallet.balance + commission,
        transactions: [
          makeWalletTransaction({
            type: 'COMMISSION_REFUND',
            amount: commission,
            title: 'Возврат комиссии',
            description: `${activeOrder.from} → ${activeOrder.to}`,
            sourceOrderId: action.orderId,
          }),
          ...state.driverWallet.transactions,
        ],
      }

      return {
        ...state,
        driverWallet: updatedWallet,
        driverProfile: syncDriverProfileWithWallet(state.driverProfile, updatedWallet),
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
      if (state.driverActiveOrder || !canAccessDriverOrders(state)) return state

      const pendingOffer = state.driverCounterOffers.find((item) =>
        action.orderId ? item.orderId === action.orderId : item.status === 'pending',
      )

      if (!pendingOffer) return state

      const order = state.driverFeedOrders.find((item) => item.id === pendingOffer.orderId)

      if (!order) return state

      return {
        ...state,
        driverCounterOffers: state.driverCounterOffers.map((item) =>
          item.id === pendingOffer.id ? { ...item, status: 'accepted' } : item,
        ),
        driverFeedOrders: state.driverFeedOrders.map((item) =>
          item.id === order.id ? { ...item, status: 'accepted' } : item,
        ),
        driverActiveOrder: makeDriverActiveOrder(order, pendingOffer.offeredPrice, pendingOffer.offeredPrice),
        currentScreen: 'driverOrders',
        isDriverCounterOfferSheetOpen: false,
        driverCounterOfferOrderId: null,
      }
    }
    case 'acceptDriverFeedOrder': {
      if (state.driverActiveOrder || !canAccessDriverOrders(state)) return state

      const order = state.driverFeedOrders.find((item) => item.id === action.orderId)

      if (!order) return state

      return {
        ...state,
        driverFeedOrders: state.driverFeedOrders.filter((item) => item.id !== order.id),
        driverActiveOrder: makeDriverActiveOrder(order, order.requestedPrice),
        currentScreen: 'driverOrders',
        isMenuOpen: false,
      }
    }
    case 'driverOrderNextStatus': {
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
    case 'updateParcelDraft':
      return { ...state, parcelDraft: { ...state.parcelDraft, ...action.patch } }
    case 'openPhoneVerifySheet':
      return { ...state, isPhoneVerifySheetOpen: true }
    case 'closePhoneVerifySheet':
      return { ...state, isPhoneVerifySheetOpen: false }
    case 'openPassengerOnboarding':
      return { ...state, isPassengerOnboardingOpen: true, isPhoneVerifySheetOpen: false }
    case 'closePassengerOnboarding':
      return { ...state, isPassengerOnboardingOpen: false }
    case 'openPassengerRating':
      return { ...state, isPassengerRatingOpen: true }
    case 'closePassengerRating':
      return { ...state, isPassengerRatingOpen: false }
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
        ...createActiveRideRequest(state),
        pendingPassengerFlow: null,
      }
    case 'createParcelFromDraft':
    case 'startParcelSearch':
      return {
        ...createActiveParcelRequest(state),
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
          status: 'ACCEPTED',
          selectedOfferId: offer.id,
        },
        activeRide: {
          id: makeId('ride'),
          requestId: state.activeRideRequest.id,
          status: 'DRIVER_COMING',
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
      if (!state.activeParcelRequest) return state
      const offer = state.parcelOffers.find((item) => item.id === action.offerId)

      if (!offer) return state

      return {
        ...state,
        activeParcelRequest: {
          ...state.activeParcelRequest,
          status: 'ACCEPTED',
          selectedOfferId: offer.id,
        },
        activeParcelOrder: {
          id: makeId('parcel'),
          requestId: state.activeParcelRequest.id,
          status: 'DRIVER_COMING',
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
      if (!state.activeRideRequest) return state
      return {
        ...state,
        activeRideRequest: { ...state.activeRideRequest, status: action.status },
        activeRide: state.activeRide
          ? {
              ...state.activeRide,
              status: action.status as ActiveRideStatus,
            }
          : state.activeRide,
      }
    case 'setActiveParcelStatus':
      if (!state.activeParcelRequest) return state
      return {
        ...state,
        activeParcelRequest: {
          ...state.activeParcelRequest,
          status: action.status,
        },
        activeParcelOrder: state.activeParcelOrder
          ? {
              ...state.activeParcelOrder,
              status: action.status as ActiveParcelStatus,
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
      return {
        ...state,
        activeRide: state.activeRide
          ? { ...state.activeRide, status: 'COMPLETED' }
          : state.activeRide,
        activeRideRequest: state.activeRideRequest
          ? { ...state.activeRideRequest, status: 'COMPLETED' }
          : state.activeRideRequest,
        isPassengerRatingOpen: true,
      }
    case 'completeParcelAndOpenHistory': {
      if (!state.activeParcelRequest || !state.activeParcelOrder) return state
      const completedParcelOrder = {
        ...state.activeParcelOrder,
        status: 'COMPLETED' as ActiveParcelStatus,
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
        date: state.rideDraft.date,
        time: state.rideDraft.time,
        type: 'shared',
        passengersCount: 1,
        comment: '',
        price: action.ride.price,
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

const initialState: AppState = {
  role: 'passenger',
  passengerStatus: 'GUEST',
  driverVerificationStatus: 'NOT_STARTED',
  currentScreen: defaultScreenByRole.passenger,
  isMenuOpen: false,
  passengerProfile: null,
  driverProfile: null,
  rideDraft: defaultRideDraft(),
  parcelDraft: defaultParcelDraft(),
  driverApplicationDraft: defaultDriverApplicationDraft(),
  driverRegistrationStep: 1,
  driverWallet: defaultDriverWallet(),
  driverFeedOrders: defaultDriverFeedOrders(),
  driverOrders: [],
  driverActiveOrder: null,
  driverCounterOffers: [],
  isDriverCounterOfferSheetOpen: false,
  driverCounterOfferOrderId: null,
  driverCounterOfferPrice: '',
  driverCounterOfferComment: '',
  isDriverFeedLoading: false,
  isDriverActionLoading: false,
  driverFlowError: null,
  isTopUpFormOpen: false,
  topUpForm: {
    amount: '',
    method: 'KASPI',
    referenceNumber: '',
    screenshotAttached: false,
  },
  activeRideRequest: null,
  driverOffers: [],
  activeRide: null,
  activeRideEvents: [],
  passengerRideRequests: [],
  passengerRideOrders: [],
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

const AppStateContext = createContext<AppContextValue | null>(null)

export function AppStateProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(appReducer, initialState)
  const didHydrateRef = useRef(false)
  const loadedRideTokenRef = useRef<string | null>(null)
  const loadedDriverTokenRef = useRef<string | null>(null)
  const driverApplicationIdRef = useRef<string | null>(null)

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
      const detailedRequest = selectedRequest
        ? await getRideRequest(selectedRequest.id).catch(() => selectedRequest)
        : null
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
        return
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

  const loadActiveRequestOffers = async () => {
    const activeRequest = state.activeRideRequest

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

    dispatch({ type: 'setRideOffersLoading', loading: true })
    dispatch({ type: 'setRideFlowError', error: null })

    try {
      const response = await getRideRequestOffers(activeRequest.id)
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
        currentScreen: isActive
          ? 'passengerActiveRide'
          : state.currentScreen === 'passengerActiveRide'
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
    if (didHydrateRef.current) return
    didHydrateRef.current = true

    if (!getRideAccessToken()) return

    let cancelled = false

    const hydratePassengerSession = async () => {
      try {
        const me = await getPassengerMe()

        if (cancelled) return

        const profile = toRidePassengerProfile(me)
        dispatch({ type: 'setPassengerProfile', profile })

        if (profile.phone) {
          dispatch({ type: 'setVerifiedPhone', phone: profile.phone })
        }
      } catch (error) {
        if (cancelled) return

        if (error instanceof BackendAuthError) {
          dispatch({ type: 'resetPassengerSession' })
        }
      }
    }

    void hydratePassengerSession()

    return () => {
      cancelled = true
    }
  }, [])

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
    clearRideAccessToken()
    loadedRideTokenRef.current = null
    loadedDriverTokenRef.current = null
    driverApplicationIdRef.current = null
    dispatch({ type: 'resetPassengerSession' })
  }

  const startPassengerRideSearch = async () => {
    dispatch({ type: 'setRideRequestLoading', loading: true })
    dispatch({ type: 'setRideFlowError', error: null })

    try {
      const createdRequest = await createRideRequest(buildRideRequestPayload(state.rideDraft))

      dispatch({
        type: 'setPassengerRideSnapshot',
        passengerRideRequests: [
          createdRequest,
          ...state.passengerRideRequests.filter((item) => item.id !== createdRequest.id),
        ],
        passengerRideOrders: [],
        activeRideRequest: isOpenRideRequestStatus(createdRequest.status) ? createdRequest : null,
        driverOffers: [],
        activeRide: null,
        activeRideEvents: [],
        currentScreen: isOpenRideRequestStatus(createdRequest.status)
          ? 'passengerOffers'
          : 'passengerOrder',
        clearCurrentRide: !isOpenRideRequestStatus(createdRequest.status),
      })

      void refreshPassengerRideSnapshot()
    } catch (error) {
      if (error instanceof BackendAuthError) {
        logoutPassengerSession()
        return
      }

      dispatch({
        type: 'setRideFlowError',
        error: error instanceof Error ? error.message : 'Не удалось создать заявку.',
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
                status: 'ACCEPTED',
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
              status: 'ACCEPTED',
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

    dispatch({ type: 'setRideActionLoading', loading: true })
    dispatch({ type: 'setRideFlowError', error: null })

    try {
      const cancelledRequest = await cancelRideRequest(state.activeRideRequest.id)

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
        (activeOrderResponse &&
        activeOrderResponse.status !== 'COMPLETED' &&
        activeOrderResponse.status !== 'CANCELLED'
          ? activeOrderResponse
          : null) ??
        ordersResponse.items.find(
          (item) => item.status !== 'COMPLETED' && item.status !== 'CANCELLED',
        ) ??
        (state.driverActiveOrder &&
        (state.driverActiveOrder.status === 'COMPLETED' || state.driverActiveOrder.status === 'CANCELLED')
          ? state.driverActiveOrder
          : null)

      dispatch({ type: 'setDriverOrders', orders: ordersResponse.items })
      dispatch({
        type: 'setDriverActiveOrder',
        order: activeOrder,
        currentScreen:
          activeOrder && state.currentScreen !== 'driverOrders'
            ? 'driverOrders'
            : state.currentScreen,
      })
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
  }, [dispatch, state.currentScreen, state.driverActiveOrder, state.driverVerificationStatus])

  const refreshDriverSnapshot = useCallback(async () => {
    const token = getRideAccessToken()

    if (!token) {
      loadedDriverTokenRef.current = null
      return
    }

    try {
      const me = await getDriverMe()
      driverApplicationIdRef.current = me.applicationId ?? me.application?.id ?? null

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
              verificationStatus,
              isOnline: me.isOnline,
            }
          : state.driverProfile,
        driverApplicationDraft: me.application ?? state.driverApplicationDraft,
        driverFeedOrders: state.driverFeedOrders,
        driverOrders: state.driverOrders,
        driverCounterOffers: state.driverCounterOffers,
        driverActiveOrder: state.driverActiveOrder,
        currentScreen: state.currentScreen,
      })

      if (verificationStatus === 'APPROVED') {
        await Promise.all([
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
    state.driverVerificationStatus,
  ])

  const saveDriverApplication = async () => {
    const application = state.driverApplicationDraft
    const shouldUpdate = Boolean(driverApplicationIdRef.current)

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
      await saveDriverApplication()
      const submitted = await submitDriverApplicationApi()
      driverApplicationIdRef.current = submitted.applicationId ?? submitted.application?.id ?? driverApplicationIdRef.current

      dispatch({
        type: 'setDriverSnapshot',
        driverVerificationStatus: submitted.verificationStatus,
        driverProfile: submitted.profile ?? state.driverProfile,
        driverApplicationDraft: submitted.application ?? state.driverApplicationDraft,
        driverFeedOrders: state.driverFeedOrders,
        driverOrders: state.driverOrders,
        driverCounterOffers: state.driverCounterOffers,
        driverActiveOrder: state.driverActiveOrder,
        currentScreen: 'driverDashboard',
      })

      void refreshDriverSnapshot()
    } catch (error) {
      if (error instanceof BackendAuthError) {
        clearRideAccessToken()
        dispatch({ type: 'resetPassengerSession' })
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

    dispatch({ type: 'setDriverActionLoading', loading: true })
    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      const result = await setDriverOnlineApi(!state.driverProfile.isOnline)
      dispatch({
        type: 'setDriverSnapshot',
        driverVerificationStatus: result.verificationStatus,
        driverProfile: result.profile ?? state.driverProfile,
        driverApplicationDraft: result.application ?? state.driverApplicationDraft,
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
    if (state.driverProfile.isOnline === online) return

    dispatch({ type: 'setDriverActionLoading', loading: true })
    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      const result = await setDriverOnlineApi(online)
      dispatch({
        type: 'setDriverSnapshot',
        driverVerificationStatus: result.verificationStatus,
        driverProfile: result.profile ?? state.driverProfile,
        driverApplicationDraft: result.application ?? state.driverApplicationDraft,
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

  const acceptDriverFeedOrderAction = async (orderId: string) => {
    if (state.driverActiveOrder || !canAccessDriverOrders(state)) return

    dispatch({ type: 'setDriverActionLoading', loading: true })
    dispatch({ type: 'setDriverFlowError', error: null })

    try {
      const accepted = await acceptRideRequestPrice(orderId)
      const activeOrder = await getActiveDriverOrder().catch(() => accepted)
      dispatch({
        type: 'setDriverFeedOrders',
        orders: state.driverFeedOrders.filter((item) => item.id !== orderId),
      })
      dispatch({
        type: 'setDriverActiveOrder',
        order: activeOrder ?? accepted,
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
      state.driverActiveOrder.status === 'GOING_TO_CLIENT'
        ? 'DRIVER_ARRIVED'
        : state.driverActiveOrder.status === 'ARRIVED'
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
      refreshDriverFeed: () => refreshDriverFeed(),
      refreshDriverOffers: () => refreshDriverOffers(),
      refreshDriverOrders: () => refreshDriverOrders(),
      startDriverRegistration: () => dispatch({ type: 'startDriverRegistration' }),
      updateDriverApplicationField: (field, value) =>
        dispatch({ type: 'updateDriverApplicationField', field, value }),
      uploadDriverDocumentMock: (field) =>
        dispatch({ type: 'uploadDriverDocumentMock', field }),
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
      submitTopUpRequest: () => dispatch({ type: 'submitTopUpRequest' }),
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
      updateParcelDraft: (patch) =>
        dispatch({ type: 'updateParcelDraft', patch }),
      openPhoneVerifySheet: () => dispatch({ type: 'openPhoneVerifySheet' }),
      closePhoneVerifySheet: () => dispatch({ type: 'closePhoneVerifySheet' }),
      openPassengerOnboarding: () => dispatch({ type: 'openPassengerOnboarding' }),
      closePassengerOnboarding: () => dispatch({ type: 'closePassengerOnboarding' }),
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
      submitRideRating: (rating, comment) =>
        dispatch({ type: 'submitRideRating', rating, comment }),
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
