import { LogOut, ShieldCheck } from 'lucide-react'

import { formatKzt } from '../../lib/format'
import { PageCard } from '../../shared/ui/PageCard'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { isPassengerProfileComplete } from '../../features/passenger/api/passenger.api'

function getPassengerStatusLabel(
  status: string,
  passengerProfile: { name?: string; city?: string } | null,
) {
  if (status === 'PHONE_VERIFIED') {
    return isPassengerProfileComplete(passengerProfile)
      ? 'Телефон подтверждён'
      : 'Профиль не заполнен'
  }

  if (status === 'GUEST') {
    return 'Гость'
  }

  return status
}

export default function PassengerProfilePage() {
  const { passengerStatus, passengerProfile, passengerReviewSummary, passengerReviews } = useAppState()
  const actions = useAppActions()
  const isProfileComplete = isPassengerProfileComplete(passengerProfile)

  return (
    <PageCard
      eyebrow="Пассажир"
      title="Профиль"
      description="Заглушка профиля пассажира. Следующим шагом здесь появятся контакты, документы и настройки безопасности."
      >
      {passengerProfile ? (
        <div className="space-y-3 rounded-2xl bg-surface-soft p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <div>
              <p className="text-sm font-semibold text-ink">
                {passengerProfile.name || 'Имя не указано'}
              </p>
              <p className="text-sm text-muted">{passengerProfile.phone}</p>
            </div>
          </div>
          <div className="grid grid-cols-2 gap-3 text-sm">
            <div className="rounded-2xl bg-white p-3">
              <p className="text-muted">Город</p>
              <p className="mt-1 font-semibold text-ink">
                {passengerProfile.city || 'Город не указан'}
              </p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-muted">Поездок</p>
              <p className="mt-1 font-semibold text-ink">{passengerProfile.tripsCount}</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-muted">Рейтинг</p>
              <p className="mt-1 font-semibold text-ink">{passengerProfile.rating}</p>
            </div>
            <div className="rounded-2xl bg-white p-3">
              <p className="text-muted">Статус</p>
              <p className="mt-1 font-semibold text-ink">
                {getPassengerStatusLabel(passengerStatus, passengerProfile)}
              </p>
            </div>
          </div>
          {!isProfileComplete ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900">
              Заполните имя и город, чтобы создать заявку.
            </div>
          ) : null}
          {passengerStatus !== 'GUEST' ? (
            <button
              type="button"
              onClick={() => actions.openPassengerOnboarding()}
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
            >
              Заполнить профиль
            </button>
          ) : null}
          <div className="rounded-2xl bg-white p-3 text-sm text-muted">
            Баланс не подключен. {formatKzt(0)}
          </div>
          <div className="rounded-2xl bg-white p-3 text-sm text-ink">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
              Отзывы
            </p>
            <p className="mt-1 font-semibold text-ink">
              {passengerReviewSummary?.averageRating ?? 0} / 5 ·{' '}
              {passengerReviewSummary?.reviewsCount ?? 0} шт.
            </p>
          </div>
          {passengerReviews.length > 0 ? (
            <div className="space-y-2 rounded-2xl bg-white p-3">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                Последние отзывы
              </p>
              {passengerReviews.slice(0, 3).map((review) => (
                <div key={review.id} className="rounded-2xl bg-surface-soft p-3 text-sm">
                  <div className="flex items-center justify-between gap-3">
                    <p className="font-semibold text-ink">{review.rating} / 5</p>
                    <p className="text-xs text-muted">{review.createdAt.slice(0, 10)}</p>
                  </div>
                  {review.comment ? <p className="mt-1 text-muted">{review.comment}</p> : null}
                </div>
              ))}
            </div>
          ) : null}
          {passengerStatus !== 'GUEST' ? (
            <button
              type="button"
              onClick={actions.logout}
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
            >
              <LogOut className="h-4 w-4" />
              Выйти
            </button>
          ) : (
            <button
              type="button"
              onClick={() => actions.openAuthSheet()}
              className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
            >
              <LogOut className="h-4 w-4" />
              Войти
            </button>
          )}
        </div>
      ) : (
        <div className="space-y-3 rounded-2xl bg-surface-soft p-4">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-5 w-5 text-accent" />
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                Статус
              </p>
              <p className="mt-1 text-sm font-semibold text-ink">
                {getPassengerStatusLabel(passengerStatus, passengerProfile)}
              </p>
            </div>
          </div>
          {passengerStatus !== 'GUEST' ? (
            <button
              type="button"
              onClick={() => actions.openPassengerOnboarding()}
              className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
            >
              <ShieldCheck className="h-4 w-4" />
              Заполнить профиль
            </button>
          ) : (
            <button
              type="button"
              onClick={() => actions.openAuthSheet()}
              className="inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
            >
              <LogOut className="h-4 w-4" />
              Войти
            </button>
          )}
        </div>
      )}
    </PageCard>
  )
}
