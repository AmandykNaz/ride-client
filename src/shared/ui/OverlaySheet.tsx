import { createPortal } from 'react-dom'
import { useEffect, type ReactNode } from 'react'

import { cn } from '../../lib/cn'

type OverlaySheetProps = {
  open: boolean
  title: string
  children: ReactNode
  onClose: () => void
  position?: 'bottom' | 'center'
  footer?: ReactNode
  contentClassName?: string
}

let openSheetCount = 0
let previousBodyOverflow = ''
let previousBodyTouchAction = ''
let previousBodyOverscrollBehavior = ''

export function OverlaySheet({
  open,
  title,
  children,
  onClose,
  position = 'center',
  footer,
  contentClassName,
}: OverlaySheetProps) {
  useEffect(() => {
    if (!open || typeof document === 'undefined') return undefined

    if (openSheetCount === 0) {
      previousBodyOverflow = document.body.style.overflow
      previousBodyTouchAction = document.body.style.touchAction
      previousBodyOverscrollBehavior = document.body.style.overscrollBehavior
      document.body.style.overflow = 'hidden'
      document.body.style.touchAction = 'none'
      document.body.style.overscrollBehavior = 'contain'
    }

    openSheetCount += 1

    return () => {
      openSheetCount = Math.max(openSheetCount - 1, 0)

      if (openSheetCount === 0) {
        document.body.style.overflow = previousBodyOverflow
        document.body.style.touchAction = previousBodyTouchAction
        document.body.style.overscrollBehavior = previousBodyOverscrollBehavior
      }
    }
  }, [open])

  if (!open) return null
  if (typeof document === 'undefined') return null

  return createPortal(
    <div
      className={cn(
        'fixed inset-0 z-40 bg-slate-950/35 backdrop-blur-[2px]',
      )}
    >
      <button
        type="button"
        aria-label={`Закрыть ${title}`}
        onClick={onClose}
        className="absolute inset-0"
      />
      <div className="relative z-10 mx-auto flex h-[100dvh] w-full max-w-[430px] items-end px-2 py-2 sm:px-3 sm:py-3">
        <div
          className={cn(
            'flex w-full max-h-[calc(100dvh-1rem)] min-h-0 flex-col overflow-hidden border border-border bg-white shadow-2xl',
            position === 'bottom' ? 'rounded-t-[28px] rounded-b-[28px]' : 'rounded-[28px]',
          )}
        >
          <div className="shrink-0 border-b border-border/70 px-4 pb-3 pt-4 sm:px-5">
            <div className="flex items-start justify-between gap-3">
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
                className="shrink-0 rounded-full bg-slate-100 px-3 py-1 text-xs font-medium text-slate-600"
              >
                Закрыть
              </button>
            </div>
          </div>
          <div
            className={cn(
              'min-h-0 flex-1 overflow-y-auto overscroll-contain px-4 pb-4 pt-4 sm:px-5',
              contentClassName,
            )}
          >
            {children}
          </div>
          {footer ? (
            <div className="shrink-0 border-t border-border/70 bg-white px-4 pb-4 pt-3 sm:px-5">
              {footer}
            </div>
          ) : null}
        </div>
      </div>
    </div>,
    document.body,
  )
}
