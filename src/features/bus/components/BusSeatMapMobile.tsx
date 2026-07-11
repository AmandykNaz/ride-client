import { useState } from 'react'

import { DoorOpen, UserRound } from 'lucide-react'

import type { BusSeat, BusSeatStatus, BusSeatType } from '../api/bus.types'
import { cn } from '../../../lib/cn'
import { formatKzt } from '../../../lib/format'

const seatStatusMeta: Record<
  BusSeatStatus | 'SELECTED',
  { label: string; chipClassName: string; seatClassName: string; dotClassName: string }
> = {
  AVAILABLE: {
    label: 'Свободно',
    chipClassName: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    seatClassName: 'border-emerald-300 bg-emerald-50 text-emerald-800',
    dotClassName: 'bg-emerald-500',
  },
  HELD: {
    label: 'Удержано',
    chipClassName: 'border-amber-200 bg-amber-50 text-amber-700',
    seatClassName: 'border-amber-300 bg-amber-50 text-amber-700',
    dotClassName: 'bg-amber-400',
  },
  SOLD: {
    label: 'Занято',
    chipClassName: 'border-rose-200 bg-rose-50 text-rose-500',
    seatClassName: 'border-rose-200 bg-rose-50 text-rose-400',
    dotClassName: 'bg-rose-300',
  },
  UNAVAILABLE: {
    label: 'Недоступно',
    chipClassName: 'border-slate-200 bg-slate-100 text-slate-500',
    seatClassName: 'border-slate-200 bg-slate-100 text-slate-400',
    dotClassName: 'bg-slate-300',
  },
  UNKNOWN: {
    label: 'Неизвестно',
    chipClassName: 'border-slate-200 bg-slate-50 text-slate-500',
    seatClassName: 'border-slate-200 bg-slate-50 text-slate-400',
    dotClassName: 'bg-slate-300',
  },
  SELECTED: {
    label: 'Выбрано',
    chipClassName: 'border-red-200 bg-red-50 text-red-700',
    seatClassName: 'border-red-500 bg-red-50 text-red-700',
    dotClassName: 'bg-[#F14635]',
  },
}

type BusSeatMapMobileProps = {
  seats: BusSeat[]
  selectedSeatId: string | null
  onSeatSelect: (seatId: string) => void
}

type ParsedLabel = {
  row: number
  letter: string
}

type SeatWithLayout = BusSeat & {
  resolvedRow: number
  resolvedColumn: number
  resolvedLevel: string
  parsedLabel: ParsedLabel | null
  resolvedType: BusSeatType
}

type LevelLayout = {
  key: string
  label: string
  rows: number[]
  columns: Array<{
    value: number
    kind: 'seat' | 'aisle'
  }>
  seatsByCell: Map<string, SeatWithLayout>
}

function isSeatSelectable(status: BusSeatStatus) {
  return status === 'AVAILABLE'
}

function formatSeatPriceCompact(price: number | null) {
  if (price == null) return null

  if (price >= 10000) {
    return Number.isInteger(price / 1000) ? `${price / 1000}k` : `${(price / 1000).toFixed(1)}k`
  }

  return new Intl.NumberFormat('ru-RU').format(price)
}

function parseSeatLabel(label: string) {
  const normalized = String(label ?? '').trim().toUpperCase()
  const match = normalized.match(/^(\d+)\s*([A-ZА-Я])$/)

  if (!match) {
    return null
  }

  const [, rowPart, letterPart] = match

  return {
    row: Number(rowPart),
    letter: letterPart === 'А' ? 'A' : letterPart,
  }
}

function buildLetterColumnMap(seats: BusSeat[]) {
  const letters = [...new Set(seats.map((seat) => parseSeatLabel(seat.label)?.letter).filter((value): value is string => Boolean(value)))]

  const joined = letters.join(',')

  if (joined === 'A,B,C,D') {
    return new Map([
      ['A', 1],
      ['B', 2],
      ['C', 4],
      ['D', 5],
    ])
  }

  if (joined === 'A,B,C') {
    return new Map([
      ['A', 1],
      ['B', 3],
      ['C', 4],
    ])
  }

  if (joined === 'B,C,D') {
    return new Map([
      ['B', 1],
      ['C', 3],
      ['D', 4],
    ])
  }

  if (joined === 'A,B') {
    return new Map([
      ['A', 1],
      ['B', 2],
    ])
  }

  if (joined === 'C,D') {
    return new Map([
      ['C', 4],
      ['D', 5],
    ])
  }

  return new Map(letters.map((letter, index) => [letter, index + 1]))
}

function normalizeLevel(value?: string | null) {
  const normalized = String(value ?? '').trim()

  if (!normalized) {
    return 'MAIN'
  }

  return normalized.toUpperCase()
}

function getLevelLabel(value: string) {
  if (value === 'MAIN' || value === 'LOWER') return '1 этаж'
  if (value === 'UPPER') return '2 этаж'

  return `Уровень ${value}`
}

function normalizeSeatLayouts(seats: BusSeat[]) {
  const grouped = new Map<string, BusSeat[]>()

  seats.forEach((seat) => {
    const levelKey = normalizeLevel(seat.deck ?? seat.level ?? seat.floor)
    const existing = grouped.get(levelKey) ?? []
    existing.push(seat)
    grouped.set(levelKey, existing)
  })

  const normalized: SeatWithLayout[] = []

  grouped.forEach((levelSeats, levelKey) => {
    const letterColumnMap = buildLetterColumnMap(levelSeats)

    levelSeats.forEach((seat, index) => {
      const parsedLabel = parseSeatLabel(seat.label)
      const fallbackColumn = parsedLabel ? letterColumnMap.get(parsedLabel.letter) ?? null : null
      const resolvedRow = seat.y ?? seat.row ?? parsedLabel?.row ?? index + 1
      const resolvedColumn = seat.x ?? seat.column ?? fallbackColumn ?? 1

      normalized.push({
        ...seat,
        resolvedRow,
        resolvedColumn,
        resolvedLevel: levelKey,
        parsedLabel,
        resolvedType: seat.type === 'UNKNOWN' ? (seat.label ? 'SEAT' : 'EMPTY') : seat.type,
      })
    })
  })

  return normalized
}

function buildLevelLayouts(seats: SeatWithLayout[]): LevelLayout[] {
  const grouped = new Map<string, SeatWithLayout[]>()

  seats.forEach((seat) => {
    const existing = grouped.get(seat.resolvedLevel) ?? []
    existing.push(seat)
    grouped.set(seat.resolvedLevel, existing)
  })

  return Array.from(grouped.entries())
    .map(([key, levelSeats]) => {
      const rows = [...new Set(levelSeats.map((seat) => seat.resolvedRow))].sort((left, right) => left - right)
      const usedColumns = [...new Set(levelSeats.map((seat) => seat.resolvedColumn))].sort((left, right) => left - right)
      const minColumn = usedColumns[0] ?? 1
      const maxColumn = usedColumns[usedColumns.length - 1] ?? 1
      const seatsByCell = new Map(levelSeats.map((seat) => [`${seat.resolvedRow}:${seat.resolvedColumn}`, seat]))
      const columns = Array.from({ length: maxColumn - minColumn + 1 }, (_, index) => minColumn + index).map((value) => {
        const hasLeft = usedColumns.some((column) => column < value)
        const hasRight = usedColumns.some((column) => column > value)
        const seatsInColumn = levelSeats.filter((seat) => seat.resolvedColumn === value)
        const onlyAisle =
          seatsInColumn.length > 0 && seatsInColumn.every((seat) => seat.resolvedType === 'AISLE')
        const kind: 'seat' | 'aisle' = onlyAisle || (seatsInColumn.length === 0 && hasLeft && hasRight) ? 'aisle' : 'seat'

        return { value, kind }
      })

      return {
        key,
        label: getLevelLabel(key),
        rows,
        columns,
        seatsByCell,
      }
    })
    .sort((left, right) => left.key.localeCompare(right.key))
}

function getSeatButtonTone(status: BusSeatStatus, isSelected: boolean) {
  if (isSelected) {
    return seatStatusMeta.SELECTED.seatClassName
  }

  return seatStatusMeta[status].seatClassName
}

function getSeatSizing(columnsCount: number, hasSleeper: boolean) {
  if (hasSleeper) {
    return {
      seatWidth: 58,
      seatHeight: 54,
      aisleWidth: 18,
      gapX: 4,
      gapY: 8,
    }
  }

  if (columnsCount >= 6) {
    return {
      seatWidth: 34,
      seatHeight: 40,
      aisleWidth: 16,
      gapX: 2,
      gapY: 6,
    }
  }

  if (columnsCount === 5) {
    return {
      seatWidth: 38,
      seatHeight: 44,
      aisleWidth: 18,
      gapX: 3,
      gapY: 7,
    }
  }

  return {
    seatWidth: 41,
    seatHeight: 45,
    aisleWidth: 20,
    gapX: 3,
    gapY: 8,
  }
}

function renderServiceCell(
  seat: SeatWithLayout | undefined,
  key: string,
  seatWidth: number,
  seatHeight: number,
  kind: 'seat' | 'aisle',
) {
  if (kind === 'aisle' && (!seat || seat.resolvedType === 'AISLE')) {
    return (
      <div
        key={key}
        className="mx-auto flex items-center justify-center rounded-full bg-[linear-gradient(180deg,#F8FAFC_0%,#EEF2F7_100%)]"
        style={{ width: '100%', height: `${seatHeight}px` }}
      >
        <div className="h-[70%] w-[4px] rounded-full bg-white shadow-[inset_0_1px_2px_rgba(148,163,184,0.2)]" />
      </div>
    )
  }

  if (!seat || seat.resolvedType === 'EMPTY') {
    return <div key={key} className="rounded-[12px]" style={{ width: `${seatWidth}px`, height: `${seatHeight}px` }} />
  }

  if (seat.resolvedType === 'DRIVER') {
    return (
      <div
        key={key}
        className="flex flex-col items-center justify-center rounded-[14px] border border-slate-200 bg-slate-50 text-slate-500 shadow-sm"
        style={{ width: `${seatWidth}px`, height: `${seatHeight}px` }}
      >
        <UserRound className="h-4 w-4" />
        <span className="mt-1 text-[8px] font-medium leading-none">driver</span>
      </div>
    )
  }

  if (seat.resolvedType === 'DOOR') {
    return (
      <div
        key={key}
        className="flex flex-col items-center justify-center rounded-[14px] border border-slate-200 bg-slate-50 text-slate-500 shadow-sm"
        style={{ width: `${seatWidth}px`, height: `${seatHeight}px` }}
      >
        <DoorOpen className="h-4 w-4" />
        <span className="mt-1 text-[8px] font-medium leading-none">door</span>
      </div>
    )
  }

  return <div key={key} style={{ width: `${seatWidth}px`, height: `${seatHeight}px` }} />
}

function renderSeatButton(
  seat: SeatWithLayout,
  selectedSeatId: string | null,
  onSeatSelect: (seatId: string) => void,
  seatWidth: number,
  seatHeight: number,
) {
  const isSelected = selectedSeatId === seat.id
  const isSelectable = isSeatSelectable(seat.status)
  const isSleeper = seat.resolvedType === 'BED' || seat.resolvedType === 'SLEEPER'
  const priceLabel = formatSeatPriceCompact(seat.price)

  return (
    <button
      key={seat.id}
      type="button"
      onClick={() => {
        if (isSelectable) {
          onSeatSelect(seat.id)
        }
      }}
      disabled={!isSelectable}
      aria-disabled={!isSelectable}
      className={cn(
        'flex flex-col items-center justify-center rounded-[13px] border px-1 text-center shadow-sm transition',
        getSeatButtonTone(seat.status, isSelected),
        isSelectable ? 'active:scale-[0.98]' : 'cursor-not-allowed',
        seat.status === 'SOLD' ? 'opacity-75' : '',
        isSelected ? 'ring-2 ring-red-200 ring-offset-1 ring-offset-white' : '',
      )}
      style={{
        width: `${isSleeper ? seatWidth + 18 : seatWidth}px`,
        minWidth: `${isSleeper ? seatWidth + 18 : seatWidth}px`,
        height: `${isSleeper ? seatHeight + 8 : seatHeight}px`,
      }}
    >
      <span className="max-w-full truncate text-[12px] font-bold leading-none">{seat.label}</span>
      {priceLabel ? <span className="mt-1 text-[9px] font-medium leading-none">{priceLabel}</span> : null}
      {isSleeper ? <span className="mt-1 text-[8px] font-medium leading-none">леж.</span> : null}
    </button>
  )
}

function renderLevelRows(
  layout: LevelLayout,
  selectedSeatId: string | null,
  onSeatSelect: (seatId: string) => void,
) {
  const hasSleeper = Array.from(layout.seatsByCell.values()).some(
    (seat) => seat.resolvedType === 'BED' || seat.resolvedType === 'SLEEPER',
  )
  const seatColumnsCount = layout.columns.filter((column) => column.kind === 'seat').length
  const { seatWidth, seatHeight, aisleWidth, gapX, gapY } = getSeatSizing(seatColumnsCount, hasSleeper)
  const templateColumns = layout.columns
    .map((column) => `${column.kind === 'aisle' ? aisleWidth : seatWidth}px`)
    .join(' ')

  return (
    <div className="overflow-x-auto pb-1 [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
      <div className="mx-auto w-fit space-y-2.5">
        {layout.rows.map((row) => (
          <div
            key={`${layout.key}-${row}`}
            className="grid w-fit items-center"
            style={{ gridTemplateColumns: templateColumns, columnGap: `${gapX}px`, rowGap: `${gapY}px` }}
          >
            {layout.columns.map((column) => {
              const seat = layout.seatsByCell.get(`${row}:${column.value}`)

              if (!seat || seat.resolvedType === 'EMPTY' || seat.resolvedType === 'AISLE' || seat.resolvedType === 'DOOR' || seat.resolvedType === 'DRIVER') {
                return renderServiceCell(seat, `${layout.key}-${row}-${column.value}`, seatWidth, seatHeight, column.kind)
              }

              return renderSeatButton(seat, selectedSeatId, onSeatSelect, seatWidth, seatHeight)
            })}
          </div>
        ))}
      </div>
    </div>
  )
}

export function BusSeatMapMobile({ seats, selectedSeatId, onSeatSelect }: BusSeatMapMobileProps) {
  const normalizedSeats = normalizeSeatLayouts(seats)
  const levelLayouts = buildLevelLayouts(normalizedSeats)
  const selectedSeat = normalizedSeats.find((seat) => seat.id === selectedSeatId) ?? null
  const [activeLevelKey, setActiveLevelKey] = useState<string | null>(null)
  const resolvedActiveLevelKey =
    activeLevelKey && levelLayouts.some((layout) => layout.key === activeLevelKey)
      ? activeLevelKey
      : levelLayouts[0]?.key ?? null
  const activeLayout = levelLayouts.find((layout) => layout.key === resolvedActiveLevelKey) ?? levelLayouts[0] ?? null

  return (
    <div className="space-y-4 pb-[calc(1.25rem+env(safe-area-inset-bottom))]">
      <div className="rounded-[28px] border border-slate-200 bg-white p-3 shadow-sm">
        <div className="mx-auto max-w-[252px] rounded-full border border-slate-200 bg-slate-50 px-3 py-2">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-slate-600">
              <UserRound className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.14em]">Водитель</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <DoorOpen className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">Вход</span>
            </div>
          </div>
        </div>

        <div className="space-y-4 px-1 py-4">
          {levelLayouts.length > 1 ? (
            <div className="flex flex-wrap gap-2 px-1">
              {levelLayouts.map((layout) => (
                <button
                  key={layout.key}
                  type="button"
                  onClick={() => setActiveLevelKey(layout.key)}
                  className={cn(
                    'rounded-full border px-3 py-1.5 text-[11px] font-semibold transition',
                    layout.key === resolvedActiveLevelKey
                      ? 'border-slate-900 bg-slate-900 text-white'
                      : 'border-slate-200 bg-slate-50 text-slate-600',
                  )}
                >
                  {layout.label}
                </button>
              ))}
            </div>
          ) : null}

          {activeLayout ? (
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-3 px-1">
                <p className="text-sm font-semibold text-ink">
                  {levelLayouts.length > 1 ? activeLayout.label : 'Салон'}
                </p>
                <p className="text-xs text-muted">
                  {Array.from(activeLayout.seatsByCell.values()).filter(
                    (seat) =>
                      seat.resolvedType !== 'EMPTY' &&
                      seat.resolvedType !== 'AISLE' &&
                      seat.resolvedType !== 'DOOR' &&
                      seat.resolvedType !== 'DRIVER',
                  ).length}{' '}
                  мест
                </p>
              </div>

              <div className="mx-auto max-w-[252px] rounded-[32px] border-[4px] border-slate-200 bg-[linear-gradient(180deg,#FFFFFF_0%,#F8FAFC_100%)] px-[10px] py-5 shadow-[inset_0_2px_10px_rgba(148,163,184,0.12)]">
                {renderLevelRows(activeLayout, selectedSeatId, onSeatSelect)}
              </div>
            </div>
          ) : null}
        </div>

        <div className="grid grid-cols-2 gap-2">
          {(['AVAILABLE', 'SELECTED', 'HELD', 'SOLD', 'UNAVAILABLE'] as const).map((status) => (
            <div
              key={status}
              className={cn(
                'flex items-center gap-2 rounded-2xl border px-3 py-2 text-[11px]',
                seatStatusMeta[status].chipClassName,
              )}
            >
              <span className={cn('size-2.5 rounded-full', seatStatusMeta[status].dotClassName)} />
              <span>{seatStatusMeta[status].label}</span>
            </div>
          ))}
        </div>
      </div>

      {selectedSeat ? (
        <div className="rounded-[22px] border border-red-200 bg-red-50 px-4 py-3 text-sm text-ink">
          <p className="font-semibold">Выбрано: место {selectedSeat.label}</p>
          <p className="mt-1 text-muted">
            {seatStatusMeta[selectedSeat.status].label}
            {selectedSeat.price != null ? ` · ${formatKzt(selectedSeat.price)}` : ''}
          </p>
        </div>
      ) : null}

      <button
        type="button"
        disabled
        className="w-full rounded-2xl border border-border bg-slate-100 px-4 py-3 text-sm font-semibold text-muted"
      >
        Бронирование скоро
      </button>
    </div>
  )
}
