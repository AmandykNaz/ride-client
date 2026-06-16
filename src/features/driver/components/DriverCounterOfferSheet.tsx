import { useMemo, useState } from 'react'

import { formatKzt, formatRoute } from '../../../lib/format'
import { useAppActions, useAppState } from '../../../providers/AppStateProvider'
import { OverlaySheet } from '../../../shared/ui/OverlaySheet'
import type { DriverCounterOffer, DriverFeedOrder } from '../../../types/domain'

export function DriverCounterOfferSheet() {
  const {
    driverFeedOrders,
    driverCounterOffers,
    isDriverCounterOfferSheetOpen,
    driverCounterOfferOrderId,
    isDriverActionLoading,
  } = useAppState()
  const actions = useAppActions()
  const selectedOrder = useMemo(
    () => driverFeedOrders.find((item) => item.id === driverCounterOfferOrderId) ?? null,
    [driverCounterOfferOrderId, driverFeedOrders],
  )
  const selectedCounterOffer = useMemo(
    () => driverCounterOffers.find((item) => item.orderId === driverCounterOfferOrderId) ?? null,
    [driverCounterOfferOrderId, driverCounterOffers],
  )

  if (!selectedOrder) return null

  return (
    <OverlaySheet
      open={isDriverCounterOfferSheetOpen}
      title="Предложить цену"
      onClose={actions.closeDriverCounterOfferSheet}
      position="bottom"
    >
      <CounterOfferForm
        key={`${selectedOrder.id}:${selectedCounterOffer?.offeredPrice ?? selectedOrder.requestedPrice}:${selectedCounterOffer?.comment ?? ''}`}
        selectedOrder={selectedOrder}
        selectedCounterOffer={selectedCounterOffer}
        isDriverActionLoading={isDriverActionLoading}
        onClose={actions.closeDriverCounterOfferSheet}
        onWithdrawOffer={(offerId) => actions.withdrawDriverOffer(offerId)}
        onSubmit={(price, comment, setError) => {
          const numericPrice = Number(price)

          if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
            setError('Введите корректную цену.')
            return
          }

          setError('')
          actions.sendDriverCounterOffer(numericPrice, comment.trim())
        }}
      />
    </OverlaySheet>
  )
}

function CounterOfferForm({
  selectedOrder,
  selectedCounterOffer,
  isDriverActionLoading,
  onClose,
  onWithdrawOffer,
  onSubmit,
}: {
  selectedOrder: DriverFeedOrder
  selectedCounterOffer: DriverCounterOffer | null
  isDriverActionLoading: boolean
  onClose: () => void
  onWithdrawOffer: (offerId: string) => Promise<void>
  onSubmit: (price: string, comment: string, setError: (value: string) => void) => void
}) {
  const [price, setPrice] = useState(
    selectedCounterOffer?.offeredPrice
      ? String(selectedCounterOffer.offeredPrice)
      : String(selectedOrder.requestedPrice),
  )
  const [comment, setComment] = useState(selectedCounterOffer?.comment ?? '')
  const [error, setError] = useState('')

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface-soft p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
          Маршрут
        </p>
        <p className="mt-2 text-sm font-semibold text-ink">
          {formatRoute(selectedOrder.from, selectedOrder.to)}
        </p>
        <p className="mt-1 text-sm text-muted">
          Цена клиента: {formatKzt(selectedOrder.requestedPrice)}
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink">Ваша цена</span>
        <input
          type="number"
          inputMode="numeric"
          min="0"
          step="100"
          value={price}
          onChange={(event) => setPrice(event.target.value)}
          placeholder="Например 12000"
          className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink">Комментарий пассажиру</span>
        <textarea
          value={comment}
          onChange={(event) => setComment(event.target.value)}
          placeholder="Напишите короткое пояснение"
          rows={4}
          className="w-full resize-none rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
        />
      </label>

      {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {selectedCounterOffer?.status === 'pending' ? (
        <div className="space-y-2">
          <button
            type="button"
            disabled={isDriverActionLoading}
            onClick={async () => {
              await onWithdrawOffer(selectedCounterOffer.id)
              onClose()
            }}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            Отозвать предложение
          </button>
        </div>
      ) : null}

      <div className="grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={onClose}
          className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
        >
          Отмена
        </button>
        <button
          type="button"
          onClick={() => onSubmit(price, comment, setError)}
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
        >
          Отправить предложение
        </button>
      </div>
    </div>
  )
}
