import { useEffect, useState } from 'react'
import type { ISODate } from './domain/dates'
import { defaultRule, type CompanyDays, type Day, type DayRule, type Settings } from './domain/calendar'
import { REGIONS, type Region } from './domain/holidays'

/** One year's settings, booked days and company days. */
export interface Plan {
  settings: Settings
  booked: ISODate[]
  /** Dates of this year only, so a new year starts without them. */
  companyDays: CompanyDays
}

/** Plans by year ("2027" → plan); years never touched are absent. */
export type Years = Record<string, Plan>

interface Store {
  year: number
  years: Years
}

const DEFAULT_SETTINGS: Settings = { work: 'HE', home: 'RP', entitlement: 30, carryover: 0, christmasEve: 'full', newYearsEve: 'full' }
const STORAGE_KEY = 'urlaub:plan'
/** Where the single-year version kept its 2027 plan. */
const LEGACY_KEY = 'urlaub-2027:plan'
const EVES: DayRule[] = ['full', 'half', 'off']

function sanitize(raw: unknown, year: number): Plan | null {
  if (!raw || typeof raw !== 'object') return null
  const { settings, booked, companyDays } = raw as Partial<Plan>
  if (!settings || !Array.isArray(booked)) return null
  const number = (v: unknown, fallback: number) => (typeof v === 'number' && v >= 0 ? v : fallback)
  const region = (v: unknown, fallback: Region) => (typeof v === 'string' && v in REGIONS ? (v as Region) : fallback)
  // Before home and work were separate there was one `region` for work, and school breaks were always RLP's.
  const legacy = (settings as { region?: unknown }).region
  // Before the two eves were separate one `eves` rule covered both.
  const bothEves = (settings as { eves?: unknown }).eves
  const eve = (v: unknown) => (EVES.includes(v as DayRule) ? (v as DayRule) : EVES.includes(bothEves as DayRule) ? (bothEves as DayRule) : 'full')
  const date = new RegExp(`^${year}-\\d{2}-\\d{2}$`)
  return {
    settings: {
      work: region(settings.work ?? legacy, DEFAULT_SETTINGS.work),
      home: region(settings.home, legacy ? 'RP' : DEFAULT_SETTINGS.home),
      entitlement: number(settings.entitlement, DEFAULT_SETTINGS.entitlement),
      carryover: number(settings.carryover, 0),
      christmasEve: eve(settings.christmasEve),
      newYearsEve: eve(settings.newYearsEve),
    },
    booked: booked.filter((d): d is ISODate => typeof d === 'string' && date.test(d)).sort(),
    companyDays: Object.fromEntries(
      Object.entries(companyDays && typeof companyDays === 'object' ? companyDays : {}).filter(
        ([d, rule]) => date.test(d) && EVES.includes(rule as DayRule),
      ),
    ),
  }
}

function sanitizeYears(raw: unknown): Years | null {
  if (!raw || typeof raw !== 'object') return null
  // A single-year plan from before years existed: it belongs to the year of its days, 2027 if it has none.
  if ('booked' in raw && Array.isArray(raw.booked)) {
    const year = Number(String(raw.booked[0] ?? '2027').slice(0, 4))
    const plan = sanitize(raw, year)
    return plan && { [year]: plan }
  }
  const years: Years = {}
  for (const [key, value] of Object.entries(raw)) {
    const plan = /^\d{4}$/.test(key) ? sanitize(value, Number(key)) : null
    if (plan) years[key] = plan
  }
  return Object.keys(years).length > 0 ? years : null
}

/**
 * A plan with a day's rule changed. 24.12 and 31.12 on weekdays go to their settings, which later years inherit;
 * any other day goes to this year's company days, and only while it differs from the day's default.
 */
export function withDayRule(plan: Plan, day: Pick<Day, 'date' | 'restDay'>, rule: DayRule): Plan {
  if (!day.restDay && day.date.endsWith('-12-24')) return { ...plan, settings: { ...plan.settings, christmasEve: rule } }
  if (!day.restDay && day.date.endsWith('-12-31')) return { ...plan, settings: { ...plan.settings, newYearsEve: rule } }
  const { [day.date]: _, ...rest } = plan.companyDays
  return { ...plan, companyDays: rule === defaultRule(day) ? rest : { ...rest, [day.date]: rule } }
}

/** Every year's plan as one base64 string, to carry it to another browser. */
export function encodePlans(years: Years): string {
  return btoa(JSON.stringify(years))
}

/** The plans behind a string from encodePlans, or null when it is not one. */
export function decodePlans(code: string): Years | null {
  try {
    return sanitizeYears(JSON.parse(atob(code.replace(/\s+/g, ''))))
  } catch {
    return null
  }
}

/** A plan for a year not planned yet: settings carried from the closest earlier year (else later), nothing booked. */
export function blankPlan(years: Years, year: number): Plan {
  const known = Object.keys(years).map(Number)
  const earlier = known.filter((y) => y < year)
  const source = earlier.length > 0 ? Math.max(...earlier) : known.length > 0 ? Math.min(...known) : null
  const settings = source === null ? DEFAULT_SETTINGS : years[source].settings
  return { settings: { ...settings, carryover: 0 }, booked: [], companyDays: {} }
}

function readJSON(key: string): unknown {
  try {
    return JSON.parse(localStorage.getItem(key) ?? 'null')
  } catch {
    return null
  }
}

function load(): Store {
  const stored = readJSON(STORAGE_KEY) as Partial<Store> | null
  const years = sanitizeYears(stored?.years) ?? sanitizeYears(readJSON(LEGACY_KEY)) ?? {}
  const year = Number.isInteger(stored?.year) ? stored!.year! : years['2027'] ? 2027 : new Date().getFullYear()
  return { year, years }
}

/** The plans live in this browser's localStorage; encodePlans/decodePlans move them between devices. */
export function usePlan() {
  const [store, setStore] = useState<Store>(load)
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(store))
      setSaved(true)
    } catch {
      setSaved(false)
    }
  }, [store])

  const { year, years } = store
  const plan = years[year] ?? blankPlan(years, year)
  const update = (change: (p: Plan) => Plan) =>
    setStore((s) => ({ ...s, years: { ...s.years, [s.year]: change(s.years[s.year] ?? blankPlan(s.years, s.year)) } }))

  return {
    year,
    years,
    plan,
    saved,
    setYear: (next: number) => setStore((s) => ({ ...s, year: next })),
    replaceAll: (next: Years) => setStore((s) => ({ ...s, years: next })),
    setSettings: (patch: Partial<Settings>) => update((p) => ({ ...p, settings: { ...p.settings, ...patch } })),
    book: (dates: readonly ISODate[], on: boolean) =>
      update((p) => {
        const next = new Set(p.booked)
        for (const d of dates) {
          if (on) next.add(d)
          else next.delete(d)
        }
        return { ...p, booked: [...next].sort() }
      }),
    setDayRule: (day: Pick<Day, 'date' | 'restDay'>, rule: DayRule) => update((p) => withDayRule(p, day, rule)),
    clear: () => update((p) => ({ ...p, booked: [] })),
  }
}
