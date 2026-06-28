import { useMemo, useState } from 'react'
import { ChevronRight, MapPinned } from 'lucide-react'

import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { cn } from '../../lib/cn'
import {
  formatCountdown,
  formatKzt,
  formatRideRequestStatusLabel,
  formatRideRequestWhenLabel,
  formatRoute,
  formatRouteIfPresent,
} from '../../lib/format'
import { OverlaySheet } from '../../shared/ui/OverlaySheet'

function formatDateTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

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

  const rideHistory = passengerHistory.filter((item) => item.category === 'ride')
  const parcelHistory = passengerHistory.filter((item) => item.category === 'parcel')
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

  return (
    <div className="space-y-4">
      {activeRide ? (
        <div className="rounded-[24px] border border-accent/20 bg-accent/8 px-4 py-3 text-sm text-ink">
          <div className="flex items-center justify-between gap-3">
            <div className="min-w-0">
              <p className="font-semibold">У вас активная поездка</p>
              <p className="mt-1 truncate text-muted">
                {formatRoute(activeRide.from, activeRide.to)} · {activeRide.status}
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
                    {formatRideRequestStatusLabel(request.status)} · Предложений: {request.offersCount}
                  </span>
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
                  {order.status} · {formatKzt(order.price)} · {order.date}
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
        rideHistory.length > 0 ? (
          <div className="space-y-3">
            {rideHistory.map((item) => (
              <article
                key={item.id}
                className="rounded-[28px] border border-border bg-white p-4 shadow-sm"
              >
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                  {item.date}
                </p>
                <p className="mt-2 text-base font-semibold text-ink">
                  {formatRoute(item.from, item.to)}
                </p>
                <p className="mt-2 text-sm text-muted">
                  {item.driverName ?? 'Водитель'} · {formatRideRequestStatusLabel(item.status)}
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
                  {item.date}
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
                    <p className="text-xs text-muted">{item.status}</p>
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
                  {selectedRequest.status === 'EXPIRED'
                    ? 'Время поиска истекло'
                    : typeof selectedRequest.searchRemainingSeconds === 'number'
                      ? `Поиск активен ещё ${formatCountdown(selectedRequest.searchRemainingSeconds)}`
                      : selectedRequest.expiresAt
                        ? `Истекает ${formatDateTime(selectedRequest.expiresAt)}`
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
                  {formatRideRequestStatusLabel(selectedRequest.status)}
                </p>
              </div>
              <div className="rounded-2xl bg-surface-soft p-4">
                <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                  Создана
                </p>
                <p className="mt-2 text-sm font-semibold text-ink">
                  {formatDateTime(selectedRequest.createdAt)}
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

            <div className="grid gap-2">
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
    </div>
  )
}
