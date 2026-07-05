import { cn } from '../../lib/cn'

function getInitials(name?: string | null) {
  const normalized = String(name ?? '').trim()
  if (!normalized) return 'В'

  const parts = normalized.split(/\s+/).filter(Boolean)
  const initials = parts.slice(0, 2).map((part) => part.charAt(0).toUpperCase()).join('')

  return initials || normalized.charAt(0).toUpperCase() || 'В'
}

export function DriverAvatar({
  name,
  avatarUrl,
  className,
}: {
  name?: string | null
  avatarUrl?: string | null
  className?: string
}) {
  const initials = getInitials(name)

  if (avatarUrl) {
    return (
      <img
        src={avatarUrl}
        alt={name ? `Фото водителя ${name}` : 'Фото водителя'}
        className={cn('h-12 w-12 rounded-2xl object-cover', className)}
      />
    )
  }

  return (
    <div
      className={cn(
        'grid h-12 w-12 place-items-center rounded-2xl bg-accent/10 text-sm font-semibold text-accent',
        className,
      )}
      aria-hidden="true"
    >
      {initials}
    </div>
  )
}
