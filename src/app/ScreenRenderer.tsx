import type { ComponentType } from 'react'

import type { AppScreen } from '../types/domain'
import BusesComingSoonPage from '../pages/BusesComingSoonPage'
import DriverBalancePage from '../pages/driver/DriverBalancePage'
import DriverDashboardPage from '../pages/driver/DriverDashboardPage'
import DriverFeedPage from '../pages/driver/DriverFeedPage'
import DriverRegistrationPage from '../pages/driver/DriverRegistrationPage'
import DriverProfilePage from '../pages/driver/DriverProfilePage'
import PassengerActiveRidePage from '../pages/passenger/PassengerActiveRidePage'
import PassengerActiveParcelPage from '../pages/passenger/PassengerActiveParcelPage'
import PassengerOrderPage from '../pages/passenger/PassengerOrderPage'
import PassengerOffersPage from '../pages/passenger/PassengerOffersPage'
import PassengerParcelOffersPage from '../pages/passenger/PassengerParcelOffersPage'
import PassengerOrdersPage from '../pages/passenger/PassengerOrdersPage'
import PassengerParcelsPage from '../pages/passenger/PassengerParcelsPage'
import PassengerProfilePage from '../pages/passenger/PassengerProfilePage'
import SafetyPage from '../pages/SafetyPage'
import SettingsPage from '../pages/SettingsPage'
import SupportPage from '../pages/SupportPage'

const screenComponents: Record<AppScreen, ComponentType> = {
  passengerOrder: PassengerOrderPage,
  passengerOffers: PassengerOffersPage,
  passengerActiveRide: PassengerActiveRidePage,
  parcelOffers: PassengerParcelOffersPage,
  activeParcel: PassengerActiveParcelPage,
  passengerParcels: PassengerParcelsPage,
  passengerOrders: PassengerOrdersPage,
  passengerProfile: PassengerProfilePage,
  driverRegistration: DriverRegistrationPage,
  driverDashboard: DriverDashboardPage,
  driverFeed: DriverFeedPage,
  driverBalance: DriverBalancePage,
  driverProfile: DriverProfilePage,
  safety: SafetyPage,
  support: SupportPage,
  settings: SettingsPage,
  busesComingSoon: BusesComingSoonPage,
}

export function ScreenRenderer({ screen }: { screen: AppScreen }) {
  const Page = screenComponents[screen]

  return <Page />
}
