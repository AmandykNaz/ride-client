import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { ChevronRight, MapPinned } from 'lucide-react'

import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { cn } from '../../lib/cn'
import {
  formatCountdown,
  formatFullDateTime,
  formatKzt,
  formatPassengerHistoryStatusLabel,
  formatPassengerRideRequestStatusLabel,
  formatRideOrderStatusLabel,
  formatRideRequestWhenLabel,
  formatRoute,
  formatRouteIfPresent,
  formatShortDate,
  formatShortDateTime,
  formatVehicleParts,
} from '../../lib/format'
import {
  createPassengerRideRequestReview,
  getPassengerMyRideRequestReview,
} from '../../features/ride-safety/api/ride-reviews.api'
import type { RideReview } from '../../features/ride-safety/api/ride-reviews.types'
import { OverlaySheet } from '../../shared/ui/OverlaySheet'
import { DriverAvatar } from '../../shared/ui/DriverAvatar'
import { RideRequestReviewSheet } from '../../features/ride-safety/components/RideRequestReviewSheet'

function isActiveRideRequestStatus(status?: string | null) {
  return status === 'SEARCHING' || status === 'OFFERED'
}

export function PassengerHistoryTabs() {
  const {
    activeRideRequest,
    passengerHistory,
    passengerOrdersTab,
    passengerRideRequests,
    passengerRideOrders,
    activeRide,
  } = useAppState()
  const actions = useAppActions()
  const [selectedRequestId, setSelectedRequestId] = useState<string | null>(null)
  const [requestReviewsByRequestId, setRequestReviewsByRequestId] = useState<Record<string, RideReview | null>>({})
  const [reviewSheetRequestId, setReviewSheetRequestId] = useState<string | null>(null)
  const [reviewSubmitting, setReviewSubmitting] = useState(false)
  const [reviewError, setReviewError] = useState<string | null>(null)
  const [reviewSuccess, setReviewSuccess] = useState(false)

  const rideHistory = passengerHistory.filter((item) => item.category === 'ride')
  const parcelHistory = passengerHistory.filter((item) => item.category === 'parcel')
  const closedExternallyRideRequests = useMemo(
    () =>
      passengerRideRequests.filter(
        (request) => String(request.status).toUpperCase() === 'CLOSED_EXTERNALLY',
      ),
    [passengerRideRequests],
  )
  const hasRideHistory = rideHistory.length > 0 || closedExternallyRideRequests.length > 0
  const selectedRequest = useMemo(
    () => passengerRideRequests.find((request) => request.id === selectedRequestId) ?? null,
    [passengerRideRequests, selectedRequestId],
  )
  const selectedRequestRoute = selectedRequest
    ? formatRouteIfPresent(
        selectedRequest.originText || selectedRequest.from,
        selectedRequest.destinationText || selectedRequest.to,
      )
    : null
  const reviewSheetRequest = useMemo(
    () => closedExternallyRideRequests.find((request) => request.id === reviewSheetRequestId) ?? null,
    [closedExternallyRideRequests, reviewSheetRequestId],
  )

  useEffect(() => {
    const pendingRequests = closedExternallyRideRequests.filter((request) => requestReviewsByRequestId[request.id] === undefined)
    if (pendingRequests.length === 0) return

    let cancelled = false

    const loadReviews = async () => {
      const entries = await Promise.all(
        pendingRequests.map(async (request) => {
          try {
            const result = await getPassengerMyRideRequestReview(request.id)
            return [request.id, result.review] as const
          } catch {
            return [request.id, null] as const
          }
        }),
      )

      if (!cancelled) {
        setRequestReviewsByRequestId((current) => {
          const next = { ...current }
          for (const [requestId, review] of entries) {
            next[requestId] = review
          }
          return next
        })
      }
    }

    void loadReviews()

    return () => {
      cancelled = true
    }
  }, [closedExternallyRideRequests, requestReviewsByRequestId])

  const handleOpenReviewSheet = (requestId: string) => {
    setReviewSheetRequestId(requestId)
    setReviewError(null)
    setReviewSuccess(false)
  }

  const handleCloseReviewSheet = () => {
    setReviewSheetRequestId(null)
    setReviewError(null)
    setReviewSuccess(false)
    setReviewSubmitting(false)
  }

  const handleSubmitReview = async ({ rating, comment }: { rating: number; comment?: string }) => {
    if (!reviewSheetRequest) return

    setReviewSubmitting(true)
    setReviewError(null)

    try {
      const created = await createPassengerRideRequestReview(reviewSheetRequest.id, {
        rating,
        comment,
        contactUnlockId: reviewSheetRequest.closedExternally?.contactUnlockId,
      })

      setRequestReviewsByRequestId((current) => ({
        ...current,
        [reviewSheetRequest.id]: created,
      }))
      handleCloseReviewSheet()
    } catch (error) {
      setReviewError(resolveReviewErrorMessage(error))
    } finally {
      setReviewSubmitting(false)
    }
  }

  return (
    <div className="space-y-4">
      {activeRide ? (
        <div className="rounded-[24px] border border-accent/20 bg-accent/8 px-4 py-3 text-sm text-ink">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">У вас активная поездка</p>
              <p className="mt-1 truncate text-muted">
                {formatRoute(activeRide.from, activeRide.to)} · {formatRideOrderStatusLabel(activeRide.status)}
              </p>
            </div>
            <button
              type="button"
              onClick={() => actions.setScreen('passengerActiveRide')}
              className="shrink-0 rounded-2xl bg-accent px-3 py-2 text-sm font-semibold text-white"
            >
              Открыть
            </button>
          </div>
        </div>
      ) : null}

      {passengerRideRequests.length > 0 ? (
        <div className="space-y-3 rounded-[28px] border border-border bg-white p-4 shadow-sm">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                Поиск водителя
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {passengerRideRequests.length} шт.
              </p>
            </div>
            <button
              type="button"
              onClick={() => actions.setScreen('passengerOrder')}
              className="rounded-2xl bg-slate-100 px-3 py-2 text-sm font-semibold text-ink"
            >
              Новая поездка
            </button>
          </div>
          <div className="space-y-2">
            {passengerRideRequests.slice(0, 3).map((request) => (
              <button
                key={request.id}
                type="button"
                onClick={() => setSelectedRequestId(request.id)}
                className="flex w-full items-start gap-3 rounded-2xl bg-surface-soft p-3 text-left transition hover:bg-slate-100"
              >
                <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-white">
                  <MapPinned className="h-4 w-4 text-accent" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-sm font-semibold text-ink">
                    {formatRoute(request.from, request.to)}
                  </span>
                  <span className="mt-1 block text-xs text-muted">
                    {String(request.status).toUpperCase() === 'CLOSED_EXTERNALLY'
                      ? 'Контакт открыт водителем'
                      : `${formatPassengerRideRequestStatusLabel(request)} · Предложений: ${request.offersCount}`}
                  </span>
                  {String(request.status).toUpperCase() === 'CLOSED_EXTERNALLY' ? (
                    <>
                      {request.closedExternally?.driverName ? (
                        <span className="mt-2 flex items-center gap-2 text-xs text-muted">
                          <DriverAvatar
                            name={request.closedExternally.driverName}
                            avatarUrl={request.closedExternally.driverAvatarUrl}
                            className="h-8 w-8 rounded-xl"
                          />
                          <span>{request.closedExternally.driverName}</span>
                        </span>
                      ) : null}
                      {request.closedExternally?.driverPhone ? (
                        <span className="mt-1 block text-xs text-muted">
                          Телефон: {request.closedExternally.driverPhone}
                        </span>
                      ) : null}
                      {request.closedExternally?.vehicleName || request.closedExternally?.vehiclePlateNumber || request.closedExternally?.vehicleColorName ? (
                        <span className="mt-1 block text-xs text-muted">
                          <VehicleFieldValue vehicle={request.closedExternally} />
                        </span>
                      ) : null}
                      {request.closedExternally?.at ? (
                        <span className="mt-1 block text-xs text-muted">
                          Закрыта: {formatShortDateTime(request.closedExternally.at)}
                        </span>
                      ) : null}
                    </>
                  ) : null}
                  <span className="mt-1 block text-xs text-muted">
                    Когда: {formatRideRequestWhenLabel(request)}
                  </span>
                </span>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted" />
              </button>
            ))}
          </div>
        </div>
      ) : null}

      {passengerRideOrders.length > 0 ? (
        <div className="space-y-3 rounded-[28px] border border-border bg-white p-4 shadow-sm">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Мои заказы
            </p>
            <p className="mt-1 text-sm font-semibold text-ink">
              {passengerRideOrders.length} шт.
            </p>
          </div>
          <div className="space-y-2">
            {passengerRideOrders.slice(0, 3).map((order) => (
              <div key={order.id} className="rounded-2xl bg-surface-soft p-3">
                <p className="text-sm font-semibold text-ink">
                  {formatRoute(order.from, order.to)}
                </p>
                <p className="mt-1 text-xs text-muted">
                  {formatRideOrderStatusLabel(order.status)} · {formatKzt(order.price)} · {formatShortDateTime(order.createdAt)}
                </p>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      <div className="grid grid-cols-3 gap-2 rounded-[28px] bg-slate-100 p-1">
        {[
          { key: 'rides', label: 'Поездки' },
          { key: 'parcels', label: 'Посылки' },
          { key: 'buses', label: 'Автобусы' },
        ].map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => actions.setPassengerOrdersTab(tab.key as 'rides' | 'parcels' | 'buses')}
            className={cn(
              'rounded-[22px] px-3 py-2 text-sm font-semibold transition',
              passengerOrdersTab === tab.key
                ? 'bg-white text-accent shadow-sm'
                : 'text-slate-500',
            )}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {passengerOrdersTab === 'rides' ? (
        hasRideHistory ? (
          <div className="space-y-3">
            {closedExternallyRideRequests.map((request) => (
              <article
                key={request.id}
                className="rounded-[28px] border border-emerald-200 bg-emerald-50/60 p-4 shadow-sm"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                  {request.closedExternally?.at ? formatShortDateTime(request.closedExternally.at) : formatShortDateTime(request.createdAt)}
                </p>
                <p className="mt-2 text-base font-semibold text-ink">
                  {formatRoute(request.from, request.to)}
                </p>
                <p className="mt-2 text-sm text-emerald-900">Контакт открыт водителем</p>
                {request.closedExternally?.driverName ? (
                  <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/70 p-3">
                    <DriverAvatar
                      name={request.closedExternally.driverName}
                      avatarUrl={request.closedExternally.driverAvatarUrl}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{request.closedExternally.driverName}</p>
                      <p className="text-xs text-muted">
                        {request.closedExternally.driverPhone ?? 'Телефон не указан'}
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field label="Цена" value={formatKzt(request.price)} />
                  <Field
                    label="Авто / госномер"
                    value={<VehicleFieldValue vehicle={request.closedExternally} />}
                  />
                  <Field
                    label="Время договорённости"
                    value={request.closedExternally?.at ? formatFullDateTime(request.closedExternally.at) : 'Не указано'}
                  />
                  <Field label="Комментарий" value={request.closedExternally?.note ?? 'Не указано'} />
                </div>
                <div className="mt-4">
                  {requestReviewsByRequestId[request.id] ? (
                    <p className="text-sm font-semibold text-emerald-900">
                      Ваша оценка: {requestReviewsByRequestId[request.id]?.rating ?? '—'}/5
                    </p>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleOpenReviewSheet(request.id)}
                      className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink"
                    >
                      Оценить водителя
                    </button>
                  )}
                </div>
              </article>
            ))}
            {rideHistory.map((item) => (
              <article
                key={item.id}
                className="rounded-[28px] border border-border bg-white p-4 shadow-sm"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                  {formatShortDate(item.date)}
                </p>
                <p className="mt-2 text-base font-semibold text-ink">
                  {formatRoute(item.from, item.to)}
                </p>
                <p className="mt-2 text-sm text-muted">
                  {item.driverName ?? 'Водитель'} · {formatPassengerRideRequestStatusLabel(item)}
                </p>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-sm font-semibold text-accent">{formatKzt(item.price)}</p>
                  <button
                    type="button"
                    onClick={() => actions.repeatRide(item)}
                    className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-ink"
                  >
                    Повторить
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-border bg-white p-6 text-center">
            <p className="text-sm font-semibold text-ink">История поездок появится здесь</p>
          </div>
        )
      ) : passengerOrdersTab === 'parcels' ? (
        parcelHistory.length > 0 ? (
          <div className="space-y-3">
            {parcelHistory.map((item) => (
              <article
                key={item.id}
                className="rounded-[28px] border border-border bg-white p-4 shadow-sm"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                  {formatShortDate(item.date)}
                </p>
                <p className="mt-2 text-base font-semibold text-ink">
                  {formatRoute(item.from, item.to)}
                </p>
                <p className="mt-2 text-sm text-muted">
                  Получатель: {item.receiverName ?? '—'}
                </p>
                <p className="mt-1 text-sm text-muted">
                  Курьер: {item.driverName ?? 'Водитель'}
                </p>
                {item.description ? (
                  <p className="mt-2 text-sm text-slate-600">{item.description}</p>
                ) : null}
                <div className="mt-3 flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm font-semibold text-accent">{formatKzt(item.price)}</p>
                    <p className="text-xs text-muted">{formatPassengerHistoryStatusLabel(item.status)}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => actions.repeatParcel(item)}
                    className="rounded-2xl bg-slate-100 px-4 py-2 text-sm font-semibold text-ink"
                  >
                    Повторить посылку
                  </button>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="rounded-[28px] border border-dashed border-border bg-white p-6 text-center">
            <p className="text-sm font-semibold text-ink">Посылки будут здесь</p>
          </div>
        )
      ) : (
        <div className="rounded-[28px] border border-dashed border-border bg-white p-6 text-center">
          <p className="text-sm font-semibold text-ink">Автобусы скоро</p>
        </div>
      )}

      <OverlaySheet
        open={selectedRequest != null}
        title="Детали заявки"
        onClose={() => setSelectedRequestId(null)}
        position="bottom"
        footer={
          <button
            type="button"
            onClick={() => setSelectedRequestId(null)}
            className="w-full rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            Закрыть детали
          </button>
        }
      >
        {selectedRequest ? (
          <div className="space-y-4">
            <div className="rounded-2xl bg-surface-soft p-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                Маршрут
              </p>
              <p className="mt-2 text-base font-semibold text-ink">
                {selectedRequestRoute ?? 'Маршрут не указан'}
              </p>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-2xl bg-surface-soft p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                  Цена
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {formatKzt(selectedRequest.price)}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-soft p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                  Когда
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {formatRideRequestWhenLabel(selectedRequest)}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-soft p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                  Поиск
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {selectedRequest.status === 'CLOSED_EXTERNALLY'
                    ? selectedRequest.closedExternally?.at
                      ? `Закрыта: ${formatFullDateTime(selectedRequest.closedExternally.at)}`
                      : 'Поиск завершён'
                    : selectedRequest.status === 'EXPIRED'
                    ? 'Время поиска истекло'
                    : typeof selectedRequest.searchRemainingSeconds === 'number'
                      ? `Поиск активен ещё ${formatCountdown(selectedRequest.searchRemainingSeconds)}`
                      : selectedRequest.expiresAt
                        ? `Истекает ${formatFullDateTime(selectedRequest.expiresAt)}`
                        : 'Поиск водителя'}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-soft p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                  Предложения
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  Предложений: {selectedRequest.offersCount}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-soft p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                  Статус
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {selectedRequest.status === 'CLOSED_EXTERNALLY'
                    ? 'Закрыта по договорённости'
                    : formatPassengerRideRequestStatusLabel(selectedRequest)}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-soft p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                  Создана
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {formatFullDateTime(selectedRequest.createdAt)}
                </p>
              </div>
            </div>

            {selectedRequest.comment ? (
              <div className="rounded-2xl border border-border bg-white p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                  Комментарий
                </p>
                <p className="mt-2 text-sm text-ink">{selectedRequest.comment}</p>
              </div>
            ) : null}

            {selectedRequest.status === 'CLOSED_EXTERNALLY' || selectedRequest.closedExternally ? (
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-emerald-700">
                  Договорённость
                </p>
                {selectedRequest.closedExternally?.driverName ? (
                  <div className="mt-3 flex items-center gap-3 rounded-2xl bg-white/70 p-3">
                    <DriverAvatar
                      name={selectedRequest.closedExternally.driverName}
                      avatarUrl={selectedRequest.closedExternally.driverAvatarUrl}
                    />
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-ink">{selectedRequest.closedExternally.driverName}</p>
                      <p className="text-xs text-muted">
                        {selectedRequest.closedExternally.driverPhone ?? 'Телефон не указан'}
                      </p>
                    </div>
                  </div>
                ) : null}
                <div className="mt-3 grid gap-3 sm:grid-cols-2">
                  <Field
                    label="Авто / госномер"
                    value={<VehicleFieldValue vehicle={selectedRequest.closedExternally} />}
                  />
                  <Field
                    label="Время закрытия"
                    value={selectedRequest.closedExternally?.at ? formatFullDateTime(selectedRequest.closedExternally.at) : 'Не указано'}
                  />
                  <Field label="Комментарий" value={selectedRequest.closedExternally?.note ?? 'Не указано'} />
                </div>
              </div>
            ) : null}

            <div className="grid gap-2">
              {(() => {
                const requestNumericId =
                  selectedRequest.backendId && /^\d+$/.test(selectedRequest.backendId.trim())
                    ? selectedRequest.backendId.trim()
                    : /^\d+$/.test(selectedRequest.id.trim())
                      ? selectedRequest.id.trim()
                      : null

                return requestNumericId ? (
                  <>
                    {selectedRequest.status === 'CLOSED_EXTERNALLY' ? (
                      requestReviewsByRequestId[selectedRequest.id] ? (
                        <div className="rounded-2xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-900">
                          Ваша оценка: {requestReviewsByRequestId[selectedRequest.id]?.rating ?? '—'}/5
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleOpenReviewSheet(selectedRequest.id)}
                          className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
                        >
                          Оценить водителя
                        </button>
                      )
                    ) : null}
                    <button
                      type="button"
                      onClick={() =>
                        actions.openRideComplaintSheet({
                          targetType: 'REQUEST_CONTACT',
                          requestId: requestNumericId,
                          contactUnlockId: selectedRequest.closedExternally?.contactUnlockId ?? undefined,
                          reporterRole: 'PASSENGER',
                          title: selectedRequest.closedExternally?.driverName || 'Заявка',
                          route: selectedRequestRoute ?? `${selectedRequest.originText} → ${selectedRequest.destinationText}`,
                        })
                      }
                      className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
                    >
                      Пожаловаться
                    </button>
                  </>
                ) : null
              })()}

              {isActiveRideRequestStatus(selectedRequest.status) ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRequestId(null)
                    actions.setScreen('passengerOffers')
                  }}
                  className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
      >
                  Открыть поиск
                </button>
              ) : null}

              {activeRideRequest?.id === selectedRequest.id &&
              isActiveRideRequestStatus(selectedRequest.status) ? (
                <button
                  type="button"
                  onClick={() => {
                    setSelectedRequestId(null)
                    void actions.cancelActiveRide()
                  }}
                  className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
                >
                  Отменить заявку
                </button>
              ) : null}
            </div>
          </div>
        ) : null}
      </OverlaySheet>

      <RideRequestReviewSheet
        key={reviewSheetRequestId ?? 'closed'}
        open={reviewSheetRequest != null}
        title="Оценить водителя"
        subjectName={reviewSheetRequest?.closedExternally?.driverName ?? 'Водитель'}
        route={reviewSheetRequest ? `${reviewSheetRequest.originText} → ${reviewSheetRequest.destinationText}` : null}
        priceLabel={reviewSheetRequest ? formatKzt(reviewSheetRequest.price) : null}
        submitLabel="Сохранить оценку"
        submitting={reviewSubmitting}
        error={reviewError}
        success={reviewSuccess}
        successMessage="Оценка сохранена."
        onSubmit={handleSubmitReview}
        onClose={handleCloseReviewSheet}
      />
    </div>
  )
}

function resolveReviewErrorMessage(error: unknown) {
  if (error instanceof Error && error.message.trim()) {
    return error.message
  }

  return 'Не удалось сохранить оценку.'
}

function VehicleFieldValue({
  vehicle,
}: {
  vehicle?:
    | {
        vehicleName?: string | null
        vehiclePlate?: string | null
        vehiclePlateNumber?: string | null
        vehicleColorName?: string | null
        carModel?: string | null
        carColor?: string | null
        brand?: string | null
        model?: string | null
        color?: string | null
        colorName?: string | null
        plate?: string | null
        plateNumber?: string | null
      }
    | null
}) {
  const { vehicleName, plateNumber, colorName } = formatVehicleParts(vehicle)

  if (vehicleName && plateNumber) {
    return (
      <span className="block">
        <span className="block">{vehicleName}</span>
        <span className="mt-1 block">{plateNumber}</span>
        {colorName ? <span className="mt-1 block">Цвет: {colorName}</span> : null}
      </span>
    )
  }

  if (vehicleName || plateNumber || colorName) {
    return (
      <span className="block">
        <span className="block">{vehicleName || plateNumber || 'Авто не указано'}</span>
        {vehicleName && plateNumber ? null : plateNumber && vehicleName !== plateNumber ? (
          <span className="mt-1 block">{plateNumber}</span>
        ) : null}
        {colorName ? <span className="mt-1 block">Цвет: {colorName}</span> : null}
      </span>
    )
  }

  return <span>Авто не указано</span>
}

function Field({ label, value }: { label: string; value: ReactNode }) {
  return (
    <div>
      <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
        {label}
      </p>
      <div className="mt-2 text-sm font-semibold text-ink">{value ?? 'Не указано'}</div>
    </div>
  )
}
