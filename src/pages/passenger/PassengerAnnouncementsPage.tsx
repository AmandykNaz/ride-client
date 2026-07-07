import { useEffect, useMemo, useState } from 'react'
import { CalendarClock, Phone, RefreshCw, Search, Sparkles, X } from 'lucide-react'

import {
  formatDriverAnnouncementFeatureLabel,
  getPassengerAnnouncement,
  getPassengerAnnouncements,
  openPassengerAnnouncementContact,
  type RideDriverAnnouncement,
  type RidePassengerAnnouncementContactOpen,
} from '../../features/announcements'
import { cn } from '../../lib/cn'
import { formatKzt, formatRoute, formatShortDateTime, formatVehicleLabel } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { DriverAvatar } from '../../shared/ui/DriverAvatar'
import { OverlaySheet } from '../../shared/ui/OverlaySheet'
import { PageCard } from '../../shared/ui/PageCard'

const CONTACT_STORAGE_KEY = 'ride-passenger-announcement-contacts-v1'

function getAnnouncementVisibilityDeadline(scheduledAt?: string | null) {
  if (!scheduledAt) return Number.NEGATIVE_INFINITY

  const scheduledDate = new Date(scheduledAt)
  if (Number.isNaN(scheduledDate.getTime())) return Number.NEGATIVE_INFINITY

  return scheduledDate.getTime() + 30 * 60 * 1000
}

function isPassengerAnnouncementVisible(item: RideDriverAnnouncement) {
  const status = String(item.status ?? '').trim().toUpperCase()
  if (status !== 'ACTIVE' && status !== 'PAUSED') {
    return false
  }

  return getAnnouncementVisibilityDeadline(item.scheduledAt) > Date.now()
}

function sortPassengerAnnouncements(left: RideDriverAnnouncement, right: RideDriverAnnouncement) {
  const leftTime = new Date(left.scheduledAt).getTime()
  const rightTime = new Date(right.scheduledAt).getTime()

  if (Number.isFinite(leftTime) && Number.isFinite(rightTime) && leftTime !== rightTime) {
    return leftTime - rightTime
  }

  return new Date(right.createdAt).getTime() - new Date(left.createdAt).getTime()
}

function filterPassengerAnnouncements(items: RideDriverAnnouncement[], query: string) {
  const normalizedQuery = query.trim().toLowerCase()

  return items
    .filter(isPassengerAnnouncementVisible)
    .filter((item) => {
      if (!normalizedQuery) return true

      return [item.fromText, item.toText, item.comment ?? '', item.driver?.fullName ?? '']
        .join(' ')
        .toLowerCase()
        .includes(normalizedQuery)
    })
    .sort(sortPassengerAnnouncements)
}

function readCachedContacts() {
  if (typeof window === 'undefined') {
    return {} as Record<string, RidePassengerAnnouncementContactOpen>
  }

  try {
    const raw = window.localStorage.getItem(CONTACT_STORAGE_KEY)
    if (!raw) return {}

    const parsed = JSON.parse(raw) as Record<string, RidePassengerAnnouncementContactOpen>
    return parsed && typeof parsed === 'object' ? parsed : {}
  } catch {
    return {}
  }
}

function writeCachedContacts(cache: Record<string, RidePassengerAnnouncementContactOpen>) {
  if (typeof window === 'undefined') return

  try {
    window.localStorage.setItem(CONTACT_STORAGE_KEY, JSON.stringify(cache))
  } catch {
    // Best effort cache only.
  }
}

function resolvePassengerAnnouncementErrorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error) || !error.message.trim()) {
    return fallback
  }

  const normalized = error.message.toLowerCase()

  if (normalized.includes('customer') || normalized.includes('profile')) {
    return 'Не удалось открыть раздел. Проверьте профиль пассажира и попробуйте снова.'
  }

  if (normalized.includes('session expired')) {
    return 'Сессия истекла. Войдите снова.'
  }

  if (normalized.includes('не удалось открыть объявление')) {
    return 'Не удалось открыть объявление. Попробуйте снова.'
  }

  if (normalized.includes('объявление не найдено')) {
    return 'Объявление уже недоступно.'
  }

  if (normalized.includes('не удалось открыть контакт')) {
    return 'Не удалось открыть контакт водителя. Попробуйте снова.'
  }

  return error.message
}

function AnnouncementFeatureChip({ children }: { children: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-surface-soft px-3 py-1 text-xs font-semibold text-ink">
      {children}
    </span>
  )
}

type AnnouncementCardProps = {
  announcement: RideDriverAnnouncement
  onOpen: (announcement: RideDriverAnnouncement) => void
}

function AnnouncementCard({ announcement, onOpen }: AnnouncementCardProps) {
  return (
    <button
      type="button"
      onClick={() => onOpen(announcement)}
      className="w-full rounded-[28px] border border-border bg-white p-4 text-left shadow-sm transition hover:border-accent/30"
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-base font-semibold tracking-[-0.02em] text-ink">
            {formatRoute(announcement.fromText, announcement.toText)}
          </p>
          <p className="mt-1 text-sm text-muted">{formatShortDateTime(announcement.scheduledAt)}</p>
        </div>
        <span className="rounded-full bg-accent/10 px-3 py-1 text-xs font-semibold text-accent">
          {formatKzt(announcement.pricePerSeat)}
        </span>
      </div>

      <div className="mt-4 rounded-2xl bg-surface-soft p-4 text-sm text-ink">
        <div className="flex items-center justify-between gap-3">
          <span className="text-muted">Свободных мест</span>
          <span className="font-semibold">{announcement.seatsAvailable}</span>
        </div>
        <div className="mt-3 flex items-center gap-3">
          <DriverAvatar
            name={announcement.driver?.fullName}
            avatarUrl={announcement.driver?.avatarUrl}
            className="h-10 w-10 rounded-xl"
          />
          <div className="min-w-0">
            <p className="truncate font-semibold text-ink">{announcement.driver?.fullName || 'Водитель'}</p>
            <p className="text-xs text-muted">
              {announcement.driver?.ratingAvg != null
                ? `Рейтинг ${announcement.driver.ratingAvg.toFixed(1)} · ${announcement.driver?.ratingCount ?? 0} оценок`
                : 'Рейтинг появится после первых поездок'}
            </p>
          </div>
        </div>
        <div className="mt-3 flex flex-wrap gap-2">
          {announcement.acceptsPassengers ? (
            <AnnouncementFeatureChip>{formatDriverAnnouncementFeatureLabel('passengers')}</AnnouncementFeatureChip>
          ) : null}
          {announcement.acceptsParcels ? (
            <AnnouncementFeatureChip>{formatDriverAnnouncementFeatureLabel('parcels')}</AnnouncementFeatureChip>
          ) : null}
        </div>
      </div>
    </button>
  )
}

export default function PassengerAnnouncementsPage() {
  const { passengerStatus } = useAppState()
  const actions = useAppActions()
  const [announcements, setAnnouncements] = useState<RideDriverAnnouncement[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [isRefreshing, setIsRefreshing] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState('')
  const [selectedAnnouncement, setSelectedAnnouncement] = useState<RideDriverAnnouncement | null>(null)
  const [detailAnnouncement, setDetailAnnouncement] = useState<RideDriverAnnouncement | null>(null)
  const [detailError, setDetailError] = useState<string | null>(null)
  const [isDetailLoading, setIsDetailLoading] = useState(false)
  const [isOpeningContact, setIsOpeningContact] = useState(false)
  const [contactError, setContactError] = useState<string | null>(null)
  const [openedContactsByAnnouncementId, setOpenedContactsByAnnouncementId] = useState<
    Record<string, RidePassengerAnnouncementContactOpen>
  >(() => readCachedContacts())

  const visibleAnnouncements = useMemo(
    () => filterPassengerAnnouncements(announcements, searchQuery),
    [announcements, searchQuery],
  )

  const selectedAnnouncementId = selectedAnnouncement?.id ?? detailAnnouncement?.id ?? null
  const cachedContact = selectedAnnouncementId ? openedContactsByAnnouncementId[selectedAnnouncementId] ?? null : null
  const currentDetail = detailAnnouncement ?? selectedAnnouncement
  const hasSearchQuery = searchQuery.trim().length > 0

  const loadAnnouncements = async (options?: { silent?: boolean }) => {
    if (!options?.silent) {
      setIsLoading(true)
    } else {
      setIsRefreshing(true)
    }

    setError(null)

    try {
      const response = await getPassengerAnnouncements()
      setAnnouncements(response.items)
    } catch (loadError) {
      setError(resolvePassengerAnnouncementErrorMessage(loadError, 'Не удалось загрузить объявления водителей.'))
    } finally {
      setIsLoading(false)
      setIsRefreshing(false)
    }
  }

  useEffect(() => {
    const timer = window.setTimeout(() => {
      void loadAnnouncements()
    }, 0)

    return () => {
      window.clearTimeout(timer)
    }
  }, [])

  useEffect(() => {
    writeCachedContacts(openedContactsByAnnouncementId)
  }, [openedContactsByAnnouncementId])

  const handleOpenAnnouncement = async (announcement: RideDriverAnnouncement) => {
    setSelectedAnnouncement(announcement)
    setDetailAnnouncement(null)
    setDetailError(null)
    setContactError(null)
    setIsDetailLoading(true)

    try {
      const detailed = await getPassengerAnnouncement(announcement.id)
      setDetailAnnouncement(detailed)
    } catch (openError) {
      setDetailError(resolvePassengerAnnouncementErrorMessage(openError, 'Не удалось загрузить объявление.'))
    } finally {
      setIsDetailLoading(false)
    }
  }

  const handleOpenContact = async () => {
    if (!currentDetail?.id) return

    setIsOpeningContact(true)
    setContactError(null)

    try {
      const contact = await openPassengerAnnouncementContact(currentDetail.id)
      setOpenedContactsByAnnouncementId((current) => ({
        ...current,
        [currentDetail.id]: contact,
      }))
      setDetailAnnouncement((current) => (current ? { ...current, contactOpened: true } : current))
      setAnnouncements((current) => current.map((item) => (
        item.id === currentDetail.id ? { ...item, contactOpened: true } : item
      )))
    } catch (openError) {
      setContactError(
        resolvePassengerAnnouncementErrorMessage(openError, 'Не удалось открыть контакт водителя.'),
      )
    } finally {
      setIsOpeningContact(false)
    }
  }

  if (passengerStatus === 'GUEST') {
    return (
      <PageCard
        eyebrow="Попутки"
        title="Объявления водителей"
        description="Раздел доступен после подтверждения номера телефона."
      >
        <div className="rounded-2xl bg-surface-soft px-4 py-3 text-sm text-muted">
          Подтвердите номер, чтобы открыть контакты водителей и позвонить им.
        </div>
        <button
          type="button"
          onClick={() => {
            actions.setPendingPassengerFlow('ride')
            actions.openPhoneVerifySheet()
          }}
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
        >
          Подтвердить номер
        </button>
      </PageCard>
    )
  }

  if (passengerStatus === 'BLOCKED' || passengerStatus === 'LIMITED') {
    return (
      <PageCard
        eyebrow="Попутки"
        title="Объявления водителей"
        description="Раздел временно недоступен."
      >
        <div className="rounded-2xl bg-amber-50 px-4 py-3 text-sm text-amber-900">
          Доступ к объявлениям ограничен. Обратитесь в поддержку, если это ошибка.
        </div>
      </PageCard>
    )
  }

  return (
    <>
      <div className="space-y-4 pb-[calc(6rem+env(safe-area-inset-bottom))]">
        <PageCard
          eyebrow="Попутки"
          title="Готовые поездки"
          description="Выберите объявление водителя и откройте контакт."
        >
          <div className="grid gap-2 sm:grid-cols-2">
            <button
              type="button"
              onClick={() => actions.setScreen('passengerOrder')}
              className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
            >
              Назад к межгороду
            </button>
            <button
              type="button"
              onClick={() => void loadAnnouncements({ silent: true })}
              disabled={isLoading || isRefreshing}
              className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:opacity-60"
            >
              <RefreshCw className={cn('h-4 w-4', isRefreshing ? 'animate-spin' : '')} />
              Обновить
            </button>
          </div>

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
                  className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-surface-soft text-muted"
                  aria-label="Очистить поиск"
                >
                  <X className="h-4 w-4" />
                </button>
              ) : null}
            </div>
          </label>

          {error ? (
            <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}
        </PageCard>

        {isLoading ? (
          <PageCard eyebrow="Загрузка" title="Ищем объявления" description="Подождите немного.">
            <div className="rounded-2xl bg-surface-soft px-4 py-3 text-sm text-muted">
              Объявления водителей загружаются...
            </div>
          </PageCard>
        ) : visibleAnnouncements.length === 0 ? (
          <PageCard
            eyebrow="Пока пусто"
            title={hasSearchQuery ? 'Ничего не найдено' : 'Сейчас нет доступных поездок'}
            description={hasSearchQuery ? 'Попробуйте другой маршрут.' : 'Обновите список чуть позже.'}
          >
            <div className="rounded-2xl border border-dashed border-border bg-surface-soft p-4 text-sm text-muted">
              {hasSearchQuery
                ? 'Поиск работает по маршруту, комментарию и имени водителя.'
                : 'Активные объявления водителей появятся здесь автоматически.'}
            </div>
          </PageCard>
        ) : (
          <div className="space-y-3">
            {visibleAnnouncements.map((announcement) => (
              <AnnouncementCard
                key={announcement.id}
                announcement={announcement}
                onOpen={handleOpenAnnouncement}
              />
            ))}
          </div>
        )}

        <div className="rounded-[28px] border border-border bg-surface-soft p-4 text-sm text-muted">
          <div className="flex items-start gap-3">
            <Sparkles className="mt-0.5 h-4 w-4 shrink-0 text-accent" />
            <p>
              Это отдельный раздел с готовыми поездками водителей. Он не заменяет обычную заявку пассажира.
            </p>
          </div>
        </div>
      </div>

      <OverlaySheet
        open={selectedAnnouncement != null}
        title="Поездка водителя"
        onClose={() => {
          setSelectedAnnouncement(null)
          setDetailAnnouncement(null)
          setDetailError(null)
          setContactError(null)
        }}
        position="bottom"
      >
        {isDetailLoading ? (
          <div className="rounded-2xl bg-surface-soft px-4 py-3 text-sm text-muted">
            Загружаем объявление...
          </div>
        ) : detailError ? (
          <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
            {detailError}
          </div>
        ) : currentDetail ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-surface-soft p-4">
              <p className="text-lg font-semibold text-ink">
                {formatRoute(currentDetail.fromText, currentDetail.toText)}
              </p>
              <p className="mt-1 text-sm text-muted">{formatShortDateTime(currentDetail.scheduledAt)}</p>
              <div className="mt-4 grid gap-2 text-sm text-ink">
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Цена за место</span>
                  <span className="font-semibold">{formatKzt(currentDetail.pricePerSeat)}</span>
                </div>
                <div className="flex items-center justify-between gap-3">
                  <span className="text-muted">Свободных мест</span>
                  <span className="font-semibold">{currentDetail.seatsAvailable}</span>
                </div>
              </div>
            </div>

            <div className="rounded-2xl border border-border bg-white p-4">
              <div className="flex items-center gap-3">
                <DriverAvatar
                  name={currentDetail.driver?.fullName}
                  avatarUrl={currentDetail.driver?.avatarUrl}
                />
                <div className="min-w-0">
                  <p className="truncate font-semibold text-ink">
                    {currentDetail.driver?.fullName || 'Водитель'}
                  </p>
                  <p className="text-sm text-muted">
                    {currentDetail.driver?.ratingAvg != null
                      ? `Рейтинг ${currentDetail.driver.ratingAvg.toFixed(1)} · ${currentDetail.driver?.ratingCount ?? 0} оценок`
                      : 'Рейтинг появится после первых поездок'}
                  </p>
                </div>
              </div>
              <div className="mt-3 flex flex-wrap gap-2">
                {currentDetail.acceptsPassengers ? (
                  <AnnouncementFeatureChip>{formatDriverAnnouncementFeatureLabel('passengers')}</AnnouncementFeatureChip>
                ) : null}
                {currentDetail.acceptsParcels ? (
                  <AnnouncementFeatureChip>{formatDriverAnnouncementFeatureLabel('parcels')}</AnnouncementFeatureChip>
                ) : null}
              </div>
            </div>

            {currentDetail.vehicle ? (
              <div className="rounded-2xl border border-border bg-white p-4 text-sm text-ink">
                <p className="font-semibold">Автомобиль</p>
                <p className="mt-2">{formatVehicleLabel(currentDetail.vehicle)}</p>
                <div className="mt-2 grid gap-1 text-muted">
                  {currentDetail.vehicle.brand || currentDetail.vehicle.model ? (
                    <p>
                      {currentDetail.vehicle.brand || 'Марка не указана'}
                      {currentDetail.vehicle.model ? ` · ${currentDetail.vehicle.model}` : ''}
                    </p>
                  ) : null}
                  {currentDetail.vehicle.color || currentDetail.vehicle.colorName ? (
                    <p>Цвет: {currentDetail.vehicle.colorName || currentDetail.vehicle.color}</p>
                  ) : null}
                  {currentDetail.vehicle.plateNumber ? <p>Номер: {currentDetail.vehicle.plateNumber}</p> : null}
                </div>
              </div>
            ) : null}

            {currentDetail.comment ? (
              <div className="rounded-2xl border border-border bg-white p-4 text-sm text-muted">
                {currentDetail.comment}
              </div>
            ) : null}

            {cachedContact ? (
              <div className="space-y-3 rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
                <div className="space-y-1">
                  <p className="font-semibold">Контакт открыт</p>
                  <p>{cachedContact.driverName || currentDetail.driver?.fullName || 'Водитель'}</p>
                  <p className="font-semibold">{cachedContact.driverPhone}</p>
                </div>
                <button
                  type="button"
                  onClick={() => window.open(`tel:${cachedContact.driverPhone.replace(/\s+/g, '')}`, '_self')}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink"
                >
                  <Phone className="h-4 w-4 text-accent" />
                  Позвонить
                </button>
                <p className="text-xs text-emerald-800">
                  Открыто {formatShortDateTime(cachedContact.openedAt)}
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {contactError ? (
                  <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">
                    {contactError}
                  </div>
                ) : null}
                <button
                  type="button"
                  onClick={() => void handleOpenContact()}
                  disabled={isOpeningContact}
                  className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 disabled:opacity-60"
                >
                  <CalendarClock className="h-4 w-4" />
                  {isOpeningContact
                    ? 'Открываем контакт...'
                    : currentDetail.contactOpened
                      ? 'Показать контакт'
                      : 'Открыть контакт'}
                </button>
              </div>
            )}
          </div>
        ) : null}
      </OverlaySheet>
    </>
  )
}
