import type { ReactNode } from 'react'

import { BusFront, DoorOpen, UserRound } from 'lucide-react'

import type { BusSeat, BusSeatStatus } from '../api/bus.types'
import { cn } from '../../../lib/cn'
import { formatKzt } from '../../../lib/format'

const seatStatusMeta: Record<
  BusSeatStatus | 'SELECTED',
  { label: string; chipClassName: string; seatClassName: string; dotClassName: string }
> = {
  AVAILABLE: {
    label: 'Свободно',
    chipClassName: 'border-emerald-200 bg-white text-emerald-700',
    seatClassName: 'border-emerald-300 bg-white text-slate-900',
    dotClassName: 'bg-emerald-500',
  },
  HELD: {
    label: 'Удержано',
    chipClassName: 'border-amber-200 bg-amber-50 text-amber-700',
    seatClassName: 'border-amber-200 bg-amber-50 text-amber-700',
    dotClassName: 'bg-amber-400',
  },
  SOLD: {
    label: 'Занято',
    chipClassName: 'border-slate-200 bg-slate-50 text-slate-500',
    seatClassName: 'border-slate-200 bg-slate-100 text-slate-400',
    dotClassName: 'bg-slate-400',
  },
  UNAVAILABLE: {
    label: 'Недоступно',
    chipClassName: 'border-slate-200 bg-slate-50 text-slate-500',
    seatClassName: 'border-slate-200 bg-slate-100 text-slate-400',
    dotClassName: 'bg-slate-300',
  },
  UNKNOWN: {
    label: 'Неизвестно',
    chipClassName: 'border-slate-200 bg-slate-50 text-slate-500',
    seatClassName: 'border-slate-200 bg-white text-slate-500',
    dotClassName: 'bg-slate-300',
  },
  SELECTED: {
    label: 'Выбрано',
    chipClassName: 'border-[#F14635] bg-[#FFF5F3] text-[#B42318]',
    seatClassName: 'border-[#F14635] bg-[#FFF5F3] text-[#991B1B]',
    dotClassName: 'bg-[#F14635]',
  },
}

type BusSeatMapMobileProps = {
  seats: BusSeat[]
  selectedSeatId: string | null
  onSeatSelect: (seatId: string) => void
}

type SeatWithPosition = BusSeat & {
  resolvedRow: number
  resolvedColumn: number
}

function isSeatSelectable(status: BusSeatStatus) {
  return status === 'AVAILABLE'
}

function normalizeSeatPositions(seats: BusSeat[]) {
  return seats.map<SeatWithPosition>((seat, index) => ({
    ...seat,
    resolvedRow: seat.row ?? Math.floor(index / 4) + 1,
    resolvedColumn: seat.column ?? (index % 4) + 1,
  }))
}

function buildRowTemplate(columns: number) {
  const leftColumns = Math.min(2, Math.max(1, Math.floor(columns / 2)))
  const rightColumns = Math.max(1, columns - leftColumns)

  return {
    leftColumns,
    templateColumns: `${'minmax(44px, 48px) '.repeat(leftColumns)} minmax(14px, 18px) ${'minmax(44px, 48px) '.repeat(rightColumns)}`.trim(),
  }
}

function getSeatButtonTone(status: BusSeatStatus, isSelected: boolean) {
  if (isSelected) {
    return seatStatusMeta.SELECTED.seatClassName
  }

  return seatStatusMeta[status].seatClassName
}

function renderSeatButton(
  seat: SeatWithPosition,
  selectedSeatId: string | null,
  onSeatSelect: (seatId: string) => void,
) {
  const isSelected = selectedSeatId === seat.id
  const isSelectable = isSeatSelectable(seat.status)

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
        'flex h-[52px] w-full min-w-0 flex-col items-center justify-center rounded-[14px] border-2 px-1 text-center shadow-sm transition sm:h-[54px]',
        getSeatButtonTone(seat.status, isSelected),
        isSelectable ? 'active:scale-[0.98]' : 'cursor-not-allowed opacity-60',
        isSelected ? 'ring-2 ring-[#F14635] ring-offset-2 ring-offset-white' : '',
      )}
    >
      <span className="text-[13px] font-black leading-none">{seat.label}</span>
      {seat.price != null ? <span className="mt-1 text-[9px] font-semibold leading-none">{formatKzt(seat.price)}</span> : null}
    </button>
  )
}

function renderRowCells(
  rowSeats: SeatWithPosition[],
  columns: number,
  leftColumns: number,
  selectedSeatId: string | null,
  onSeatSelect: (seatId: string) => void,
) {
  const seatsByColumn = new Map(rowSeats.map((seat) => [seat.resolvedColumn, seat]))
  const cells: ReactNode[] = []

  for (let column = 1; column <= columns; column += 1) {
    if (column === leftColumns + 1) {
      cells.push(
        <div
          key={`aisle-${rowSeats[0]?.floor ?? 'main'}-${rowSeats[0]?.resolvedRow ?? 0}`}
          className="mx-auto flex h-[52px] w-4 items-center justify-center rounded-full bg-[#EEF2F7] sm:h-[54px]"
        >
          <div className="h-7 w-[3px] rounded-full bg-white" />
        </div>,
      )
    }

    const seat = seatsByColumn.get(column)

    if (!seat) {
      cells.push(<div key={`empty-${rowSeats[0]?.resolvedRow ?? 0}-${column}`} className="h-[52px] sm:h-[54px]" />)
      continue
    }

    cells.push(renderSeatButton(seat, selectedSeatId, onSeatSelect))
  }

  return cells
}

export function BusSeatMapMobile({ seats, selectedSeatId, onSeatSelect }: BusSeatMapMobileProps) {
  const normalizedSeats = normalizeSeatPositions(seats)
  const maxColumn = normalizedSeats.reduce((current, seat) => Math.max(current, seat.resolvedColumn), 4)
  const rows = [...new Set(normalizedSeats.map((seat) => seat.resolvedRow))].sort((left, right) => left - right)
  const { leftColumns, templateColumns } = buildRowTemplate(maxColumn)
  const selectedSeat = normalizedSeats.find((seat) => seat.id === selectedSeatId) ?? null

  return (
    <div className="space-y-4">
      <div className="overflow-hidden rounded-[26px] border border-[#E5E7EB] bg-white shadow-[0_6px_18px_rgba(15,23,42,0.04)]">
        <div className="border-b border-[#EEF2F7] bg-[#F8FAFC] px-4 py-3">
          <div className="flex items-center justify-between gap-3 rounded-[18px] border border-[#E5E7EB] bg-white px-3 py-2">
            <div className="flex items-center gap-2 text-slate-600">
              <UserRound className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Водитель</span>
            </div>
            <div className="flex items-center gap-2 text-slate-500">
              <DoorOpen className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.12em]">Вход</span>
            </div>
          </div>
        </div>

        <div className="bg-[linear-gradient(180deg,#F8FAFC_0%,#FFFFFF_18%)] px-3 py-4">
          <div className="mx-auto max-w-[318px] rounded-[28px] border border-[#E5E7EB] bg-white px-3 py-4 shadow-inner">
            <div className="mb-3 flex items-center justify-center gap-2 text-slate-500">
              <BusFront className="h-4 w-4" />
              <span className="text-[11px] font-semibold uppercase tracking-[0.18em]">Схема салона</span>
            </div>

            <div className="space-y-2">
              {rows.map((row) => {
                const rowSeats = normalizedSeats.filter((seat) => seat.resolvedRow === row)

                return (
                  <div
                    key={row}
                    className="mx-auto grid justify-center gap-2"
                    style={{ gridTemplateColumns: templateColumns }}
                  >
                    {renderRowCells(rowSeats, maxColumn, leftColumns, selectedSeatId, onSeatSelect)}
                  </div>
                )
              })}
            </div>
          </div>
        </div>
      </div>

      <div className="flex flex-wrap gap-2">
        {(['AVAILABLE', 'HELD', 'SOLD', 'UNAVAILABLE', 'SELECTED'] as const).map((status) => (
          <div
            key={status}
            className={cn(
              'flex items-center gap-2 rounded-2xl border px-3 py-2 text-xs',
              seatStatusMeta[status].chipClassName,
            )}
          >
            <span className={cn('size-2.5 rounded-full', seatStatusMeta[status].dotClassName)} />
            <span>{seatStatusMeta[status].label}</span>
          </div>
        ))}
      </div>

      {selectedSeat ? (
        <div className="rounded-[22px] border border-[#F14635]/20 bg-[#FFF5F3] px-4 py-3 text-sm text-ink">
          <p className="font-semibold">Выбрано для просмотра: место {selectedSeat.label}</p>
          <p className="mt-1 text-muted">
            {seatStatusMeta[selectedSeat.status].label}
            {selectedSeat.price != null ? ` · ${formatKzt(selectedSeat.price)}` : ''}
          </p>
        </div>
      ) : (
        <div className="rounded-[22px] border border-dashed border-border bg-white px-4 py-3 text-sm text-muted">
          Нажмите на свободное место, чтобы посмотреть его состояние и цену.
        </div>
      )}
    </div>
  )
}
