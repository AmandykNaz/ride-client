import { useEffect, useState } from 'react'
import { Minus, Plus, Package2, ImagePlus } from 'lucide-react'

import { cn } from '../../lib/cn'
import { formatKzt } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'

const sizeOptions = [
  { value: 'small' as const, label: 'Маленькая до 5 кг', hint: 'До 5 кг' },
  { value: 'medium' as const, label: 'Средняя 5–15 кг', hint: '5–15 кг' },
  { value: 'large' as const, label: 'Большая 15+ кг', hint: '15+ кг' },
]

function statusBanner(status: string) {
  if (status === 'LIMITED') {
    return {
      text: 'Создание заявок на посылку временно ограничено.',
      tone: 'warning' as const,
    }
  }

  if (status === 'BLOCKED') {
    return {
      text: 'Аккаунт заблокирован. Создание посылок недоступно.',
      tone: 'danger' as const,
    }
  }

  return null
}

export default function PassengerParcelsPage() {
  const { passengerStatus, passengerProfile, verifiedPhone, parcelDraft } = useAppState()
  const actions = useAppActions()
  const [error, setError] = useState('')

  useEffect(() => {
    if (parcelDraft.senderName || !passengerProfile?.name) return
    actions.updateParcelDraft({
      senderName: passengerProfile.name,
      senderPhone: verifiedPhone || passengerProfile.phone,
    })
  }, [actions, parcelDraft.senderName, passengerProfile, verifiedPhone])

  const banner = statusBanner(passengerStatus)

  const requiredFieldsMissing =
    !parcelDraft.senderName.trim() ||
    !parcelDraft.senderPhone.trim() ||
    !parcelDraft.receiverName.trim() ||
    !parcelDraft.receiverPhone.trim() ||
    !parcelDraft.from.trim() ||
    !parcelDraft.to.trim() ||
    !parcelDraft.description.trim() ||
    !parcelDraft.price

  const handleSearch = () => {
    if (passengerStatus === 'LIMITED' || passengerStatus === 'BLOCKED') {
      return
    }

    if (requiredFieldsMissing) {
      setError('Заполните обязательные поля посылки.')
      return
    }

    setError('')

    if (passengerStatus === 'GUEST') {
      actions.setPendingPassengerFlow('parcel')
      actions.openPhoneVerifySheet()
      return
    }

    actions.createParcelFromDraft()
  }

  return (
    <div className="space-y-4">
      {banner ? (
        <div
          className={cn(
            'rounded-[24px] border px-4 py-3 text-sm font-medium',
            banner.tone === 'danger'
              ? 'border-red-200 bg-red-50 text-red-700'
              : 'border-amber-200 bg-amber-50 text-amber-900',
          )}
        >
          {banner.text}
        </div>
      ) : null}

      <PageCard
        eyebrow="Пассажир"
        title="Отправить посылку"
        description="Каркас формы отправки посылки между городами Казахстана."
      >
        <div className="rounded-2xl bg-surface-soft p-4">
          <div className="flex items-center gap-2 text-sm font-semibold text-ink">
            <Package2 className="h-5 w-5 text-accent" />
            Посылка
          </div>
          <p className="mt-2 text-sm text-muted">
            Фото можно прикрепить позже, это демо-тоггл без загрузки файла.
          </p>
        </div>
      </PageCard>

      <div className="rounded-[30px] border border-border bg-white p-4 shadow-sm">
        <div className="grid gap-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Имя отправителя</span>
              <input
                value={parcelDraft.senderName}
                onChange={(event) =>
                  actions.updateParcelDraft({ senderName: event.target.value })
                }
                className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
                placeholder="Алия"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">Телефон отправителя</span>
              <input
                value={parcelDraft.senderPhone}
                onChange={(event) =>
                  actions.updateParcelDraft({ senderPhone: event.target.value })
                }
                className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
                placeholder="+7 700 000 00 00"
              />
            </label>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                Имя получателя
              </span>
              <input
                value={parcelDraft.receiverName}
                onChange={(event) =>
                  actions.updateParcelDraft({ receiverName: event.target.value })
                }
                className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
                placeholder="Марат"
              />
            </label>
            <label className="block">
              <span className="mb-1 block text-sm font-medium text-ink">
                Телефон получателя
              </span>
              <input
                value={parcelDraft.receiverPhone}
                onChange={(event) =>
                  actions.updateParcelDraft({ receiverPhone: event.target.value })
                }
                className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
                placeholder="+7 701 000 00 00"
              />
            </label>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Откуда забрать</span>
            <input
              value={parcelDraft.from}
              onChange={(event) => actions.updateParcelDraft({ from: event.target.value })}
              className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
              placeholder="Алматы, ул. Абая 10"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Куда доставить</span>
            <input
              value={parcelDraft.to}
              onChange={(event) => actions.updateParcelDraft({ to: event.target.value })}
              className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
              placeholder="Шымкент, пр. Тауке хана 5"
            />
          </label>

          <div>
            <p className="mb-2 text-sm font-medium text-ink">Размер / вес</p>
            <div className="grid gap-2">
              {sizeOptions.map((option) => (
                <button
                  key={option.value}
                  type="button"
                  onClick={() => actions.updateParcelDraft({ size: option.value })}
                  className={cn(
                    'flex items-center justify-between rounded-2xl border px-4 py-3 text-left text-sm font-semibold transition',
                    parcelDraft.size === option.value
                      ? 'border-accent bg-accent/8 text-accent'
                      : 'border-border bg-surface-soft text-ink',
                  )}
                >
                  <span>{option.label}</span>
                  <span className="text-xs font-medium text-muted">{option.hint}</span>
                </button>
              ))}
            </div>
          </div>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Вес, кг</span>
            <input
              type="number"
              min={0}
              step="0.1"
              value={parcelDraft.weightKg ?? ''}
              onChange={(event) =>
                actions.updateParcelDraft({
                  weightKg: event.target.value ? Number(event.target.value) : undefined,
                })
              }
              className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
              placeholder="2"
            />
          </label>

          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Описание посылки</span>
            <textarea
              value={parcelDraft.description}
              onChange={(event) =>
                actions.updateParcelDraft({ description: event.target.value })
              }
              rows={3}
              className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
              placeholder="Документы в конверте, аккуратная упаковка..."
            />
          </label>

          <button
            type="button"
            onClick={() =>
              actions.updateParcelDraft({ photoAttached: !parcelDraft.photoAttached })
            }
            className={cn(
              'flex items-center justify-between rounded-2xl border px-4 py-3 text-sm font-semibold transition',
              parcelDraft.photoAttached
                ? 'border-accent bg-accent/8 text-accent'
                : 'border-border bg-surface-soft text-ink',
            )}
          >
            <span className="flex items-center gap-2">
              <ImagePlus className="h-4 w-4" />
              Фото посылки
            </span>
            <span>{parcelDraft.photoAttached ? 'Фото прикреплено' : 'Не прикреплено'}</span>
          </button>

          <div className="grid grid-cols-[auto_1fr_auto] items-center gap-3">
            <button
              type="button"
              onClick={() =>
                actions.updateParcelDraft({ price: Math.max(0, parcelDraft.price - 500) })
              }
              className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-white"
            >
              <Minus className="h-4 w-4 text-ink" />
            </button>
            <div className="rounded-2xl bg-surface-soft px-4 py-3 text-center">
              <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">
                Предлагаемая цена
              </p>
              <p className="mt-1 text-base font-semibold text-ink">
                {formatKzt(parcelDraft.price)}
              </p>
            </div>
            <button
              type="button"
              onClick={() =>
                actions.updateParcelDraft({ price: parcelDraft.price + 500 })
              }
              className="grid h-11 w-11 place-items-center rounded-2xl border border-border bg-white"
            >
              <Plus className="h-4 w-4 text-ink" />
            </button>
          </div>

          <div className="rounded-2xl bg-slate-50 px-4 py-3 text-sm text-muted">
            {parcelDraft.from} → {parcelDraft.to}
          </div>

          {error ? (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
              {error}
            </div>
          ) : null}

          <button
            type="button"
            onClick={handleSearch}
            disabled={passengerStatus === 'LIMITED' || passengerStatus === 'BLOCKED'}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            Найти водителя
          </button>
        </div>
      </div>
    </div>
  )
}
