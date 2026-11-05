import { addDays, iso, utc, weekday, type ISODate } from './dates'

export type Region = 'BW' | 'BY' | 'BE' | 'BB' | 'HB' | 'HH' | 'HE' | 'MV' | 'NI' | 'NW' | 'RP' | 'SL' | 'SN' | 'ST' | 'SH' | 'TH'

/** The Bundesländer by their ISO 3166-2:DE suffix. */
export const REGIONS: Record<Region, string> = {
  BW: 'Baden-Württemberg',
  BY: 'Bayern',
  BE: 'Berlin',
  BB: 'Brandenburg',
  HB: 'Bremen',
  HH: 'Hamburg',
  HE: 'Hessen',
  MV: 'Mecklenburg-Vorpommern',
  NI: 'Niedersachsen',
  NW: 'Nordrhein-Westfalen',
  RP: 'Rheinland-Pfalz',
  SL: 'Saarland',
  SN: 'Sachsen',
  ST: 'Sachsen-Anhalt',
  SH: 'Schleswig-Holstein',
  TH: 'Thüringen',
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

const ALL = Object.keys(REGIONS) as Region[]

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

/**
 * Statewide gesetzliche Feiertage by current law. Holidays that only some municipalities keep
 * (Fronleichnam in parts of Sachsen and Thüringen, Mariä Himmelfahrt in catholic Bavaria, Augsburger Friedensfest)
 * and Easter/Pentecost Sunday are left out.
 */
export function legalHolidays(year: number): Holiday[] {
  const easter = easterSunday(year)
  const fromEaster = (days: number) => iso(addDays(easter, days))
  const fixed = (month: number, day: number) => iso(utc(year, month, day))
  // Buß- und Bettag: the Wednesday before 23 November.
  const nov22 = utc(year, 11, 22)
  const repentance = iso(addDays(nov22, -((weekday(nov22) + 5) % 7)))
  return [
    { date: fixed(1, 1), name: 'Neujahr', regions: ALL },
    { date: fixed(1, 6), name: 'Heilige Drei Könige', regions: ['BW', 'BY', 'ST'] },
    { date: fixed(3, 8), name: 'Internationaler Frauentag', regions: ['BE', 'MV'] },
    { date: fromEaster(-2), name: 'Karfreitag', regions: ALL },
    { date: fromEaster(1), name: 'Ostermontag', regions: ALL },
    { date: fixed(5, 1), name: 'Tag der Arbeit', regions: ALL },
    { date: fromEaster(39), name: 'Christi Himmelfahrt', regions: ALL },
    { date: fromEaster(50), name: 'Pfingstmontag', regions: ALL },
    { date: fromEaster(60), name: 'Fronleichnam', regions: ['BW', 'BY', 'HE', 'NW', 'RP', 'SL'] },
    { date: fixed(8, 15), name: 'Mariä Himmelfahrt', regions: ['SL'] },
    { date: fixed(9, 20), name: 'Weltkindertag', regions: ['TH'] },
    { date: fixed(10, 3), name: 'Tag der Deutschen Einheit', regions: ALL },
    { date: fixed(10, 31), name: 'Reformationstag', regions: ['BB', 'HB', 'HH', 'MV', 'NI', 'SN', 'ST', 'SH', 'TH'] },
    { date: fixed(11, 1), name: 'Allerheiligen', regions: ['BW', 'BY', 'NW', 'RP', 'SL'] },
    { date: repentance, name: 'Buß- und Bettag', regions: ['SN'] },
    { date: fixed(12, 25), name: '1. Weihnachtstag', regions: ALL },
    { date: fixed(12, 26), name: '2. Weihnachtstag', regions: ALL },
  ]
}

export function observances(year: number): Observance[] {
  const easter = easterSunday(year)
  return [
    {
      date: iso(addDays(easter, -48)),
      name: 'Rosenmontag',
      note: 'не государственный праздник; в карнавальных городах многие фирмы отпускают, но это по договорённости',
    },
    { date: iso(utc(year, 12, 24)), name: 'Heiligabend', note: 'по закону рабочий день — зависит от фирмы' },
    { date: iso(utc(year, 12, 31)), name: 'Silvester', note: 'по закону рабочий день — зависит от фирмы' },
  ]
}
