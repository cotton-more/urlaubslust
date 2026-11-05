import { addDays, iso, utc, type ISODate } from './dates'

/** Bundesländer that matter here: the office is in Frankfurt (Hessen), home is Mainz (Rheinland-Pfalz). */
export type Region = 'HE' | 'RP'

export const REGIONS: Record<Region, { state: string; city: string }> = {
  HE: { state: 'Hessen', city: 'Франкфурт' },
  RP: { state: 'Rheinland-Pfalz', city: 'Майнц' },
}

/** A gesetzlicher Feiertag and the regions where it is one. */
export interface Holiday {
  date: ISODate
  name: string
  regions: readonly Region[]
}

/** A notable day that is not a legal holiday. */
export interface Observance {
  date: ISODate
  name: string
  note: string
}

const BOTH: readonly Region[] = ['HE', 'RP']

/** Easter Sunday, Gregorian calendar (Meeus/Jones/Butcher). */
export function easterSunday(year: number): Date {
  const a = year % 19
  const b = Math.floor(year / 100)
  const c = year % 100
  const d = Math.floor(b / 4)
  const e = b % 4
  const f = Math.floor((b + 8) / 25)
  const g = Math.floor((b - f + 1) / 3)
  const h = (19 * a + b - d - g + 15) % 30
  const i = Math.floor(c / 4)
  const k = c % 4
  const l = (32 + 2 * e + 2 * i - h - k) % 7
  const m = Math.floor((a + 11 * h + 22 * l) / 451)
  const n = h + l - 7 * m + 114
  return utc(year, Math.floor(n / 31), (n % 31) + 1)
}

export function legalHolidays(year: number): Holiday[] {
  const easter = easterSunday(year)
  const fromEaster = (days: number) => iso(addDays(easter, days))
  const fixed = (month: number, day: number) => iso(utc(year, month, day))
  return [
    { date: fixed(1, 1), name: 'Neujahr', regions: BOTH },
    { date: fromEaster(-2), name: 'Karfreitag', regions: BOTH },
    { date: fromEaster(1), name: 'Ostermontag', regions: BOTH },
    { date: fixed(5, 1), name: 'Tag der Arbeit', regions: BOTH },
    { date: fromEaster(39), name: 'Christi Himmelfahrt', regions: BOTH },
    { date: fromEaster(50), name: 'Pfingstmontag', regions: BOTH },
    { date: fromEaster(60), name: 'Fronleichnam', regions: BOTH },
    { date: fixed(10, 3), name: 'Tag der Deutschen Einheit', regions: BOTH },
    { date: fixed(11, 1), name: 'Allerheiligen', regions: ['RP'] },
    { date: fixed(12, 25), name: '1. Weihnachtstag', regions: BOTH },
    { date: fixed(12, 26), name: '2. Weihnachtstag', regions: BOTH },
  ]
}

export function observances(year: number): Observance[] {
  const easter = easterSunday(year)
  return [
    {
      date: iso(addDays(easter, -48)),
      name: 'Rosenmontag',
      note: 'не государственный праздник; в Майнце многие фирмы отпускают, но это по договорённости',
    },
    { date: iso(utc(year, 12, 24)), name: 'Heiligabend', note: 'по закону рабочий день — зависит от фирмы' },
    { date: iso(utc(year, 12, 31)), name: 'Silvester', note: 'по закону рабочий день — зависит от фирмы' },
  ]
}
