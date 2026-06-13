import { Headphones, ShieldAlert } from 'lucide-react'

import { useAppState } from '../providers/AppStateProvider'
import { PageCard } from '../shared/ui/PageCard'

function formatDateTime(createdAt: string) {
  return new Intl.DateTimeFormat('ru-KZ', {
    day: '2-digit',
    month: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(createdAt))
}

export default function SupportPage() {
  const { role, passengerComplaints, driverComplaints } = useAppState()
  const complaints = role === 'driver' ? driverComplaints : passengerComplaints

  return (
    <PageCard
      eyebrow="Сервис"
      title="Поддержка"
      description="Помощь пользователям, обращения и контакты службы поддержки."
    >
      <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
        <Headphones className="h-5 w-5 text-accent" />
        <p className="text-sm text-ink">Поддержка будет добавлена на следующем шаге</p>
      </div>

      <div className="rounded-2xl bg-white p-4">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-5 w-5 text-accent" />
          <div>
            <p className="text-sm font-semibold text-ink">Мои жалобы</p>
            <p className="text-sm text-muted">{complaints.length} шт.</p>
          </div>
        </div>

        {complaints.length === 0 ? (
          <p className="mt-3 text-sm text-muted">Пока нет жалоб.</p>
        ) : (
          <div className="mt-3 space-y-2">
            {complaints.slice(0, 5).map((complaint) => (
              <div key={complaint.id} className="rounded-2xl bg-surface-soft p-3 text-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="font-semibold text-ink">{complaint.category}</p>
                  <p className="text-xs text-muted">{complaint.status}</p>
                </div>
                <p className="mt-1 text-muted">{complaint.message}</p>
                <p className="mt-2 text-xs text-muted">{formatDateTime(complaint.createdAt)}</p>
              </div>
            ))}
          </div>
        )}
      </div>
    </PageCard>
  )
}
