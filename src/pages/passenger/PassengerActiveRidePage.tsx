import { useEffect, useRef } from 'react'
import { Phone, ShieldAlert, XCircle } from 'lucide-react'

import { formatFullDateTime, formatKzt, formatRideOrderStatusLabel, formatRoute, formatVehicleParts } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'
import { DriverAvatar } from '../../shared/ui/DriverAvatar'

export default function PassengerActiveRidePage() {
  const { activeRide, activeRideEvents, orderReviews, orderComplaints, rideFlowError, isRideActionLoading } = useAppState()
  const actions = useAppActions()
  const refreshActiveRideDetailsRef = useRef(actions.refreshActiveRideDetails)
  const refreshOrderReviewsRef = useRef(actions.refreshOrderReviews)
  const refreshOrderComplaintsRef = useRef(actions.refreshOrderComplaints)

  useEffect(() => {
    refreshActiveRideDetailsRef.current = actions.refreshActiveRideDetails
  }, [actions.refreshActiveRideDetails])

  useEffect(() => {
    refreshOrderReviewsRef.current = actions.refreshOrderReviews
    refreshOrderComplaintsRef.current = actions.refreshOrderComplaints
  }, [actions.refreshOrderReviews, actions.refreshOrderComplaints])

  useEffect(() => {
    if (!activeRide?.orderId) return
    void refreshActiveRideDetailsRef.current(activeRide.orderId)
  }, [activeRide?.orderId])

  useEffect(() => {
    if (!activeRide?.orderId) return
    void refreshOrderReviewsRef.current(activeRide.orderId)
    void refreshOrderComplaintsRef.current(activeRide.orderId)
  }, [activeRide?.orderId])

  if (!activeRide) {
    return (
      <PageCard
        eyebrow="Пассажир"
        title="Активная поездка"
        description="Активная поездка не найдена."
      >
        <button
          type="button"
          onClick={() => actions.setScreen('passengerOrder')}
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
        >
          Вернуться к заявке
        </button>
      </PageCard>
    )
  }

  const isCompleted = activeRide.status === 'COMPLETED'
  const { vehicleName, plateNumber, colorName } = formatVehicleParts(activeRide)

  return (
    <div className="space-y-4">
      {rideFlowError ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {rideFlowError}
        </div>
      ) : null}

      <PageCard
        eyebrow="В пути"
        title={formatRideOrderStatusLabel(activeRide.status)}
        description="Пассажирский экран без кнопки завершения. Статус меняет водитель через бэкенд."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Водитель
            </p>
            <div className="mt-2 flex items-center gap-3">
              <DriverAvatar name={activeRide.driverName} avatarUrl={activeRide.driverAvatarUrl} />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-ink">{activeRide.driverName}</p>
                <p className="mt-1 text-sm text-muted">
                  {activeRide.canCallDriver ? activeRide.driverPhone : 'Контакт скрыт до подтверждения заказа'}
                </p>
              </div>
            </div>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Рейтинг
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {activeRide.driverRating} / 5
            </p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Авто
            </p>
            <div className="mt-2 text-sm font-semibold text-ink">
              <p>{vehicleName || plateNumber || 'Авто не указано'}</p>
              {vehicleName && plateNumber ? <p className="mt-1">{plateNumber}</p> : null}
            </div>
            {colorName ? <p className="mt-1 text-sm text-muted">Цвет: {colorName}</p> : null}
          </div>
        </div>
      </PageCard>

      <div className="rounded-[28px] border border-border bg-white p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
          Маршрут
        </p>
        <p className="mt-2 text-lg font-semibold text-ink">
          {formatRoute(activeRide.from, activeRide.to)}
        </p>
        <p className="mt-2 text-sm font-semibold text-accent">
          {formatKzt(activeRide.price)}
        </p>
      </div>

      <div className="grid gap-2 sm:grid-cols-3">
        {activeRide.canCallDriver ? (
          <a
            href={`tel:${activeRide.driverPhone.replace(/\s+/g, '')}`}
            className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-3 py-3 text-sm font-semibold text-ink"
          >
            <Phone className="h-4 w-4 text-accent" />
            Позвонить водителю
          </a>
        ) : (
          <div className="flex items-center justify-center rounded-2xl border border-border bg-white px-3 py-3 text-sm font-semibold text-muted">
            Контакты доступны по правилам заказа и тарифа.
          </div>
        )}
        <button
          type="button"
          onClick={() => void actions.cancelActiveRide()}
          disabled={isRideActionLoading}
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-3 py-3 text-sm font-semibold text-ink"
        >
          <XCircle className="h-4 w-4 text-accent" />
          Отменить
        </button>
        <button
          type="button"
          onClick={() =>
            actions.openRideComplaintSheet({
              targetType: 'ORDER',
              orderId: activeRide.orderId,
              title: activeRide.driverName,
              route: `${activeRide.from} → ${activeRide.to}`,
            })
          }
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-3 py-3 text-sm font-semibold text-ink"
        >
          <ShieldAlert className="h-4 w-4 text-accent" />
          Пожаловаться
        </button>
      </div>

      {isCompleted ? (
        <button
          type="button"
          onClick={() => actions.openPassengerRating()}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
        >
          Оставить отзыв
        </button>
      ) : null}

      {activeRideEvents.length > 0 ? (
        <div className="rounded-[28px] border border-border bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            События заказа
          </p>
          <div className="mt-3 space-y-3">
            {activeRideEvents.map((event) => (
              <div key={event.id} className="rounded-2xl bg-surface-soft p-3">
                <p className="text-sm font-semibold text-ink">{event.message}</p>
                <p className="mt-1 text-xs text-muted">
                  {formatRideOrderStatusLabel(event.status)} · {formatFullDateTime(event.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid gap-4 md:grid-cols-2">
        <div className="rounded-[28px] border border-border bg-white p-4 shadow-sm">
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
                    <p className="text-xs text-muted">{formatFullDateTime(review.createdAt)}</p>
                  </div>
                  {review.comment ? <p className="mt-2 text-sm text-muted">{review.comment}</p> : null}
                </div>
              ))}
            </div>
          )}
        </div>
        <div className="rounded-[28px] border border-border bg-white p-4 shadow-sm">
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
  )
}
