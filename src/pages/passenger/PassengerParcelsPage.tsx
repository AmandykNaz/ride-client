import { Package2 } from 'lucide-react'

import { PageCard } from '../../shared/ui/PageCard'

export default function PassengerParcelsPage() {
  return (
    <PageCard
      eyebrow="Пассажир"
      title="Посылки"
      description="Каркас будущего экрана для отправки посылок между городами. Логика отправки пока не подключена."
    >
      <div className="rounded-2xl bg-surface-soft p-4">
        <Package2 className="h-5 w-5 text-accent" />
        <p className="mt-3 text-sm font-semibold text-ink">
          Позже здесь будет форма отправки посылок
        </p>
      </div>
    </PageCard>
  )
}
