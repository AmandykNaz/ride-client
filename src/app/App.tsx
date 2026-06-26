import { AppStateProvider, useAppState } from '../providers/AppStateProvider'
import { MobileShell } from './MobileShell'
import { ScreenRenderer } from './ScreenRenderer'
import { PhoneVerifySheet } from '../features/passenger/components/PhoneVerifySheet'
import { PassengerRideLocationSheet } from '../features/passenger/components/PassengerRideLocationSheet'
import { PassengerOnboardingModal } from '../features/passenger/components/PassengerOnboardingModal'
import { PassengerRatingModal } from '../features/passenger/components/PassengerRatingModal'
import { RideComplaintSheet } from '../features/ride-safety/components/RideComplaintSheet'

function AppContent() {
  const {
    role,
    currentScreen,
    passengerProfile,
    isPhoneVerifySheetOpen,
    isRideLocationSheetOpen,
    rideLocationSheetTarget,
    isPassengerOnboardingOpen,
    isPassengerRatingOpen,
    isRideComplaintOpen,
  } = useAppState()
  const shouldShowPassengerOnboarding =
    isPassengerOnboardingOpen && role === 'passenger' && !currentScreen.startsWith('driver')
  const hasOverlay =
    isPhoneVerifySheetOpen ||
    isRideLocationSheetOpen ||
    shouldShowPassengerOnboarding ||
    isPassengerRatingOpen ||
    isRideComplaintOpen

  return (
    <MobileShell
      overlay={
        hasOverlay ? (
          <>
            {isPhoneVerifySheetOpen ? <PhoneVerifySheet /> : null}
            {isRideLocationSheetOpen ? (
              <PassengerRideLocationSheet key={rideLocationSheetTarget ?? 'ride-location'} />
            ) : null}
            {shouldShowPassengerOnboarding ? (
              <PassengerOnboardingModal
                key={`${passengerProfile?.name ?? ''}:${passengerProfile?.city ?? ''}:${passengerProfile?.phone ?? ''}`}
              />
            ) : null}
            {isPassengerRatingOpen ? <PassengerRatingModal /> : null}
            {isRideComplaintOpen ? <RideComplaintSheet /> : null}
          </>
        ) : null
      }
    >
      <ScreenRenderer screen={currentScreen} />
    </MobileShell>
  )
}

export default function App() {
  return (
    <AppStateProvider>
      <AppContent />
    </AppStateProvider>
  )
}
