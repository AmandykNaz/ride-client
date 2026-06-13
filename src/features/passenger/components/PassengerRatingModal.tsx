import { useState } from 'react'
import { Star } from 'lucide-react'

import { formatKzt, formatRoute } from '../../../lib/format'
import { useAppActions, useAppState } from '../../../providers/AppStateProvider'
import { OverlaySheet } from '../../../shared/ui/OverlaySheet'

export function PassengerRatingModal() {
  const {
    isPassengerRatingOpen,
    activeRide,
    driverActiveOrder,
    isRideReviewSubmitting,
    rideSafetyError,
  } = useAppState()
  const actions = useAppActions()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')
  const reviewTarget = activeRide ?? driverActiveOrder
  const targetName = activeRide?.driverName ?? driverActiveOrder?.clientName ?? 'Участник поездки'
  const targetPhone = activeRide?.driverPhone ?? driverActiveOrder?.clientPhone ?? ''
  const targetRoute = reviewTarget ? formatRoute(reviewTarget.from, reviewTarget.to) : ''
  const open = isPassengerRatingOpen && Boolean(reviewTarget)

  const submit = async () => {
    try {
      await actions.submitRideRating(rating, comment)
      setComment('')
      setRating(5)
    } catch {
      // Error is surfaced by rideSafetyError in the sheet.
    }
  }

  return (
    <OverlaySheet
      open={open}
      title={activeRide ? 'Поездка завершена' : 'Оставить отзыв'}
      onClose={actions.closePassengerRating}
      position="center"
    >
      {reviewTarget ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-sm font-semibold text-ink">{targetName}</p>
            {targetPhone ? <p className="mt-1 text-sm text-muted">{targetPhone}</p> : null}
            <p className="mt-1 text-sm text-muted">{targetRoute}</p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {formatKzt(reviewTarget.price)}
            </p>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-ink">Оценка водителя</p>
            <div className="flex gap-2">
              {[1, 2, 3, 4, 5].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setRating(value)}
                  className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-white"
                  aria-label={`${value} stars`}
                >
                  <Star
                    className={rating >= value ? 'h-5 w-5 fill-accent text-accent' : 'h-5 w-5 text-slate-300'}
                  />
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">
              Комментарий необязательно
            </span>
            <textarea
              value={comment}
              onChange={(event) => setComment(event.target.value)}
              rows={3}
              placeholder="Напишите пару слов"
              className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
            />
          </label>

          <button
            type="button"
            onClick={submit}
            disabled={isRideReviewSubmitting}
            className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isRideReviewSubmitting ? 'Отправляем...' : activeRide ? 'Оценить водителя' : 'Отправить отзыв'}
          </button>

          {rideSafetyError ? (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {rideSafetyError}
            </div>
          ) : null}
        </div>
      ) : null}
    </OverlaySheet>
  )
}
