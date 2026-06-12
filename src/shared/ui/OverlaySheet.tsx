import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'

type OverlaySheetProps = {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  position?: 'bottom' | 'center'
}

export function OverlaySheet({
  open,
  title,
  children,
  onClose,
  position = 'center',
}: OverlaySheetProps) {
  if (!open) return null

  return (
    <div
      className={cn(
        'absolute inset-0 z-40 flex bg-slate-950/35 px-3 py-3 backdrop-blur-[2px]',
        position === 'bottom' ? 'items-end' : 'items-center',
      )}
    >
      <button
        type="button"
        aria-label={`Закрыть ${title}`}
        onClick={onClose}
        className="absolute inset-0"
      />
      <div
        className={cn(
          'relative z-10 w-full overflow-hidden border border-border bg-white shadow-2xl',
          position === 'bottom'
            ? 'rounded-t-[28px] p-4'
            : 'mx-auto max-w-[390px] rounded-[28px] p-5',
        )}
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted">
              AmanJol Ride
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-ink">
              {title}
            </h3>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
          >
            Закрыть
          </button>
        </div>
        {children}
      </div>
    </div>
  )
}
