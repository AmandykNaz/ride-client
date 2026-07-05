import { useState } from 'react'

import { PageCard } from '../../shared/ui/PageCard'
import { DriverRequestHistorySection } from './components/DriverRequestHistorySection'

export default function DriverMyOrdersPage() {
  const [historyReloadKey, setHistoryReloadKey] = useState(0)

  const refreshPageData = () => {
    setHistoryReloadKey((current) => current + 1)
  }

  return (
    <PageCard
      eyebrow="Водитель"
      title="Мои заказы"
      description="История открытых контактов и заявок"
    >
      <DriverRequestHistorySection
        historyReloadKey={historyReloadKey}
        onRetry={refreshPageData}
        title="Мои заказы"
        description="Поиск по маршруту, пассажиру или ID заявки."
      />
    </PageCard>
  )
}
