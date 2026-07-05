import { useState } from 'react'

import { formatKzt, formatRoute } from '../../../lib/format'
import { BackendApiError } from '../../../shared/api/backend'
import { useAppActions, useAppState } from '../../../providers/AppStateProvider'
import { OverlaySheet } from '../../../shared/ui/OverlaySheet'
import type { DriverCounterOffer, DriverFeedOrder } from '../../../types/domain'

export function DriverCounterOfferSheet({
  selectedRequest,
  draftPrice,
  draftComment,
  onDraftChange,
  onClose,
  onSuccess,
  onUnavailable,
  onRefreshFeed,
}: {
  selectedRequest: DriverFeedOrder | null
  draftPrice: string
  draftComment: string
  onDraftChange: (next: { price: string; comment: string }) => void
  onClose: () => void
  onSuccess?: (payload: { order: DriverFeedOrder; offer: DriverCounterOffer }) => void
  onUnavailable?: () => void
  onRefreshFeed: () => Promise<void>
}) {
  const { driverCounterOffers, isDriverCounterOfferSheetOpen, isDriverActionLoading } = useAppState()
  const actions = useAppActions()

  const selectedCounterOffer = selectedRequest
    ? driverCounterOffers.find((item) => item.orderId === selectedRequest.id) ?? null
    : null

  if (!selectedRequest) return null

  return (
    <OverlaySheet
      open={isDriverCounterOfferSheetOpen}
      title="Предложить цену"
      onClose={onClose}
      position="bottom"
    >
      <CounterOfferForm
        key={selectedRequest.id}
        selectedRequest={selectedRequest}
        selectedCounterOffer={selectedCounterOffer}
        draftPrice={draftPrice}
        draftComment={draftComment}
        onDraftChange={onDraftChange}
        isDriverActionLoading={isDriverActionLoading}
        onClose={onClose}
        onUnavailable={onUnavailable}
        onRefreshFeed={onRefreshFeed}
        onWithdrawOffer={(offerId) => actions.withdrawDriverOffer(offerId)}
        onSubmit={async (price, comment, setError) => {
          setError('')
          return actions.sendDriverCounterOffer(price, comment.trim())
        }}
        onSuccess={(offer) => {
          onSuccess?.({ order: selectedRequest, offer })
          onClose()
        }}
      />
    </OverlaySheet>
  )
}

function CounterOfferForm({
  selectedRequest,
  selectedCounterOffer,
  draftPrice,
  draftComment,
  onDraftChange,
  isDriverActionLoading,
  onClose,
  onUnavailable,
  onRefreshFeed,
  onWithdrawOffer,
  onSubmit,
  onSuccess,
}: {
  selectedRequest: DriverFeedOrder
  selectedCounterOffer: DriverCounterOffer | null
  draftPrice: string
  draftComment: string
  onDraftChange: (next: { price: string; comment: string }) => void
  isDriverActionLoading: boolean
  onClose: () => void
  onUnavailable?: () => void
  onRefreshFeed: () => Promise<void>
  onWithdrawOffer: (offerId: string) => Promise<void>
  onSubmit: (price: string, comment: string, setError: (value: string) => void) => Promise<DriverCounterOffer>
  onSuccess: (offer: DriverCounterOffer) => void
}) {
  const [error, setError] = useState('')

  const normalizePrice = (value: string) => {
    const trimmed = value.trim().replace(/[\s₸]+/g, '')
    if (!/^[1-9]\d*$/.test(trimmed)) {
      return null
    }

    return trimmed
  }

  return (
    <div className="space-y-4">
      <div className="rounded-2xl bg-surface-soft p-4">
        <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
          Маршрут
        </p>
        <p className="mt-2 text-sm font-semibold text-ink">
          {formatRoute(selectedRequest.from, selectedRequest.to)}
        </p>
        <p className="mt-1 text-sm text-muted">
          Цена клиента: {formatKzt(selectedRequest.requestedPrice)}
        </p>
      </div>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink">Ваша цена</span>
        <input
          type="text"
          inputMode="numeric"
          value={draftPrice}
          onChange={(event) => onDraftChange({ price: event.target.value, comment: draftComment })}
          placeholder="Например 12000"
          className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
        />
      </label>

      <label className="block">
        <span className="mb-1 block text-sm font-medium text-ink">Комментарий пассажиру</span>
        <textarea
          value={draftComment}
          onChange={(event) => onDraftChange({ price: draftPrice, comment: event.target.value })}
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
              try {
                await onWithdrawOffer(selectedCounterOffer.id)
                onClose()
              } catch (error) {
                if (error instanceof Error && error.message) {
                  setError(error.message)
                } else {
                  setError('Не удалось отозвать предложение.')
                }
              }
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
          onClick={async () => {
            try {
              const normalizedPrice = normalizePrice(draftPrice)

              if (!normalizedPrice) {
                setError('Укажите корректную цену.')
                return
              }

              const offer = await onSubmit(normalizedPrice, draftComment, setError)
              onSuccess(offer)
            } catch (error) {
              if (error instanceof BackendApiError && [404, 409, 410].includes(error.status ?? 0)) {
                setError('Заявка уже недоступна. Обновили ленту.')
                onUnavailable?.()
                onClose()
                void onRefreshFeed()
                return
              }

              if (error instanceof BackendApiError && [400, 422].includes(error.status ?? 0)) {
                setError('Не удалось отправить предложение. Проверьте цену.')
                return
              }

              if (error instanceof Error && error.message) {
                setError(error.message)
              } else {
                setError('Не удалось отправить предложение.')
              }
            }
          }}
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
        >
          Отправить предложение
        </button>
      </div>
    </div>
  )
}
