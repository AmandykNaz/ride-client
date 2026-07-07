import { useEffect, useMemo, useRef, useState } from 'react'
import { Bell, CheckCheck, ChevronRight, RefreshCw } from 'lucide-react'

import { cn } from '../../lib/cn'
import { formatFullDateTime } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'
import type { RideNotification } from '../../features/notifications'

function sortNotifications(items: RideNotification[]) {
  return [...items].sort((left, right) => {
    if (left.isRead !== right.isRead) {
      return left.isRead ? 1 : -1
    }

    return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
  })
}

function resolveNotificationDestination(actionType?: string | null, role?: 'passenger' | 'driver') {
  const normalized = String(actionType ?? '').trim().toUpperCase()
  const legacyPassengerRequestContactOpened = 'PASSENGER_REQUEST_CONTACT_OPENED'

  switch (normalized) {
    case 'PASSENGER_OFFER_CREATED':
      return 'passengerOffers' as const
    case 'PASSENGER_ORDERS':
    case 'PASSENGER_ORDER':
    case legacyPassengerRequestContactOpened:
    case 'RIDE_REQUEST':
      return 'passengerOrders' as const
    case 'PASSENGER_ANNOUNCEMENT_CANCELLED':
      return 'passengerAnnouncements' as const
    case 'RIDE_ORDER':
    case 'RIDE_ORDER_CANCELLED':
      return role === 'driver' ? 'driverMyOrders' as const : 'passengerOrders' as const
    case 'PASSENGER_ANNOUNCEMENTS':
    case 'ANNOUNCEMENT':
      return 'passengerAnnouncements' as const
    case 'DRIVER_FEED':
    case 'DRIVER_REQUEST':
    case 'DRIVER_REQUEST_CANCELLED':
      return 'driverFeed' as const
    case 'DRIVER_ORDERS':
    case 'DRIVER_ORDER':
    case 'DRIVER_OFFER_ACCEPTED':
      return 'driverMyOrders' as const
    case 'DRIVER_OFFER_REJECTED':
      return 'driverFeed' as const
    case 'DRIVER_TOP_UP_APPROVED':
    case 'DRIVER_TOP_UP_REJECTED':
      return 'driverBalance' as const
    case 'DRIVER_APPLICATION_APPROVED':
    case 'DRIVER_APPLICATION_REJECTED':
      return 'driverProfile' as const
    case 'DRIVER_APPLICATION_NEEDS_CHANGES':
      return 'driverRegistration' as const
    case 'DRIVER_ANNOUNCEMENT_CONTACT_OPENED':
    case 'DRIVER_ANNOUNCEMENTS':
      return 'driverAnnouncements' as const
    default:
      return null
  }
}

export default function NotificationsPage() {
  const {
    role,
    notifications,
    notificationsLoading,
    notificationsError,
    unreadNotificationsCount,
  } = useAppState()
  const actions = useAppActions()
  const refreshNotificationsRef = useRef(actions.refreshNotifications)
  const [activeNotificationId, setActiveNotificationId] = useState<string | null>(null)
  const [isReadAllPending, setIsReadAllPending] = useState(false)

  useEffect(() => {
    refreshNotificationsRef.current = actions.refreshNotifications
  }, [actions.refreshNotifications])

  useEffect(() => {
    void refreshNotificationsRef.current()
  }, [])

  const sortedNotifications = useMemo(() => sortNotifications(notifications), [notifications])

  const handleRefresh = async () => {
    await actions.refreshNotifications()
  }

  const handleReadAll = async () => {
    if (unreadNotificationsCount <= 0) return

    setIsReadAllPending(true)
    try {
      await actions.markAllNotificationsRead()
    } finally {
      setIsReadAllPending(false)
    }
  }

  const handleOpenNotification = async (notification: RideNotification) => {
    setActiveNotificationId(notification.id)

    try {
      if (!notification.isRead) {
        await actions.markNotificationRead(notification.id)
      }

      const screen = resolveNotificationDestination(notification.actionType, role)
      if (screen) {
        actions.setScreen(screen)
      }
    } finally {
      setActiveNotificationId(null)
    }
  }

  return (
    <PageCard
      eyebrow="Ride"
      title="Уведомления"
      description="Здесь собраны важные обновления по заявкам, поездкам и контактам."
    >
      <div className="flex flex-wrap items-center gap-2">
        <button
          type="button"
          onClick={handleRefresh}
          disabled={notificationsLoading}
          className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-2 text-sm font-medium text-ink transition hover:border-accent/40 hover:text-accent disabled:cursor-not-allowed disabled:opacity-60"
        >
          <RefreshCw className={cn('h-4 w-4', notificationsLoading ? 'animate-spin' : '')} />
          Обновить
        </button>
        <button
          type="button"
          onClick={handleReadAll}
          disabled={isReadAllPending || unreadNotificationsCount <= 0}
          className={cn(
            'inline-flex items-center gap-2 rounded-2xl px-4 py-2 text-sm font-semibold transition',
            unreadNotificationsCount > 0 && !isReadAllPending
              ? 'bg-accent text-white hover:bg-accent/90'
              : 'border border-border bg-slate-100 text-muted',
            'disabled:cursor-not-allowed disabled:hover:bg-slate-100',
          )}
        >
          <CheckCheck className="h-4 w-4" />
          Прочитать все
        </button>
      </div>

      {notificationsError ? (
        <div className="mt-4 rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
          {notificationsError}
        </div>
      ) : null}

      {notificationsLoading && notifications.length === 0 ? (
        <div className="mt-4 rounded-[24px] border border-dashed border-border bg-white/80 px-4 py-8 text-center text-sm text-muted">
          Загружаем уведомления…
        </div>
      ) : null}

      {!notificationsLoading && sortedNotifications.length === 0 ? (
        <div className="mt-4 rounded-[24px] border border-dashed border-border bg-white/80 px-4 py-8 text-center text-sm text-muted">
          Уведомлений пока нет
        </div>
      ) : null}

      {sortedNotifications.length > 0 ? (
        <div className="mt-4 space-y-3">
          {sortedNotifications.map((notification) => {
            const isPending = activeNotificationId === notification.id

            return (
              <button
                key={notification.id}
                type="button"
                onClick={() => void handleOpenNotification(notification)}
                disabled={isPending}
                className={cn(
                  'w-full rounded-[26px] border p-4 text-left shadow-sm transition',
                  notification.isRead
                    ? 'border-border bg-white hover:border-slate-300 hover:bg-white'
                    : 'border-accent/45 bg-accent/[0.09] hover:border-accent/60 hover:bg-accent/[0.12]',
                  isPending ? 'cursor-wait opacity-70' : '',
                )}
              >
                <div className="flex items-start gap-3">
                  <span
                    className={cn(
                      'mt-0.5 grid h-10 w-10 shrink-0 place-items-center rounded-2xl',
                      notification.isRead ? 'bg-slate-100 text-muted' : 'bg-accent/12 text-accent',
                    )}
                  >
                    <Bell className="h-5 w-5" />
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-ink">{notification.title}</p>
                        <p className="mt-1 text-xs text-muted">
                          {formatFullDateTime(notification.createdAt)}
                        </p>
                      </div>
                      {!notification.isRead ? (
                        <span className="rounded-full bg-accent px-2.5 py-1 text-[11px] font-semibold text-white">
                          Новое
                        </span>
                      ) : null}
                    </div>
                    {notification.body ? (
                      <p className="mt-3 text-sm leading-6 text-muted">{notification.body}</p>
                    ) : null}
                  </div>
                  <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted" />
                </div>
              </button>
            )
          })}
        </div>
      ) : null}
    </PageCard>
  )
}
