import { useEffect, useRef } from 'react'

import {
  CheckCircle2,
  MapPinned,
  Navigation2,
  PackageSearch,
  ReceiptText,
  ShieldAlert,
} from 'lucide-react'

import {
  formatKzt,
  formatParcelSizeLabel,
  formatRideOrderStatusLabel,
  formatRideTypeLabel,
  formatRoute,
} from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'
import { DriverBlockedStateCard } from './components/DriverBlockedStateCard'

function formatDriverStatus(status: string) {
  return formatRideOrderStatusLabel(status)
}

function getNextActionLabel(category: 'ride' | 'parcel', status: string) {
  if (category === 'ride') {
    if (status === 'DRIVER_ASSIGNED') return 'Я в пути'
    if (status === 'DRIVER_ON_WAY') return 'Я прибыл'
    if (status === 'DRIVER_ARRIVED') return 'Начать поездку'
    if (status === 'IN_PROGRESS') return 'Завершить поездку'
  }

  if (category === 'parcel') {
    if (status === 'DRIVER_ASSIGNED') return 'Я в пути за посылкой'
    if (status === 'DRIVER_ON_WAY') return 'Я прибыл за посылкой'
    if (status === 'DRIVER_ARRIVED') return 'Забрал посылку'
    if (status === 'IN_PROGRESS') return 'Доставил посылку'
  }

  return 'Продолжить'
}

export default function DriverActiveOrderPage() {
  const {
    driverActiveOrder,
    driverVerificationStatus,
    driverWallet,
    driverAccess,
    isDriverActionLoading,
    driverFlowError,
    orderReviews,
    orderComplaints,
  } = useAppState()
  const actions = useAppActions()
  const refreshOrderReviewsRef = useRef(actions.refreshOrderReviews)
  const refreshOrderComplaintsRef = useRef(actions.refreshOrderComplaints)
  const refreshDriverOrdersRef = useRef(actions.refreshDriverOrders)
  const activeOrderId = driverActiveOrder?.id ?? null
  const accessMode = driverAccess?.monetizationMode ?? 'ORDER_COMMISSION'
  const subscriptionAccess = accessMode === 'ACCESS_SUBSCRIPTION'

  useEffect(() => {
    refreshOrderReviewsRef.current = actions.refreshOrderReviews
    refreshOrderComplaintsRef.current = actions.refreshOrderComplaints
    refreshDriverOrdersRef.current = actions.refreshDriverOrders
  }, [actions.refreshOrderReviews, actions.refreshOrderComplaints, actions.refreshDriverOrders])

  useEffect(() => {
    void refreshDriverOrdersRef.current()
  }, [])

  useEffect(() => {
    if (!activeOrderId) return

    void refreshOrderReviewsRef.current(activeOrderId)
    void refreshOrderComplaintsRef.current(activeOrderId)
  }, [activeOrderId])

  if (driverVerificationStatus !== 'APPROVED') {
    const blockedReason =
      driverWallet.blockedReason?.trim() ||
      'Профиль водителя заблокирован модератором.'

    return (
      <PageCard
        eyebrow="Водитель"
        title={driverVerificationStatus === 'BLOCKED' ? 'Профиль водителя заблокирован' : 'Активный заказ'}
        description={driverVerificationStatus === 'BLOCKED' ? 'Доступ к заказам ограничен.' : 'Доступен после проверки водителя.'}
      >
        {driverVerificationStatus === 'BLOCKED' ? (
          <DriverBlockedStateCard reason={blockedReason} />
        ) : (
          <div className="rounded-2xl bg-surface-soft p-4 text-sm text-ink">
            Сначала завершите водительскую проверку, чтобы работать с заказами.
          </div>
        )}
      </PageCard>
    )
  }

  if (!driverActiveOrder) {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Активный заказ"
        description="Сейчас у вас нет открытого заказа."
      >
        <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
          <MapPinned className="h-5 w-5 text-accent" />
          <p className="text-sm text-ink">Выберите заказ в ленте, чтобы начать работу.</p>
        </div>
        <button
          type="button"
          onClick={() => actions.setScreen('driverFeed')}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
        >
          Открыть ленту заказов
        </button>
      </PageCard>
    )
  }

  const commissionPreview = driverActiveOrder.commissionPreview ?? null
  const commissionAmount = driverActiveOrder.commissionAmount ?? commissionPreview ?? null
  const afterCommission = commissionPreview != null ? driverActiveOrder.price - commissionPreview : null
  const nextActionLabel = getNextActionLabel(driverActiveOrder.category, driverActiveOrder.status)
  const isCompleted = driverActiveOrder.status === 'COMPLETED'
  const isCancelled = driverActiveOrder.status === 'CANCELLED'
  const balanceBefore = driverActiveOrder.completedBalanceBefore
  const balanceAfter = driverActiveOrder.completedBalanceAfter

  return (
    <PageCard
      eyebrow="Водитель"
      title="Активный заказ"
      description={
        subscriptionAccess
          ? 'Комиссия за заказ не списывается. Работа доступна по тарифу.'
          : 'Комиссия списывается только после завершения заказа.'
      }
    >
      {driverFlowError ? (
        <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
          {driverFlowError}
        </div>
      ) : null}

      <div className="rounded-2xl bg-surface-soft p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Статус
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {formatDriverStatus(driverActiveOrder.status)}
            </p>
          </div>
          <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            {driverActiveOrder.category === 'ride' ? 'Поездка' : 'Посылка'}
          </span>
        </div>
      </div>

      <div className="grid gap-3">
        <div className="rounded-2xl bg-surface-soft p-4">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Маршрут</p>
          <p className="mt-2 text-lg font-semibold tracking-[-0.02em] text-ink">
            {formatRoute(
              driverActiveOrder.originText ?? driverActiveOrder.from,
              driverActiveOrder.destinationText ?? driverActiveOrder.to,
            )}
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Клиент
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">{driverActiveOrder.clientName}</p>
          </div>
          {driverActiveOrder.canCallPassenger && driverActiveOrder.clientPhone ? (
            <div className="rounded-2xl bg-white p-4 text-left">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                Телефон
              </p>
              <p className="mt-2 text-sm font-semibold text-ink">{driverActiveOrder.clientPhone}</p>
              <a
                href={`tel:${driverActiveOrder.clientPhone.replace(/\s+/g, '')}`}
                className="mt-3 inline-flex items-center justify-center rounded-2xl bg-surface-soft px-4 py-3 text-sm font-semibold text-ink"
              >
                Позвонить
              </a>
            </div>
          ) : (
            <div className="rounded-2xl bg-surface-soft p-4 text-sm text-muted">
              Контакты доступны по правилам заказа и тарифа.
            </div>
          )}
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Цена
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {formatKzt(driverActiveOrder.agreedPrice ?? driverActiveOrder.price)}
            </p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              {subscriptionAccess ? 'Комиссия' : 'Комиссия после завершения'}
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {subscriptionAccess
                ? 'Комиссия за заказ не списывается. Работа доступна по тарифу.'
                : commissionPreview != null
                  ? formatKzt(commissionPreview)
                  : 'Комиссия будет списана после завершения'}
            </p>
          </div>
        </div>

        {subscriptionAccess ? (
          <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
            Комиссия за заказ не списывается. Работа доступна по тарифу.
          </div>
        ) : (
          <div className="rounded-2xl border border-border bg-white p-4">
            <div className="flex items-center gap-3">
              <ReceiptText className="h-5 w-5 text-accent" />
              <div>
                <p className="text-sm font-semibold text-ink">До и после комиссии</p>
                <p className="mt-1 text-sm text-muted">
                  {commissionPreview != null
                    ? `Получите ${formatKzt(driverActiveOrder.agreedPrice ?? driverActiveOrder.price)} до списания комиссии и ${formatKzt(afterCommission ?? 0)} после предварительного расчёта.`
                    : 'Комиссия будет рассчитана и списана после завершения заказа.'}
                </p>
              </div>
            </div>
          </div>
        )}

        {driverActiveOrder.category === 'ride' ? (
          <div className="grid gap-3 rounded-2xl bg-surface-soft p-4 text-sm text-ink">
            <div className="flex items-center gap-2">
              <Navigation2 className="h-4 w-4 text-accent" />
              <span className="font-semibold">
                {formatRideTypeLabel(driverActiveOrder.rideType)}
              </span>
            </div>
            <div className="flex items-center gap-2 text-muted">
              <CheckCircle2 className="h-4 w-4" />
              <span>{driverActiveOrder.passengersCount ?? 1} пассажир(а)</span>
            </div>
          </div>
        ) : (
          <div className="grid gap-3 rounded-2xl bg-surface-soft p-4 text-sm text-ink">
            <div className="flex items-center gap-2">
              <PackageSearch className="h-4 w-4 text-accent" />
              <span className="font-semibold">
                Размер: {formatParcelSizeLabel(driverActiveOrder.parcelSize)}
              </span>
            </div>
            {driverActiveOrder.parcelDescription ? (
              <p className="text-sm text-muted">{driverActiveOrder.parcelDescription}</p>
            ) : null}
            {driverActiveOrder.receiverName ? (
              <p className="text-sm text-muted">Получатель: {driverActiveOrder.receiverName}</p>
            ) : null}
            {driverActiveOrder.receiverPhone ? (
              <p className="text-sm text-muted">
                Телефон получателя: {driverActiveOrder.receiverPhone}
              </p>
            ) : null}
          </div>
        )}

        {isCompleted ? (
          <div className="space-y-3 rounded-2xl bg-emerald-50 p-4 text-sm text-emerald-800">
            <p className="font-semibold">Заказ завершён</p>
            <p>
              {subscriptionAccess
                ? 'Комиссия не списывается. Работа доступна по тарифу.'
                : 'Состояние и списания приходят из бэкенда после смены статуса.'}
            </p>
            <div className="grid gap-2 rounded-2xl bg-white/70 p-3 text-emerald-900">
              <div className="flex items-center justify-between gap-3">
                <span>Цена заказа</span>
                <span className="font-semibold">
                  {formatKzt(driverActiveOrder.agreedPrice ?? driverActiveOrder.price)}
                </span>
              </div>
              {!subscriptionAccess ? (
                <div className="flex items-center justify-between gap-3">
                  <span>Комиссия</span>
                  <span className="font-semibold">
                    {commissionAmount != null
                      ? `-${formatKzt(commissionAmount)}`
                      : 'Будет рассчитана после завершения'}
                  </span>
                </div>
              ) : (
                <div className="rounded-2xl bg-emerald-100 px-3 py-2 text-emerald-900">
                  Комиссия за заказ не списывается. Работа доступна по тарифу.
                </div>
              )}
              {balanceBefore != null && balanceAfter != null ? (
                <>
                  <div className="flex items-center justify-between gap-3">
                    <span>Баланс до</span>
                    <span className="font-semibold">{formatKzt(balanceBefore)}</span>
                  </div>
                  <div className="flex items-center justify-between gap-3">
                    <span>Баланс после</span>
                    <span className="font-semibold">{formatKzt(balanceAfter)}</span>
                  </div>
                </>
              ) : (
                <div className="rounded-2xl bg-white/70 px-3 py-2 text-emerald-900">
                  Баланс обновится после ответа бэкенда.
                </div>
              )}
            </div>
            {typeof balanceAfter === 'number' && balanceAfter < driverWallet.minBalance ? (
              <div className="rounded-2xl bg-amber-100 px-4 py-3 text-amber-900">
                Баланс стал ниже минимума.
              </div>
            ) : null}
          </div>
        ) : isCancelled ? (
          <div className="rounded-2xl bg-red-50 p-4 text-sm text-red-700">
            <p className="font-semibold">Заказ отменён</p>
            <p className="mt-2">Вы можете вернуться в кабинет и открыть новый заказ.</p>
          </div>
        ) : (
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={actions.driverOrderNextStatus}
              disabled={isDriverActionLoading}
              className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
            >
              {nextActionLabel}
            </button>
            <button
              type="button"
              onClick={actions.cancelDriverActiveOrder}
              disabled={isDriverActionLoading}
              className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-semibold text-red-700"
            >
              Отменить заказ
            </button>
          </div>
        )}

        {!isCancelled ? (
          <button
            type="button"
            onClick={() =>
              actions.openRideComplaintSheet({
                targetType: 'ORDER',
                orderId: driverActiveOrder.id,
                title: driverActiveOrder.clientName,
                route: `${driverActiveOrder.from} → ${driverActiveOrder.to}`,
              })
            }
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            <ShieldAlert className="h-4 w-4 text-accent" />
            Пожаловаться
          </button>
        ) : null}

        {(isCompleted || isCancelled) && (
          <div className="space-y-2">
            {isCompleted ? (
              <button
                type="button"
                onClick={() => actions.openPassengerRating()}
                className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
              >
                Оставить отзыв
              </button>
            ) : null}
            <button
              type="button"
              onClick={actions.clearCompletedDriverOrder}
              className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
            >
              Вернуться в кабинет
            </button>
          </div>
        )}

        <div className="grid gap-4 md:grid-cols-2">
          <div className="rounded-2xl border border-border bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Отзывы по заказу
            </p>
            {orderReviews.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Пока нет отзывов.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {orderReviews.slice(0, 3).map((review) => (
                  <div key={review.id} className="rounded-2xl bg-surface-soft p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">{review.rating} / 5</p>
                      <p className="text-xs text-muted">{review.createdAt.slice(0, 10)}</p>
                    </div>
                    {review.comment ? <p className="mt-2 text-sm text-muted">{review.comment}</p> : null}
                  </div>
                ))}
              </div>
            )}
          </div>
          <div className="rounded-2xl border border-border bg-white p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Жалобы по заказу
            </p>
            {orderComplaints.length === 0 ? (
              <p className="mt-3 text-sm text-muted">Пока нет жалоб.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {orderComplaints.slice(0, 3).map((complaint) => (
                  <div key={complaint.id} className="rounded-2xl bg-surface-soft p-3">
                    <div className="flex items-center justify-between gap-3">
                      <p className="text-sm font-semibold text-ink">{complaint.category}</p>
                      <p className="text-xs text-muted">{complaint.status}</p>
                    </div>
                    <p className="mt-2 text-sm text-muted">{complaint.message}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </PageCard>
  )
}
