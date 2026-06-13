import { AppStateProvider, useAppState } from '../providers/AppStateProvider'
import { MobileShell } from './MobileShell'
import { ScreenRenderer } from './ScreenRenderer'
import { PhoneVerifySheet } from '../features/passenger/components/PhoneVerifySheet'
import { PassengerOnboardingModal } from '../features/passenger/components/PassengerOnboardingModal'
import { PassengerRatingModal } from '../features/passenger/components/PassengerRatingModal'
import { RideComplaintSheet } from '../features/ride-safety/components/RideComplaintSheet'

function AppContent() {
  const {
    currentScreen,
    isPhoneVerifySheetOpen,
    isPassengerOnboardingOpen,
    isPassengerRatingOpen,
    isRideComplaintOpen,
  } = useAppState()
  const hasOverlay =
    isPhoneVerifySheetOpen || isPassengerOnboardingOpen || isPassengerRatingOpen || isRideComplaintOpen

  return (
    <MobileShell
      overlay={
        hasOverlay ? (
          <>
            {isPhoneVerifySheetOpen ? <PhoneVerifySheet /> : null}
            {isPassengerOnboardingOpen ? <PassengerOnboardingModal /> : null}
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
