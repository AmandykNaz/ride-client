import {
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
  type InputHTMLAttributes,
  type ReactNode,
} from 'react'
import {
  Camera,
  CheckCircle2,
  ChevronDown,
  CircleAlert,
  FileUp,
  RefreshCcw,
} from 'lucide-react'

import { cn } from '../../../lib/cn'
import { BackendAuthError } from '../../../shared/api/backend'
import { uploadDriverDocument } from '../../../features/driver/api/driver.api'
import type { DriverApplicationDocument } from '../../../types/domain'
import {
  formatFileSize,
  isDriverApplicationDocumentReady,
  optionalDocumentDefinitions,
  requiredDocumentDefinitions,
} from './driverDocumentsStep.constants'

type DriverDocumentType = DriverApplicationDocument['type']
type UploadedDriverDocument = DriverApplicationDocument & { url?: string }

type DocumentsMap = Partial<Record<DriverDocumentType, UploadedDriverDocument>>

type DocumentsState = {
  required: DocumentsMap
  optional: DocumentsMap
  uploadingType: DriverDocumentType | null
  errors: Partial<Record<DriverDocumentType, string>>
  showRequiredErrors: boolean
}

type DocumentsAction =
  | { type: 'START_UPLOAD'; documentType: DriverDocumentType }
  | { type: 'UPLOAD_SUCCESS_REQUIRED'; document: UploadedDriverDocument }
  | { type: 'UPLOAD_SUCCESS_OPTIONAL'; document: UploadedDriverDocument }
  | { type: 'UPLOAD_ERROR'; documentType: DriverDocumentType; error: string }
  | { type: 'CLEAR_ERROR'; documentType: DriverDocumentType }
  | { type: 'SHOW_REQUIRED_ERRORS' }

function isDocumentReady(document?: UploadedDriverDocument) {
  return isDriverApplicationDocumentReady(document) || Boolean(document?.url?.trim())
}

function isRequiredDocumentType(type: DriverDocumentType) {
  return requiredDocumentDefinitions.some((definition) => definition.type === type)
}

function createDocumentsState(documents: DriverApplicationDocument[]): DocumentsState {
  const required: DocumentsMap = {}
  const optional: DocumentsMap = {}

  for (const document of documents) {
    if (isRequiredDocumentType(document.type)) {
      required[document.type] = document
      continue
    }

    if (optionalDocumentDefinitions.some((definition) => definition.type === document.type)) {
      optional[document.type] = document
    }
  }

  return {
    required,
    optional,
    uploadingType: null,
    errors: {},
    showRequiredErrors: false,
  }
}

function documentsReducer(state: DocumentsState, action: DocumentsAction): DocumentsState {
  switch (action.type) {
    case 'START_UPLOAD':
      return {
        ...state,
        uploadingType: action.documentType,
        errors: {
          ...state.errors,
          [action.documentType]: undefined,
        },
      }
    case 'UPLOAD_SUCCESS_REQUIRED': {
      const nextRequired = {
        ...state.required,
        [action.document.type]: action.document,
      }
      const allRequiredReady = requiredDocumentDefinitions.every((definition) =>
        isDocumentReady(nextRequired[definition.type]),
      )

      return {
        ...state,
        required: nextRequired,
        uploadingType: null,
        errors: {
          ...state.errors,
          [action.document.type]: undefined,
        },
        showRequiredErrors: allRequiredReady ? false : state.showRequiredErrors,
      }
    }
    case 'UPLOAD_SUCCESS_OPTIONAL':
      return {
        ...state,
        optional: {
          ...state.optional,
          [action.document.type]: action.document,
        },
        uploadingType: null,
        errors: {
          ...state.errors,
          [action.document.type]: undefined,
        },
      }
    case 'UPLOAD_ERROR':
      return {
        ...state,
        uploadingType: null,
        errors: {
          ...state.errors,
          [action.documentType]: action.error,
        },
      }
    case 'CLEAR_ERROR':
      return {
        ...state,
        errors: {
          ...state.errors,
          [action.documentType]: undefined,
        },
      }
    case 'SHOW_REQUIRED_ERRORS':
      return {
        ...state,
        showRequiredErrors: true,
      }
    default:
      return state
  }
}

function DocumentPickerButton({
  label,
  icon,
  accept,
  capture,
  disabled,
  onPick,
}: {
  label: string
  icon: ReactNode
  accept: string
  capture?: InputHTMLAttributes<HTMLInputElement>['capture']
  disabled?: boolean
  onPick: (file: File) => void
}) {
  const inputRef = useRef<HTMLInputElement | null>(null)

  return (
    <>
      <button
        type="button"
        onClick={() => inputRef.current?.click()}
        disabled={disabled}
        className={cn(
          'flex w-full cursor-pointer items-center justify-center gap-2 rounded-xl border border-border bg-white px-3 py-2.5 text-xs font-semibold text-ink transition hover:bg-slate-50',
          disabled && 'cursor-not-allowed opacity-60',
        )}
      >
        {icon}
        <span className="truncate">{label}</span>
      </button>
      <input
        ref={inputRef}
        type="file"
        accept={accept}
        capture={capture}
        disabled={disabled}
        onChange={(event) => {
          const file = event.currentTarget.files?.[0]
          event.currentTarget.value = ''
          if (!file) return
          onPick(file)
        }}
        className="sr-only"
      />
    </>
  )
}

function DocumentCard({
  definition,
  document,
  error,
  isUploading,
  onPick,
}: {
  definition: { type: DriverDocumentType; label: string; required?: boolean }
  document?: UploadedDriverDocument
  error?: string
  isUploading: boolean
  onPick: (documentType: DriverDocumentType, file: File) => void
}) {
  const isReady = isDocumentReady(document)
  const toneClass = isReady
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : error
      ? 'border-rose-200 bg-rose-50 text-rose-900'
      : 'border-border bg-surface-soft text-ink'

  const pickerDisabled = isUploading

  return (
    <div className={cn('flex w-full flex-col rounded-2xl border p-3 transition', toneClass)}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-inherit">{definition.label}</p>
        </div>

        <div className="flex shrink-0 items-center gap-2">
          <p className="text-xs font-medium text-slate-600">
            {isUploading ? 'Загружается' : isReady ? 'Загружено' : 'Не загружено'}
          </p>
          {isReady ? (
            <CheckCircle2 className="h-5 w-5 text-emerald-600" />
          ) : isUploading ? (
            <RefreshCcw className="h-5 w-5 animate-spin text-accent" />
          ) : error ? (
            <CircleAlert className="h-5 w-5 text-rose-600" />
          ) : (
            <FileUp className="h-5 w-5 text-muted" />
          )}
        </div>
      </div>

      {isReady ? (
        <div className="mt-2 rounded-2xl bg-white/80 px-3 py-2 text-xs text-muted">
          <p className="truncate font-medium text-ink" title={document?.fileName ?? ''}>
            {document?.fileName?.trim() || 'Файл без имени'}
          </p>
          <p className="mt-1 truncate" title={`${document?.mimeType ?? '—'} • ${formatFileSize(document?.sizeBytes)}`}>
            {document?.mimeType ?? '—'} • {formatFileSize(document?.sizeBytes)}
          </p>
        </div>
      ) : (
        <p className="mt-2 text-xs leading-5 text-muted">
          {definition.required
            ? 'Обязательный документ для проверки заявки.'
            : 'Дополнительное фото можно добавить позже.'}
        </p>
      )}

      {error ? <p className="mt-2 text-xs font-medium text-rose-700">{error}</p> : null}

      <div className="mt-3 grid grid-cols-2 gap-2">
        {isReady ? (
          <>
            <DocumentPickerButton
              label={isUploading ? 'Загрузка...' : 'Переснять'}
              icon={<Camera className="h-4 w-4 shrink-0" />}
              accept="image/*"
              capture="environment"
              disabled={pickerDisabled}
              onPick={(file) => onPick(definition.type, file)}
            />
            <DocumentPickerButton
              label={isUploading ? 'Загрузка...' : 'Заменить'}
              icon={<RefreshCcw className="h-4 w-4 shrink-0" />}
              accept="image/*,application/pdf"
              disabled={pickerDisabled}
              onPick={(file) => onPick(definition.type, file)}
            />
          </>
        ) : (
          <>
            <DocumentPickerButton
              label="Сфоткать"
              icon={<Camera className="h-4 w-4 shrink-0" />}
              accept="image/*"
              capture="environment"
              disabled={pickerDisabled}
              onPick={(file) => onPick(definition.type, file)}
            />
            <DocumentPickerButton
              label="Выбрать файл"
              icon={<FileUp className="h-4 w-4 shrink-0" />}
              accept="image/*,application/pdf"
              disabled={pickerDisabled}
              onPick={(file) => onPick(definition.type, file)}
            />
          </>
        )}
      </div>
    </div>
  )
}

export type DriverDocumentsStepProps = {
  documents: DriverApplicationDocument[]
  onDocumentsChange: (documents: DriverApplicationDocument[]) => void
  onBack: () => void
  onContinue: (documents: DriverApplicationDocument[]) => void
  onAuthRequired: () => void
}

export function DriverDocumentsStep({
  documents,
  onDocumentsChange,
  onBack,
  onContinue,
  onAuthRequired,
}: DriverDocumentsStepProps) {
  const [state, dispatch] = useReducer(documentsReducer, documents, createDocumentsState)
  const [isOptionalOpen, setIsOptionalOpen] = useState(() =>
    optionalDocumentDefinitions.some((definition) =>
      documents.some((document) => document.type === definition.type && isDocumentReady(document as UploadedDriverDocument)),
    ),
  )
  const lastEmittedSignatureRef = useRef('')

  const otherDocuments = useMemo(
    () =>
      documents.filter(
        (document) =>
          !requiredDocumentDefinitions.some((definition) => definition.type === document.type) &&
          !optionalDocumentDefinitions.some((definition) => definition.type === document.type),
      ),
    [documents],
  )

  const requiredDocuments = useMemo(
    () =>
      requiredDocumentDefinitions.reduce<Partial<Record<DriverDocumentType, UploadedDriverDocument>>>(
        (accumulator, definition) => {
          const document = state.required[definition.type]
          if (document) {
            accumulator[definition.type] = document
          }
          return accumulator
        },
        {},
      ),
    [state.required],
  )

  const optionalDocuments = useMemo(
    () =>
      optionalDocumentDefinitions.reduce<Partial<Record<DriverDocumentType, UploadedDriverDocument>>>(
        (accumulator, definition) => {
          const document = state.optional[definition.type]
          if (document) {
            accumulator[definition.type] = document
          }
          return accumulator
        },
        {},
      ),
    [state.optional],
  )

  const allRequiredDocumentsReady = requiredDocumentDefinitions.every((definition) =>
    Boolean(requiredDocuments[definition.type]?.filePath.trim() || requiredDocuments[definition.type]?.url?.trim()),
  )

  const missingRequiredDocumentLabels = requiredDocumentDefinitions
    .filter((definition) => !isDocumentReady(requiredDocuments[definition.type]))
    .map((definition) => definition.label)

  const combinedDocuments = useMemo(() => {
    const requiredSnapshot = requiredDocumentDefinitions
      .map((definition) => requiredDocuments[definition.type])
      .filter((document): document is UploadedDriverDocument => Boolean(document))
    const optionalSnapshot = optionalDocumentDefinitions
      .map((definition) => optionalDocuments[definition.type])
      .filter((document): document is UploadedDriverDocument => Boolean(document))

    return [...requiredSnapshot, ...optionalSnapshot, ...otherDocuments]
  }, [optionalDocuments, otherDocuments, requiredDocuments])

  const combinedSignature = useMemo(
    () =>
      combinedDocuments
        .map((document) =>
          [
            document.type,
            document.filePath,
            document.fileName ?? '',
            document.mimeType ?? '',
            document.sizeBytes ?? '',
            document.id ?? '',
          ].join(':'),
        )
        .join('|'),
    [combinedDocuments],
  )

  useEffect(() => {
    if (lastEmittedSignatureRef.current === combinedSignature) return
    lastEmittedSignatureRef.current = combinedSignature
    onDocumentsChange(combinedDocuments)
  }, [combinedDocuments, combinedSignature, onDocumentsChange])

  const emitDocumentsChange = () => {
    lastEmittedSignatureRef.current = combinedSignature
    onDocumentsChange(combinedDocuments)
  }

  const handleUpload = async (documentType: DriverDocumentType, file: File) => {
    dispatch({ type: 'START_UPLOAD', documentType })

    try {
      const uploaded = (await uploadDriverDocument(documentType, file)) as UploadedDriverDocument
      if (isRequiredDocumentType(documentType)) {
        dispatch({ type: 'UPLOAD_SUCCESS_REQUIRED', document: uploaded })
      } else {
        dispatch({ type: 'UPLOAD_SUCCESS_OPTIONAL', document: uploaded })
      }
    } catch (error) {
      if (error instanceof BackendAuthError) {
        dispatch({
          type: 'UPLOAD_ERROR',
          documentType,
          error: 'Сначала войдите в аккаунт, затем загрузите документы.',
        })
        onAuthRequired()
        return
      }

      dispatch({
        type: 'UPLOAD_ERROR',
        documentType,
        error: error instanceof Error ? error.message : 'Не удалось загрузить документ.',
      })
    }
  }

  const requiredStatusTone = allRequiredDocumentsReady
    ? 'border-emerald-200 bg-emerald-50 text-emerald-900'
    : state.showRequiredErrors
      ? 'border-amber-200 bg-amber-50 text-amber-900'
      : 'border-slate-200 bg-slate-50 text-slate-700'

  return (
    <div className="space-y-4">
      <section className="space-y-3">
        <div>
          <p className="text-sm font-semibold text-ink">Обязательные документы</p>
          <p className="mt-1 text-xs text-muted">Без них заявку нельзя отправить на проверку.</p>
        </div>

        <div className="space-y-2">
          {requiredDocumentDefinitions.map((definition) => (
            <DocumentCard
              key={definition.type}
              definition={definition}
              document={requiredDocuments[definition.type]}
              error={state.errors[definition.type]}
              isUploading={state.uploadingType === definition.type}
              onPick={handleUpload}
            />
          ))}
        </div>
      </section>

      <section className="rounded-3xl border border-border bg-surface-soft p-3">
        <button
          type="button"
          onClick={() => setIsOptionalOpen((current) => !current)}
          className="flex w-full items-center justify-between gap-3 text-left text-sm font-semibold text-ink"
        >
          <span>
            Дополнительные фото
            <span className="ml-2 text-xs font-medium text-muted">необязательно</span>
          </span>
          <ChevronDown
            className={cn(
              'h-4 w-4 shrink-0 transition-transform',
              isOptionalOpen ? 'rotate-180' : 'rotate-0',
            )}
          />
        </button>

        {isOptionalOpen ? (
          <>
            <p className="mt-2 text-xs leading-5 text-muted">
              Можно добавить сейчас или позже, если хотите показать автомобиль подробнее.
            </p>

            <div className="mt-3 space-y-2">
              {optionalDocumentDefinitions.map((definition) => (
                <DocumentCard
                  key={definition.type}
                  definition={definition}
                  document={optionalDocuments[definition.type]}
                  error={state.errors[definition.type]}
                  isUploading={state.uploadingType === definition.type}
                  onPick={handleUpload}
                />
              ))}
            </div>
          </>
        ) : null}
      </section>

      <div className={cn('rounded-2xl border px-4 py-3 text-sm', requiredStatusTone)}>
        <p className="font-semibold">
          {allRequiredDocumentsReady ? 'Документы загружены' : 'Требуются обязательные документы'}
        </p>
        <p className="mt-1">
          {allRequiredDocumentsReady
            ? 'Можно перейти к проверке и отправке.'
            : state.showRequiredErrors
              ? 'Загрузите обязательные документы: ВУ лицевая, ВУ обратная, техпаспорт и фото авто спереди.'
              : 'Обязательные документы можно загрузить по одному или сразу все четыре.'}
        </p>

        {!allRequiredDocumentsReady && state.showRequiredErrors && missingRequiredDocumentLabels.length > 0 ? (
          <p className="mt-1 text-sm font-medium">Не хватает: {missingRequiredDocumentLabels.join(', ')}.</p>
        ) : null}
      </div>

      <div className="rounded-3xl border border-border bg-white p-2 shadow-sm">
        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={onBack}
            className="rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
          >
            <span className="inline-flex items-center gap-2">
              <span aria-hidden="true">←</span>
              Назад
            </span>
          </button>

          <button
            type="button"
            onClick={() => {
              if (!allRequiredDocumentsReady) {
                dispatch({ type: 'SHOW_REQUIRED_ERRORS' })
                return
              }

              emitDocumentsChange()
              onContinue(combinedDocuments)
            }}
            disabled={state.uploadingType !== null}
            className="rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white shadow-lg shadow-accent/20 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <span className="inline-flex items-center gap-2">
              Продолжить
              <span aria-hidden="true">→</span>
            </span>
          </button>
        </div>
      </div>

      <div aria-hidden="true" className="h-24" />
    </div>
  )
}

export default DriverDocumentsStep
