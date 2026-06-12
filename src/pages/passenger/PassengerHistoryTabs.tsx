import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { cn } from '../../lib/cn'
import { formatKzt, formatRoute } from '../../lib/format'

export function PassengerHistoryTabs() {
  const { passengerHistory, passengerOrdersTab } = useAppState()
  const actions = useAppActions()

  const rideHistory = passengerHistory.filter((item) => item.category === 'ride')
  const parcelHistory = passengerHistory.filter((item) => item.category === 'parcel')

  return (
    <div className="space-y-4">
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
                  {item.driverName ?? 'Водитель'} · {item.status}
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
    </div>
  )
}
