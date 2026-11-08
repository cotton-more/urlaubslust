import type { ISODate } from './dates'
import { isOff, type Day, type Settings } from './calendar'
import type { Holiday } from './holidays'

/** One stretch of consecutive days off that contains at least one booked vacation day. */
export interface Trip {
  start: ISODate
  end: ISODate
  /** Calendar days off in a row, weekends and holidays included. */
  length: number
  /** Vacation days it costs. */
  cost: number
  booked: ISODate[]
}

export function trips(days: readonly Day[], booked: ReadonlySet<ISODate>): Trip[] {
  const result: Trip[] = []
  let run: Day[] = []
  const flush = () => {
    const paid = run.filter((d) => !isOff(d) && booked.has(d.date))
    if (paid.length > 0) {
      result.push({
        start: run[0].date,
        end: run[run.length - 1].date,
        length: run.length,
        cost: paid.reduce((sum, d) => sum + d.cost, 0),
        booked: paid.map((d) => d.date),
      })
    }
    run = []
  }
  for (const day of days) {
    if (isOff(day) || booked.has(day.date)) run.push(day)
    else flush()
  }
  flush()
  return result
}

export interface Usage {
  total: number
  used: number
  remaining: number
  /** Resturlaub that is booked before it expires on 31 March (§ 7 Abs. 3 BUrlG). */
  carryoverUsed: number
  carryoverAtRisk: number
}

export function usage(days: readonly Day[], booked: ReadonlySet<ISODate>, settings: Settings): Usage {
  const april = `${days[0].date.slice(0, 4)}-04-01`
  let used = 0
  let beforeApril = 0
  for (const day of days) {
    if (isOff(day) || !booked.has(day.date)) continue
    used += day.cost
    if (day.date < april) beforeApril += day.cost
  }
  const total = settings.entitlement + settings.carryover
  const carryoverUsed = Math.min(settings.carryover, beforeApril)
  return {
    total,
    used,
    remaining: total - used,
    carryoverUsed,
    carryoverAtRisk: settings.carryover - carryoverUsed,
  }
}

/** Single working days squeezed between days off — one vacation day buys a long weekend. */
export function bridgeDays(days: readonly Day[]): Day[] {
  return days.filter(
    (day, i) => !isOff(day) && i > 0 && i < days.length - 1 && isOff(days[i - 1]) && isOff(days[i + 1]),
  )
}

/** The working days between two dates, inclusive, in either order. */
export function workdaysBetween(days: readonly Day[], a: ISODate, b: ISODate): ISODate[] {
  const [from, to] = a <= b ? [a, b] : [b, a]
  return days.filter((d) => !isOff(d) && d.date >= from && d.date <= to).map((d) => d.date)
}

/** Holidays at work split by whether they land on a weekday (a free day) or on a weekend (lost). */
export interface Luck {
  weekday: Holiday[]
  weekend: Holiday[]
}

export function holidayLuck(days: readonly Day[]): Luck {
  const luck: Luck = { weekday: [], weekend: [] }
  for (const day of days) if (day.holiday) luck[day.weekday >= 5 ? 'weekend' : 'weekday'].push(day.holiday)
  return luck
}

/** Days off in a row that count as a break: a long weekend at least. Plain weekends do not. */
export const BREAK_DAYS = 3
/** A stretch without a break longer than this gets a warning: the rest of a vacation wears off within weeks. */
export const LONG_STRETCH_DAYS = 10 * 7

/** A long stretch of work without a break, and the one vacation day that breaks it best. */
export interface Stretch {
  start: ISODate
  end: ISODate
  /** Calendar days, start and end included. */
  length: number
  tip?: { day: Day; /** days off in a row the tip makes */ gain: number }
}

/**
 * Stretches of the year longer than LONG_STRETCH_DAYS without BREAK_DAYS off in a row. Booked days count as off.
 * The tip is a single full working day that makes a break of its own, picked to split the stretch most evenly.
 */
export function longStretches(days: readonly Day[], booked: ReadonlySet<ISODate>): Stretch[] {
  const free = days.map((d) => isOff(d) || booked.has(d.date))
  // Length of the free run ending at i (from the left) and starting at i (from the right).
  const left = free.map(() => 0)
  const right = free.map(() => 0)
  for (let i = 0; i < days.length; i++) left[i] = free[i] ? (left[i - 1] ?? 0) + 1 : 0
  for (let i = days.length - 1; i >= 0; i--) right[i] = free[i] ? (right[i + 1] ?? 0) + 1 : 0
  const inBreak = free.map((f, i) => f && left[i] + right[i] - 1 >= BREAK_DAYS)

  const result: Stretch[] = []
  let from: number | null = null
  for (let i = 0; i <= days.length; i++) {
    if (i < days.length && !inBreak[i]) {
      from ??= i
      continue
    }
    if (from !== null && i - from > LONG_STRETCH_DAYS) result.push(stretch(days, free, left, right, from, i - 1))
    from = null
  }
  return result
}

function stretch(days: readonly Day[], free: boolean[], left: number[], right: number[], from: number, to: number): Stretch {
  let tip: Stretch['tip']
  let best = -1
  for (let i = from; i <= to; i++) {
    const day = days[i]
    if (free[i] || day.cost < 1) continue
    const gain = (left[i - 1] ?? 0) + 1 + (right[i + 1] ?? 0)
    if (gain < BREAK_DAYS) continue
    // The shorter of the two parts left over: the larger, the more even the split.
    const shorter = Math.min(i - (left[i - 1] ?? 0) - from, to - (i + (right[i + 1] ?? 0)))
    const score = shorter * 10 + gain
    if (score > best) [best, tip] = [score, { day, gain }]
  }
  return { start: days[from].date, end: days[to].date, length: to - from + 1, tip }
}
