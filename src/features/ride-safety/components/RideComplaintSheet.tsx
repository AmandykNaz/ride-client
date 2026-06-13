import { useState } from 'react'

import { cn } from '../../../lib/cn'
import { useAppActions, useAppState } from '../../../providers/AppStateProvider'
import { OverlaySheet } from '../../../shared/ui/OverlaySheet'

const complaintCategories = [
  { id: 'safety', label: 'Safety' },
  { id: 'behavior', label: 'Behavior' },
  { id: 'service', label: 'Service' },
  { id: 'payment', label: 'Payment' },
  { id: 'other', label: 'Other' },
] as const

export function RideComplaintSheet() {
  const {
    isRideComplaintOpen,
    rideComplaintForm,
    rideSafetyError,
    isRideComplaintSubmitting,
    activeRide,
    driverActiveOrder,
  } = useAppState()
  const actions = useAppActions()
  const [localError, setLocalError] = useState('')
  const currentOrder = activeRide ?? driverActiveOrder
  const currentOrderId = currentOrder?.id
  const currentTitle = activeRide ? activeRide.driverName : driverActiveOrder?.clientName
  const currentRoute = currentOrder ? `${currentOrder.from} → ${currentOrder.to}` : ''

  const handleSubmit = async () => {
    if (!currentOrderId) {
      setLocalError('Не удалось определить заказ для жалобы.')
      return
    }

    if (!rideComplaintForm.message.trim()) {
      setLocalError('Напишите сообщение.')
      return
    }

    setLocalError('')

    try {
      await actions.createOrderComplaint(currentOrderId, {
        category: rideComplaintForm.category,
        message: rideComplaintForm.message.trim(),
      })
      actions.updateRideComplaintForm({ category: 'other', message: '' })
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
    >
      <div className="space-y-4">
        <div className="rounded-2xl bg-surface-soft p-4">
          <p className="text-sm font-semibold text-ink">
            {currentTitle || 'Текущий заказ'}
          </p>
          {currentRoute ? <p className="mt-1 text-sm text-muted">{currentRoute}</p> : null}
          {currentOrderId ? (
            <p className="mt-2 text-xs text-muted">Order ID: {currentOrderId}</p>
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
                className={cn(
                  'rounded-2xl px-3 py-3 text-xs font-semibold transition',
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
          <span className="mb-1 block text-sm font-medium text-ink">Сообщение</span>
          <textarea
            value={rideComplaintForm.message}
            onChange={(event) => actions.updateRideComplaintForm({ message: event.target.value })}
            rows={4}
            className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
            placeholder="Опишите проблему"
          />
        </label>

        {rideSafetyError ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {rideSafetyError}
          </div>
        ) : null}

        {localError ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {localError}
          </div>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={actions.closeRideComplaintSheet}
            className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            Отмена
          </button>
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
        </div>
      </div>
    </OverlaySheet>
  )
}
