import { createContext, useContext, useReducer, type ReactNode } from 'react'

import { defaultScreenByRole } from '../navigation/navigation'
import type {
  ActiveRide,
  ActiveRideStatus,
  AppScreen,
  DriverOffer,
  DriverVerificationStatus,
  PassengerHistoryItem,
  PassengerProfile,
  PassengerStatus,
  RideDraft,
  RideRequest,
  RideRequestStatus,
  UserRole,
} from '../types/domain'

type PassengerOrdersTab = 'rides' | 'parcels' | 'buses'

type AppState = {
  role: UserRole
  passengerStatus: PassengerStatus
  driverVerificationStatus: DriverVerificationStatus
  currentScreen: AppScreen
  isMenuOpen: boolean
  passengerProfile: PassengerProfile | null
  rideDraft: RideDraft
  activeRideRequest: RideRequest | null
  driverOffers: DriverOffer[]
  activeRide: ActiveRide | null
  passengerHistory: PassengerHistoryItem[]
  passengerOrdersTab: PassengerOrdersTab
  verifiedPhone: string
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
    updateRideDraft: (patch: Partial<RideDraft>) => void
    openPhoneVerifySheet: () => void
    closePhoneVerifySheet: () => void
    openPassengerOnboarding: () => void
    closePassengerOnboarding: () => void
    openPassengerRating: () => void
    closePassengerRating: () => void
    setPassengerOrdersTab: (tab: PassengerOrdersTab) => void
    setVerifiedPhone: (phone: string) => void
    startRideSearch: () => void
    createRideFromDraft: () => void
    acceptOffer: (offerId: string) => void
    setActiveRideStatus: (status: RideRequestStatus) => void
    cancelActiveRide: () => void
    setPassengerProfile: (profile: PassengerProfile) => void
    completeRideAndOpenRating: () => void
    submitRideRating: (rating: number, comment: string) => void
    repeatRide: (ride: PassengerHistoryItem) => void
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
  | { type: 'updateRideDraft'; patch: Partial<RideDraft> }
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
  | { type: 'createRideFromDraft' }
  | { type: 'acceptOffer'; offerId: string }
  | { type: 'setActiveRideStatus'; status: RideRequestStatus }
  | { type: 'cancelActiveRide' }
  | { type: 'completeRideAndOpenRating' }
  | { type: 'submitRideRating'; rating: number; comment: string }
  | { type: 'repeatRide'; ride: PassengerHistoryItem }

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
      return { ...state, driverVerificationStatus: action.status }
    case 'updateRideDraft':
      return { ...state, rideDraft: { ...state.rideDraft, ...action.patch } }
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
    case 'createRideFromDraft': {
      const requestId = makeId('req')
      return {
        ...state,
        activeRideRequest: {
          id: requestId,
          status: 'SEARCHING',
          ...state.rideDraft,
        },
        driverOffers: makeMockOffers(state.rideDraft.price),
        currentScreen: 'passengerOffers',
      }
    }
    case 'startRideSearch':
      return createActiveRideRequest(state)
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
  rideDraft: defaultRideDraft(),
  activeRideRequest: null,
  driverOffers: [],
  activeRide: null,
  passengerHistory: [],
  passengerOrdersTab: 'rides',
  verifiedPhone: '',
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
      updateRideDraft: (patch) => dispatch({ type: 'updateRideDraft', patch }),
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
      createRideFromDraft: () => dispatch({ type: 'createRideFromDraft' }),
      acceptOffer: (offerId) => dispatch({ type: 'acceptOffer', offerId }),
      setActiveRideStatus: (status) =>
        dispatch({ type: 'setActiveRideStatus', status }),
      cancelActiveRide: () => dispatch({ type: 'cancelActiveRide' }),
      setPassengerProfile: (profile) =>
        dispatch({ type: 'setPassengerProfile', profile }),
      completeRideAndOpenRating: () =>
        dispatch({ type: 'completeRideAndOpenRating' }),
      submitRideRating: (rating, comment) =>
        dispatch({ type: 'submitRideRating', rating, comment }),
      repeatRide: (ride) => dispatch({ type: 'repeatRide', ride }),
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
