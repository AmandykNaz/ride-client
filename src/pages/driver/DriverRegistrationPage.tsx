import { useCallback, useEffect, useMemo, useState, type InputHTMLAttributes, type ReactNode } from 'react'
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
} from 'lucide-react'

import { cn } from '../../lib/cn'
import { formatKzPlateNumber, getKzPlateValidationError, normalizeKzPlateInput } from '../../lib/format'
import { useAppActions, useAppState } from '../../providers/AppStateProvider'
import { PageCard } from '../../shared/ui/PageCard'
import { type DriverApplicationDocument } from '../../types/domain'
import {
  getRideVehicleBodyTypes,
  getRideVehicleBrands,
  getRideVehicleColors,
  getRideVehicleModels,
  getRideCities,
  type RideCity,
} from '../../features/driver/api/driver.api'
import type {
  RideVehicleBodyTypeOption,
  RideVehicleBrandOption,
  RideVehicleColorOption,
  RideVehicleModelOption,
} from '../../features/driver/api/driver.types'
import { getDriverVerificationStatusLabel } from '../../features/driver/driver-status'
import DriverDocumentsStep from './components/DriverDocumentsStep'
import {
  documentDefinitions,
  documentTitle,
  requiredDocumentDefinitions,
} from './components/driverDocumentsStep.constants'
const allowedVehicleSeats = [2, 3, 4, 5, 6, 7, 8, 12, 16, 20]

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
  helperText,
  error,
  inputMode,
  autoCapitalize,
  maxLength,
  onBlur,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  type?: string
  helperText?: string
  error?: string | null
  inputMode?: InputHTMLAttributes<HTMLInputElement>['inputMode']
  autoCapitalize?: InputHTMLAttributes<HTMLInputElement>['autoCapitalize']
  maxLength?: number
  onBlur?: () => void
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      <input
        type={type}
        value={value}
        onChange={(event) => onChange(event.target.value)}
        onBlur={onBlur}
        placeholder={placeholder}
        inputMode={inputMode}
        autoCapitalize={autoCapitalize}
        maxLength={maxLength}
        className={cn(
          'w-full rounded-2xl border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent',
          error ? 'border-rose-300 focus:border-rose-500' : 'border-border',
        )}
      />
      {error ? <p className="mt-1 text-xs text-rose-600">{error}</p> : helperText ? <p className="mt-1 text-xs text-muted">{helperText}</p> : null}
    </label>
  )
}

function SelectField({
  label,
  value,
  onChange,
  placeholder,
  disabled,
  children,
}: {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder?: string
  disabled?: boolean
  children: ReactNode
}) {
  return (
    <label className="block">
      <span className="mb-1 block text-sm font-medium text-ink">{label}</span>
      <select
        value={value}
        onChange={(event) => onChange(event.target.value)}
        disabled={disabled}
        className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
      >
        <option value="">{placeholder}</option>
        {children}
      </select>
    </label>
  )
}

function normalizeVehicleBodyTypeCode(value?: string | null) {
  return value?.trim().toUpperCase() ?? ''
}

export default function DriverRegistrationPage() {
  const {
    driverApplicationDraft,
    driverProfile,
    driverRegistrationStep,
    driverVerificationStatus,
    driverFlowError,
    isDriverActionLoading,
  } = useAppState()
  const actions = useAppActions()

  const [rideCities, setRideCities] = useState<RideCity[]>([])
  const [rideCitiesLoading, setRideCitiesLoading] = useState(true)
  const [rideCitiesError, setRideCitiesError] = useState<string | null>(null)
  const [vehicleBrands, setVehicleBrands] = useState<RideVehicleBrandOption[]>([])
  const [vehicleModels, setVehicleModels] = useState<RideVehicleModelOption[]>([])
  const [vehicleColors, setVehicleColors] = useState<RideVehicleColorOption[]>([])
  const [vehicleBodyTypes, setVehicleBodyTypes] = useState<RideVehicleBodyTypeOption[]>([])
  const [vehicleCatalogLoading, setVehicleCatalogLoading] = useState(true)
  const [vehicleCatalogError, setVehicleCatalogError] = useState<string | null>(null)
  const [vehicleModelsLoading, setVehicleModelsLoading] = useState(false)
  const [vehicleModelsError, setVehicleModelsError] = useState<string | null>(null)
  const [vehiclePlateTouched, setVehiclePlateTouched] = useState(false)
  const currentVehicleYear = new Date().getFullYear()

  useEffect(() => {
    let alive = true

    void getRideCities()
      .then((cities) => {
        if (!alive) return
        setRideCities(cities)
      })
      .catch((error) => {
        if (!alive) return
        setRideCities([])
        setRideCitiesError(error instanceof Error ? error.message : 'Не удалось загрузить города для водителей.')
      })
      .finally(() => {
        if (!alive) return
        setRideCitiesLoading(false)
      })

    return () => {
      alive = false
    }
  }, [])

  const loadVehicleCatalog = useCallback(async () => {
    setVehicleCatalogLoading(true)
    setVehicleCatalogError(null)

    try {
      const [brands, colors, bodyTypes] = await Promise.all([
        getRideVehicleBrands(),
        getRideVehicleColors(),
        getRideVehicleBodyTypes(),
      ])

      setVehicleBrands(brands)
      setVehicleColors(colors)
      setVehicleBodyTypes(bodyTypes)
    } catch (error) {
      setVehicleBrands([])
      setVehicleColors([])
      setVehicleBodyTypes([])
      setVehicleCatalogError(error instanceof Error ? error.message : 'Не удалось загрузить справочники авто')
    } finally {
      setVehicleCatalogLoading(false)
    }
  }, [])

  const loadVehicleModels = useCallback(async (brandId: number) => {
    setVehicleModelsLoading(true)
    setVehicleModelsError(null)

    try {
      const models = await getRideVehicleModels(brandId)
      setVehicleModels(models)
    } catch (error) {
      setVehicleModels([])
      setVehicleModelsError(error instanceof Error ? error.message : 'Не удалось загрузить модели марки')
    } finally {
      setVehicleModelsLoading(false)
    }
  }, [])

  useEffect(() => {
    let alive = true
    const timer = window.setTimeout(() => {
      if (!alive) return
      void loadVehicleCatalog()
    }, 0)

    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [loadVehicleCatalog])

  useEffect(() => {
    const brandId = driverApplicationDraft.vehicleBrandId
    let alive = true
    const timer = window.setTimeout(() => {
      if (!alive) return

      if (brandId == null) {
        setVehicleModels([])
        setVehicleModelsError(null)
        setVehicleModelsLoading(false)
        return
      }

      setVehicleModelsLoading(true)
      setVehicleModelsError(null)

      void getRideVehicleModels(brandId)
        .then((models) => {
          if (!alive) return
          setVehicleModels(models)
        })
        .catch((error) => {
          if (!alive) return
          setVehicleModels([])
          setVehicleModelsError(error instanceof Error ? error.message : 'Не удалось загрузить модели марки')
        })
        .finally(() => {
          if (!alive) return
          setVehicleModelsLoading(false)
        })
    }, 0)

    return () => {
      alive = false
      window.clearTimeout(timer)
    }
  }, [driverApplicationDraft.vehicleBrandId])

  const selectedRideCity = useMemo(
    () => rideCities.find((city) => String(city.id) === driverApplicationDraft.cityId) ?? null,
    [driverApplicationDraft.cityId, rideCities],
  )

  const selectedVehicleBrand = useMemo(
    () => vehicleBrands.find((brand) => brand.id === driverApplicationDraft.vehicleBrandId) ?? null,
    [driverApplicationDraft.vehicleBrandId, vehicleBrands],
  )

  const selectedVehicleModel = useMemo(
    () => vehicleModels.find((model) => model.id === driverApplicationDraft.vehicleModelId) ?? null,
    [driverApplicationDraft.vehicleModelId, vehicleModels],
  )

  const vehicleCatalogReady = Boolean(
    !vehicleCatalogLoading &&
      !vehicleCatalogError &&
      vehicleBrands.length > 0 &&
      vehicleColors.length > 0 &&
      vehicleBodyTypes.length > 0,
  )

  const vehicleBrandSelected = Boolean(driverApplicationDraft.vehicleBrandId ?? driverApplicationDraft.vehicleBrand.trim())
  const vehicleModelSelected = Boolean(driverApplicationDraft.vehicleModelId ?? driverApplicationDraft.vehicleModel.trim())
  const vehicleColorSelected = Boolean(driverApplicationDraft.vehicleColorId ?? driverApplicationDraft.vehicleColor.trim())
  const vehiclePlateValue = normalizeKzPlateInput(driverApplicationDraft.vehiclePlate)
  const vehicleYearValue = Number(driverApplicationDraft.vehicleYear)
  const vehicleSeatsValue = Number(driverApplicationDraft.vehicleSeats)
  const vehicleYearValid =
    driverApplicationDraft.vehicleYear.trim().length > 0 &&
    Number.isInteger(vehicleYearValue) &&
    vehicleYearValue >= 1990 &&
    vehicleYearValue <= currentVehicleYear + 1
  const vehicleSeatsValid =
    driverApplicationDraft.vehicleSeats.trim().length > 0 &&
    Number.isInteger(vehicleSeatsValue) &&
    allowedVehicleSeats.includes(vehicleSeatsValue)
  const vehiclePlateValid = Boolean(vehiclePlateValue) && getKzPlateValidationError(vehiclePlateValue) === null
  const vehiclePlateValidationError = vehiclePlateTouched ? getKzPlateValidationError(vehiclePlateValue) : null
  const vehicleBodyTypeSelected = Boolean(normalizeVehicleBodyTypeCode(driverApplicationDraft.vehicleBodyType))

  const driverStatusLabel = getDriverVerificationStatusLabel(driverVerificationStatus)

  const isRequiredDocumentReady = (type: DriverApplicationDocument['type']) =>
    driverApplicationDraft.documents.some(
      (document) => document.type === type && document.filePath.trim().length > 0,
    )

  const allRequiredDocumentsReady = requiredDocumentDefinitions.every((definition) =>
    isRequiredDocumentReady(definition.type),
  )

  const missingReviewFields = [
    !driverApplicationDraft.fullName.trim() && 'ФИО',
    !driverApplicationDraft.phone.trim() && 'Телефон',
    !driverApplicationDraft.cityId?.trim() && 'Город',
    !vehicleBrandSelected && 'Марка',
    !vehicleModelSelected && 'Модель',
    !vehicleYearValid && 'Год',
    !vehiclePlateValid && 'Госномер',
    !vehicleColorSelected && 'Цвет',
    !vehicleSeatsValid && 'Мест',
    !vehicleBodyTypeSelected && 'Тип кузова',
  ].filter((label): label is string => Boolean(label))

  const isStep5Ready = Boolean(
    driverApplicationDraft.fullName.trim() &&
      driverApplicationDraft.phone.trim() &&
      driverApplicationDraft.cityId?.trim() &&
      vehicleBrandSelected &&
      vehicleModelSelected &&
      vehicleYearValid &&
      vehiclePlateValid &&
      vehicleColorSelected &&
      vehicleSeatsValid &&
      vehicleBodyTypeSelected &&
      vehicleCatalogReady &&
      allRequiredDocumentsReady,
  )

  const canSubmitApplication =
    isStep5Ready &&
    (driverVerificationStatus === 'DRAFT' || driverVerificationStatus === 'NEEDS_CHANGES')

  const summaryVehicle = useMemo(() => {
    const pieces = [
      selectedVehicleBrand?.name || driverApplicationDraft.vehicleBrand,
      selectedVehicleModel?.name || driverApplicationDraft.vehicleModel,
      driverApplicationDraft.vehicleYear,
    ].filter(Boolean)

    return pieces.join(' ')
  }, [driverApplicationDraft.vehicleBrand, driverApplicationDraft.vehicleModel, driverApplicationDraft.vehicleYear, selectedVehicleBrand?.name, selectedVehicleModel?.name])

  const reviewPhone = driverProfile?.phone || driverApplicationDraft.phone

  const step = driverRegistrationStep

  const stepButtons = (
    <div className="flex items-center justify-between gap-3 rounded-[28px] bg-slate-100 p-2">
      {[1, 2, 3, 4, 5].map((value) => (
        <StepBadge key={value} step={value} active={step === value} />
      ))}
    </div>
  )

  const flowErrorBanner = driverFlowError ? (
    <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{driverFlowError}</div>
  ) : null

  const yearOptions = useMemo(() => {
    const years: number[] = []
    for (let year = currentVehicleYear + 1; year >= 1990; year -= 1) {
      years.push(year)
    }
    return years
  }, [currentVehicleYear])

  const renderFooter = (canContinue = true) => (
    <div className="border-t border-border pt-3">
      <div className="flex gap-2">
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
          onClick={() => {
            if (step === 3 && !vehiclePlateValid) {
              setVehiclePlateTouched(true)
              return
            }

            if (step === 5) {
              void actions.submitDriverApplication()
              return
            }

            actions.nextDriverRegistrationStep()
          }}
          disabled={!canContinue || isDriverActionLoading}
          className="flex-1 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
        >
          <span className="inline-flex items-center gap-2">
            {step === 5 ? 'Отправить на проверку' : 'Продолжить'}
            <ArrowRight className="h-4 w-4" />
          </span>
        </button>
      </div>
    </div>
  )

  const renderWizardLayout = (
    content: ReactNode,
    canContinue = true,
    props?: { title: string; description: string; eyebrow?: string },
  ) => (
    <PageCard
      eyebrow={props?.eyebrow ?? 'Водитель'}
      title={props?.title ?? ''}
      description={props?.description ?? ''}
    >
      {stepButtons}
      {flowErrorBanner}
      {content}
      {renderFooter(canContinue)}
    </PageCard>
  )

  if (driverVerificationStatus === 'PENDING_REVIEW') {
    return (
      <PageCard
        eyebrow="Водитель"
        title="На проверке"
        description="Заявка отправлена. Модератор проверит документы."
      >
        {flowErrorBanner}

        <div className="flex items-start gap-3 rounded-2xl border border-sky-200 bg-sky-50 p-4 text-sky-900">
          <BadgeCheck className="mt-0.5 h-5 w-5 shrink-0" />
          <div className="min-w-0">
            <p className="text-sm font-semibold">{driverStatusLabel}</p>
            <p className="mt-1 text-sm text-sky-800">
              Заявка отправлена. Модератор проверит документы.
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => actions.setScreen('driverDashboard')}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
        >
          Перейти в кабинет водителя
        </button>
      </PageCard>
    )
  }

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
    return renderWizardLayout(
      <div className="space-y-3">
        {rideCitiesError ? (
          <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">
            {rideCitiesError}
          </div>
        ) : null}

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

        <label className="block">
          <span className="mb-1 block text-sm font-medium text-ink">Основной город работы</span>
          <select
            value={driverApplicationDraft.cityId ?? ''}
            onChange={(event) => {
              const cityId = event.target.value
              const city = rideCities.find((item) => String(item.id) === cityId) ?? null

              actions.updateDriverApplicationField('cityId', cityId)
              actions.updateDriverApplicationField('city', city?.name ?? '')
            }}
            disabled={rideCitiesLoading}
            className="w-full rounded-2xl border border-border bg-surface-soft px-4 py-3 text-sm outline-none transition focus:border-accent disabled:cursor-not-allowed disabled:opacity-60"
          >
            <option value="">{rideCitiesLoading ? 'Загрузка городов...' : 'Выберите город'}</option>
            {rideCities.map((city) => (
              <option key={city.id} value={city.id}>
                {city.name}
              </option>
            ))}
          </select>
        </label>
      </div>,
      Boolean(
        driverApplicationDraft.fullName.trim() &&
          driverApplicationDraft.phone.trim() &&
          driverApplicationDraft.cityId?.trim(),
      ),
      {
        title: 'Личные данные',
        description: 'Заполняем основные данные водителя и выбираем основной город работы.',
      },
    )
  }

  if (step === 3) {
    return renderWizardLayout(
      <div className="grid gap-3">
        {vehicleCatalogLoading ? (
          <div className="rounded-2xl border border-sky-200 bg-sky-50 px-4 py-3 text-sm text-sky-900">
            Загружаем справочники авто...
          </div>
        ) : vehicleCatalogError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <p>Не удалось загрузить справочники авто</p>
            <button
              type="button"
              onClick={() => {
                void loadVehicleCatalog()
              }}
              className="mt-3 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700"
            >
              Обновить
            </button>
          </div>
        ) : null}

        <div className="grid gap-3 sm:[grid-template-columns:repeat(2,minmax(0,1fr))]">
          <SelectField
            label="Марка"
            value={driverApplicationDraft.vehicleBrandId?.toString() ?? ''}
            onChange={(value) => {
              const brandId = value ? Number(value) : undefined
              const brand = vehicleBrands.find((item) => item.id === brandId) ?? null

              actions.updateDriverApplicationField('vehicleBrandId', brandId)
              actions.updateDriverApplicationField('vehicleBrand', brand?.name ?? '')
              actions.updateDriverApplicationField('vehicleModelId', undefined)
              actions.updateDriverApplicationField('vehicleModel', '')
              setVehicleModels([])
              setVehicleModelsError(null)
            }}
            placeholder="Выберите марку"
            disabled={vehicleCatalogLoading || Boolean(vehicleCatalogError)}
          >
            {vehicleBrands.map((brand) => (
              <option key={brand.id} value={brand.id}>
                {brand.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Модель"
            value={driverApplicationDraft.vehicleModelId?.toString() ?? ''}
            onChange={(value) => {
              const modelId = value ? Number(value) : undefined
              const model = vehicleModels.find((item) => item.id === modelId) ?? null

              actions.updateDriverApplicationField('vehicleModelId', modelId)
              actions.updateDriverApplicationField('vehicleModel', model?.name ?? '')
            }}
            placeholder={
              driverApplicationDraft.vehicleBrandId
                ? vehicleModelsLoading
                  ? 'Загрузка моделей...'
                  : 'Выберите модель'
                : 'Сначала выберите марку'
            }
            disabled={!driverApplicationDraft.vehicleBrandId || vehicleModelsLoading || Boolean(vehicleCatalogError)}
          >
            {vehicleModels.map((model) => (
              <option key={model.id} value={model.id}>
                {model.name}
              </option>
            ))}
          </SelectField>
        </div>

        {vehicleModelsError ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">
            <p>Не удалось загрузить модели для выбранной марки</p>
            <button
              type="button"
              onClick={() => {
                if (driverApplicationDraft.vehicleBrandId != null) {
                  void loadVehicleModels(driverApplicationDraft.vehicleBrandId)
                }
              }}
              className="mt-3 rounded-2xl border border-rose-200 bg-white px-4 py-2 text-sm font-semibold text-rose-700"
            >
              Обновить
            </button>
          </div>
        ) : null}

        <div className="grid gap-3 sm:[grid-template-columns:repeat(2,minmax(0,1fr))]">
          <SelectField
            label="Год"
            value={driverApplicationDraft.vehicleYear}
            onChange={(value) => actions.updateDriverApplicationField('vehicleYear', value)}
            placeholder="Выберите год"
          >
            {yearOptions.map((year) => (
              <option key={year} value={String(year)}>
                {year}
              </option>
            ))}
          </SelectField>
          <Field
            label="Госномер"
            value={driverApplicationDraft.vehiclePlate}
            onChange={(value) => actions.updateDriverApplicationField('vehiclePlate', normalizeKzPlateInput(value))}
            onBlur={() => setVehiclePlateTouched(true)}
            placeholder="Например 765 ABL 13"
            helperText={vehiclePlateValidationError ? undefined : 'Формат: 123 ABC 02'}
            error={vehiclePlateValidationError}
            inputMode="text"
            autoCapitalize="characters"
            maxLength={8}
          />
        </div>

        <div className="grid gap-3 sm:[grid-template-columns:repeat(2,minmax(0,1fr))]">
          <SelectField
            label="Цвет"
            value={driverApplicationDraft.vehicleColorId?.toString() ?? ''}
            onChange={(value) => {
              const colorId = value ? Number(value) : undefined
              const color = vehicleColors.find((item) => item.id === colorId) ?? null

              actions.updateDriverApplicationField('vehicleColorId', colorId)
              actions.updateDriverApplicationField('vehicleColor', color?.name ?? '')
            }}
            placeholder="Выберите цвет"
            disabled={vehicleCatalogLoading || Boolean(vehicleCatalogError)}
          >
            {vehicleColors.map((color) => (
              <option key={color.id} value={color.id}>
                {color.name}
              </option>
            ))}
          </SelectField>

          <SelectField
            label="Мест"
            value={driverApplicationDraft.vehicleSeats}
            onChange={(value) => actions.updateDriverApplicationField('vehicleSeats', value)}
            placeholder="Выберите количество мест"
          >
            {allowedVehicleSeats.map((seats) => (
              <option key={seats} value={String(seats)}>
                {seats}
              </option>
            ))}
          </SelectField>
        </div>

        <div className="space-y-2">
          <span className="block text-sm font-medium text-ink">Тип кузова</span>
          <div className="flex flex-wrap gap-2">
            {vehicleBodyTypes.map((bodyType) => {
              const bodyTypeValue = normalizeVehicleBodyTypeCode(bodyType.code).toLowerCase() as typeof driverApplicationDraft.vehicleBodyType
              const isSelected = driverApplicationDraft.vehicleBodyType === bodyTypeValue

              return (
                <button
                  key={bodyType.code}
                  type="button"
                  onClick={() => actions.updateDriverApplicationField('vehicleBodyType', bodyTypeValue)}
                  className={cn(
                    'min-w-[110px] flex-1 rounded-2xl border px-3 py-3 text-sm font-semibold',
                    isSelected ? 'border-accent bg-accent/8 text-accent' : 'border-border bg-surface-soft text-ink',
                  )}
                >
                  {bodyType.nameRu}
                </button>
              )
            })}
          </div>
        </div>
      </div>,
      Boolean(
        vehicleCatalogReady &&
          vehicleBrandSelected &&
          vehicleModelSelected &&
          vehicleYearValid &&
          vehicleColorSelected &&
          vehicleSeatsValid &&
          vehicleBodyTypeSelected,
      ),
      {
        title: 'Автомобиль',
        description: 'Собираем данные об автомобиле для будущей модерации.',
      },
    )
  }

  if (step === 4) {
    return (
      <PageCard
        eyebrow="Водитель"
        title="Документы и фото"
        description="Загрузите обязательные документы и дополнительные фото в одном месте."
      >
        {stepButtons}
        {flowErrorBanner}
        <DriverDocumentsStep
          documents={driverApplicationDraft.documents}
          onDocumentsChange={(nextDocuments) => {
            actions.updateDriverApplicationField('documents', nextDocuments)
          }}
          onBack={actions.prevDriverRegistrationStep}
          onContinue={actions.nextDriverRegistrationStep}
          onAuthRequired={() => {
            actions.openAuthSheet('driverRegistrationResume')
          }}
        />
      </PageCard>
    )
  }

  return renderWizardLayout(
    !isStep5Ready ? (
      <div className="space-y-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Заявка ещё не готова к отправке</p>

          {missingReviewFields.length > 0 ? (
            <p className="mt-1">
              Заполните поля: {missingReviewFields.join(', ')}.
            </p>
          ) : null}

          <p className="mt-1">
            Загрузите обязательные документы: ВУ лицевая, ВУ обратная, техпаспорт и фото авто спереди.
          </p>

          <div className="mt-3 flex gap-2">
            <button
              type="button"
              onClick={actions.prevDriverRegistrationStep}
              className="rounded-2xl bg-white px-4 py-3 text-sm font-semibold text-ink"
            >
              Вернуться к документам
            </button>
            <button
              type="button"
              onClick={() => actions.setScreen('driverRegistration')}
              className="rounded-2xl border border-amber-300 bg-amber-100 px-4 py-3 text-sm font-semibold text-amber-900"
            >
              Продолжить регистрацию
            </button>
          </div>
        </div>
      </div>
    ) : canSubmitApplication ? (
      <div className="space-y-3">
        {!vehicleCatalogReady ? (
          <div className="rounded-2xl border border-rose-200 bg-rose-50 p-4 text-sm text-rose-700">
            <p className="font-semibold">Не удалось загрузить справочники авто</p>
            <p className="mt-1">Обновите страницу или вернитесь к шагу "Автомобиль" и попробуйте ещё раз.</p>
          </div>
        ) : null}

        <div className="rounded-2xl bg-surface-soft p-4 text-sm text-ink">
          <p className="font-semibold">{driverApplicationDraft.fullName || 'ФИО'}</p>
          <p className="mt-1 text-muted">{reviewPhone || 'Телефон'}</p>
          <p className="mt-1 text-muted">{selectedRideCity?.name || driverApplicationDraft.city || 'Город'}</p>
        </div>

        <div className="rounded-2xl bg-surface-soft p-4 text-sm text-ink">
          <p className="font-semibold">Автомобиль</p>
          <p className="mt-1 text-muted">
            {summaryVehicle || 'Марка, модель, год'}
          </p>
          <p className="mt-1 text-muted">
            {formatKzPlateNumber(driverApplicationDraft.vehiclePlate) || 'Госномер'}
          </p>
        </div>

        <div className="rounded-2xl bg-white p-4">
          <p className="text-sm font-semibold text-ink">Документы</p>
          <div className="mt-2 grid gap-2 text-xs text-muted sm:[grid-template-columns:repeat(2,minmax(0,1fr))]">
            {documentDefinitions.map((definition) => {
              const document = driverApplicationDraft.documents.find((item) => item.type === definition.type)
              return (
                <div key={definition.type} className="rounded-2xl bg-surface-soft px-3 py-2">
                  {documentTitle(definition.type)}: {document?.fileName?.trim() || document?.filePath.trim() || 'Нет'}
                </div>
              )
            })}
          </div>
        </div>

        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-sm text-emerald-900">
          После отправки данные проверит модератор.
        </div>
      </div>
    ) : (
      <div className="space-y-3">
        <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
          <p className="font-semibold">Заявка уже на проверке</p>
          <p className="mt-1">
            Повторная отправка недоступна. Статус: {driverStatusLabel}.
          </p>
          <p className="mt-1">
            Заявка отправлена. Модератор проверит документы.
          </p>
        </div>

        <button
          type="button"
          onClick={() => actions.setScreen('driverDashboard')}
          className="w-full rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20"
        >
          Перейти в кабинет водителя
        </button>
      </div>
    ),
    canSubmitApplication && vehicleCatalogReady,
    {
      title: 'Проверка и отправка',
      description: 'Проверяем заполненные данные перед отправкой модератору.',
    },
  )
  }
