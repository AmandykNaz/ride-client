import { Phone, ShieldAlert, XCircle } from 'lucide-react'

import { formatKzt, formatRoute } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'

const statusText: Record<string, string> = {
  DRIVER_COMING: 'Водитель едет за посылкой',
  ARRIVED: 'Водитель прибыл за посылкой',
  IN_PROGRESS: 'Посылка в пути',
  COMPLETED: 'Посылка доставлена',
  CANCELLED: 'Доставка отменена',
}

export default function PassengerActiveParcelPage() {
  const { activeParcelOrder } = useAppState()
  const actions = useAppActions()

  if (!activeParcelOrder) {
    return (
      <PageCard
        eyebrow="Посылка"
        title="Активная доставка"
        description="Активная доставка не найдена."
      >
        <button
          type="button"
          onClick={() => actions.setScreen('passengerParcels')}
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
        >
          Вернуться к форме
        </button>
      </PageCard>
    )
  }

  return (
    <div className="space-y-4">
      <PageCard
        eyebrow="Посылка"
        title={statusText[activeParcelOrder.status]}
        description="Пассажир не завершает доставку сам. Завершение эмулируется водителем."
      >
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Водитель
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {activeParcelOrder.driverName}
            </p>
            <p className="mt-1 text-sm text-muted">{activeParcelOrder.driverPhone}</p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Рейтинг
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {activeParcelOrder.driverRating} / 5
            </p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Авто
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {activeParcelOrder.carModel}
            </p>
            <p className="mt-1 text-sm text-muted">{activeParcelOrder.carColor}</p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Госномер
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">{activeParcelOrder.plate}</p>
          </div>
        </div>
      </PageCard>

      <div className="rounded-[28px] border border-border bg-white p-4 shadow-sm">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
          Маршрут
        </p>
        <p className="mt-2 text-lg font-semibold text-ink">
          {formatRoute(activeParcelOrder.from, activeParcelOrder.to)}
        </p>
        <p className="mt-2 text-sm font-semibold text-accent">
          {formatKzt(activeParcelOrder.price)}
        </p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2">
        <div className="rounded-[28px] border border-border bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            Получатель
          </p>
          <p className="mt-2 text-sm font-semibold text-ink">{activeParcelOrder.receiverName}</p>
          <p className="mt-1 text-sm text-muted">{activeParcelOrder.receiverPhone}</p>
        </div>
        <div className="rounded-[28px] border border-border bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            Описание
          </p>
          <p className="mt-2 text-sm font-semibold text-ink">{activeParcelOrder.description}</p>
        </div>
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
          onClick={actions.cancelActiveParcel}
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
            onClick={() => actions.setActiveParcelStatus('IN_PROGRESS')}
            className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            Водитель забрал посылку
          </button>
          <button
            type="button"
            onClick={actions.completeParcelAndOpenHistory}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
          >
            Водитель доставил посылку
          </button>
        </div>
      </div>
    </div>
  )
}
