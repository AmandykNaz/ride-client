import { ShieldCheck } from 'lucide-react'

import { formatKzt } from '../../lib/format'
import { PageCard } from '../../shared/ui/PageCard'
import { useAppState } from '../../providers/AppStateProvider'

export default function PassengerProfilePage() {
  const { passengerStatus, passengerProfile } = useAppState()

  return (
    <PageCard
      eyebrow="Пассажир"
      title="Профиль"
      description="Заглушка профиля пассажира. Следующим шагом здесь появятся контакты, документы и настройки безопасности."
    >
      {passengerProfile ? (
        <div className="space-y-3 rounded-2xl bg-surface-soft p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-semibold text-ink">{passengerProfile.name}</p>
              <p className="text-sm text-muted">{passengerProfile.phone}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white p-3">
              <p className="text-muted">Город</p>
              <p className="mt-1 font-semibold text-ink">{passengerProfile.city}</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-muted">Поездок</p>
              <p className="mt-1 font-semibold text-ink">{passengerProfile.tripsCount}</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-muted">Рейтинг</p>
              <p className="mt-1 font-semibold text-ink">{passengerProfile.rating}</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-muted">Статус</p>
              <p className="mt-1 font-semibold text-ink">{passengerStatus}</p>
            </div>
          </div>
          <div className="rounded-2xl bg-white p-3 text-sm text-muted">
            Баланс не подключен. {formatKzt(0)}
          </div>
        </div>
      ) : (
        <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
          <ShieldCheck className="h-5 w-5 text-accent" />
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              PassengerStatus
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">{passengerStatus}</p>
          </div>
        </div>
      )}
    </PageCard>
  )
}
