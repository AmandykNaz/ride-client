import type { ReactNode } from 'react'

import { cn } from '../../lib/cn'

type PageCardProps = {
  eyebrow?: string
  title: string
  description: string
  children?: ReactNode
  className?: string
}

export function PageCard({
  eyebrow,
  title,
  description,
  children,
  className,
}: PageCardProps) {
  return (
    <section
      className={cn(
        'rounded-[28px] border border-border bg-surface p-5 shadow-sm',
        className,
      )}
    >
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          {eyebrow ? (
            <p className="mb-2 text-[11px] font-semibold uppercase tracking-[0.26em] text-muted">
              {eyebrow}
            </p>
          ) : null}
          <h2 className="text-[22px] font-semibold tracking-[-0.03em] text-ink">
            {title}
          </h2>
          <p className="mt-2 text-sm leading-6 text-slate-600">{description}</p>
        </div>
        <div className="h-12 w-12 rounded-2xl bg-accent/10" />
      </div>

      {children ? <div className="space-y-3">{children}</div> : null}
    </section>
  )
}
