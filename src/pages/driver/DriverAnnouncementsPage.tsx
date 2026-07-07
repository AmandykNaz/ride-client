import { useEffect, useMemo, useRef, useState } from 'react'
import {
  AlertTriangle,
  CalendarRange,
  CalendarClock,
  CirclePause,
  CirclePlay,
  PencilLine,
  Plus,
  Search,
  TriangleAlert,
  X,
} from 'lucide-react'

import { cn } from '../../lib/cn'
import { formatKzt, formatRoute, formatShortDateTime, formatVehicleLabel } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { OverlaySheet } from '../../shared/ui/OverlaySheet'
import { PageCard } from '../../shared/ui/PageCard'
import {
  formatDriverAnnouncementFeatureLabel,
  formatDriverAnnouncementStatusLabel,
} from '../../features/announcements'
import type { RideDriverAnnouncement, RideDriverAnnouncementStatus } from '../../features/announcements'

type DriverAnnouncementFilter = 'ALL' | 'ACTIVE' | 'PAUSED' | 'COMPLETED' | 'CANCELLED'

const DRIVER_ANNOUNCEMENT_FILTERS: Array<{ value: DriverAnnouncementFilter; label: string }> = [
  { value: 'ALL', label: 'Все' },
  { value: 'ACTIVE', label: 'Активные' },
  { value: 'PAUSED', label: 'Пауза' },
  { value: 'COMPLETED', label: 'Заверш.' },
  { value: 'CANCELLED', label: 'Отмен.' },
]

function isEditableAnnouncementStatus(status: RideDriverAnnouncementStatus | string) {
  const normalized = String(status ?? '').trim().toUpperCase()
  return normalized === 'ACTIVE' || normalized === 'PAUSED'
}

function AnnouncementChip({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-ink">
      {children}
    </span>
  )
}

function getAnnouncementVisibilityMeta(scheduledAt?: string | null) {
  const scheduledDate = scheduledAt ? new Date(scheduledAt) : null
  if (!scheduledDate || Number.isNaN(scheduledDate.getTime())) {
    return {
      hasDeparturePassed: false,
      visibilityEndsAtLabel: 'Время видимости уточняется',
    }
  }

  const visibilityEnd = new Date(scheduledDate.getTime() + 30 * 60 * 1000)

  return {
    hasDeparturePassed: Date.now() >= scheduledDate.getTime(),
    visibilityEndsAtLabel: `Видно до ${formatShortDateTime(visibilityEnd.toISOString())}`,
  }
}

function getTimestamp(value?: string | null) {
  if (!value) return Number.NEGATIVE_INFINITY
  const parsed = new Date(value).getTime()
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY
}

function getNumericAnnouncementId(value?: string | null) {
  if (!value || !/^\d+$/.test(value)) return Number.NEGATIVE_INFINITY
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : Number.NEGATIVE_INFINITY
}

function getAnnouncementSortBucket(announcement: RideDriverAnnouncement) {
  const status = String(announcement.status ?? '').trim().toUpperCase()
  const scheduledAtMs = getTimestamp(announcement.scheduledAt)
  const hasFutureDeparture = Number.isFinite(scheduledAtMs) && scheduledAtMs > Date.now()

  if (status === 'ACTIVE' && hasFutureDeparture) return 0
  if (status === 'PAUSED' && hasFutureDeparture) return 1
  if ((status === 'ACTIVE' || status === 'PAUSED') && !hasFutureDeparture) return 2
  if (status === 'COMPLETED') return 3
  if (status === 'CANCELLED') return 4
  if (status === 'EXPIRED') return 5
  return 6
}

function compareAnnouncements(left: RideDriverAnnouncement, right: RideDriverAnnouncement) {
  const leftBucket = getAnnouncementSortBucket(left)
  const rightBucket = getAnnouncementSortBucket(right)

  if (leftBucket !== rightBucket) {
    return leftBucket - rightBucket
  }

  if (leftBucket === 2) {
    const scheduledDiff = getTimestamp(right.scheduledAt) - getTimestamp(left.scheduledAt)
    if (scheduledDiff !== 0) return scheduledDiff
  }

  const createdDiff = getTimestamp(right.createdAt) - getTimestamp(left.createdAt)
  if (createdDiff !== 0) return createdDiff

  const updatedDiff = getTimestamp(right.updatedAt) - getTimestamp(left.updatedAt)
  if (updatedDiff !== 0) return updatedDiff

  return getNumericAnnouncementId(right.id) - getNumericAnnouncementId(left.id)
}

function matchesAnnouncementFilter(
  announcement: RideDriverAnnouncement,
  filter: DriverAnnouncementFilter,
) {
  if (filter === 'ALL') return true
  return String(announcement.status ?? '').trim().toUpperCase() === filter
}

function matchesAnnouncementSearch(announcement: RideDriverAnnouncement, searchQuery: string) {
  const normalizedQuery = searchQuery.trim().toLowerCase()
  if (!normalizedQuery) return true

  return [announcement.fromText, announcement.toText, announcement.comment ?? '']
    .join(' ')
    .toLowerCase()
    .includes(normalizedQuery)
}

type AnnouncementDangerAction = {
  announcementId: string
  kind: 'cancel' | 'complete'
}

function AnnouncementCard({
  announcement,
  isBusy,
  onOpenEditor,
  onPause,
  onActivate,
  onRequestCancel,
  onRequestComplete,
}: {
  announcement: RideDriverAnnouncement
  isBusy: boolean
  onOpenEditor: (id: string) => void
  onPause: (id: string) => void
  onActivate: (id: string) => void
  onRequestCancel: (id: string) => void
  onRequestComplete: (id: string) => void
}) {
  const isEditable = isEditableAnnouncementStatus(announcement.status)
  const isActive = String(announcement.status).toUpperCase() === 'ACTIVE'
  const statusLabel = formatDriverAnnouncementStatusLabel(announcement.status)
  const vehicleLabel = announcement.vehicle ? formatVehicleLabel(announcement.vehicle, 'Авто не указано') : null
  const { hasDeparturePassed, visibilityEndsAtLabel } = getAnnouncementVisibilityMeta(announcement.scheduledAt)
  const normalizedStatus = String(announcement.status ?? '').trim().toUpperCase()
  const statusMetaLabel =
    normalizedStatus === 'CANCELLED'
      ? 'Отменено водителем'
      : normalizedStatus === 'COMPLETED'
        ? 'Поездка завершена'
        : hasDeparturePassed
          ? 'Время поездки прошло'
          : visibilityEndsAtLabel

  return (
    <article className="rounded-[28px] border border-border bg-white p-4 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold tracking-[-0.02em] text-ink">
            {formatRoute(announcement.fromText, announcement.toText)}
          </p>
          <p className="mt-1 text-sm text-muted">
            {formatShortDateTime(announcement.scheduledAt)}
          </p>
        </div>
        <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          {statusLabel}
        </span>
      </div>

      <div className="mt-4 grid gap-3 rounded-2xl bg-surface-soft p-4 text-sm text-ink">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">Цена за место</span>
          <span className="font-semibold">{formatKzt(Number(announcement.pricePerSeat || 0))}</span>
        </div>
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">Свободных мест</span>
          <span className="font-semibold">{announcement.seatsAvailable}</span>
        </div>
        {vehicleLabel ? (
          <div className="flex items-center justify-between gap-3">
            <span className="text-muted">Авто</span>
            <span className="font-semibold text-right">{vehicleLabel}</span>
          </div>
        ) : null}
        {announcement.comment ? (
          <p className="text-sm leading-6 text-muted">{announcement.comment}</p>
        ) : null}
        <div className="flex flex-wrap gap-2">
          {announcement.acceptsPassengers ? (
            <AnnouncementChip>{formatDriverAnnouncementFeatureLabel('passengers')}</AnnouncementChip>
          ) : null}
          {announcement.acceptsParcels ? (
            <AnnouncementChip>{formatDriverAnnouncementFeatureLabel('parcels')}</AnnouncementChip>
          ) : null}
        </div>
        <div className="rounded-2xl border border-border/70 bg-white px-3 py-2 text-xs text-muted">
          <div className="flex items-center gap-2">
            <CalendarRange className="h-4 w-4 text-accent" />
            <span>{statusMetaLabel}</span>
          </div>
          {(normalizedStatus === 'ACTIVE' || normalizedStatus === 'PAUSED') && hasDeparturePassed ? (
            <p className="mt-1 text-amber-700">Пассажиры уже не увидят эту поездку.</p>
          ) : null}
        </div>
      </div>

      {isEditable ? (
        <div className="mt-4 grid gap-2 sm:grid-cols-2">
          {isActive ? (
            <button
              type="button"
              onClick={() => onPause(announcement.id)}
              disabled={isBusy}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              <CirclePause className="h-4 w-4" />
              Пауза
            </button>
          ) : (
            <button
              type="button"
              onClick={() => onActivate(announcement.id)}
              disabled={isBusy}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink',
                'disabled:cursor-not-allowed disabled:opacity-60',
              )}
            >
              <CirclePlay className="h-4 w-4" />
              Активировать
            </button>
          )}
          <button
            type="button"
            onClick={() => onOpenEditor(announcement.id)}
            disabled={isBusy}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <PencilLine className="h-4 w-4" />
            Редактировать
          </button>
          {isActive && hasDeparturePassed ? (
            <button
              type="button"
              onClick={() => onRequestComplete(announcement.id)}
              disabled={isBusy}
              className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              Завершить поездку
            </button>
          ) : null}
          {isActive && !hasDeparturePassed ? (
            <div className="rounded-2xl border border-dashed border-border bg-surface-soft px-4 py-3 text-sm text-muted">
              Завершить поездку можно после времени отправления.
            </div>
          ) : null}
          <button
            type="button"
            onClick={() => onRequestCancel(announcement.id)}
            disabled={isBusy}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
          >
            Отменить
          </button>
        </div>
      ) : (
        <div className="mt-4 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
          Только просмотр
        </div>
      )}
    </article>
  )
}

export default function DriverAnnouncementsPage() {
  const { driverAnnouncements, driverFlowError, driverVerificationStatus, isDriverActionLoading } = useAppState()
  const actions = useAppActions()
  const refreshAnnouncementsRef = useRef(actions.refreshDriverAnnouncements)
  const topAnchorRef = useRef<HTMLDivElement | null>(null)
  const [isRefreshing, setIsRefreshing] = useState(true)
  const [dangerAction, setDangerAction] = useState<AnnouncementDangerAction | null>(null)
  const [selectedFilter, setSelectedFilter] = useState<DriverAnnouncementFilter>('ALL')
  const [searchQuery, setSearchQuery] = useState('')

  useEffect(() => {
    refreshAnnouncementsRef.current = actions.refreshDriverAnnouncements
  }, [actions.refreshDriverAnnouncements])

  useEffect(() => {
    let cancelled = false

    void refreshAnnouncementsRef.current().finally(() => {
      if (!cancelled) {
        setIsRefreshing(false)
      }
    })

    return () => {
      cancelled = true
    }
  }, [])

  useEffect(() => {
    topAnchorRef.current?.scrollIntoView({ block: 'start' })
  }, [driverAnnouncements.length])

  const handleUpdateStatus = async (id: string, status: RideDriverAnnouncementStatus) => {
    await actions.updateDriverAnnouncementStatus(id, status)
    await actions.refreshDriverAnnouncements()
  }

  const handleConfirmDangerAction = async () => {
    if (!dangerAction) return

    await handleUpdateStatus(
      dangerAction.announcementId,
      dangerAction.kind === 'cancel' ? 'CANCELLED' : 'COMPLETED',
    )
    setDangerAction(null)
  }

  const filteredAnnouncements = useMemo(() => {
    return [...driverAnnouncements]
      .sort(compareAnnouncements)
      .filter((announcement) => matchesAnnouncementFilter(announcement, selectedFilter))
      .filter((announcement) => matchesAnnouncementSearch(announcement, searchQuery))
  }, [driverAnnouncements, searchQuery, selectedFilter])

  const hasSearchQuery = searchQuery.trim().length > 0
  const emptyStateTitle = hasSearchQuery
    ? 'Ничего не найдено'
    : selectedFilter !== 'ALL'
      ? 'По этому фильтру объявлений нет'
      : 'У вас пока нет объявлений'
  const emptyStateDescription = hasSearchQuery
    ? 'Попробуйте другой маршрут или очистите поиск.'
    : selectedFilter !== 'ALL'
      ? 'Попробуйте выбрать другой статус.'
      : 'Нажмите кнопку выше, чтобы создать первое объявление.'

  if (driverVerificationStatus !== 'APPROVED') {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Мои объявления"
        description="Раздел появится после одобрения водительского профиля."
      >
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Чтобы создавать и редактировать объявления, водительский профиль должен быть одобрен.
        </div>
      </PageCard>
    )
  }

  if (isRefreshing && driverAnnouncements.length === 0) {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Мои объявления"
        description="Загружаем ваши объявления."
      >
        <div className="rounded-2xl bg-surface-soft px-4 py-3 text-sm text-muted">
          Подождите, список объявлений загружается...
        </div>
      </PageCard>
    )
  }

  return (
    <div className="space-y-4">
      <div ref={topAnchorRef} />
      <PageCard
        eyebrow="Водитель"
        title="Мои объявления"
        description="Создавайте объявления о поездках и управляйте их статусами."
      >
        <div className="grid gap-2 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => actions.openDriverAnnouncementEditor()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
          >
            <Plus className="h-4 w-4" />
            Создать объявление
          </button>
          <button
            type="button"
            onClick={() => void actions.refreshDriverAnnouncements()}
            className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            <CalendarClock className="h-4 w-4" />
            Обновить
          </button>
        </div>

        {driverFlowError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {driverFlowError}
          </div>
        ) : null}

        <div className="space-y-3">
          <label className="block">
            <span className="sr-only">Поиск по маршруту</span>
            <div className="flex items-center gap-3 rounded-2xl border border-border bg-white px-4 py-3 focus-within:border-accent/60 focus-within:ring-2 focus-within:ring-accent/10">
              <Search className="h-4 w-4 shrink-0 text-muted" />
              <input
                type="text"
                value={searchQuery}
                onChange={(event) => setSearchQuery(event.target.value)}
                placeholder="Поиск по маршруту"
                className="min-w-0 flex-1 bg-transparent text-sm text-ink outline-none placeholder:text-muted"
              />
              {searchQuery ? (
                <button
                  type="button"
                  onClick={() => setSearchQuery('')}
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-soft text-muted transition hover:text-ink"
                  aria-label="Очистить поиск"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </label>

          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1 no-scrollbar">
            {DRIVER_ANNOUNCEMENT_FILTERS.map((filter) => {
              const isSelected = selectedFilter === filter.value

              return (
                <button
                  key={filter.value}
                  type="button"
                  onClick={() => setSelectedFilter(filter.value)}
                  className={cn(
                    'shrink-0 rounded-full border px-3.5 py-2 text-xs font-semibold whitespace-nowrap transition',
                    isSelected
                      ? 'border-accent bg-accent text-white'
                      : 'border-border bg-white text-ink',
                  )}
                >
                  {filter.label}
                </button>
              )
            })}
          </div>
        </div>
      </PageCard>

      {filteredAnnouncements.length === 0 ? (
        <PageCard
          eyebrow="Пока пусто"
          title={emptyStateTitle}
          description={emptyStateDescription}
        >
          <div className="rounded-2xl border border-dashed border-border bg-surface-soft p-4 text-sm text-muted">
            {hasSearchQuery
              ? 'Поиск работает по маршруту и комментарию объявления.'
              : selectedFilter !== 'ALL'
                ? 'В этом разделе появятся объявления с выбранным статусом.'
                : 'Объявления помогут быстрее собирать пассажиров на выбранный маршрут.'}
          </div>
        </PageCard>
      ) : (
        <div className="space-y-3">
          {filteredAnnouncements.map((announcement) => (
            <AnnouncementCard
              key={announcement.id}
              announcement={announcement}
              isBusy={isDriverActionLoading}
              onOpenEditor={actions.openDriverAnnouncementEditor}
              onPause={(id) => {
                void handleUpdateStatus(id, 'PAUSED')
              }}
              onActivate={(id) => {
                void handleUpdateStatus(id, 'ACTIVE')
              }}
              onRequestCancel={(id) => setDangerAction({ announcementId: id, kind: 'cancel' })}
              onRequestComplete={(id) => setDangerAction({ announcementId: id, kind: 'complete' })}
            />
          ))}
        </div>
      )}

      <div className="rounded-[28px] border border-border bg-surface-soft p-4 text-sm text-muted">
        <div className="flex items-start gap-3">
          <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
          <p>
            Если вы меняете статус или редактируете объявление, список обновится сразу после сохранения.
          </p>
        </div>
      </div>

      <OverlaySheet
        open={dangerAction != null}
        title={dangerAction?.kind === 'cancel' ? 'Отменить объявление?' : 'Завершить поездку?'}
        onClose={() => {
          if (isDriverActionLoading) return
          setDangerAction(null)
        }}
        position="bottom"
        footer={
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => setDangerAction(null)}
              disabled={isDriverActionLoading}
              className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
            >
              Назад
            </button>
            <button
              type="button"
              onClick={() => void handleConfirmDangerAction()}
              disabled={isDriverActionLoading}
              className={cn(
                'inline-flex items-center justify-center gap-2 rounded-2xl px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60',
                dangerAction?.kind === 'cancel'
                  ? 'bg-red-600'
                  : 'bg-accent shadow-lg shadow-accent/20',
              )}
            >
              <AlertTriangle className="h-4 w-4" />
              {isDriverActionLoading
                ? 'Сохраняем...'
                : dangerAction?.kind === 'cancel'
                  ? 'Отменить'
                  : 'Завершить'}
            </button>
          </div>
        }
      >
        <div className="space-y-3 text-sm text-ink">
          <p>
            {dangerAction?.kind === 'cancel'
              ? 'Пассажиры больше не увидят эту поездку.'
              : 'Отметим, что поездка состоялась.'}
          </p>
          <div className="rounded-2xl bg-surface-soft px-4 py-3 text-sm text-muted">
            {dangerAction?.kind === 'cancel'
              ? 'Используйте отмену, если поездка не состоится.'
              : 'Используйте завершение только если поездка реально состоялась.'}
          </div>
        </div>
      </OverlaySheet>
    </div>
  )
}
