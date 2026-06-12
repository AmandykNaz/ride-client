import { useMemo, useState } from 'react'
import { CircleGauge, Lock, Sparkles } from 'lucide-react'

import { cn } from '../../lib/cn'
import { formatKzt } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'
import { DriverCounterOfferSheet } from '../../features/driver/components/DriverCounterOfferSheet'
import { DriverFeedOrderCard } from '../../features/driver/components/DriverFeedOrderCard'
import type { DriverCounterOffer, DriverFeedOrder } from '../../types/domain'

type FeedFilter = 'all' | 'ride' | 'parcel' | 'full'

const filterChips: Array<{ id: FeedFilter; label: string }> = [
  { id: 'all', label: 'Все' },
  { id: 'ride', label: 'Межгород' },
  { id: 'parcel', label: 'Посылки' },
  { id: 'full', label: 'Весь салон' },
]

function matchesFilter(order: DriverFeedOrder, filter: FeedFilter) {
  if (filter === 'all') return true
  if (filter === 'ride') return order.category === 'ride'
  if (filter === 'parcel') return order.category === 'parcel'
  return order.category === 'ride' && order.rideType === 'full'
}

export default function DriverFeedPage() {
  const {
    driverVerificationStatus,
    driverFeedOrders,
    driverCounterOffers,
    driverProfile,
  } = useAppState()
  const actions = useAppActions()
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all')

  const visibleOrders = useMemo(
    () =>
      driverFeedOrders
        .filter((order) => order.status === 'available' || order.status === 'offered')
        .filter((order) => matchesFilter(order, feedFilter)),
    [driverFeedOrders, feedFilter],
  )

  const counterOffersByOrderId = useMemo(() => {
    return driverCounterOffers.reduce<Record<string, DriverCounterOffer>>((accumulator, offer) => {
      accumulator[offer.orderId] = offer
      return accumulator
    }, {})
  }, [driverCounterOffers])

  if (driverVerificationStatus !== 'APPROVED') {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Лента заказов"
        description="Доступно после проверки водителя."
      >
        <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
          <Lock className="h-5 w-5 text-accent" />
          <p className="text-sm text-ink">Лента будет доступна после approval</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => actions.setScreen('driverRegistration')}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            Перейти к регистрации
          </button>
          <button
            type="button"
            onClick={() => actions.setScreen('driverDashboard')}
            className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            Посмотреть статус заявки
          </button>
        </div>
      </PageCard>
    )
  }

  return (
    <div className="space-y-4">
      <PageCard
        eyebrow="Водитель"
        title="Лента заказов"
        description="Заявки в демо-режиме. Комиссия пока только preview."
      >
        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Режим
            </p>
            <div className="mt-2 flex items-center gap-2">
              <CircleGauge className="h-4 w-4 text-accent" />
              <p className="text-sm font-semibold text-ink">
                {driverProfile?.isOnline ? 'Online' : 'Offline'}
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Баланс
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {formatKzt(driverProfile?.balance ?? 0)}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Минимум
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {formatKzt(driverProfile?.minBalance ?? 1000)}
            </p>
          </div>
        </div>

        <div className="flex flex-wrap gap-2">
          {filterChips.map((chip) => {
            const isActive = feedFilter === chip.id

            return (
              <button
                key={chip.id}
                type="button"
                onClick={() => setFeedFilter(chip.id)}
                className={cn(
                  'rounded-full px-4 py-2 text-sm font-semibold transition',
                  isActive
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'bg-surface-soft text-ink hover:bg-slate-50',
                )}
              >
                {chip.label}
              </button>
            )
          })}
        </div>

        <button
          type="button"
          onClick={actions.toggleDriverOnlineStatus}
          className={cn(
            'w-full rounded-2xl px-4 py-3 text-sm font-semibold',
            driverProfile?.isOnline
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-700',
          )}
        >
          {driverProfile?.isOnline ? 'Сейчас онлайн' : 'Сейчас оффлайн'}
        </button>
      </PageCard>

      <div className="space-y-3">
        {visibleOrders.map((order) => (
          <DriverFeedOrderCard
            key={order.id}
            order={order}
            counterOffer={counterOffersByOrderId[order.id]}
            onAccept={() => actions.acceptDriverFeedOrder(order.id)}
            onOpenCounterOffer={() => actions.openDriverCounterOfferSheet(order.id)}
            onAcceptCounterOfferDemo={actions.acceptDemoCounterOfferAsPassenger}
          />
        ))}
      </div>

      {visibleOrders.length === 0 ? (
        <PageCard
          eyebrow="Водитель"
          title="Ничего не найдено"
          description="Попробуйте другой фильтр или обновите список позже."
        >
          <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
            <Sparkles className="h-5 w-5 text-accent" />
            <p className="text-sm text-ink">Сейчас нет доступных заявок по этому фильтру.</p>
          </div>
        </PageCard>
      ) : null}

      <DriverCounterOfferSheet />
    </div>
  )
}
