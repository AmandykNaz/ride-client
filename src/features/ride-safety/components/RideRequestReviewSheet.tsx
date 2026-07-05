import { useState } from 'react'
import { Star } from 'lucide-react'

import { OverlaySheet } from '../../../shared/ui/OverlaySheet'
import { cn } from '../../../lib/cn'

type RideRequestReviewSheetProps = {
  open: boolean
  title: string
  subjectName?: string | null
  route?: string | null
  priceLabel?: string | null
  submitLabel: string
  submitting?: boolean
  error?: string | null
  success?: boolean
  successMessage?: string
  onSubmit: (payload: { rating: number; comment?: string }) => Promise<void> | void
  onClose: () => void
}

export function RideRequestReviewSheet({
  open,
  title,
  subjectName,
  route,
  priceLabel,
  submitLabel,
  submitting = false,
  error,
  success = false,
  successMessage = 'Оценка сохранена.',
  onSubmit,
  onClose,
}: RideRequestReviewSheetProps) {
  const [rating, setRating] = useState<number | null>(null)
  const [comment, setComment] = useState('')

  const handleSubmit = async () => {
    if (!rating || success || submitting) return
    await onSubmit({
      rating,
      comment,
    })
  }

  return (
    <OverlaySheet
      open={open}
      title={title}
      onClose={onClose}
      position="center"
      footer={
        success ? (
          <button
            type="button"
            onClick={onClose}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            Закрыть
          </button>
        ) : (
          <button
            type="button"
            onClick={() => void handleSubmit()}
            disabled={!rating || submitting}
            className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {submitting ? 'Сохраняем...' : submitLabel}
          </button>
        )
      }
    >
      <div className="space-y-4">
        {(subjectName || route || priceLabel) ? (
          <div className="rounded-2xl bg-surface-soft p-4">
            {subjectName ? <p className="text-sm font-semibold text-ink">{subjectName}</p> : null}
            {route ? <p className="mt-1 text-sm text-muted">{route}</p> : null}
            {priceLabel ? <p className="mt-2 text-sm font-semibold text-ink">{priceLabel}</p> : null}
          </div>
        ) : null}

        <div>
          <p className="mb-2 text-sm font-medium text-ink">Оценка</p>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map((value) => (
              <button
                key={value}
                type="button"
                onClick={() => {
                  if (!success) setRating(value)
                }}
                disabled={success}
                className={cn(
                  'grid h-11 w-11 place-items-center rounded-2xl border border-border bg-white disabled:cursor-default',
                  rating === value ? 'border-accent' : '',
                )}
                aria-label={`${value} stars`}
              >
                <Star
                  className={cn(
                    'h-5 w-5',
                    rating && rating >= value ? 'fill-accent text-accent' : 'text-slate-300',
                  )}
                />
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Комментарий необязательно</span>
          <textarea
            value={comment}
            onChange={(event) => setComment(event.target.value)}
            rows={3}
            disabled={success}
            placeholder="Напишите пару слов"
            className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent disabled:cursor-default disabled:opacity-70"
          />
        </label>

        {success ? (
          <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
            {successMessage}
          </div>
        ) : null}

        {error ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {error}
          </div>
        ) : null}
      </div>
    </OverlaySheet>
  )
}
