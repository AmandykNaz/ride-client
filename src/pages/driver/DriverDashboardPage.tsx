import { useEffect, useRef } from 'react'

import {
  BadgeCheck,
  CarFront,
  CircleAlert,
  ShieldCheck,
  SlidersHorizontal,
} from 'lucide-react'
import type { LucideIcon } from 'lucide-react'

import { cn } from '../../lib/cn'
import { formatKzPlateNumber, formatKzt, formatRideOrderStatusLabel, formatRoute } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'
import {
  getDriverAccessState,
  getDriverApplicationReason,
  getDriverVerificationStatusLabel,
  getDriverWalletShortfall,
} from '../../features/driver/driver-status'
import { DriverApplicationHistoryCard } from './components/DriverApplicationHistoryCard'
import { DriverBlockedStateCard } from './components/DriverBlockedStateCard'
import { DriverRecheckCard } from './components/DriverRecheckCard'

function StatusRow({
  icon: Icon,
  title,
  value,
}: {
  icon: LucideIcon
  title: string
  value: string
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
      <span className="grid h-10 w-10 place-items-center rounded-2xl bg-white">
        <Icon className="h-5 w-5 text-accent" />
      </span>
      <div className="min-w-0">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
          {title}
        </p>
        <p className="mt-1 truncate text-sm font-semibold text-ink">{value}</p>
      </div>
    </div>
  )
}

export default function DriverDashboardPage() {
  const {
    driverVerificationStatus,
    driverProfile,
    activeRecheck,
    driverApplicationDraft,
    driverRegistrationStep,
    driverActiveOrder,
    driverWallet,
    driverReviewSummary,
    driverReviews,
    driverFlowError,
    isDriverActionLoading,
  } = useAppState()
  const actions = useAppActions()
  const refreshDriverOrdersRef = useRef(actions.refreshDriverOrders)
  const accessState = getDriverAccessState(driverVerificationStatus, driverWallet)
  const verificationStatusLabel = getDriverVerificationStatusLabel(driverVerificationStatus)
  const walletShortfall = getDriverWalletShortfall(driverWallet)
  const applicationReason = getDriverApplicationReason(driverApplicationDraft, driverVerificationStatus)
  const blockedReason =
    driverProfile?.blockedReason?.trim() ||
    driverWallet?.blockedReason?.trim() ||
    'Профиль водителя заблокирован модератором.'

  useEffect(() => {
    refreshDriverOrdersRef.current = actions.refreshDriverOrders
  }, [actions.refreshDriverOrders])

  useEffect(() => {
    if (driverVerificationStatus !== 'APPROVED') return

    void refreshDriverOrdersRef.current()
  }, [driverVerificationStatus])

  if (accessState === 'NOT_STARTED') {
    return (
      <div className="space-y-4">
        <PageCard
          eyebrow="Водитель"
          title="Стать водителем AmanJol"
          description="Начните регистрацию, чтобы открыть водительский кабинет."
        >
          <div className="grid gap-3">
            <StatusRow icon={ShieldCheck} title="Преимущество" value="Минимальная комиссия после поездки" />
            <StatusRow icon={CircleAlert} title="Требование" value="Права B и исправный автомобиль" />
            <StatusRow icon={CarFront} title="Баланс" value="Минимальный баланс для доступа к заказам" />
          </div>
          <div className="rounded-2xl bg-surface-soft p-4 text-sm text-ink">
            <p className="font-semibold">Что вы получаете</p>
            <div className="mt-2 space-y-2 text-muted">
              <p>• зарабатывайте на межгороде</p>
              <p>• свободный график</p>
              <p>• комиссия только после завершения поездки</p>
            </div>
          </div>
          <button
            type="button"
            onClick={actions.startDriverRegistration}
            className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
          >
            Начать регистрацию
          </button>
        </PageCard>
      </div>
    )
  }

  if (accessState === 'DRAFT') {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Заявка не завершена"
        description="Вы начали регистрацию водителя, но ещё не отправили заявку на проверку."
      >
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          Вы начали регистрацию водителя, но ещё не отправили заявку на проверку.
        </div>
        <StatusRow
          icon={SlidersHorizontal}
          title="Статус"
          value={verificationStatusLabel}
        />
        <StatusRow
          icon={SlidersHorizontal}
          title="Текущий шаг"
          value={`Шаг ${driverRegistrationStep} из 5`}
        />
        <StatusRow
          icon={CarFront}
          title="ФИО"
          value={driverApplicationDraft.fullName || 'Не заполнено'}
        />
        <button
          type="button"
          onClick={() => actions.setScreen('driverRegistration')}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
        >
          Продолжить регистрацию
        </button>
      </PageCard>
    )
  }

  if (accessState === 'PENDING_REVIEW') {
    return (
      <div className="space-y-4">
        <PageCard
          eyebrow="Водитель"
          title="На проверке"
          description="Обычно проверка занимает до 24 часов."
        >
          <StatusRow icon={BadgeCheck} title="Статус" value={verificationStatusLabel} />
          <div className="rounded-2xl bg-surface-soft p-4 text-sm text-muted">
            Мы уведомим вас после проверки.
          </div>
          <DriverApplicationHistoryCard history={driverApplicationDraft.history ?? []} limit={5} />
          <button
            type="button"
            onClick={actions.returnToPassengerMode}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            Вернуться в пассажирский режим
          </button>
        </PageCard>

      </div>
    )
  }

  if (accessState === 'NEEDS_CHANGES') {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Нужно исправить данные"
        description="Модератор запросил уточнения по заявке."
      >
        <StatusRow
          icon={CircleAlert}
          title="Причина"
          value={applicationReason || 'Не указана'}
        />
        <DriverApplicationHistoryCard history={driverApplicationDraft.history ?? []} limit={5} />
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={actions.editDriverApplicationAfterChanges}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            Исправить заявку
          </button>
          <button
            type="button"
            onClick={actions.returnToPassengerMode}
            className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            Вернуться в пассажирский режим
          </button>
        </div>
      </PageCard>
    )
  }

  if (accessState === 'BLOCKED') {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Профиль водителя заблокирован"
        description="Статус ограничивает доступ к водительскому кабинету."
      >
        <DriverBlockedStateCard reason={blockedReason} />
      </PageCard>
    )
  }

  if (accessState === 'SUSPENDED') {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Профиль приостановлен"
        description="Статус временно ограничивает доступ к кабинету."
      >
        <StatusRow
          icon={CircleAlert}
          title="Статус"
          value={verificationStatusLabel}
        />
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => actions.setScreen('support')}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            Связаться с поддержкой
          </button>
          <button
            type="button"
            onClick={actions.returnToPassengerMode}
            className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            Вернуться в пассажирский режим
          </button>
        </div>
      </PageCard>
    )
  }

  return (
    <div className="space-y-4">
      {activeRecheck ? (
        <DriverRecheckCard
          recheck={activeRecheck}
          compact
          onRefresh={() => actions.refreshDriverSnapshot()}
          onOpenDetails={() => actions.setScreen('driverProfile')}
        />
      ) : null}

      <PageCard
      eyebrow="Водитель"
      title={accessState === 'APPROVED_LOW_BALANCE' ? 'Профиль одобрен' : 'Кабинет водителя'}
      description={
        accessState === 'APPROVED_LOW_BALANCE'
          ? `Пополните баланс минимум до ${formatKzt(driverWallet.minBalance)} чтобы выйти на линию.`
          : 'Ваш профиль подтверждён. Можно включать онлайн-режим и пользоваться кабинетом.'
      }
    >
      {driverFlowError ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {driverFlowError}
        </div>
      ) : null}

      {accessState === 'APPROVED_LOW_BALANCE' ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Профиль одобрен</p>
          <p className="mt-1">
            Пополните баланс минимум до {formatKzt(driverWallet.minBalance)}.
          </p>
        </div>
      ) : null}

      <StatusRow
        icon={BadgeCheck}
        title="Статус"
        value={accessState === 'APPROVED_LOW_BALANCE' ? 'Профиль одобрен' : 'Готов к линии'}
      />
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface-soft p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            Имя
          </p>
          <p className="mt-2 text-sm font-semibold text-ink">
            {driverProfile?.fullName || driverApplicationDraft.fullName}
          </p>
        </div>
        <div className="rounded-2xl bg-surface-soft p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            Телефон
          </p>
          <p className="mt-2 text-sm font-semibold text-ink">
            {driverProfile?.phone || driverApplicationDraft.phone}
          </p>
        </div>
        <div className="rounded-2xl bg-surface-soft p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            Город
          </p>
          <p className="mt-2 text-sm font-semibold text-ink">
            {driverProfile?.city || driverApplicationDraft.city}
          </p>
        </div>
        <div className="rounded-2xl bg-surface-soft p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            Авто
          </p>
          <p className="mt-2 text-sm font-semibold text-ink">
            {driverProfile?.vehicle?.brand || driverApplicationDraft.vehicleBrand}{' '}
            {driverProfile?.vehicle?.model || driverApplicationDraft.vehicleModel}
          </p>
          <p className="mt-1 text-sm text-muted">
            {formatKzPlateNumber(driverProfile?.vehicle?.plate || driverApplicationDraft.vehiclePlate)}
          </p>
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

      <div
        className={cn(
          'rounded-2xl p-4 text-sm font-semibold',
          accessState === 'APPROVED_READY'
            ? 'bg-emerald-50 text-emerald-700'
            : 'bg-amber-50 text-amber-800',
        )}
      >
        {accessState === 'APPROVED_READY'
          ? 'Доступ к заказам активен'
          : accessState === 'APPROVED_LOW_BALANCE'
            ? 'Доступ к заказам будет открыт после пополнения баланса'
            : 'Кошелёк заблокирован'}
      </div>

      {accessState === 'APPROVED_LOW_BALANCE' ? (
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Пополните баланс минимум до {formatKzt(driverWallet.minBalance)}</p>
          <p className="mt-1">
            Сейчас не хватает {formatKzt(walletShortfall)}.
          </p>
          <button
            type="button"
            onClick={() => actions.setScreen('driverBalance')}
            className="mt-3 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            Перейти в баланс
          </button>
        </div>
      ) : null}

      <div className="rounded-2xl border border-border bg-white p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Режим
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {driverProfile?.isOnline ? 'Онлайн' : 'Офлайн'}
            </p>
          </div>
          <button
            type="button"
            onClick={
              accessState === 'APPROVED_LOW_BALANCE'
                ? () => actions.setScreen('driverBalance')
                : actions.toggleDriverOnlineStatus
            }
            disabled={isDriverActionLoading}
            className={cn(
              'rounded-2xl px-4 py-3 text-sm font-semibold',
              driverProfile?.isOnline
                ? 'bg-emerald-100 text-emerald-700'
                : 'bg-slate-100 text-slate-700',
              isDriverActionLoading && 'cursor-not-allowed opacity-60',
            )}
          >
          {accessState === 'APPROVED_LOW_BALANCE'
            ? 'Пополнить баланс'
            : driverProfile?.isOnline
              ? 'Онлайн'
              : 'Офлайн'}
          </button>
        </div>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-2xl bg-surface-soft p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            Отзывы
          </p>
          <p className="mt-2 text-sm font-semibold text-ink">
            {driverReviewSummary?.averageRating ?? 0} / 5
          </p>
          <p className="mt-1 text-sm text-muted">
            {driverReviewSummary?.reviewsCount ?? 0} отзывов
          </p>
        </div>
        <div className="rounded-2xl bg-surface-soft p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            Последние отзывы
          </p>
          <div className="mt-2 space-y-2">
            {driverReviews.length === 0 ? (
              <p className="text-sm text-muted">Пока нет отзывов.</p>
            ) : (
              driverReviews.slice(0, 2).map((review) => (
                <div key={review.id} className="rounded-2xl bg-white p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-ink">{review.rating} / 5</p>
                    <p className="text-xs text-muted">{review.createdAt.slice(0, 10)}</p>
                  </div>
                  {review.comment ? <p className="mt-1 text-muted">{review.comment}</p> : null}
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {driverActiveOrder ? (
        <div className="rounded-[28px] border border-accent/15 bg-accent/5 p-4">
          <div className="flex items-start justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                Активный заказ
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">
                {formatRoute(driverActiveOrder.originText ?? driverActiveOrder.from, driverActiveOrder.destinationText ?? driverActiveOrder.to)}
              </p>
              <p className="mt-1 text-sm text-muted">
                {driverActiveOrder.category === 'ride' ? 'Поездка' : 'Посылка'} · {formatRideOrderStatusLabel(driverActiveOrder.status)}
              </p>
            </div>
            <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
              {formatKzt(driverActiveOrder.agreedPrice ?? driverActiveOrder.price)}
            </span>
          </div>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => actions.setScreen('driverOrders')}
              className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
            >
              Открыть активный заказ
            </button>
            <button
              type="button"
              onClick={() => actions.setScreen('driverFeed')}
              className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
            >
              Открыть ленту заказов
            </button>
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => actions.setScreen('driverFeed')}
          disabled={!driverWallet.canGoOnline}
          className={cn(
            'rounded-2xl px-3 py-3 text-sm font-semibold',
            !driverWallet.canGoOnline
              ? 'cursor-not-allowed border border-border bg-slate-50 text-muted'
              : 'border border-border bg-white text-ink',
          )}
        >
          Лента заказов
        </button>
        <button
          type="button"
          onClick={() => actions.setScreen('driverBalance')}
          className="rounded-2xl border border-border bg-white px-3 py-3 text-sm font-semibold text-ink"
        >
          Баланс
        </button>
        <button
          type="button"
          onClick={() => actions.setScreen('driverProfile')}
          className="rounded-2xl border border-border bg-white px-3 py-3 text-sm font-semibold text-ink"
        >
          Профиль
        </button>
      </div>
      </PageCard>
    </div>
  )
}
