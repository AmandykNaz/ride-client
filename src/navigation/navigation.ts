import {
  Banknote,
  BusFront,
  CircleGauge,
  History,
  House,
  Luggage,
  Package,
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
  passengerOffers: {
    title: 'Поиск водителя',
    subtitle: 'Предложения и ожидание',
  },
  passengerActiveRide: {
    title: 'Активная поездка',
    subtitle: 'Текущий статус поездки',
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
  driverDashboard: {
    title: 'Кабинет водителя',
    subtitle: 'Обзор и действия',
  },
  driverFeed: {
    title: 'Лента',
    subtitle: 'Новые заказы рядом',
  },
  driverBalance: {
    title: 'Баланс',
    subtitle: 'Доход и выплаты',
  },
  driverProfile: {
    title: 'Профиль',
    subtitle: 'Режим водителя',
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
  { label: 'Заказ', screen: 'passengerOrder', icon: House },
  { label: 'Посылки', screen: 'passengerParcels', icon: Package },
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
  { label: 'Отправить посылку', screen: 'passengerParcels', icon: Package2 },
  { label: 'Автобусы скоро', screen: 'busesComingSoon', icon: BusFront },
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
  { label: 'Лента заказов', screen: 'driverFeed', icon: Sparkles },
  { label: 'Мои заказы', screen: 'passengerOrders', icon: History },
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
