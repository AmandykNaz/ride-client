import { useEffect, useRef } from 'react'
import { Phone, ShieldAlert, XCircle } from 'lucide-react'

import { formatKzt, formatRoute } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'

const statusText: Record<string, string> = {
  ACCEPTED: 'Поездка подтверждена',
  DRIVER_ASSIGNED: 'Водитель назначен',
  DRIVER_ON_WAY: 'Водитель едет к вам',
  DRIVER_ARRIVED: 'Водитель на месте',
  DRIVER_COMING: 'Водитель едет к вам',
  ARRIVED: 'Водитель на месте',
  IN_PROGRESS: 'Поездка началась',
  DISPUTE: 'Спор по поездке',
  COMPLETED: 'Поездка завершена',
  CANCELLED: 'Поездка отменена',
}

export default function PassengerActiveRidePage() {
  const { activeRide, activeRideEvents, orderReviews, orderComplaints, rideFlowError } = useAppState()
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
    if (!activeRide?.id) return
    void refreshActiveRideDetailsRef.current(activeRide.id)
  }, [activeRide?.id])

  useEffect(() => {
    if (!activeRide?.id) return
    void refreshOrderReviewsRef.current(activeRide.id)
    void refreshOrderComplaintsRef.current(activeRide.id)
  }, [activeRide?.id])

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

  return (
    <div className="space-y-4">
      {rideFlowError ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {rideFlowError}
        </div>
      ) : null}

      <PageCard
        eyebrow="В пути"
        title={statusText[activeRide.status] ?? activeRide.status}
        description="Пассажирский UX без кнопки завершения поездки. Завершение эмулирует водительский сценарий."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Водитель
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">{activeRide.driverName}</p>
            <p className="mt-1 text-sm text-muted">{activeRide.driverPhone}</p>
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
            <p className="mt-2 text-sm font-semibold text-ink">{activeRide.carModel}</p>
            <p className="mt-1 text-sm text-muted">{activeRide.carColor}</p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Госномер
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">{activeRide.plate}</p>
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

      <div className="grid grid-cols-3 gap-2">
        <button
          type="button"
          onClick={() => window.alert('Демо-звонок водителю')}
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-3 py-3 text-sm font-semibold text-ink"
        >
          <Phone className="h-4 w-4 text-accent" />
          Позвонить
        </button>
        <button
          type="button"
          onClick={actions.cancelActiveRide}
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-3 py-3 text-sm font-semibold text-ink"
        >
          <XCircle className="h-4 w-4 text-accent" />
          Отменить
        </button>
        <button
          type="button"
          onClick={() => actions.openRideComplaintSheet(activeRide.id)}
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

      <div className="rounded-[28px] border border-dashed border-border bg-slate-50 p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
          Демо-симуляция водителя
        </p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={() => actions.setActiveRideStatus('IN_PROGRESS')}
            className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            Водитель начал поездку
          </button>
          <button
            type="button"
            onClick={actions.completeRideAndOpenRating}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            Водитель завершил поездку
          </button>
        </div>
      </div>

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
                  {event.status} · {event.createdAt.slice(0, 19).replace('T', ' ')}
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
                    <p className="text-xs text-muted">{review.createdAt.slice(0, 10)}</p>
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
