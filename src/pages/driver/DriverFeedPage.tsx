import { useMemo, useState } from 'react'
import { CircleGauge, Lock, Sparkles } from 'lucide-react'

import { cn } from '../../lib/cn'
import { formatKzt } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'
import { DriverCounterOfferSheet } from '../../features/driver/components/DriverCounterOfferSheet'
import { DriverFeedOrderCard } from '../../features/driver/components/DriverFeedOrderCard'
import type { DriverCounterOffer, DriverFeedOrder } from '../../types/domain'
import { getDriverAccessState, getDriverWalletShortfall } from '../../features/driver/driver-status'

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
    driverWallet,
    driverActiveOrder,
    isDriverFeedLoading,
    isDriverActionLoading,
    driverFlowError,
  } = useAppState()
  const actions = useAppActions()
  const [feedFilter, setFeedFilter] = useState<FeedFilter>('all')
  const accessState = getDriverAccessState(driverVerificationStatus, driverWallet)
  const walletShortfall = getDriverWalletShortfall(driverWallet)

  const lowBalance = accessState === 'APPROVED_LOW_BALANCE'
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

  if (
    accessState === 'NOT_STARTED' ||
    accessState === 'DRAFT' ||
    accessState === 'PENDING_REVIEW' ||
    accessState === 'NEEDS_CHANGES' ||
    accessState === 'BLOCKED' ||
    accessState === 'SUSPENDED'
  ) {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Лента заказов"
        description="Доступно после проверки водителя."
      >
        <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
          <Lock className="h-5 w-5 text-accent" />
          <p className="text-sm text-ink">Лента будет доступна после подтверждения заявки.</p>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={
              accessState === 'NOT_STARTED'
                ? actions.startDriverRegistration
                : () => actions.setScreen('driverRegistration')
            }
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            {accessState === 'DRAFT' ? 'Продолжить регистрацию' : 'Перейти к регистрации'}
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

  if (lowBalance) {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Профиль одобрен"
        description={`Пополните баланс минимум до ${formatKzt(driverWallet.minBalance)}, чтобы выйти на линию.`}
      >
        <div className="flex items-center gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
          <Sparkles className="h-5 w-5" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">Профиль одобрен</p>
            <p className="text-sm">
              Не хватает {formatKzt(walletShortfall)} до минимального баланса.
            </p>
          </div>
        </div>
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => actions.setScreen('driverBalance')}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            Перейти в баланс
          </button>
          <button
            type="button"
            onClick={() => actions.setScreen('driverDashboard')}
            className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            В кабинет
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
        description="Показываем доступные заказы и предварительный расчет комиссии."
      >
        {driverFlowError ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {driverFlowError}
          </div>
        ) : null}

        {isDriverFeedLoading ? (
          <div className="rounded-2xl bg-surface-soft px-4 py-3 text-sm text-muted">
            Загружаем ленту заказов...
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-3">
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Режим
            </p>
            <div className="mt-2 flex items-center gap-2">
              <CircleGauge className="h-4 w-4 text-accent" />
              <p className="text-sm font-semibold text-ink">
                {driverProfile?.isOnline ? 'Онлайн' : 'Офлайн'}
              </p>
            </div>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Баланс
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {formatKzt(driverWallet.balance)}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Минимум
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {formatKzt(driverWallet.minBalance)}
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
          disabled={isDriverActionLoading}
          className={cn(
            'w-full rounded-2xl px-4 py-3 text-sm font-semibold',
            driverProfile?.isOnline
              ? 'bg-emerald-100 text-emerald-700'
              : 'bg-slate-100 text-slate-700',
          isDriverActionLoading && 'cursor-not-allowed opacity-60',
          )}
        >
          {driverProfile?.isOnline ? 'Сейчас онлайн' : 'Сейчас офлайн'}
        </button>
      </PageCard>

      {driverActiveOrder ? (
          <PageCard
          eyebrow="Водитель"
          title="Активный заказ"
          description="Управляйте заказом из отдельного экрана."
        >
          <div className="rounded-2xl bg-surface-soft p-4 text-sm text-ink">
            У вас есть активный заказ. Откройте его из этого экрана.
          </div>
          <button
            type="button"
            onClick={() => actions.setScreen('driverOrders')}
            className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
          >
            Открыть активный заказ
          </button>
        </PageCard>
      ) : null}

      <div className="space-y-3">
        {visibleOrders.map((order) => (
          <DriverFeedOrderCard
            key={order.id}
            order={order}
            counterOffer={counterOffersByOrderId[order.id]}
            onAccept={() => actions.acceptDriverFeedOrder(order.id)}
            onOpenCounterOffer={() => actions.openDriverCounterOfferSheet(order.id)}
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
