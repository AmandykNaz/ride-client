import { useState } from 'react'

import { Phone, ShieldAlert, XCircle } from 'lucide-react'

import { formatKzt, formatRideOrderStatusLabel, formatRoute } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'

export default function PassengerActiveParcelPage() {
  const { activeParcelOrder } = useAppState()
  const actions = useAppActions()
  const isDevParcelFlow = import.meta.env.DEV
  const [notice, setNotice] = useState('')

  if (!isDevParcelFlow) {
    return (
      <PageCard
        eyebrow="Посылка"
        title="Посылки скоро"
        description="Сценарий посылок пока не готов к боевому запуску."
      >
        <div className="rounded-2xl bg-surface-soft p-4 text-sm text-ink">
          Сейчас это экран-заглушка, а не боевой сценарий.
        </div>
        <button
          type="button"
          onClick={() => actions.setScreen('passengerParcels')}
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
        >
          Вернуться к разделу
        </button>
      </PageCard>
    )
  }

  if (!activeParcelOrder) {
    return (
      <PageCard
        eyebrow="Посылка"
        title="Посылки скоро"
        description="Сценарий посылок пока не готов к боевому запуску."
      >
        <div className="rounded-2xl bg-surface-soft p-4 text-sm text-ink">
          Сейчас это режим только для разработки или экран-заглушка. Боевой бэкенд для сценария посылок ещё не подключён.
        </div>
        <button
          type="button"
          onClick={() => actions.setScreen('passengerParcels')}
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
        >
          Вернуться к разделу
        </button>
      </PageCard>
    )
  }

  return (
    <div className="space-y-4">
      <PageCard
        eyebrow="Посылка"
        title={formatRideOrderStatusLabel(activeParcelOrder.status)}
        description="Сценарий посылок доступен только в режиме разработки до готовности бэкенда."
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
          onClick={() => setNotice('В режиме разработки звонок водителю пока не подключён.')}
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
          onClick={() => setNotice('Жалобы в этом сценарии доступны только как заглушка.')}
          className="flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-3 py-3 text-sm font-semibold text-ink"
        >
          <ShieldAlert className="h-4 w-4 text-accent" />
          Пожаловаться
        </button>
      </div>

      {notice ? (
        <div className="rounded-2xl bg-surface-soft px-4 py-3 text-sm text-ink">
          {notice}
        </div>
      ) : null}

      <div className="rounded-[28px] border border-dashed border-border bg-slate-50 p-4 text-sm text-muted">
        Завершение посылок пока не является боевым flow.
      </div>
    </div>
  )
}
