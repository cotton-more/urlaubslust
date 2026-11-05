import { addDays, iso, utc, weekday, type ISODate } from './dates'
import { legalHolidays, observances, type Holiday, type Observance, type Region } from './holidays'
import { schoolBreakOn, type SchoolBreak } from './schoolBreaks'

/** How the company treats Heiligabend and Silvester when they fall on a weekday. */
export type EveRule = 'full' | 'half' | 'off'

export interface Settings {
  region: Region
  /** Annual entitlement in working days (Mon–Fri). */
  entitlement: number
  /** Resturlaub carried over from the previous year. */
  carryover: number
  eves: EveRule
}

export type DayKind = 'workday' | 'weekend' | 'holiday' | 'company'

export interface Day {
  date: ISODate
  /** 0–11 */
  month: number
  dayOfMonth: number
  /** 0 = Monday … 6 = Sunday */
  weekday: number
  kind: DayKind
  /** Vacation days spent when this day is booked; weekends and holidays cost nothing (§ 3 BUrlG). */
  cost: number
  /** Legal holiday in the chosen region. */
  holiday?: Holiday
  /** Legal holiday only in the other region. */
  elsewhere?: Holiday
  observance?: Observance
  /** Schulferien in Rheinland-Pfalz, for reference only. */
  schoolBreak?: SchoolBreak
}

const EVE_COST: Record<EveRule, number> = { full: 1, half: 0.5, off: 0 }

export function isOff(day: Day): boolean {
  return day.kind !== 'workday'
}

export function buildYear(year: number, { region, eves }: Pick<Settings, 'region' | 'eves'>): Day[] {
  const holidays = new Map(legalHolidays(year).map((h) => [h.date, h]))
  const notable = new Map(observances(year).map((o) => [o.date, o]))
  const eveDates = new Set([iso(utc(year, 12, 24)), iso(utc(year, 12, 31))])

  const days: Day[] = []
  for (let d = utc(year, 1, 1); d.getUTCFullYear() === year; d = addDays(d, 1)) {
    const date = iso(d)
    const wd = weekday(d)
    const h = holidays.get(date)
    const local = h?.regions.includes(region) ? h : undefined

    let kind: DayKind = 'workday'
    let cost = 1
    if (wd >= 5) [kind, cost] = ['weekend', 0]
    else if (local) [kind, cost] = ['holiday', 0]
    else if (eveDates.has(date)) {
      cost = EVE_COST[eves]
      if (eves === 'off') kind = 'company'
    }

    days.push({
      date,
      month: d.getUTCMonth(),
      dayOfMonth: d.getUTCDate(),
      weekday: wd,
      kind,
      cost,
      holiday: local,
      elsewhere: h && !local ? h : undefined,
      observance: notable.get(date),
      schoolBreak: schoolBreakOn(date),
    })
  }
  return days
}
