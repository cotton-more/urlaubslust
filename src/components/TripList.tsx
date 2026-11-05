import type { Day } from '../domain/calendar'
import type { Trip } from '../domain/plan'
import { dayLabel, days, rangeLabel } from '../format'

interface TripsProps {
  trips: readonly Trip[]
  onRemove: (trip: Trip) => void
}

export function TripList({ trips, onRemove }: TripsProps) {
  if (trips.length === 0)
    return (
      <p className="rounded-3xl border border-dashed border-stone-300 px-5 py-6 text-center text-sm text-stone-500">
        Кликни по рабочему дню — или протяни мышкой по нескольким. Shift + клик выделяет диапазон.
      </p>
    )
  return (
    <ul className="grid gap-2">
      {trips.map((trip) => (
        <li
          key={trip.start}
          className="group flex items-center gap-3 rounded-2xl border border-white bg-white/70 px-4 py-3 shadow-sm shadow-stone-900/5 transition hover:border-blush-200"
        >
          <div className="h-9 w-1 rounded-full bg-linear-to-b from-blush-500 to-peach-500" />
          <div className="min-w-0 flex-1">
            <div className="truncate text-sm font-semibold">{rangeLabel(trip.start, trip.end)}</div>
            <div className="text-xs text-stone-500">
              {days(trip.cost)} отпуска → <span className="font-medium text-blush-600">{days(trip.length)} свободы</span>
            </div>
          </div>
          <button
            type="button"
            onClick={() => onRemove(trip)}
            aria-label="Удалить"
            className="rounded-full p-1.5 text-stone-300 opacity-0 transition group-hover:opacity-100 hover:bg-stone-100 hover:text-stone-700 focus-visible:opacity-100"
          >
            ✕
          </button>
        </li>
      ))}
    </ul>
  )
}

interface TipsProps {
  tips: readonly { day: Day; gain: number; reason: string }[]
  onTake: (day: Day) => void
}

export function BridgeTips({ tips, onTake }: TipsProps) {
  if (tips.length === 0) return null
  return (
    <ul className="grid gap-2">
      {tips.map(({ day, gain, reason }) => (
        <li key={day.date} className="flex items-center gap-3 rounded-2xl bg-butter-100 px-4 py-2.5 ring-1 ring-inset ring-butter-300/40">
          <span className="size-1.5 shrink-0 rounded-full bg-butter-500 shadow-[0_0_8px] shadow-butter-500/50" />
          <div className="min-w-0 flex-1 text-xs">
            <div className="font-semibold text-butter-800">{dayLabel(day.date)}</div>
            <div className="truncate text-stone-500">
              {reason} · 1 день → {days(gain)}
            </div>
          </div>
          <button
            type="button"
            onClick={() => onTake(day)}
            className="rounded-full bg-butter-300/50 px-3 py-1 text-xs font-semibold text-butter-800 transition hover:bg-butter-300/80"
          >
            взять
          </button>
        </li>
      ))}
    </ul>
  )
}
