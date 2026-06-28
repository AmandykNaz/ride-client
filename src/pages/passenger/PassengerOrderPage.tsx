import { ChevronRight } from 'lucide-react'
import { useState } from 'react'

import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { formatKzt, formatRideRequestWhenLabel, formatRoute } from '../../lib/format'
import { cn } from '../../lib/cn'
import { getPassengerCityDisplay, isPassengerProfileComplete } from '../../features/passenger/api/passenger.api'
import { OverlaySheet } from '../../shared/ui/OverlaySheet'

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

function RowButton({
  label,
  value,
  onClick,
  placeholder = 'Выбрать',
}: {
  label: string
  value?: string | null
  onClick: () => void
  placeholder?: string
}) {
  const hasValue = Boolean(value?.trim())

  return (
    <button
      type="button"
      onClick={onClick}
      aria-haspopup="dialog"
      className="flex w-full items-center justify-between gap-3 rounded-[24px] border border-border bg-surface-soft px-4 py-4 text-left transition hover:border-accent/30 focus:border-accent"
    >
      <span className="min-w-0">
        <span className="mb-1 block text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
          {label}
        </span>
        <span className={cn('block text-base font-semibold leading-6', hasValue ? 'text-ink' : 'text-muted')}>
          {hasValue ? value : placeholder}
        </span>
      </span>
      <ChevronRight className="h-4 w-4 shrink-0 text-muted" />
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
  const [openSheet, setOpenSheet] = useState<'schedule' | 'price' | 'comment' | null>(null)
  const [parcelInfoMessage, setParcelInfoMessage] = useState<string | null>(null)

  const handleSearch = () => {
    if (passengerStatus === 'GUEST') {
      actions.setPendingPassengerFlow('ride')
      actions.openPhoneVerifySheet()
      return
    }

    actions.startRideSearch()
  }

  const currentPrice = Number(rideDraft.price)
  const hasOrigin = Boolean((rideDraft.originCityName ?? '').trim() && (rideDraft.originAddress ?? '').trim())
  const hasDestination = Boolean(
    (rideDraft.destinationCityName ?? '').trim() && (rideDraft.destinationAddress ?? '').trim(),
  )
  const hasPrice = rideDraft.price.trim().length > 0 && Number.isFinite(currentPrice) && currentPrice > 0
  const needsScheduledTime = rideDraft.timingMode === 'scheduled'
  const isScheduledFieldsValid =
    !needsScheduledTime || (Boolean(rideDraft.date.trim()) && Boolean(rideDraft.time.trim()))
  const validationError = !hasOrigin
    ? 'Выберите город и адрес отправления.'
    : !hasDestination
      ? 'Выберите город и адрес прибытия.'
      : !hasPrice
        ? 'Укажите цену поездки.'
        : !isScheduledFieldsValid
          ? 'Для запланированной поездки выберите дату и время.'
          : ''
  const canSearch = !isSubmitting && passengerStatus !== 'LIMITED' && passengerStatus !== 'BLOCKED' && !validationError
  const originLabel = buildLocationLabel(rideDraft.originCityName, rideDraft.originAddress)
  const destinationLabel = buildLocationLabel(rideDraft.destinationCityName, rideDraft.destinationAddress)
  const timingLabel = formatRideRequestWhenLabel(rideDraft)

  const openScheduleSheet = () => setOpenSheet('schedule')
  const openPriceSheet = () => setOpenSheet('price')
  const openCommentSheet = () => setOpenSheet('comment')

  return (
    <div className="space-y-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
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
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
              Межгород
            </p>
            <h2 className="mt-1 text-[22px] font-semibold tracking-[-0.03em] text-ink">
              Куда поедем?
            </h2>
          </div>
          <div className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
            AmanJol Ride
          </div>
        </div>

        <div className="space-y-2">
          <RowButton
            label="Откуда"
            value={originLabel === 'Выберите город' ? undefined : originLabel}
            onClick={() => actions.openRideLocationSheet('origin')}
            placeholder="Выберите город и адрес"
          />
          <RowButton
            label="Куда"
            value={destinationLabel === 'Выберите город' ? undefined : destinationLabel}
            onClick={() => actions.openRideLocationSheet('destination')}
            placeholder="Выберите город и адрес"
          />
          <RowButton
            label="Дата и время"
            value={timingLabel}
            onClick={openScheduleSheet}
            placeholder="Сегодня, как можно скорее"
          />
          <RowButton
            label="Комментарий"
            value={rideDraft.comment.trim() || undefined}
            onClick={openCommentSheet}
            placeholder="Добавьте комментарий"
          />
          <RowButton
            label="Цена"
            value={hasPrice ? formatKzt(currentPrice) : undefined}
            onClick={openPriceSheet}
            placeholder="Укажите цену"
          />
        </div>

        <div className="mt-4">
          <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.24em] text-muted">
            Какая поездка вам нужна?
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-3">
            {typeOptions.map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => actions.updateRideDraft({ type: option.value })}
                className={cn(
                  'rounded-[20px] border px-4 py-3 text-sm font-semibold transition',
                  rideDraft.type === option.value
                    ? 'border-accent bg-accent/8 text-accent'
                    : 'border-border bg-surface-soft text-ink',
                )}
              >
                {option.label}
              </button>
            ))}
            <button
              type="button"
              onClick={() => setParcelInfoMessage('Посылки скоро будут доступны')}
              className="rounded-[20px] border border-border bg-surface-soft px-4 py-3 text-sm font-semibold text-ink transition hover:border-accent/30"
            >
              Отправить посылку · скоро
            </button>
          </div>
          {parcelInfoMessage ? (
            <div className="mt-3 rounded-[20px] border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
              {parcelInfoMessage}
            </div>
          ) : null}
        </div>

        <div className="mt-4 rounded-[24px] border border-dashed border-border bg-slate-50 px-4 py-3 text-sm text-muted">
          Маршрут: {formatRoute(originLabel, destinationLabel)}
        </div>

        <div className="sticky bottom-3 z-10 mt-4">
          <button
            type="button"
            onClick={handleSearch}
            className="w-full rounded-[22px] bg-accent px-4 py-4 text-base font-semibold text-white shadow-lg shadow-accent/20"
            disabled={
              !canSearch
            }
          >
            {isSubmitting ? 'Создаём заявку...' : 'Найти водителя'}
          </button>
          {validationError ? (
            <p className="mt-2 px-1 text-sm font-medium text-red-600">{validationError}</p>
          ) : null}
        </div>
      </div>

      {openSheet === 'schedule' ? (
        <RideScheduleSheet
          initialMode={rideDraft.timingMode}
          initialDate={rideDraft.date}
          initialTime={rideDraft.time}
          onClose={() => setOpenSheet(null)}
          onSave={(payload) => {
            actions.updateRideDraft(payload)
            setOpenSheet(null)
          }}
        />
      ) : null}

      {openSheet === 'price' ? (
        <RidePriceSheet
          initialPrice={rideDraft.price}
          onClose={() => setOpenSheet(null)}
          onSave={(price) => {
            actions.updateRideDraft({ price })
            setOpenSheet(null)
          }}
        />
      ) : null}

      {openSheet === 'comment' ? (
        <RideCommentSheet
          initialComment={rideDraft.comment}
          onClose={() => setOpenSheet(null)}
          onSave={(comment) => {
            actions.updateRideDraft({ comment })
            setOpenSheet(null)
          }}
        />
      ) : null}
    </div>
  )
}

function RideScheduleSheet({
  initialMode,
  initialDate,
  initialTime,
  onClose,
  onSave,
}: {
  initialMode: 'immediate' | 'scheduled'
  initialDate: string
  initialTime: string
  onClose: () => void
  onSave: (payload: { timingMode: 'immediate' | 'scheduled'; date: string; time: string }) => void
}) {
  const [mode, setMode] = useState<'immediate' | 'scheduled'>(initialMode)
  const [date, setDate] = useState(initialDate)
  const [time, setTime] = useState(initialTime)
  const [error, setError] = useState('')

  const handleDone = () => {
    if (mode === 'scheduled') {
      if (!date || !time) {
        setError('Для запланированной поездки выберите дату и время.')
        return
      }
      onSave({ timingMode: 'scheduled', date, time })
      return
    }

    onSave({ timingMode: 'immediate', date: '', time: '' })
  }

  const handleSkip = () => {
    onSave({ timingMode: 'immediate', date: '', time: '' })
  }

  return (
    <OverlaySheet open title="Дата и время" onClose={onClose} position="bottom">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-2">
          {[
            { value: 'immediate' as const, label: 'Сейчас' },
            { value: 'scheduled' as const, label: 'Запланировать' },
          ].map((option) => (
            <button
              key={option.value}
              type="button"
              onClick={() => {
                setMode(option.value)
                setError('')
              }}
              className={cn(
                'rounded-[18px] border px-4 py-3 text-sm font-semibold transition',
                mode === option.value
                  ? 'border-accent bg-accent/8 text-accent'
                  : 'border-border bg-surface-soft text-ink',
              )}
            >
              {option.label}
            </button>
          ))}
        </div>

        <div className="space-y-3">
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Дата отправления</span>
            <input
              type="date"
              value={date}
              onChange={(event) => {
                setDate(event.target.value)
                setError('')
              }}
              className="w-full rounded-[18px] border border-border bg-white px-4 py-4 text-base outline-none transition focus:border-accent"
            />
          </label>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Время отправления</span>
            <input
              type="time"
              value={time}
              onChange={(event) => {
                setTime(event.target.value)
                setError('')
              }}
              className="w-full rounded-[18px] border border-border bg-white px-4 py-4 text-base outline-none transition focus:border-accent"
            />
          </label>
        </div>

        {error ? (
          <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleSkip}
            className="rounded-[18px] border border-border bg-white px-4 py-4 text-base font-semibold text-ink"
          >
            Пропустить
          </button>
          <button
            type="button"
            onClick={handleDone}
            className="rounded-[18px] bg-accent px-4 py-4 text-base font-semibold text-white shadow-lg shadow-accent/20"
          >
            Готово
          </button>
        </div>
      </div>
    </OverlaySheet>
  )
}

function RidePriceSheet({
  initialPrice,
  onClose,
  onSave,
}: {
  initialPrice: string
  onClose: () => void
  onSave: (price: string) => void
}) {
  const [price, setPrice] = useState(initialPrice)
  const [error, setError] = useState('')

  const handleDone = () => {
    const normalized = normalizePriceInput(price)
    const numeric = Number(normalized)

    if (!normalized || !Number.isFinite(numeric) || numeric <= 0) {
      setError('Укажите цену больше нуля.')
      return
    }

    onSave(normalized)
  }

  return (
    <OverlaySheet open title="Предложите цену" onClose={onClose} position="bottom">
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Цена</span>
          <div className="relative">
            <input
              type="text"
              inputMode="numeric"
              value={price}
              onChange={(event) => {
                setPrice(normalizePriceInput(event.target.value))
                setError('')
              }}
              placeholder="9000"
              className="w-full rounded-[22px] border border-border bg-white py-4 pl-4 pr-14 text-2xl font-semibold tracking-tight outline-none transition focus:border-accent"
            />
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xl font-semibold text-muted">
              ₸
            </span>
          </div>
        </label>

        {error ? (
          <div className="rounded-[18px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}

        <button
          type="button"
          onClick={handleDone}
          className="w-full rounded-[18px] bg-accent px-4 py-4 text-base font-semibold text-white shadow-lg shadow-accent/20"
        >
          Готово
        </button>
      </div>
    </OverlaySheet>
  )
}

function RideCommentSheet({
  initialComment,
  onClose,
  onSave,
}: {
  initialComment: string
  onClose: () => void
  onSave: (comment: string) => void
}) {
  const [comment, setComment] = useState(initialComment)

  return (
    <OverlaySheet open title="Комментарии" onClose={onClose} position="bottom">
      <div className="space-y-4">
        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Комментарий</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={6}
            placeholder="Например: 2 человека с чемоданом"
            className="w-full rounded-[22px] border border-border bg-white px-4 py-4 text-base outline-none transition focus:border-accent"
          />
        </label>

        <button
          type="button"
          onClick={() => onSave(comment.trim())}
          className="w-full rounded-[18px] bg-accent px-4 py-4 text-base font-semibold text-white shadow-lg shadow-accent/20"
        >
          Готово
        </button>
      </div>
    </OverlaySheet>
  )
}
