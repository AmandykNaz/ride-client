import { useEffect, useMemo, useState } from 'react'
import {
  Camera,
  CheckCircle2,
  Clock3,
  FileCheck2,
  FileImage,
  FileText,
  RefreshCw,
  Send,
  UserRound,
} from 'lucide-react'

import { cn } from '../../../lib/cn'
import {
  getActiveDriverRecheck,
  submitDriverRecheck,
  uploadDriverRecheckFile,
} from '../../../features/driver/api/driver.api'
import type {
  RideDriverRecheck,
  RideDriverRecheckFile,
  RideDriverRecheckFileType,
  RideDriverRecheckStatus,
  RideDriverRecheckType,
} from '../../../types/domain'
import { PageCard } from '../../../shared/ui/PageCard'
import { RecheckCameraCapture } from './RecheckCameraCapture'

type RecheckRequirement = {
  type: RideDriverRecheckFileType
  label: string
  buttonLabel: string
  icon: typeof Camera
  captureMode: 'user' | 'environment'
}

const RECHECK_TYPE_LABELS: Record<RideDriverRecheckType, string> = {
  SELFIE: 'Селфи',
  VEHICLE_PHOTOS: 'Фото авто',
  DOCUMENTS: 'Документы',
  VEHICLE_AND_SELFIE: 'Фото авто + селфи',
}

const RECHECK_STATUS_LABELS: Record<RideDriverRecheckStatus, string> = {
  PENDING_UPLOAD: 'Нужна загрузка файлов',
  PENDING_REVIEW: 'На проверке',
  APPROVED: 'Одобрено',
  REJECTED: 'Отклонено',
  CANCELLED: 'Отменено',
  EXPIRED: 'Истекло',
}

const FILE_LABELS: Record<RideDriverRecheckFileType, string> = {
  SELFIE: 'Селфи',
  CAR_FRONT_PHOTO: 'Фото авто спереди',
  CAR_BACK_PHOTO: 'Фото авто сзади',
  INTERIOR_PHOTO: 'Фото салона',
  TRUNK_PHOTO: 'Фото багажника',
  DRIVER_LICENSE_FRONT: 'ВУ лицевая сторона',
  DRIVER_LICENSE_BACK: 'ВУ обратная сторона',
  VEHICLE_REGISTRATION: 'Техпаспорт',
}

const REQUIREMENTS: Record<RideDriverRecheckType, RecheckRequirement[]> = {
  SELFIE: [
    {
      type: 'SELFIE',
      label: 'Селфи',
      buttonLabel: 'Сделать селфи',
      icon: UserRound,
      captureMode: 'user',
    },
  ],
  VEHICLE_PHOTOS: [
    {
      type: 'CAR_FRONT_PHOTO',
      label: 'Фото авто спереди',
      buttonLabel: 'Сфотографировать авто спереди',
      icon: Camera,
      captureMode: 'environment',
    },
    {
      type: 'CAR_BACK_PHOTO',
      label: 'Фото авто сзади',
      buttonLabel: 'Сфотографировать авто сзади',
      icon: Camera,
      captureMode: 'environment',
    },
    {
      type: 'INTERIOR_PHOTO',
      label: 'Фото салона',
      buttonLabel: 'Сфотографировать салон',
      icon: FileImage,
      captureMode: 'environment',
    },
  ],
  DOCUMENTS: [
    {
      type: 'DRIVER_LICENSE_FRONT',
      label: 'Лицевая сторона прав',
      buttonLabel: 'Сфотографировать лицевую сторону прав',
      icon: FileText,
      captureMode: 'environment',
    },
    {
      type: 'DRIVER_LICENSE_BACK',
      label: 'Обратная сторона прав',
      buttonLabel: 'Сфотографировать обратную сторону прав',
      icon: FileText,
      captureMode: 'environment',
    },
    {
      type: 'VEHICLE_REGISTRATION',
      label: 'Техпаспорт',
      buttonLabel: 'Сфотографировать техпаспорт',
      icon: FileCheck2,
      captureMode: 'environment',
    },
  ],
  VEHICLE_AND_SELFIE: [
    {
      type: 'SELFIE',
      label: 'Селфи',
      buttonLabel: 'Сделать селфи',
      icon: UserRound,
      captureMode: 'user',
    },
    {
      type: 'CAR_FRONT_PHOTO',
      label: 'Фото авто спереди',
      buttonLabel: 'Сфотографировать авто спереди',
      icon: Camera,
      captureMode: 'environment',
    },
    {
      type: 'CAR_BACK_PHOTO',
      label: 'Фото авто сзади',
      buttonLabel: 'Сфотографировать авто сзади',
      icon: Camera,
      captureMode: 'environment',
    },
    {
      type: 'INTERIOR_PHOTO',
      label: 'Фото салона',
      buttonLabel: 'Сфотографировать салон',
      icon: FileImage,
      captureMode: 'environment',
    },
  ],
}

function formatDateTime(value?: string | null) {
  if (!value) return '—'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value

  return new Intl.DateTimeFormat('ru-RU', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function getRequirements(type: RideDriverRecheckType) {
  return REQUIREMENTS[type] ?? REQUIREMENTS.DOCUMENTS
}

function getUploadedFileMap(files: RideDriverRecheckFile[] | null | undefined) {
  return (files ?? []).reduce<Partial<Record<RideDriverRecheckFileType, RideDriverRecheckFile>>>(
    (accumulator, file) => {
      accumulator[file.type] = file
      return accumulator
    },
    {},
  )
}

function getRecheckId(recheck: RideDriverRecheck) {
  const raw = recheck.raw as Record<string, unknown> | null | undefined
  const rawData = (raw?.data as Record<string, unknown> | null | undefined) ?? undefined

  return (
    recheck.id ||
    (typeof raw?.id === 'string' && raw.id.trim() ? raw.id.trim() : '') ||
    (typeof raw?.recheckId === 'string' && raw.recheckId.trim() ? raw.recheckId.trim() : '') ||
    (typeof raw?.recheck_id === 'string' && raw.recheck_id.trim() ? raw.recheck_id.trim() : '') ||
    (typeof rawData?.id === 'string' && rawData.id.trim() ? rawData.id.trim() : '') ||
    (typeof rawData?.recheckId === 'string' && rawData.recheckId.trim() ? rawData.recheckId.trim() : '') ||
    (typeof rawData?.recheck_id === 'string' && rawData.recheck_id.trim() ? rawData.recheck_id.trim() : '') ||
    ''
  )
}

function formatUploadedLabel(file?: RideDriverRecheckFile | null) {
  if (!file) return 'Фото загружено'
  return file.fileName?.trim() || 'Фото загружено'
}

function RecheckRequirementRow({
  requirement,
  file,
  onOpenCamera,
}: {
  requirement: RecheckRequirement
  file?: RideDriverRecheckFile
  onOpenCamera: (requirement: RecheckRequirement) => void
}) {
  const Icon = requirement.icon
  const isUploaded = Boolean(file?.filePath?.trim())

  return (
    <div className="rounded-2xl border border-border bg-surface-soft p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-sm font-semibold text-ink">{requirement.label}</p>
          <p className="mt-1 text-xs text-muted">
            {isUploaded ? 'Загружено' : 'Не загружено'}
            {isUploaded ? ` • ${formatUploadedLabel(file)}` : ''}
          </p>
        </div>
        <span
          className={cn(
            'inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold',
            isUploaded ? 'bg-emerald-100 text-emerald-700' : 'bg-white text-slate-600',
          )}
        >
          <CheckCircle2 className="h-3.5 w-3.5" />
          {isUploaded ? 'Загружено' : 'Ожидается'}
        </span>
      </div>

      <button
        type="button"
        onClick={() => onOpenCamera(requirement)}
        className="mt-3 inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white"
      >
        <Icon className="h-4 w-4" />
        {requirement.buttonLabel}
      </button>
    </div>
  )
}

function RecheckFilesSummary({
  files,
}: {
  files: RideDriverRecheckFile[]
}) {
  if (files.length === 0) {
    return <p className="text-sm text-muted">Пока нет загруженных файлов.</p>
  }

  return (
    <div className="space-y-2">
      {files.map((file) => (
        <div key={`${file.type}-${file.id ?? file.filePath ?? file.fileName ?? file.uploadedAt ?? 'file'}`} className="flex items-center justify-between gap-3 rounded-2xl bg-surface-soft px-4 py-3">
          <div className="min-w-0">
            <p className="text-sm font-semibold text-ink">{FILE_LABELS[file.type] ?? file.type}</p>
            <p className="mt-1 truncate text-xs text-muted">{formatUploadedLabel(file)}</p>
          </div>
          <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
        </div>
      ))}
    </div>
  )
}

export function DriverRecheckCard({
  recheck,
  onRefresh,
  compact = false,
  onOpenDetails,
}: {
  recheck: RideDriverRecheck
  onRefresh: () => Promise<void> | void
  compact?: boolean
  onOpenDetails?: () => void
}) {
  const requirements = getRequirements(recheck.type)
  const [resolvedRecheck, setResolvedRecheck] = useState<RideDriverRecheck | null>(recheck)
  const [isResolving, setIsResolving] = useState(false)
  const isDev = import.meta.env.DEV
  const [activeRequirement, setActiveRequirement] = useState<RecheckRequirement | null>(null)
  const [error, setError] = useState<string | null>(null)
  const uploadedFiles = useMemo(
    () => getUploadedFileMap(resolvedRecheck?.files ?? recheck.files),
    [resolvedRecheck?.files, recheck.files],
  )
  const missingRequirements = requirements.filter((requirement) => !uploadedFiles[requirement.type]?.filePath?.trim())
  const allRequiredUploaded = missingRequirements.length === 0
  const resolvedId = resolvedRecheck ? getRecheckId(resolvedRecheck) : 0

  useEffect(() => {
    let alive = true

    const syncRecheck = async () => {
      if (recheck && getRecheckId(recheck)) {
        setResolvedRecheck(recheck)
        return
      }

      setIsResolving(true)
      try {
        const latest = await getActiveDriverRecheck()
        if (!alive) return
        setResolvedRecheck(latest)
      } catch {
        if (!alive) return
        setResolvedRecheck(null)
      } finally {
        if (alive) setIsResolving(false)
      }
    }

    void syncRecheck()

    return () => {
      alive = false
    }
  }, [recheck])

  const uploadCapturedFile = async (file: File) => {
    if (!activeRequirement) return

    const id = resolvedRecheck ? getRecheckId(resolvedRecheck) : 0
    if (!id) {
      setError(
        isDev
          ? 'Technical warning: active recheck id is missing after refetch.'
          : 'Не удалось определить повторную проверку. Обновите экран.',
      )
      return
    }

    setError(null)

    try {
      await uploadDriverRecheckFile(id, activeRequirement.type, file)
      await onRefresh()
    } catch (uploadError) {
      setError(uploadError instanceof Error ? uploadError.message : 'Не удалось загрузить файл.')
    }
  }

  const handleSubmit = async () => {
    const id = resolvedRecheck ? getRecheckId(resolvedRecheck) : 0
    if (!id) {
      setError(
        isDev
          ? 'Technical warning: active recheck id is missing after refetch.'
          : 'Не удалось определить повторную проверку. Обновите экран.',
      )
      return
    }

    if (!allRequiredUploaded) {
      setError(`Сначала загрузите: ${missingRequirements.map((item) => item.label).join(', ')}`)
      return
    }

    setError(null)

    try {
      await submitDriverRecheck(id)
      await onRefresh()
    } catch (submitError) {
      setError(submitError instanceof Error ? submitError.message : 'Не удалось отправить на проверку.')
    }
  }

  return (
    <>
      <PageCard
        eyebrow="Водитель"
        title={compact ? 'Повторная проверка' : recheck.status === 'PENDING_UPLOAD' ? 'Требуется повторная проверка' : 'Повторная проверка'}
        description={
          recheck.status === 'PENDING_UPLOAD'
            ? 'Загрузите нужные файлы и отправьте их на проверку модератору.'
            : recheck.status === 'PENDING_REVIEW'
              ? 'Повторная проверка отправлена. Ожидайте решения модератора.'
              : `Статус: ${RECHECK_STATUS_LABELS[recheck.status]}`
        }
        className={cn(compact ? 'border-amber-200 bg-amber-50/80' : 'border-sky-200 bg-white')}
      >
        {isResolving ? (
          <div className="rounded-2xl bg-surface-soft p-4 text-sm text-muted">
            Обновляем данные повторной проверки...
          </div>
        ) : null}

        {!resolvedId && isDev ? (
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
            Technical warning: active recheck id is missing after refetch.
          </div>
        ) : null}

        <div className="grid gap-3 sm:grid-cols-2">
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Тип</p>
            <p className="mt-2 text-sm font-semibold text-ink">{RECHECK_TYPE_LABELS[recheck.type]}</p>
          </div>
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Статус</p>
            <p className="mt-2 text-sm font-semibold text-ink">{RECHECK_STATUS_LABELS[recheck.status]}</p>
          </div>
        </div>

        {recheck.reason ? (
          <div className="flex items-start gap-3 rounded-2xl border border-amber-200 bg-amber-50 p-4 text-amber-900">
            <Clock3 className="mt-0.5 h-5 w-5 shrink-0" />
            <div className="min-w-0">
              <p className="text-sm font-semibold">Причина</p>
              <p className="mt-1 text-sm">{recheck.reason}</p>
            </div>
          </div>
        ) : null}

        {recheck.dueAt ? (
          <div className="rounded-2xl bg-surface-soft p-4">
            <p className="text-[11px] font-semibold uppercase tracking-[0.22em] text-muted">Дедлайн</p>
            <p className="mt-2 text-sm font-semibold text-ink">{formatDateTime(recheck.dueAt)}</p>
          </div>
        ) : null}

        {compact ? (
          <div className="rounded-2xl border border-amber-200 bg-white p-4 text-sm text-ink">
            <p className="font-semibold">Нужно действий: {missingRequirements.length}</p>
            <p className="mt-1 text-muted">
              {allRequiredUploaded
                ? 'Все обязательные файлы уже загружены.'
                : `Не хватает файлов: ${missingRequirements.map((item) => item.label).join(', ')}`}
            </p>
          </div>
        ) : null}

        {recheck.status === 'PENDING_UPLOAD' && !compact ? (
          <div className="space-y-3">
            <div className="rounded-2xl bg-surface-soft p-4">
              <p className="text-sm font-semibold text-ink">Обязательные файлы</p>
              <p className="mt-1 text-xs text-muted">Нажмите на нужный тип файла и сделайте фото камерой.</p>
            </div>

            <div className="space-y-3">
              {requirements.map((requirement) => (
                <RecheckRequirementRow
                  key={requirement.type}
                  requirement={requirement}
                  file={uploadedFiles[requirement.type]}
                  onOpenCamera={(nextRequirement) => {
                    setError(null)
                    setActiveRequirement(nextRequirement)
                  }}
                />
              ))}
            </div>

            <button
              type="button"
              onClick={() => {
                void handleSubmit()
              }}
              disabled={!allRequiredUploaded}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Send className="h-4 w-4" />
              Отправить на проверку
            </button>

            {!allRequiredUploaded ? (
              <p className="text-xs text-muted">
                До отправки не хватает: {missingRequirements.map((item) => item.label).join(', ')}
              </p>
            ) : null}
          </div>
        ) : null}

        {recheck.status === 'PENDING_REVIEW' ? (
          <div className="space-y-3">
            <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4 text-emerald-900">
              <p className="text-sm font-semibold">Повторная проверка отправлена. Ожидайте решения модератора.</p>
              <p className="mt-1 text-sm">Файлы переданы модератору. Мы сообщим, когда проверка будет завершена.</p>
            </div>
            <RecheckFilesSummary files={recheck.files} />
          </div>
        ) : null}

        {recheck.status !== 'PENDING_UPLOAD' && recheck.status !== 'PENDING_REVIEW' ? (
          <div className="rounded-2xl bg-surface-soft p-4 text-sm text-ink">
            {recheck.status === 'APPROVED' ? 'Проверка завершена успешно.' : `Статус: ${RECHECK_STATUS_LABELS[recheck.status]}`}
            {recheck.reviewReason ? <p className="mt-1 text-muted">{recheck.reviewReason}</p> : null}
          </div>
        ) : null}

        {error ? <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

        <div className="flex flex-col gap-2 sm:flex-row">
          {compact && onOpenDetails ? (
            <button
              type="button"
              onClick={onOpenDetails}
              className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
            >
              Открыть профиль
            </button>
          ) : null}
          <button
            type="button"
            onClick={() => {
              void onRefresh()
            }}
            className="inline-flex flex-1 items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            <RefreshCw className="h-4 w-4" />
            Обновить статус
          </button>
        </div>
      </PageCard>

      {activeRequirement ? (
        <RecheckCameraCapture
          open
          title={activeRequirement.buttonLabel}
          captureMode={activeRequirement.captureMode}
          onClose={() => setActiveRequirement(null)}
          onUsePhoto={uploadCapturedFile}
        />
      ) : null}
    </>
  )
}
