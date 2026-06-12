import { AppStateProvider, useAppState } from '../providers/AppStateProvider'
import { MobileShell } from './MobileShell'
import { ScreenRenderer } from './ScreenRenderer'
import { PhoneVerifySheet } from '../features/passenger/components/PhoneVerifySheet'
import { PassengerOnboardingModal } from '../features/passenger/components/PassengerOnboardingModal'
import { PassengerRatingModal } from '../features/passenger/components/PassengerRatingModal'

function AppContent() {
  const { currentScreen, isPhoneVerifySheetOpen, isPassengerOnboardingOpen, isPassengerRatingOpen } =
    useAppState()

  return (
    <MobileShell
      overlay={
        <>
          {isPhoneVerifySheetOpen ? <PhoneVerifySheet /> : null}
          {isPassengerOnboardingOpen ? <PassengerOnboardingModal /> : null}
          {isPassengerRatingOpen ? <PassengerRatingModal /> : null}
        </>
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
