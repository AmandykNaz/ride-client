import { BadgeCheck } from 'lucide-react'

import { PageCard } from '../../shared/ui/PageCard'
import { useAppState } from '../../providers/AppStateProvider'

export default function DriverDashboardPage() {
  const { driverVerificationStatus } = useAppState()

  return (
    <PageCard
      eyebrow="Водитель"
      title="Кабинет водителя"
      description="Точка входа в будущий водительский кабинет. Пока здесь только макет без бизнес-логики."
    >
      <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
        <BadgeCheck className="h-5 w-5 text-accent" />
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
            DriverVerificationStatus
          </p>
          <p className="mt-1 text-sm font-semibold text-ink">
            {driverVerificationStatus}
          </p>
        </div>
      </div>
    </PageCard>
  )
}
