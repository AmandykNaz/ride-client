import { useState } from 'react'

import { cn } from '../../../lib/cn'
import { useAppActions, useAppState } from '../../../providers/AppStateProvider'
import { OverlaySheet } from '../../../shared/ui/OverlaySheet'

const complaintCategories = [
  { id: 'safety', label: 'Безопасность' },
  { id: 'behavior', label: 'Поведение' },
  { id: 'service', label: 'Сервис' },
  { id: 'payment', label: 'Оплата' },
  { id: 'other', label: 'Другое' },
] as const

export function RideComplaintSheet() {
  const {
    isRideComplaintOpen,
    rideComplaintForm,
    rideSafetyError,
    rideSafetyNotice,
    isRideComplaintSubmitting,
  } = useAppState()
  const actions = useAppActions()
  const [localError, setLocalError] = useState('')
  const currentTargetId = rideComplaintForm.targetType === 'ORDER' ? rideComplaintForm.orderId : rideComplaintForm.requestId
  const currentTitle = rideComplaintForm.title
  const currentRoute = rideComplaintForm.route
  const targetLabel = rideComplaintForm.targetType === 'ORDER' ? 'ID заказа' : 'ID заявки'
  const isSubmitted = Boolean(rideSafetyNotice)
  const isLocked = isRideComplaintSubmitting || isSubmitted

  const handleSubmit = async () => {
    if (isSubmitted) {
      return
    }

    if (!currentTargetId) {
      setLocalError(
        rideComplaintForm.targetType === 'ORDER'
          ? 'Не удалось определить заказ для жалобы.'
          : 'Не удалось определить заявку для жалобы.',
      )
      return
    }

    if (!rideComplaintForm.category.trim()) {
      setLocalError('Выберите причину.')
      return
    }

    setLocalError('')

    try {
      await actions.submitRideComplaint()
      actions.updateRideComplaintForm({ category: 'other' })
    } catch {
      setLocalError('Не удалось отправить жалобу.')
    }
  }

  return (
    <OverlaySheet
      open={isRideComplaintOpen}
      title="Жалоба"
      onClose={actions.closeRideComplaintSheet}
      position="bottom"
      footer={
        <div className={cn('grid gap-2', isSubmitted ? 'grid-cols-1' : 'grid-cols-2')}>
          <button
            type="button"
            onClick={actions.closeRideComplaintSheet}
            className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            {rideSafetyNotice ? 'Закрыть' : 'Отмена'}
          </button>
          {isSubmitted ? null : (
            <button
              type="button"
              onClick={handleSubmit}
              disabled={isRideComplaintSubmitting}
              className={cn(
                'rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20',
                isRideComplaintSubmitting && 'cursor-not-allowed opacity-60',
              )}
            >
              {isRideComplaintSubmitting ? 'Отправляем...' : 'Отправить жалобу'}
            </button>
          )}
        </div>
      }
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-surface-soft p-4">
          <p className="text-sm font-semibold text-ink">
            {currentTitle || (rideComplaintForm.targetType === 'ORDER' ? 'Текущий заказ' : 'Текущая заявка')}
          </p>
          {currentRoute ? <p className="mt-1 text-sm text-muted">{currentRoute}</p> : null}
          {currentTargetId ? (
            <p className="mt-2 text-xs text-muted">{targetLabel}: {currentTargetId}</p>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {complaintCategories.map((category) => {
            const isActive = rideComplaintForm.category === category.id

            return (
              <button
                key={category.id}
                type="button"
                onClick={() => actions.updateRideComplaintForm({ category: category.id })}
                disabled={isLocked}
                className={cn(
                  'rounded-2xl px-3 py-3 text-xs font-semibold transition',
                  isLocked && 'cursor-not-allowed opacity-60',
                  isActive
                    ? 'bg-accent text-white shadow-lg shadow-accent/20'
                    : 'bg-surface-soft text-ink',
                )}
              >
                {category.label}
              </button>
            )
          })}
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Комментарий</span>
          <textarea
            value={rideComplaintForm.message}
            onChange={(event) => actions.updateRideComplaintForm({ message: event.target.value })}
            rows={4}
            disabled={isLocked}
            className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
            placeholder="Опишите проблему, если хотите"
          />
        </label>

        {rideSafetyError ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {rideSafetyError}
          </div>
        ) : null}

        {rideSafetyNotice ? (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
            {rideSafetyNotice}
          </div>
        ) : null}

        {localError ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {localError}
          </div>
        ) : null}
      </div>
    </OverlaySheet>
  )
}
