import { CircleAlert } from 'lucide-react'

import { useAppActions } from '../../../providers/AppStateProvider'

type DriverBlockedStateCardProps = {
  reason?: string | null
}

export function DriverBlockedStateCard({ reason }: DriverBlockedStateCardProps) {
  const actions = useAppActions()

  return (
    <>
      <div className="flex items-start gap-3 rounded-2xl bg-red-50 p-4 text-red-700">
        <CircleAlert className="mt-0.5 h-5 w-5 shrink-0" />
        <div>
          <p className="text-sm font-semibold">Причина блокировки</p>
          <p className="mt-1 text-sm">{reason || 'Не указана'}</p>
        </div>
      </div>
      <div className="grid gap-2 sm:grid-cols-2">
        <button
          type="button"
          onClick={() => actions.setScreen('support')}
          className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
        >
          Связаться с поддержкой
        </button>
        <button
          type="button"
          onClick={actions.returnToPassengerMode}
          className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
        >
          Выйти в пассажирский режим
        </button>
      </div>
    </>
  )
}
