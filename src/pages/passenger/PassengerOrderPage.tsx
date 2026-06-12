import { Minus, Plus } from 'lucide-react'

import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { formatKzt, formatRoute } from '../../lib/format'
import { cn } from '../../lib/cn'

const typeOptions = [
  { value: 'shared' as const, label: 'С попутчиками' },
  { value: 'full' as const, label: 'Весь салон' },
]

function statusMessage(status: string) {
  if (status === 'LIMITED') {
    return 'Создание заявок временно ограничено.'
  }

  if (status === 'BLOCKED') {
    return 'Аккаунт заблокирован.'
  }

  return ''
}

export default function PassengerOrderPage() {
  const { passengerStatus, passengerProfile, rideDraft } = useAppState()
  const actions = useAppActions()
  const banner = statusMessage(passengerStatus)

  const handleSearch = () => {
    if (passengerStatus === 'GUEST') {
      actions.openPhoneVerifySheet()
      return
    }

    if (passengerStatus === 'PHONE_VERIFIED') {
      actions.startRideSearch()
      return
    }
  }

  return (
    <div className="space-y-4">
      {banner ? (
        <div
          className={cn(
            'rounded-[24px] border px-4 py-3 text-sm font-medium',
            passengerStatus === 'BLOCKED'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-amber-200 bg-amber-50 text-amber-900',
          )}
        >
          {banner}
        </div>
      ) : null}

      {passengerProfile ? (
        <div className="rounded-[28px] border border-border bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            Мини-профиль
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-ink">{passengerProfile.name}</p>
              <p className="text-sm text-muted">{passengerProfile.phone}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{passengerProfile.city}</p>
              <p className="text-sm text-muted">Город</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{passengerProfile.tripsCount}</p>
              <p className="text-sm text-muted">Поездок</p>
            </div>
          </div>
        </div>
      ) : null}

      <div className="rounded-[30px] border border-border bg-white p-4 shadow-sm">
        <div className="grid gap-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Откуда</span>
            <input
              value={rideDraft.from}
              onChange={(event) => actions.updateRideDraft({ from: event.target.value })}
              className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
              placeholder="Алматы"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Куда</span>
            <input
              value={rideDraft.to}
              onChange={(event) => actions.updateRideDraft({ to: event.target.value })}
              className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
              placeholder="Шымкент"
            />
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Дата</span>
              <input
                type="date"
                value={rideDraft.date}
                onChange={(event) => actions.updateRideDraft({ date: event.target.value })}
                className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Время</span>
              <input
                type="time"
                value={rideDraft.time}
                onChange={(event) => actions.updateRideDraft({ time: event.target.value })}
                className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
              />
            </label>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink">Тип поездки</p>
            <div className="grid grid-cols-2 gap-2">
              {typeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => actions.updateRideDraft({ type: option.value })}
                  className={cn(
                    'rounded-2xl border px-3 py-3 text-sm font-semibold',
                    rideDraft.type === option.value
                      ? 'border-accent bg-accent/8 text-accent'
                      : 'border-border bg-surface-soft text-ink',
                  )}
                >
                  {option.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Пассажиров</span>
              <input
                type="number"
                min={1}
                max={7}
                value={rideDraft.passengersCount}
                onChange={(event) =>
                  actions.updateRideDraft({
                    passengersCount: Number(event.target.value) || 1,
                  })
                }
                className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Цена</span>
              <input
                type="number"
                min={0}
                value={rideDraft.price}
                onChange={(event) =>
                  actions.updateRideDraft({ price: Number(event.target.value) || 0 })
                }
                className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Комментарий</span>
            <textarea
              value={rideDraft.comment}
              onChange={(event) => actions.updateRideDraft({ comment: event.target.value })}
              rows={3}
              placeholder="Нужен багажник, детское кресло..."
              className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
            />
          </label>

          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <button
              type="button"
              onClick={() =>
                actions.updateRideDraft({ price: Math.max(0, rideDraft.price - 500) })
              }
              className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-white"
            >
              <Minus className="h-4 w-4 text-ink" />
            </button>
            <div className="rounded-2xl bg-surface-soft px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                Цена заявки
              </p>
              <p className="mt-1 text-base font-semibold text-ink">
                {formatKzt(rideDraft.price)}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                actions.updateRideDraft({ price: rideDraft.price + 500 })
              }
              className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-white"
            >
              <Plus className="h-4 w-4 text-ink" />
            </button>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-muted">
            Маршрут: {formatRoute(rideDraft.from, rideDraft.to)}
          </div>

          <button
            type="button"
            onClick={handleSearch}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
            disabled={passengerStatus === 'LIMITED' || passengerStatus === 'BLOCKED'}
          >
            Найти водителя
          </button>
        </div>
      </div>
    </div>
  )
}
