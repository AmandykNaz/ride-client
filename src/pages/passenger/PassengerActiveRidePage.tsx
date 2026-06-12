import { Phone, ShieldAlert, XCircle } from 'lucide-react'

import { formatKzt, formatRoute } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'

const statusText: Record<string, string> = {
  DRIVER_COMING: 'Водитель едет к вам',
  ARRIVED: 'Водитель на месте',
  IN_PROGRESS: 'Поездка началась',
  COMPLETED: 'Поездка завершена',
  CANCELLED: 'Поездка отменена',
}

export default function PassengerActiveRidePage() {
  const { activeRide } = useAppState()
  const actions = useAppActions()

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

  return (
    <div className="space-y-4">
      <PageCard
        eyebrow="В пути"
        title={statusText[activeRide.status]}
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
          onClick={() => window.alert('Жалоба отправлена в демо-режиме')}
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-3 py-3 text-sm font-semibold text-ink"
        >
          <ShieldAlert className="h-4 w-4 text-accent" />
          Пожаловаться
        </button>
      </div>

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
    </div>
  )
}
