import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Camera, CameraOff, Check, RefreshCcw, X } from 'lucide-react'

type RecheckCameraCaptureProps = {
  open: boolean
  title: string
  captureMode: 'user' | 'environment'
  onClose: () => void
  onUsePhoto: (file: File) => Promise<void> | void
}

function blobToFile(blob: Blob, fileName: string) {
  return new File([blob], fileName, {
    type: blob.type || 'image/jpeg',
    lastModified: Date.now(),
  })
}

export function RecheckCameraCapture({
  open,
  title,
  captureMode,
  onClose,
  onUsePhoto,
}: RecheckCameraCaptureProps) {
  const videoRef = useRef<HTMLVideoElement | null>(null)
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const fileInputRef = useRef<HTMLInputElement | null>(null)
  const requestIdRef = useRef(0)
  const [availableCameras, setAvailableCameras] = useState<MediaDeviceInfo[]>([])
  const [activeDeviceId, setActiveDeviceId] = useState<string | null>(null)
  const [isStarting, setIsStarting] = useState(false)
  const [cameraError, setCameraError] = useState<string | null>(null)
  const [capturedPreview, setCapturedPreview] = useState<string | null>(null)
  const [capturedFile, setCapturedFile] = useState<File | null>(null)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [uploadError, setUploadError] = useState<string | null>(null)

  const facingMode = useMemo(
    () => (captureMode === 'user' ? { facingMode: 'user' as const } : { facingMode: { ideal: 'environment' } as const }),
    [captureMode],
  )

  const stopStream = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
  }, [])

  const resetCapture = useCallback(() => {
    setCapturedPreview(null)
    setCapturedFile(null)
  }, [])

  const startCamera = useCallback(
    async (deviceId?: string | null) => {
      const requestId = ++requestIdRef.current
      stopStream()
      resetCapture()
      setCameraError(null)

      if (!navigator.mediaDevices?.getUserMedia) {
        setCameraError('Камера недоступна. Можно выбрать файл вручную.')
        return
      }

      setIsStarting(true)

      try {
        const constraints: MediaStreamConstraints = deviceId
          ? { video: { deviceId: { exact: deviceId } }, audio: false }
          : { video: facingMode, audio: false }
        const stream = await navigator.mediaDevices.getUserMedia(constraints)
        if (requestId !== requestIdRef.current) {
          stream.getTracks().forEach((track) => track.stop())
          return
        }

        streamRef.current = stream

        if (videoRef.current) {
          videoRef.current.srcObject = stream
          await videoRef.current.play().catch(() => undefined)
        }

        const devices = await navigator.mediaDevices.enumerateDevices()
        if (requestId !== requestIdRef.current) {
          return
        }
        const cameras = devices.filter((device) => device.kind === 'videoinput')
        setAvailableCameras(cameras)

        const currentDeviceId =
          stream.getVideoTracks()[0]?.getSettings().deviceId ?? deviceId ?? cameras[0]?.deviceId ?? null
        setActiveDeviceId(currentDeviceId)
      } catch (error) {
        if (requestId !== requestIdRef.current) {
          return
        }
        setAvailableCameras([])
        setActiveDeviceId(null)
        setCameraError(
          error instanceof DOMException && error.name === 'NotAllowedError'
            ? 'Нет доступа к камере. Можно выбрать файл вручную.'
            : 'Камера недоступна. Можно выбрать файл вручную.',
        )
      } finally {
        if (requestId === requestIdRef.current) {
          setIsStarting(false)
        }
      }
    },
    [facingMode, resetCapture, stopStream],
  )

  useEffect(() => {
    if (!open) return

    const timer = window.setTimeout(() => {
      void startCamera()
    }, 0)

    return () => {
      requestIdRef.current += 1
      window.clearTimeout(timer)
      stopStream()
    }
  }, [open, startCamera, stopStream])

  const captureFrame = async () => {
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return

    const width = video.videoWidth
    const height = video.videoHeight
    if (!width || !height) {
      setCameraError('Не удалось получить кадр с камеры.')
      return
    }

    canvas.width = width
    canvas.height = height

    const context = canvas.getContext('2d')
    if (!context) {
      setCameraError('Не удалось подготовить фото.')
      return
    }

    context.drawImage(video, 0, 0, width, height)
    const blob = await new Promise<Blob | null>((resolve) => {
      canvas.toBlob((result) => resolve(result), 'image/jpeg', 0.92)
    })

    if (!blob) {
      setCameraError('Не удалось сохранить фото.')
      return
    }

    resetCapture()
    const file = blobToFile(blob, `recheck-${captureMode}-${Date.now()}.jpg`)
    setCapturedPreview(canvas.toDataURL('image/jpeg', 0.92))
    setCapturedFile(file)
  }

  const handleUseCapturedPhoto = async () => {
    if (!capturedFile) return

    setIsSubmitting(true)
    setUploadError(null)
    try {
      await onUsePhoto(capturedFile)
      onClose()
      stopStream()
    } catch (error) {
      setUploadError(error instanceof Error ? error.message : 'Не удалось загрузить фото.')
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleSwitchCamera = async () => {
    if (availableCameras.length < 2 || isStarting) return

    const currentDeviceId = activeDeviceId ?? streamRef.current?.getVideoTracks()[0]?.getSettings().deviceId ?? null
    const currentIndex = availableCameras.findIndex((device) => device.deviceId === currentDeviceId)
    const nextCamera = availableCameras[(currentIndex + 1) % availableCameras.length] ?? availableCameras[0]

    if (!nextCamera) return

    await startCamera(nextCamera.deviceId)
  }

  if (!open) return null

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 px-3 py-3 backdrop-blur-sm">
      <button
        type="button"
        aria-label={`Закрыть ${title}`}
        className="absolute inset-0"
        onClick={() => {
          stopStream()
          onClose()
        }}
      />

      <div className="relative z-10 flex w-full max-w-[520px] flex-col overflow-hidden rounded-[28px] border border-border bg-white shadow-2xl">
        <div className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.26em] text-muted">
              AmanJol Ride
            </p>
            <h3 className="mt-1 text-lg font-semibold tracking-[-0.03em] text-ink">{title}</h3>
          </div>
          <button
            type="button"
            onClick={() => {
              stopStream()
              onClose()
            }}
            className="inline-flex items-center gap-2 rounded-2xl border border-border bg-white px-3 py-2 text-sm font-semibold text-ink"
          >
            <X className="h-4 w-4" />
            Закрыть
          </button>
        </div>

        <div className="space-y-4 p-4">
          {cameraError ? (
            <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
              <p className="font-semibold">Камера недоступна</p>
              <p className="mt-1">{cameraError}</p>
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="mt-3 inline-flex items-center gap-2 rounded-2xl bg-accent px-4 py-2.5 text-sm font-semibold text-white"
              >
                <CameraOff className="h-4 w-4" />
                Выбрать файл вручную
              </button>
            </div>
          ) : null}

          {uploadError ? (
            <div className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">{uploadError}</div>
          ) : null}

          <div className="overflow-hidden rounded-[24px] bg-slate-950">
            {capturedPreview ? (
              <img
                src={capturedPreview}
                alt="Предпросмотр фото"
                className="aspect-[4/3] w-full object-cover"
              />
            ) : (
              <video
                ref={videoRef}
                className="aspect-[4/3] w-full object-cover"
                playsInline
                muted
                autoPlay
              />
            )}
          </div>

          <canvas ref={canvasRef} className="hidden" />

          {isStarting ? (
            <div className="rounded-2xl bg-surface-soft p-4 text-sm text-muted">
              Запускаем камеру...
            </div>
          ) : null}

          <div className={capturedPreview ? 'grid gap-2 sm:grid-cols-2' : 'grid gap-2 sm:grid-cols-3'}>
            {!capturedPreview ? (
              <button
                type="button"
                onClick={() => {
                  void captureFrame()
                }}
                disabled={Boolean(cameraError) || isStarting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Camera className="h-4 w-4" />
                Сделать фото
              </button>
            ) : (
              <button
                type="button"
                onClick={resetCapture}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink"
              >
                <RefreshCcw className="h-4 w-4" />
                Переснять
              </button>
            )}

            {!capturedPreview && availableCameras.length > 1 ? (
              <button
                type="button"
                onClick={() => {
                  void handleSwitchCamera()
                }}
                disabled={isStarting}
                className="inline-flex items-center justify-center gap-2 rounded-2xl border border-border bg-white px-4 py-3 text-sm font-semibold text-ink disabled:cursor-not-allowed disabled:opacity-60"
              >
                <Camera className="h-4 w-4" />
                Сменить камеру
              </button>
            ) : null}
          </div>

          {capturedPreview ? (
            <button
              type="button"
              onClick={() => {
                void handleUseCapturedPhoto()
              }}
              disabled={isSubmitting}
              className="inline-flex w-full items-center justify-center gap-2 rounded-2xl bg-accent px-4 py-3 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-60"
            >
              <Check className="h-4 w-4" />
              {isSubmitting ? 'Загрузка...' : 'Использовать фото'}
            </button>
          ) : null}

          <p className="text-xs text-muted">
            Для работы камеры на продакшене нужен HTTPS. На localhost доступ обычно работает без ограничений.
          </p>
        </div>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          capture={captureMode}
          className="sr-only"
          onChange={(event) => {
            const file = event.currentTarget.files?.[0]
            event.currentTarget.value = ''
            if (!file) return

            setUploadError(null)
            void Promise.resolve(onUsePhoto(file))
              .then(() => {
                stopStream()
                onClose()
              })
              .catch((error) => {
                setUploadError(error instanceof Error ? error.message : 'Не удалось загрузить фото.')
              })
          }}
        />
      </div>
    </div>
  )
}
