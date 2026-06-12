import { useEffect, useMemo, useState } from 'react'

import { formatKzt, formatRoute } from '../../../lib/format'
import { useAppActions, useAppState } from '../../../providers/AppStateProvider'
import { OverlaySheet } from '../../../shared/ui/OverlaySheet'

export function DriverCounterOfferSheet() {
  const {
    driverFeedOrders,
    driverCounterOffers,
    isDriverCounterOfferSheetOpen,
    driverCounterOfferOrderId,
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
  const [price, setPrice] = useState('')
  const [comment, setComment] = useState('')

  useEffect(() => {
    if (!isDriverCounterOfferSheetOpen || !selectedOrder) return

    setPrice(
      selectedCounterOffer?.offeredPrice
        ? String(selectedCounterOffer.offeredPrice)
        : String(selectedOrder.requestedPrice),
    )
    setComment(selectedCounterOffer?.comment ?? '')
  }, [isDriverCounterOfferSheetOpen, selectedCounterOffer, selectedOrder])

  if (!selectedOrder) return null

  const handleSubmit = () => {
    const numericPrice = Number(price)

    if (!Number.isFinite(numericPrice) || numericPrice <= 0) {
      window.alert('Введите корректную цену.')
      return
    }

    actions.sendDriverCounterOffer(numericPrice, comment.trim())
    window.alert('Предложение отправлено')
  }

  return (
    <OverlaySheet
      open={isDriverCounterOfferSheetOpen}
      title="Предложить цену"
      onClose={actions.closeDriverCounterOfferSheet}
      position="bottom"
    >
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

        {selectedCounterOffer?.status === 'pending' ? (
          <button
            type="button"
            onClick={() => actions.acceptDemoCounterOfferAsPassenger(selectedOrder.id)}
            className="w-full rounded-2xl border border-accent/20 bg-accent/10 px-4 py-3 text-sm font-semibold text-accent"
          >
            Пассажир принял предложение
          </button>
        ) : null}

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={actions.closeDriverCounterOfferSheet}
            className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            Отмена
          </button>
          <button
            type="button"
            onClick={handleSubmit}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
          >
            Отправить предложение
          </button>
        </div>
      </div>
    </OverlaySheet>
  )
}
