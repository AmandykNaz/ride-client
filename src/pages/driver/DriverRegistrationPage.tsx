import { useMemo } from 'react'
import { ArrowLeft, ArrowRight, CheckCircle2, Upload } from 'lucide-react'

import { cn } from '../../lib/cn'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'
import type { DriverApplicationDocuments } from '../../types/domain'

const requiredDocumentKeys = [
  'driverLicenseFront',
  'driverLicenseBack',
  'vehicleRegistration',
  'carFrontPhoto',
] as const

const documentLabels: Record<keyof DriverApplicationDocuments, string> = {
  driverLicenseFront: 'ВУ лицевая сторона',
  driverLicenseBack: 'ВУ обратная сторона',
  vehicleRegistration: 'Техпаспорт / регистрация авто',
  carFrontPhoto: 'Фото авто спереди',
  carBackPhoto: 'Фото авто сзади',
  interiorPhoto: 'Фото салона',
  trunkPhoto: 'Фото багажника',
}

function StepBadge({ step, active }: { step: number; active: boolean }) {
  return (
    <div
      className={cn(
        'grid h-9 w-9 place-items-center rounded-full text-sm font-semibold',
        active ? 'bg-accent text-white' : 'bg-slate-100 text-slate-500',
      )}
    >
      {step}
    </div>
  )
}

function Field({
  label,
  value,
  onChange,
  placeholder,
  type = 'text',
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        placeholder={placeholder}
        className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent"
      />
    </label>
  )
}

export default function DriverRegistrationPage() {
  const { driverApplicationDraft, driverRegistrationStep, driverFlowError, isDriverActionLoading } = useAppState()
  const actions = useAppActions()

  const allRequiredDocsReady = requiredDocumentKeys.every(
    (key) => driverApplicationDraft.documents[key],
  )

  const summaryVehicle = useMemo(() => {
    const pieces = [
      driverApplicationDraft.vehicleBrand,
      driverApplicationDraft.vehicleModel,
      driverApplicationDraft.vehicleYear,
    ].filter(Boolean)

    return pieces.join(' ')
  }, [driverApplicationDraft])

  const step = driverRegistrationStep

  const stepButtons = (
    <div className="flex items-center justify-between gap-3 rounded-[28px] bg-slate-100 p-2">
      {[1, 2, 3, 4, 5].map((value) => (
        <StepBadge key={value} step={value} active={step === value} />
      ))}
    </div>
  )

  const flowErrorBanner = driverFlowError ? (
    <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
      {driverFlowError}
    </div>
  ) : null

  const renderFooter = (canContinue = true) => (
    <div className="mt-5 flex gap-2">
      {step > 1 ? (
        <button
          type="button"
          onClick={actions.prevDriverRegistrationStep}
          className="flex-1 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
        >
          <span className="inline-flex items-center gap-2">
            <ArrowLeft className="h-4 w-4" />
            Назад
          </span>
        </button>
      ) : null}
      <button
        type="button"
        onClick={
          step === 5 ? actions.submitDriverApplication : actions.nextDriverRegistrationStep
        }
        disabled={!canContinue || isDriverActionLoading}
        className="flex-1 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
      >
        <span className="inline-flex items-center gap-2">
          {step === 5 ? 'Отправить на проверку' : 'Продолжить'}
          <ArrowRight className="h-4 w-4" />
        </span>
      </button>
    </div>
  )

  if (step === 1) {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Стать водителем AmanJol"
        description="Коротко о том, как работает водительский профиль в демо-прототипе."
      >
        {flowErrorBanner}
        {stepButtons}
        <div className="space-y-3 rounded-2xl bg-surface-soft p-4 text-sm text-ink">
          <p>• зарабатывайте на межгороде</p>
          <p>• свободный график</p>
          <p>• комиссия только после завершения поездки</p>
          <p>• минимальный баланс для доступа к заказам</p>
        </div>

        <div className="rounded-2xl border border-border bg-white p-4">
          <p className="text-sm font-semibold text-ink">Требования</p>
          <div className="mt-2 space-y-2 text-sm text-muted">
            <p>• права категории B</p>
            <p>• стаж от 2 лет</p>
            <p>• исправный автомобиль</p>
          </div>
        </div>

        {renderFooter()}
      </PageCard>
    )
  }

  if (step === 2) {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Личные данные"
        description="Заполняем основные данные водителя и частые направления."
      >
        {stepButtons}
        {flowErrorBanner}
        <div className="space-y-3">
          <Field
            label="ФИО"
            value={driverApplicationDraft.fullName}
            onChange={(value) => actions.updateDriverApplicationField('fullName', value)}
            placeholder="Иванов Иван Иванович"
          />
          <Field
            label="Телефон"
            value={driverApplicationDraft.phone}
            onChange={(value) => actions.updateDriverApplicationField('phone', value)}
            placeholder="+7 700 000 00 00"
          />
          <Field
            label="Основной город работы"
            value={driverApplicationDraft.city}
            onChange={(value) => actions.updateDriverApplicationField('city', value)}
            placeholder="Алматы"
          />
          <Field
            label="Частые направления"
            value={driverApplicationDraft.frequentRoutes}
            onChange={(value) =>
              actions.updateDriverApplicationField('frequentRoutes', value)
            }
            placeholder="Алматы — Шымкент"
          />
        </div>
        {renderFooter(Boolean(driverApplicationDraft.fullName.trim() && driverApplicationDraft.phone.trim() && driverApplicationDraft.city.trim()))}
      </PageCard>
    )
  }

  if (step === 3) {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Автомобиль"
        description="Собираем данные об автомобиле для будущей модерации."
      >
        {stepButtons}
        {flowErrorBanner}
        <div className="grid gap-3">
          <Field
            label="Марка"
            value={driverApplicationDraft.vehicleBrand}
            onChange={(value) =>
              actions.updateDriverApplicationField('vehicleBrand', value)
            }
            placeholder="Toyota"
          />
          <Field
            label="Модель"
            value={driverApplicationDraft.vehicleModel}
            onChange={(value) =>
              actions.updateDriverApplicationField('vehicleModel', value)
            }
            placeholder="Camry"
          />
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Год"
              value={driverApplicationDraft.vehicleYear}
              onChange={(value) =>
                actions.updateDriverApplicationField('vehicleYear', value)
              }
              placeholder="2020"
            />
            <Field
              label="Госномер"
              value={driverApplicationDraft.vehiclePlate}
              onChange={(value) =>
                actions.updateDriverApplicationField('vehiclePlate', value)
              }
              placeholder="778 AAB 02"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <Field
              label="Цвет"
              value={driverApplicationDraft.vehicleColor}
              onChange={(value) =>
                actions.updateDriverApplicationField('vehicleColor', value)
              }
              placeholder="Белый"
            />
            <Field
              label="Мест"
              value={driverApplicationDraft.vehicleSeats}
              onChange={(value) =>
                actions.updateDriverApplicationField('vehicleSeats', value)
              }
              placeholder="4"
            />
          </div>
          <label className="block">
            <span className="mb-1 block text-sm font-medium text-ink">Тип кузова</span>
            <div className="grid grid-cols-2 gap-2">
              {(['sedan', 'suv', 'minivan', 'alphard'] as const).map((bodyType) => (
                <button
                  key={bodyType}
                  type="button"
                  onClick={() =>
                    actions.updateDriverApplicationField('vehicleBodyType', bodyType)
                  }
                  className={cn(
                    'rounded-2xl border px-3 py-3 text-sm font-semibold capitalize',
                    driverApplicationDraft.vehicleBodyType === bodyType
                      ? 'border-accent bg-accent/8 text-accent'
                      : 'border-border bg-surface-soft text-ink',
                  )}
                >
                  {bodyType}
                </button>
              ))}
            </div>
          </label>
        </div>
        {renderFooter(
          Boolean(
            driverApplicationDraft.vehicleBrand.trim() &&
              driverApplicationDraft.vehicleModel.trim() &&
              driverApplicationDraft.vehicleYear.trim() &&
              driverApplicationDraft.vehiclePlate.trim() &&
              driverApplicationDraft.vehicleColor.trim() &&
              driverApplicationDraft.vehicleSeats.trim(),
          ),
        )}
      </PageCard>
    )
  }

  if (step === 4) {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Документы и фото"
        description="Mock upload tiles для демонстрации проверки документов."
      >
        {stepButtons}
        {flowErrorBanner}
        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          {(
            [
              ['driverLicenseFront', 'ВУ лицевая сторона'],
              ['driverLicenseBack', 'ВУ обратная сторона'],
              ['vehicleRegistration', 'Техпаспорт / регистрация авто'],
              ['carFrontPhoto', 'Фото авто спереди'],
              ['carBackPhoto', 'Фото авто сзади'],
              ['interiorPhoto', 'Фото салона'],
              ['trunkPhoto', 'Фото багажника'],
            ] as const
          ).map(([key, label]) => {
            const uploaded = driverApplicationDraft.documents[key]

            return (
              <button
                key={key}
                type="button"
                onClick={() => actions.uploadDriverDocumentMock(key)}
                className={cn(
                  'rounded-2xl border p-4 text-left transition',
                  uploaded
                    ? 'border-accent bg-accent/8 text-accent'
                    : 'border-border bg-surface-soft text-ink',
                )}
              >
                <div className="flex items-center justify-between gap-3">
                  <span className="text-sm font-semibold">{label}</span>
                  {uploaded ? (
                    <CheckCircle2 className="h-5 w-5" />
                  ) : (
                    <Upload className="h-5 w-5" />
                  )}
                </div>
                <p className="mt-2 text-xs font-medium uppercase tracking-[0.2em]">
                  {uploaded ? 'Загружено' : 'Нажмите для mock upload'}
                </p>
              </button>
            )
          })}
        </div>

        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-900">
          Обязательные документы: ВУ лицевая, ВУ обратная, техпаспорт и фото авто спереди.
        </div>

        {renderFooter(allRequiredDocsReady)}
      </PageCard>
    )
  }

  return (
    <PageCard
      eyebrow="Водитель"
      title="Проверка и отправка"
      description="Проверяем заполненные данные перед отправкой модератору."
    >
      {stepButtons}
      {flowErrorBanner}
      <div className="space-y-3">
        <div className="rounded-2xl bg-surface-soft p-4 text-sm text-ink">
          <p className="font-semibold">{driverApplicationDraft.fullName || 'ФИО'}</p>
          <p className="mt-1 text-muted">{driverApplicationDraft.phone || 'Телефон'}</p>
          <p className="mt-1 text-muted">{driverApplicationDraft.city || 'Город'}</p>
          <p className="mt-1 text-muted">{driverApplicationDraft.frequentRoutes || 'Маршруты'}</p>
        </div>
        <div className="rounded-2xl bg-surface-soft p-4 text-sm text-ink">
          <p className="font-semibold">Автомобиль</p>
          <p className="mt-1 text-muted">
            {summaryVehicle || 'Марка, модель, год'}
          </p>
          <p className="mt-1 text-muted">
            {driverApplicationDraft.vehiclePlate || 'Госномер'}
          </p>
        </div>
        <div className="rounded-2xl bg-white p-4">
          <p className="text-sm font-semibold text-ink">Документы</p>
          <div className="mt-2 grid grid-cols-2 gap-2 text-xs text-muted">
            {Object.entries(driverApplicationDraft.documents).map(([key, uploaded]) => (
              <div key={key} className="rounded-2xl bg-surface-soft px-3 py-2">
                {documentLabels[key as keyof typeof documentLabels]}: {uploaded ? 'Загружено' : 'Нет'}
              </div>
            ))}
          </div>
        </div>
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          После отправки данные проверит модератор.
        </div>
      </div>
      {renderFooter(
        Boolean(
          driverApplicationDraft.fullName.trim() &&
            driverApplicationDraft.phone.trim() &&
            driverApplicationDraft.city.trim() &&
            driverApplicationDraft.vehicleBrand.trim() &&
            driverApplicationDraft.vehicleModel.trim() &&
            driverApplicationDraft.vehicleYear.trim() &&
            driverApplicationDraft.vehiclePlate.trim() &&
            driverApplicationDraft.vehicleColor.trim() &&
            driverApplicationDraft.vehicleSeats.trim() &&
            allRequiredDocsReady,
        ),
      )}
    </PageCard>
  )
}
