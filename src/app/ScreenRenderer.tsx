import type { ComponentType } from 'react'

import type { AppScreen } from '../types/domain'
import BusSearchPage from '../pages/bus/BusSearchPage'
import BusSeatsPage from '../pages/bus/BusSeatsPage'
import BusTripDetailPage from '../pages/bus/BusTripDetailPage'
import BusTripsPage from '../pages/bus/BusTripsPage'
import BusesComingSoonPage from '../pages/BusesComingSoonPage'
import DriverBalancePage from '../pages/driver/DriverBalancePage'
import DriverAnnouncementEditorPage from '../pages/driver/DriverAnnouncementEditorPage'
import DriverAnnouncementsPage from '../pages/driver/DriverAnnouncementsPage'
import DriverDashboardPage from '../pages/driver/DriverDashboardPage'
import DriverActiveOrderPage from '../pages/driver/DriverActiveOrderPage'
import DriverFeedPage from '../pages/driver/DriverFeedPage'
import DriverMyOrdersPage from '../pages/driver/DriverMyOrdersPage'
import DriverRegistrationPage from '../pages/driver/DriverRegistrationPage'
import DriverProfilePage from '../pages/driver/DriverProfilePage'
import PassengerActiveRidePage from '../pages/passenger/PassengerActiveRidePage'
import PassengerActiveParcelPage from '../pages/passenger/PassengerActiveParcelPage'
import PassengerAnnouncementsPage from '../pages/passenger/PassengerAnnouncementsPage'
import PassengerOrderPage from '../pages/passenger/PassengerOrderPage'
import PassengerOffersPage from '../pages/passenger/PassengerOffersPage'
import PassengerParcelOffersPage from '../pages/passenger/PassengerParcelOffersPage'
import PassengerOrdersPage from '../pages/passenger/PassengerOrdersPage'
import PassengerParcelsPage from '../pages/passenger/PassengerParcelsPage'
import PassengerProfilePage from '../pages/passenger/PassengerProfilePage'
import SafetyPage from '../pages/SafetyPage'
import SettingsPage from '../pages/SettingsPage'
import SupportPage from '../pages/SupportPage'
import NotificationsPage from '../pages/shared/NotificationsPage'

const screenComponents: Record<AppScreen, ComponentType> = {
  passengerOrder: PassengerOrderPage,
  passengerAnnouncements: PassengerAnnouncementsPage,
  passengerOffers: PassengerOffersPage,
  passengerActiveRide: PassengerActiveRidePage,
  busSearch: BusSearchPage,
  busTrips: BusTripsPage,
  busTripDetail: BusTripDetailPage,
  busSeats: BusSeatsPage,
  parcelOffers: PassengerParcelOffersPage,
  activeParcel: PassengerActiveParcelPage,
  passengerParcels: PassengerParcelsPage,
  passengerOrders: PassengerOrdersPage,
  passengerProfile: PassengerProfilePage,
  notifications: NotificationsPage,
  driverRegistration: DriverRegistrationPage,
  driverDashboard: DriverDashboardPage,
  driverAnnouncements: DriverAnnouncementsPage,
  driverAnnouncementEditor: DriverAnnouncementEditorPage,
  driverFeed: DriverFeedPage,
  driverOrders: DriverActiveOrderPage,
  driverMyOrders: DriverMyOrdersPage,
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
