import type { DriverApplicationHistoryItem } from '../../../types/domain'

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

const DOCUMENT_LABELS: Record<string, string> = {
  DRIVER_LICENSE_FRONT: 'ВУ лицевая сторона',
  DRIVER_LICENSE_BACK: 'ВУ обратная сторона',
  VEHICLE_REGISTRATION: 'Техпаспорт авто',
  CAR_FRONT_PHOTO: 'Фото авто спереди',
  CAR_BACK_PHOTO: 'Фото авто сзади',
  INTERIOR_PHOTO: 'Фото салона',
  TRUNK_PHOTO: 'Фото багажника',
}

function formatDocumentTypeLabel(value?: string | null) {
  const normalized = String(value ?? '').trim().toUpperCase()
  if (!normalized) return '—'
  return DOCUMENT_LABELS[normalized] ?? value ?? '—'
}

function formatHistoryActionLabel(action?: string | null) {
  const normalized = String(action ?? '').trim().toUpperCase()
  if (normalized === 'CREATED') return 'Заявка создана'
  if (normalized === 'UPDATED') return 'Вы обновили данные'
  if (normalized === 'DOCUMENT_UPLOADED') return 'Вы загрузили документ'
  if (normalized === 'SUBMITTED') return 'Вы отправили заявку на проверку'
  if (normalized === 'REQUESTED_CHANGES') return 'Модератор запросил исправления'
  if (normalized === 'RESUBMITTED') return 'Вы повторно отправили заявку'
  if (normalized === 'APPROVED') return 'Модератор одобрил заявку'
  if (normalized === 'REJECTED') return 'Модератор отклонил заявку'
  if (normalized === 'BLOCKED') return 'Заявка заблокирована'
  if (normalized === 'UNBLOCKED') return 'Заявка разблокирована'
  return action ?? 'Событие'
}

function formatHistoryStatusLabel(status?: string | null) {
  const normalized = String(status ?? '').trim().toUpperCase()
  if (normalized === 'DRAFT') return 'Черновик'
  if (normalized === 'PENDING_REVIEW' || normalized === 'SUBMITTED') return 'На проверке'
  if (normalized === 'NEEDS_CHANGES') return 'Нужно исправить данные'
  if (normalized === 'APPROVED') return 'Одобрена'
  if (normalized === 'REJECTED') return 'Отклонена'
  if (normalized === 'BLOCKED') return 'Заблокирована'
  return status ?? '—'
}

function formatHistoryMetadata(item: DriverApplicationHistoryItem) {
  const metadata = item as DriverApplicationHistoryItem & { metadata?: Record<string, unknown> | null }
  const documentLabel =
    typeof metadata.metadata?.documentLabel === 'string'
      ? formatDocumentTypeLabel(metadata.metadata.documentLabel)
      : typeof metadata.metadata?.documentType === 'string'
        ? formatDocumentTypeLabel(metadata.metadata.documentType)
        : typeof metadata.metadata?.type === 'string'
          ? formatDocumentTypeLabel(metadata.metadata.type)
          : ''
  const fileName =
    typeof metadata.metadata?.fileName === 'string'
      ? metadata.metadata.fileName
      : typeof metadata.metadata?.file_name === 'string'
        ? metadata.metadata.file_name
        : ''
  const info = [documentLabel, fileName ? `Файл: ${fileName}` : ''].filter(Boolean)
  return info.length > 0 ? info.join(' • ') : null
}

function getHistoryDateTimestamp(item: DriverApplicationHistoryItem) {
  const time = new Date(item.createdAt).getTime()
  return Number.isNaN(time) ? 0 : time
}

function isDocumentUploadEvent(item: DriverApplicationHistoryItem) {
  return String(item.action ?? '').trim().toUpperCase() === 'DOCUMENT_UPLOADED'
}

function getDocumentUploadLabel(item: DriverApplicationHistoryItem) {
  const metadata = item as DriverApplicationHistoryItem & { metadata?: Record<string, unknown> | null }
  const rawLabel =
    typeof metadata.metadata?.documentLabel === 'string'
      ? metadata.metadata.documentLabel
      : typeof metadata.metadata?.documentType === 'string'
        ? metadata.metadata.documentType
      : typeof metadata.metadata?.type === 'string'
        ? metadata.metadata.type
        : ''
  const label = formatDocumentTypeLabel(rawLabel)
  return label === '—' ? '' : label
}

type HistoryDisplayItem =
  | {
      kind: 'event'
      key: string
      item: DriverApplicationHistoryItem
    }
  | {
      kind: 'documents'
      key: string
      items: DriverApplicationHistoryItem[]
      labels: string[]
    }

function groupHistoryItems(history: DriverApplicationHistoryItem[], limit: number) {
  const grouped: HistoryDisplayItem[] = []

  for (let index = 0; index < history.length; ) {
    const current = history[index]

    if (!isDocumentUploadEvent(current)) {
      grouped.push({
        kind: 'event',
        key: `${current.createdAt}-${current.action}-${index}`,
        item: current,
      })
      index += 1
      continue
    }

    const cluster: DriverApplicationHistoryItem[] = [current]
    index += 1

    while (index < history.length && isDocumentUploadEvent(history[index])) {
      cluster.push(history[index])
      index += 1
    }

    const labels = Array.from(new Set(cluster.map((item) => getDocumentUploadLabel(item)).filter(Boolean)))
    grouped.push({
      kind: 'documents',
      key: `${cluster[0].createdAt}-${cluster[0].action}-${cluster.length}-${grouped.length}`,
      items: cluster,
      labels,
    })
  }

  return grouped.slice(0, limit)
}

function formatDocumentUploadSummary(labels: string[]) {
  if (labels.length === 0) return null

  const visibleLabels = labels.slice(0, 3)
  const hiddenCount = labels.length - visibleLabels.length
  const base = visibleLabels.join(', ')
  if (hiddenCount <= 0) return `Загружено: ${base}`

  return `Загружено: ${base} и ещё ${hiddenCount}`
}

export function DriverApplicationHistoryCard({
  history,
  limit = 5,
}: {
  history: DriverApplicationHistoryItem[] | null | undefined
  limit?: number
}) {
  const entries = groupHistoryItems(history ?? [], limit)

  return (
    <div className="rounded-2xl border border-border bg-white p-4">
      <div className="mb-3">
        <p className="text-sm font-semibold text-ink">История проверки</p>
        <p className="mt-1 text-xs text-muted">Последние действия по заявке.</p>
      </div>
      {entries.length > 0 ? (
        <div className="space-y-3">
          {entries.map((entry) => {
            if (entry.kind === 'documents') {
              const latestItem = entry.items.reduce((latest, item) =>
                getHistoryDateTimestamp(item) > getHistoryDateTimestamp(latest) ? item : latest,
              entry.items[0])
              const summary = formatDocumentUploadSummary(entry.labels)

              return (
                <article key={entry.key} className="rounded-2xl bg-surface-soft p-4">
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">
                        {entry.items.length > 1 ? 'Вы загрузили документы' : 'Вы загрузили документ'}
                      </p>
                      <p className="mt-1 text-xs text-muted">{formatDateTime(latestItem.createdAt)}</p>
                    </div>
                  </div>
                  {summary ? (
                    <p className="mt-2 text-sm text-ink">{summary}</p>
                  ) : null}
                </article>
              )
            }

            const item = entry.item
            const statusTransition =
              item.statusFrom || item.statusTo
                ? `${formatHistoryStatusLabel(item.statusFrom)} → ${formatHistoryStatusLabel(item.statusTo)}`
                : null

            return (
              <article key={entry.key} className="rounded-2xl bg-surface-soft p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-sm font-semibold text-ink">{formatHistoryActionLabel(item.action)}</p>
                    <p className="mt-1 text-xs text-muted">{formatDateTime(item.createdAt)}</p>
                  </div>
                  {statusTransition ? (
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-ink">
                      {statusTransition}
                    </span>
                  ) : null}
                </div>
                {item.reason ? <p className="mt-2 text-sm text-ink">Причина: {item.reason}</p> : null}
                {item.message ? <p className="mt-1 text-sm text-muted">{item.message}</p> : null}
                {item.action === 'DOCUMENT_UPLOADED' ? (
                  <p className="mt-1 text-xs text-muted">{formatHistoryMetadata(item)}</p>
                ) : null}
              </article>
            )
          })}
        </div>
      ) : (
        <p className="text-sm text-muted">История пока пустая.</p>
      )}
    </div>
  )
}
