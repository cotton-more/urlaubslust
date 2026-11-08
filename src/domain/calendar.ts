import { addDays, iso, utc, weekday, type ISODate } from './dates'
import { legalHolidays, observances, type Holiday, type Observance, type Region } from './holidays'
import { crowd, type SchoolBreak } from './schoolBreaks'

/** How the company treats a weekday: a full working day, half a day, or closed. */
export type DayRule = 'full' | 'half' | 'off'

/** One year's company-specific days (a closed Brückentag, a half day before a party…), beyond 24.12 and 31.12. */
export type CompanyDays = Partial<Record<ISODate, Exclude<DayRule, 'full'>>>

export interface Settings {
  /** Bundesland of the workplace (Arbeitsort): its holidays are days off. */
  work: Region
  /** Bundesland of home: its school breaks, and holidays work does not have, are shown for reference. */
  home: Region
  /** Annual entitlement in working days (Mon–Fri). */
  entitlement: number
  /** Resturlaub carried over from the previous year. */
  carryover: number
  /** Heiligabend, 24.12. */
  christmasEve: DayRule
  /** Silvester, 31.12. */
  newYearsEve: DayRule
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
  /** Legal holiday at work. */
  holiday?: Holiday
  /** Legal holiday at home but not at work. */
  elsewhere?: Holiday
  observance?: Observance
  /** Schulferien at home, for reference only. */
  schoolBreak?: SchoolBreak
  /** Länder with school breaks on this day. */
  onBreak: Region[]
  /** Share of Germany's population in those Länder, 0–1: how busy travel gets. */
  crowd: number
}

const RULE_COST: Record<DayRule, number> = { full: 1, half: 0.5, off: 0 }

/** The company rule behind a weekday that is not a legal holiday. */
export function ruleOf(day: Day): DayRule {
  return day.kind === 'company' ? 'off' : day.cost < 1 ? 'half' : 'full'
}

/** Whether the company decides about this day: weekdays that are not legal holidays at work. */
export function hasRule(day: Day): boolean {
  return day.kind === 'workday' || day.kind === 'company'
}

export function isOff(day: Day): boolean {
  return day.kind !== 'workday'
}

export function buildYear(
  year: number,
  {
    work,
    home,
    christmasEve,
    newYearsEve,
    companyDays = {},
  }: Pick<Settings, 'work' | 'home' | 'christmasEve' | 'newYearsEve'> & { companyDays?: CompanyDays },
  breaks: readonly SchoolBreak[] = [],
): Day[] {
  const holidays = new Map(legalHolidays(year).map((h) => [h.date, h]))
  const notable = new Map(observances(year).map((o) => [o.date, o]))
  const eves = new Map<ISODate, DayRule>([
    [iso(utc(year, 12, 24)), christmasEve],
    [iso(utc(year, 12, 31)), newYearsEve],
  ])

  const days: Day[] = []
  for (let d = utc(year, 1, 1); d.getUTCFullYear() === year; d = addDays(d, 1)) {
    const date = iso(d)
    const wd = weekday(d)
    const h = holidays.get(date)
    const local = h?.regions.includes(work) ? h : undefined

    let kind: DayKind = 'workday'
    let cost = 1
    if (wd >= 5) [kind, cost] = ['weekend', 0]
    else if (local) [kind, cost] = ['holiday', 0]
    else {
      const rule = companyDays[date] ?? eves.get(date) ?? 'full'
      cost = RULE_COST[rule]
      if (rule === 'off') kind = 'company'
    }

    const current = breaks.filter((b) => b.start <= date && date <= b.end)
    const onBreak = [...new Set(current.flatMap((b) => b.regions))]
    days.push({
      date,
      month: d.getUTCMonth(),
      dayOfMonth: d.getUTCDate(),
      weekday: wd,
      kind,
      cost,
      holiday: local,
      elsewhere: h && !local && h.regions.includes(home) ? h : undefined,
      observance: notable.get(date),
      schoolBreak: current.find((b) => b.regions.includes(home)),
      onBreak,
      crowd: crowd(onBreak),
    })
  }
  return days
}
