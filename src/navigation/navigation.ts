import {
  Banknote,
  BusFront,
  CircleGauge,
  History,
  Luggage,
  Settings,
  ShieldCheck,
  Sparkles,
  Package2,
  Truck,
  User,
  Users,
  Wallet,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import type { AppScreen, UserRole } from '../types/domain'

export type BottomNavItem = {
  label: string
  screen: AppScreen
  icon: LucideIcon
}

export type DrawerItem = {
  label: string
  icon: LucideIcon
  screen?: AppScreen
  role?: UserRole
}

export const defaultScreenByRole = {
  passenger: 'passengerOrder',
  driver: 'driverDashboard',
} as const satisfies Record<UserRole, AppScreen>

export const screenMeta = {
  passengerOrder: {
    title: 'Межгород',
    subtitle: 'Поездки по Казахстану',
  },
  passengerAnnouncements: {
    title: 'Попутки',
    subtitle: 'Готовые поездки водителей',
  },
  passengerOffers: {
    title: 'Поиск водителя',
    subtitle: 'Предложения и ожидание',
  },
  passengerActiveRide: {
    title: 'Активная поездка',
    subtitle: 'Текущий статус поездки',
  },
  busSearch: {
    title: 'Автобусы',
    subtitle: 'Поиск автобусных рейсов',
  },
  busTrips: {
    title: 'Рейсы',
    subtitle: 'Доступные автобусные маршруты',
  },
  busTripDetail: {
    title: 'Рейс',
    subtitle: 'Детали автобусного маршрута',
  },
  busSeats: {
    title: 'Места',
    subtitle: 'Схема автобуса без бронирования',
  },
  parcelOffers: {
    title: 'Поиск курьера',
    subtitle: 'Предложения и ожидание',
  },
  activeParcel: {
    title: 'Активная доставка',
    subtitle: 'Текущий статус посылки',
  },
  passengerParcels: {
    title: 'Посылки',
    subtitle: 'Отправка и получение',
  },
  passengerOrders: {
    title: 'Мои заказы',
    subtitle: 'История поездок',
  },
  passengerProfile: {
    title: 'Профиль',
    subtitle: 'Пассажирский режим',
  },
  notifications: {
    title: 'Уведомления',
    subtitle: 'Важные обновления по поездкам',
  },
  driverDashboard: {
    title: 'Кабинет водителя',
    subtitle: 'Обзор и действия',
  },
  driverAnnouncements: {
    title: 'Мои объявления',
    subtitle: 'Ваши водительские объявления',
  },
  driverAnnouncementEditor: {
    title: 'Объявление водителя',
    subtitle: 'Создание и редактирование',
  },
  driverFeed: {
    title: 'Лента',
    subtitle: 'Новые заказы рядом',
  },
  driverOrders: {
    title: 'Активный заказ',
    subtitle: 'Текущий статус выполнения',
  },
  driverMyOrders: {
    title: 'Мои заказы',
    subtitle: 'История открытых контактов и заявок',
  },
  driverBalance: {
    title: 'Баланс',
    subtitle: 'Доход и выплаты',
  },
  driverProfile: {
    title: 'Профиль',
    subtitle: 'Режим водителя',
  },
  driverRegistration: {
    title: 'Регистрация водителя',
    subtitle: 'Пошаговая заявка',
  },
  safety: {
    title: 'Безопасность',
    subtitle: 'Проверки и доступ',
  },
  support: {
    title: 'Поддержка',
    subtitle: 'Связь с командой',
  },
  settings: {
    title: 'Настройки',
    subtitle: 'Параметры приложения',
  },
  busesComingSoon: {
    title: 'Автобусы скоро',
    subtitle: 'Раздел в разработке',
  },
} satisfies Record<AppScreen, { title: string; subtitle: string }>

export const passengerBottomNav: BottomNavItem[] = [
  { label: 'Попутки', screen: 'passengerAnnouncements', icon: Sparkles },
  { label: 'Автобусы', screen: 'busSearch', icon: BusFront },
  { label: 'Мои заказы', screen: 'passengerOrders', icon: History },
]

export const driverBottomNav: BottomNavItem[] = [
  { label: 'Панель', screen: 'driverDashboard', icon: CircleGauge },
  { label: 'Лента', screen: 'driverFeed', icon: Sparkles },
  { label: 'Баланс', screen: 'driverBalance', icon: Wallet },
  { label: 'Профиль', screen: 'driverProfile', icon: User },
]

export const passengerDrawerItems: DrawerItem[] = [
  { label: 'Межгород', screen: 'passengerOrder', icon: BusFront },
  { label: 'Отправить посылку · скоро', screen: 'busesComingSoon', icon: Package2 },
  { label: 'Автобусы', screen: 'busSearch', icon: BusFront },
  { label: 'История заказов', screen: 'passengerOrders', icon: History },
  { label: 'Безопасность', screen: 'safety', icon: ShieldCheck },
  { label: 'Поддержка', screen: 'support', icon: Users },
  { label: 'Настройки', screen: 'settings', icon: Settings },
  {
    label: 'Стать водителем',
    role: 'driver',
    screen: 'driverDashboard',
    icon: Truck,
  },
]

export const driverDrawerItems: DrawerItem[] = [
  { label: 'Кабинет водителя', screen: 'driverDashboard', icon: CircleGauge },
  { label: 'Мои объявления', screen: 'driverAnnouncements', icon: Truck },
  { label: 'Лента заказов', screen: 'driverFeed', icon: Sparkles },
  { label: 'Мои заказы', screen: 'driverMyOrders', icon: History },
  { label: 'Баланс', screen: 'driverBalance', icon: Banknote },
  { label: 'Профиль', screen: 'driverProfile', icon: User },
  { label: 'Безопасность', screen: 'safety', icon: ShieldCheck },
  { label: 'Поддержка', screen: 'support', icon: Users },
  {
    label: 'Вернуться в пассажирский режим',
    role: 'passenger',
    screen: 'passengerOrder',
    icon: Luggage,
  },
]
