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
