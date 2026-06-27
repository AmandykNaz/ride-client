import { Minus, Plus } from 'lucide-react'

import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { formatKzt, formatRoute } from '../../lib/format'
import { cn } from '../../lib/cn'
import { getPassengerCityDisplay, isPassengerProfileComplete } from '../../features/passenger/api/passenger.api'

const typeOptions = [
  { value: 'shared' as const, label: 'С попутчиками' },
  { value: 'full' as const, label: 'Весь салон' },
]

function normalizePriceInput(value: string) {
  const digits = value.replace(/\D/g, '')

  if (!digits) {
    return ''
  }

  const normalized = digits.replace(/^0+/, '')
  return normalized || ''
}

function buildLocationLabel(cityName?: string, address?: string) {
  const trimmedCity = cityName?.trim() || ''
  const trimmedAddress = address?.trim() || ''

  if (!trimmedCity) return 'Выберите город'
  if (!trimmedAddress) return trimmedCity

  return `${trimmedCity}, ${trimmedAddress}`
}

function LocationButton({
  label,
  value,
  onClick,
}: {
  label: string
  value: string
  onClick: () => void
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="block w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-left outline-none transition hover:border-accent/30 focus:border-accent"
    >
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      <span className={cn('block text-sm', value === 'Выберите город' ? 'text-muted' : 'text-ink')}>
        {value}
      </span>
    </button>
  )
}

function getPassengerStatusMessage(
  status: string,
  passengerProfile: { name?: string; cityId?: number | null; cityName?: string; cityRegionName?: string | null; city?: string } | null,
) {
  if (status === 'LIMITED') {
    return 'Создание заявок временно ограничено.'
  }

  if (status === 'BLOCKED') {
    return 'Аккаунт заблокирован.'
  }

  if (status === 'PHONE_VERIFIED') {
    return isPassengerProfileComplete(passengerProfile)
      ? 'Телефон подтверждён.'
      : 'Профиль не заполнен.'
  }

  return ''
}

export default function PassengerOrderPage() {
  const {
    passengerStatus,
    passengerProfile,
    activeRide,
    rideDraft,
    isRideRequestLoading,
    rideFlowError,
  } = useAppState()
  const actions = useAppActions()
  const isProfileComplete = isPassengerProfileComplete(passengerProfile)
  const profileActionLabel = isProfileComplete ? 'Редактировать профиль' : 'Заполнить профиль'
  const isSubmitting = isRideRequestLoading
  const banner = getPassengerStatusMessage(passengerStatus, passengerProfile)
  const cityDisplay = getPassengerCityDisplay(passengerProfile)

  const handleSearch = () => {
    if (passengerStatus === 'GUEST') {
      actions.setPendingPassengerFlow('ride')
      actions.openPhoneVerifySheet()
      return
    }

    actions.startRideSearch()
  }

  const currentPrice = Number(rideDraft.price)
  const hasPrice = rideDraft.price.trim().length > 0 && Number.isFinite(currentPrice) && currentPrice > 0
  const originLabel = buildLocationLabel(rideDraft.originCityName, rideDraft.originAddress)
  const destinationLabel = buildLocationLabel(rideDraft.destinationCityName, rideDraft.destinationAddress)

  return (
    <div className="space-y-4">
      {activeRide ? (
        <div className="rounded-[24px] border border-accent/20 bg-accent/8 px-4 py-3 text-sm text-ink">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">У вас активная поездка</p>
              <p className="mt-1 truncate text-muted">
                {formatRoute(activeRide.from, activeRide.to)} · {activeRide.status}
              </p>
            </div>
            <button
              type="button"
              onClick={() => actions.setScreen('passengerActiveRide')}
              className="shrink-0 rounded-2xl bg-accent px-3 py-2 text-sm font-semibold text-white"
            >
              Открыть
            </button>
          </div>
        </div>
      ) : null}

      {rideFlowError ? (
        <div className="rounded-[24px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
          {rideFlowError}
        </div>
      ) : null}

      {banner ? (
        <div
          className={cn(
            'rounded-[24px] border px-4 py-3 text-sm font-medium',
            passengerStatus === 'BLOCKED'
              ? 'border-red-200 bg-red-50 text-red-700'
              : passengerStatus === 'PHONE_VERIFIED' && !isProfileComplete
                ? 'border-amber-200 bg-amber-50 text-amber-900'
                : 'border-emerald-200 bg-emerald-50 text-emerald-900',
          )}
        >
          <div className="flex items-center justify-between gap-3">
            <span>{banner}</span>
            {passengerStatus === 'PHONE_VERIFIED' && !isProfileComplete ? (
              <button
                type="button"
                onClick={() => actions.openPassengerOnboarding()}
                className="shrink-0 rounded-full border border-amber-300 bg-white px-3 py-1 text-xs font-semibold text-amber-900"
              >
                Заполнить профиль
              </button>
            ) : null}
          </div>
        </div>
      ) : null}

      {passengerProfile ? (
        <div className="rounded-[28px] border border-border bg-white p-4 shadow-sm">
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            Мини-профиль
          </p>
          <div className="mt-3 grid gap-3 sm:grid-cols-3">
            <div>
              <p className="text-sm font-semibold text-ink">
                {passengerProfile.name || 'Имя не указано'}
              </p>
              <p className="text-sm text-muted">{passengerProfile.phone}</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">
                {cityDisplay || 'Город не указан'}
              </p>
              <p className="text-sm text-muted">Город</p>
            </div>
            <div>
              <p className="text-sm font-semibold text-ink">{passengerProfile.tripsCount}</p>
              <p className="text-sm text-muted">Поездок</p>
            </div>
          </div>
          <button
            type="button"
            onClick={() => actions.openPassengerOnboarding()}
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            {profileActionLabel}
          </button>
        </div>
      ) : null}

      <div className="rounded-[30px] border border-border bg-white p-4 shadow-sm">
        <div className="grid gap-3">
          <LocationButton
            label="Откуда"
            value={originLabel}
            onClick={() => actions.openRideLocationSheet('origin')}
          />
          <LocationButton
            label="Куда"
            value={destinationLabel}
            onClick={() => actions.openRideLocationSheet('destination')}
          />
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
                type="text"
                inputMode="numeric"
                placeholder="Введите цену"
                value={rideDraft.price}
                onChange={(event) =>
                  actions.updateRideDraft({ price: normalizePriceInput(event.target.value) })
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
                actions.updateRideDraft({
                  price: currentPrice > 500 ? String(currentPrice - 500) : '',
                })
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
                {hasPrice ? formatKzt(currentPrice) : '—'}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                actions.updateRideDraft({
                  price: String((Number.isFinite(currentPrice) ? currentPrice : 0) + 500),
                })
              }
              className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-white"
            >
              <Plus className="h-4 w-4 text-ink" />
            </button>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-muted">
            Маршрут: {formatRoute(originLabel, destinationLabel)}
          </div>

          <button
            type="button"
            onClick={handleSearch}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
            disabled={
              passengerStatus === 'LIMITED' ||
              passengerStatus === 'BLOCKED' ||
              isSubmitting
            }
          >
            {isSubmitting ? 'Создаём заявку...' : 'Найти водителя'}
          </button>
        </div>
      </div>
    </div>
  )
}
