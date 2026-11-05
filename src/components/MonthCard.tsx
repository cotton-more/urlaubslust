import type { PointerEvent } from 'react'
import type { Day } from '../domain/calendar'
import type { ISODate } from '../domain/dates'
import { WEEKDAYS, monthName } from '../format'

/** What the cells show: the vacation plan, or how much of Germany is on school breaks. */
export type View = 'plan' | 'crowd'

/** Crowd fill per fifth of the population, 0 = nobody on break. */
export const CROWD_STEPS = ['bg-white/50', 'bg-crowd-1', 'bg-crowd-2', 'bg-crowd-3', 'bg-crowd-4', 'bg-crowd-5'] as const
export const crowdStep = (share: number) => (share <= 0 ? 0 : Math.min(5, Math.ceil(share * 5)))

interface Props {
  view: View
  year: number
  month: number
  days: readonly Day[]
  booked: ReadonlySet<ISODate>
  /** Days off that belong to a trip without being booked: the weekends and holidays inside it. */
  covered: ReadonlySet<ISODate>
  bridges: ReadonlySet<ISODate>
  onPress: (day: Day, event: PointerEvent) => void
  onEnter: (day: Day) => void
  onKeyToggle: (day: Day) => void
}

function cellClass(day: Day, booked: boolean, covered: boolean): string {
  if (day.kind === 'workday' && booked)
    return 'bg-linear-to-br from-blush-600 to-peach-600 text-white font-bold shadow-md shadow-blush-600/30 scale-[1.04]'
  if (covered)
    return day.kind === 'weekend' ? 'bg-blush-100 text-blush-700' : 'bg-blush-100 text-sage-700 font-semibold'
  if (day.kind === 'holiday' || day.kind === 'company') return 'bg-sage-100 text-sage-700 font-semibold ring-1 ring-inset ring-sage-300'
  if (day.kind === 'weekend') return 'text-stone-400'
  return 'text-stone-700 hover:bg-blush-100 hover:text-blush-700 cursor-pointer'
}

function crowdClass(day: Day, inTrip: boolean): string {
  const step = crowdStep(day.crowd)
  const ink = step === 5 ? 'text-white' : day.kind === 'workday' ? 'text-stone-800' : step >= 3 ? 'text-stone-700' : 'text-stone-500'
  const trip = inTrip ? 'ring-2 ring-inset ring-blush-600 font-bold' : ''
  return `${CROWD_STEPS[step]} ${ink} ${trip} ${day.kind === 'workday' ? 'cursor-pointer' : ''}`
}

export function MonthCard({ view, year, month, days, booked, covered, bridges, onPress, onEnter, onKeyToggle }: Props) {
  const bookedHere = days.filter((d) => d.kind === 'workday' && booked.has(d.date)).reduce((s, d) => s + d.cost, 0)
  return (
    <section className="rounded-3xl border border-white bg-white/70 p-4 shadow-sm shadow-stone-900/5 backdrop-blur-xl transition hover:shadow-md">
      <header className="mb-3 flex items-baseline justify-between px-1">
        <h2 className="font-display text-sm font-medium tracking-wide text-stone-800">{monthName(year, month)}</h2>
        {bookedHere > 0 && (
          <span className="rounded-full bg-blush-100 px-2 py-0.5 text-[11px] font-semibold text-blush-700">
            {bookedHere.toLocaleString('ru-RU')} д.
          </span>
        )}
      </header>
      <div className="grid grid-cols-7 gap-1 text-center">
        {WEEKDAYS.map((w, i) => (
          <div key={w} className={`pb-1 text-[10px] font-semibold uppercase tracking-wider ${i >= 5 ? 'text-stone-400' : 'text-stone-500'}`}>
            {w}
          </div>
        ))}
        {Array.from({ length: days[0].weekday }, (_, i) => (
          <div key={`pad-${i}`} />
        ))}
        {days.map((day) => {
          const isBooked = booked.has(day.date)
          const clickable = day.kind === 'workday'
          const plan = view === 'plan'
          const look = plan
            ? `${cellClass(day, isBooked, covered.has(day.date))} ${day.elsewhere ? 'outline-1 outline-offset-[-3px] outline-dashed outline-butter-500' : ''}`
            : crowdClass(day, (clickable && isBooked) || covered.has(day.date))
          return (
            <button
              key={day.date}
              type="button"
              tabIndex={clickable ? 0 : -1}
              aria-pressed={clickable ? isBooked : undefined}
              aria-label={day.date}
              onPointerDown={(e) => onPress(day, e)}
              onPointerEnter={() => onEnter(day)}
              onClick={(e) => e.detail === 0 && clickable && onKeyToggle(day)}
              className={`relative grid aspect-square place-items-center rounded-xl text-[13px] tabular-nums outline-none transition duration-150 select-none focus-visible:ring-2 focus-visible:ring-blush-300 ${look} ${clickable ? '' : 'cursor-default'}`}
            >
              {day.dayOfMonth}
              {day.kind === 'workday' && day.cost < 1 && (
                <span className={`absolute top-0.5 right-1 text-[8px] font-bold ${isBooked && plan ? 'text-white/85' : 'text-butter-800'}`}>½</span>
              )}
              {plan && day.observance && !day.holiday && (
                <span className="absolute top-1 left-1 size-1 rounded-full bg-mist-500" />
              )}
              {plan && day.schoolBreak && (
                <span className={`absolute inset-x-1.5 bottom-0.5 h-[3px] rounded-full ${isBooked ? 'bg-white/80' : 'bg-lilac-500/55'}`} />
              )}
              {plan && bridges.has(day.date) && !isBooked && (
                <span className="absolute bottom-1.5 size-1 rounded-full bg-butter-500 shadow-[0_0_6px] shadow-butter-500/50" />
              )}
            </button>
          )
        })}
      </div>
    </section>
  )
}
