import { useState } from 'react'
import { Star } from 'lucide-react'

import { formatKzt, formatRoute } from '../../../lib/format'
import { useAppActions, useAppState } from '../../../providers/AppStateProvider'
import { OverlaySheet } from '../../../shared/ui/OverlaySheet'

export function PassengerRatingModal() {
  const { isPassengerRatingOpen, activeRide } = useAppState()
  const actions = useAppActions()
  const [rating, setRating] = useState(5)
  const [comment, setComment] = useState('')

  const submit = () => {
    actions.submitRideRating(rating, comment)
    setComment('')
    setRating(5)
  }

  return (
    <OverlaySheet
      open={isPassengerRatingOpen && Boolean(activeRide)}
      title="Поездка завершена"
      onClose={actions.closePassengerRating}
      position="center"
    >
      {activeRide ? (
        <div className="space-y-4">
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-sm font-semibold text-ink">{activeRide.driverName}</p>
            <p className="mt-1 text-sm text-muted">
              {formatRoute(activeRide.from, activeRide.to)}
            </p>
            <p className="mt-2 text-sm font-semibold text-ink">
              {formatKzt(activeRide.price)}
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
            className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
          >
            Оценить водителя
          </button>
        </div>
      ) : null}
    </OverlaySheet>
  )
}
