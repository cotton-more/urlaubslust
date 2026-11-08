import type { Day } from '../domain/calendar'
import type { Stretch, Trip } from '../domain/plan'
import { dayLabel, days, rangeLabel, weeks } from '../format'
import { CrowdPie } from './CrowdPie'
import { Reveal } from './controls'

interface TripsProps {
  trips: readonly Trip[]
  /** Average share of Germany on school breaks over the trip, 0–1. */
  crowdOf: (trip: Trip) => number
  onRemove: (trip: Trip) => void
}

export function TripList({ trips, crowdOf, onRemove }: TripsProps) {
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
            <div className="mt-0.5 flex items-center gap-1.5 text-[11px] text-stone-500">
              <CrowdPie share={crowdOf(trip)} className="size-3" />
              на каникулах в среднем {Math.round(crowdOf(trip) * 100)}% Германии
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

interface StretchProps {
  stretches: readonly Stretch[]
  onTake: (day: Day) => void
  /** The stretch under the pointer, to light it up in the calendar; null when the pointer leaves. */
  onHover: (stretch: Stretch | null) => void
}

/** Long stretches without a break, each with the one day that breaks it best. */
export function LongStretches({ stretches, onTake, onHover }: StretchProps) {
  return (
    <div className="grid gap-2">
      <ul className="grid gap-2">
        {stretches.map((stretch) => (
          <li
            key={stretch.start}
            onPointerEnter={() => onHover(stretch)}
            onPointerLeave={() => onHover(null)}
            className="grid gap-1.5 rounded-2xl bg-berry-400/10 px-4 py-2.5 ring-1 ring-inset ring-berry-400/20"
          >
            <div className="text-xs">
              <span className="font-semibold text-berry-600">{weeks(Math.round(stretch.length / 7))} без отдыха</span>
              <span className="text-stone-500"> · {rangeLabel(stretch.start, stretch.end)}</span>
            </div>
            {stretch.tip && (
              <div className="flex items-center gap-3">
                <div className="min-w-0 flex-1 truncate text-xs text-stone-600">
                  {dayLabel(stretch.tip.day.date)} · 1 день → {days(stretch.tip.gain)} отдыха
                </div>
                <button
                  type="button"
                  onClick={() => onTake(stretch.tip!.day)}
                  className="rounded-full bg-berry-400/20 px-3 py-1 text-xs font-semibold text-berry-600 transition hover:bg-berry-400/30"
                >
                  взять
                </button>
              </div>
            )}
          </li>
        ))}
      </ul>
      <Reveal title="Почему это важно">
        <p className="mt-2 pl-3 text-xs leading-relaxed text-stone-500">
          Эффект отпуска проходит за 2–4 недели после возвращения, поэтому лучше не работать дольше 8–12 недель подряд
          хотя бы без длинных выходных. Здесь — периоды дольше 10 недель без трёх свободных дней подряд.
        </p>
      </Reveal>
    </div>
  )
}
