/** Calendar dates as `YYYY-MM-DD`; all arithmetic is done in UTC so time zones never shift a day. */
export type ISODate = string

const DAY_MS = 86_400_000

export function utc(year: number, month: number, day: number): Date {
  return new Date(Date.UTC(year, month - 1, day))
}

export function iso(date: Date): ISODate {
  return date.toISOString().slice(0, 10)
}

export function parse(date: ISODate): Date {
  const [y, m, d] = date.split('-').map(Number)
  return utc(y, m, d)
}

export function addDays(date: Date, days: number): Date {
  return new Date(date.getTime() + days * DAY_MS)
}

/** 0 = Monday … 6 = Sunday. */
export function weekday(date: Date): number {
  return (date.getUTCDay() + 6) % 7
}
