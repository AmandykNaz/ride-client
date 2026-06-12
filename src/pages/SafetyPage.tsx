import { ShieldAlert } from 'lucide-react'

import { PageCard } from '../shared/ui/PageCard'

export default function SafetyPage() {
  return (
    <PageCard
      eyebrow="Сервис"
      title="Безопасность"
      description="Раздел для проверок, жалоб, экстренных сценариев и доверенных контактов."
    >
      <div className="flex items-center gap-3 rounded-2xl bg-surface-soft p-4">
        <ShieldAlert className="h-5 w-5 text-accent" />
        <p className="text-sm text-ink">Пока только безопасная заглушка экрана</p>
      </div>
    </PageCard>
  )
}
