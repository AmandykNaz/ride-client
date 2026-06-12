import { createContext, useContext, useReducer, type ReactNode } from 'react'

import { defaultScreenByRole } from '../navigation/navigation'
import type {
  ActiveRide,
  ActiveParcelStatus,
  ActiveRideStatus,
  AppScreen,
  DriverApplicationDraft,
  DriverApplicationStep,
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
  RideRequest,
  RideRequestStatus,
  UserRole,
} from '../types/domain'

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
  activeRideRequest: RideRequest | null
  driverOffers: DriverOffer[]
  activeRide: ActiveRide | null
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
    setDriverVerificationStatus: (status: DriverVerificationStatus) => void
    setPendingPassengerFlow: (flow: PassengerFlow) => void
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
    startRideSearch: () => void
    startParcelSearch: () => void
    createRideFromDraft: () => void
    createParcelFromDraft: () => void
    acceptOffer: (offerId: string) => void
    acceptParcelOffer: (offerId: string) => void
    setActiveRideStatus: (status: RideRequestStatus) => void
    setActiveParcelStatus: (status: ParcelRequestStatus) => void
    cancelActiveRide: () => void
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

function createActiveRideRequest(state: AppState): AppState {
  const requestId = makeId('req')
  const request: RideRequest = {
    id: requestId,
    status: 'SEARCHING',
    ...state.rideDraft,
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
    case 'setDriverVerificationStatus':
      return {
        ...state,
        driverVerificationStatus: action.status,
        driverProfile:
          action.status === 'APPROVED' && state.driverProfile
            ? { ...state.driverProfile, verificationStatus: 'APPROVED' }
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

      return {
        ...state,
        driverVerificationStatus: 'APPROVED',
        driverProfile: approvedProfile,
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
          ? { ...state.driverProfile, isOnline: !state.driverProfile.isOnline }
          : state.driverProfile,
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
  activeRideRequest: null,
  driverOffers: [],
  activeRide: null,
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
      setDriverVerificationStatus: (status) =>
        dispatch({ type: 'setDriverVerificationStatus', status }),
      setPendingPassengerFlow: (flow) =>
        dispatch({ type: 'setPendingPassengerFlow', flow }),
      startDriverRegistration: () => dispatch({ type: 'startDriverRegistration' }),
      updateDriverApplicationField: (field, value) =>
        dispatch({ type: 'updateDriverApplicationField', field, value }),
      uploadDriverDocumentMock: (field) =>
        dispatch({ type: 'uploadDriverDocumentMock', field }),
      nextDriverRegistrationStep: () =>
        dispatch({ type: 'nextDriverRegistrationStep' }),
      prevDriverRegistrationStep: () =>
        dispatch({ type: 'prevDriverRegistrationStep' }),
      submitDriverApplication: () => dispatch({ type: 'submitDriverApplication' }),
      demoApproveDriver: () => dispatch({ type: 'demoApproveDriver' }),
      demoRequestDriverChanges: (comment) =>
        dispatch({ type: 'demoRequestDriverChanges', comment }),
      demoBlockDriver: (comment) => dispatch({ type: 'demoBlockDriver', comment }),
      returnToPassengerMode: () => dispatch({ type: 'returnToPassengerMode' }),
      editDriverApplicationAfterChanges: () =>
        dispatch({ type: 'editDriverApplicationAfterChanges' }),
      toggleDriverOnlineStatus: () =>
        dispatch({ type: 'toggleDriverOnlineStatus' }),
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
      startRideSearch: () => dispatch({ type: 'startRideSearch' }),
      startParcelSearch: () => dispatch({ type: 'startParcelSearch' }),
      createRideFromDraft: () => dispatch({ type: 'createRideFromDraft' }),
      createParcelFromDraft: () => dispatch({ type: 'createParcelFromDraft' }),
      acceptOffer: (offerId) => dispatch({ type: 'acceptOffer', offerId }),
      acceptParcelOffer: (offerId) =>
        dispatch({ type: 'acceptParcelOffer', offerId }),
      setActiveRideStatus: (status) =>
        dispatch({ type: 'setActiveRideStatus', status }),
      setActiveParcelStatus: (status) =>
        dispatch({ type: 'setActiveParcelStatus', status }),
      cancelActiveRide: () => dispatch({ type: 'cancelActiveRide' }),
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
