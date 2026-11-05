import { useEffect, useState } from 'react'
import type { ISODate } from './domain/dates'
import type { EveRule, Settings } from './domain/calendar'
import type { Region } from './domain/holidays'

/** One year's settings and booked days. */
export interface Plan {
  settings: Settings
  booked: ISODate[]
}

/** Plans by year ("2027" → plan); years never touched are absent. */
export type Years = Record<string, Plan>

interface Store {
  year: number
  years: Years
}

const DEFAULT_SETTINGS: Settings = { region: 'HE', entitlement: 30, carryover: 0, eves: 'full' }
const STORAGE_KEY = 'urlaub:plan'
/** Where the single-year version kept its 2027 plan. */
const LEGACY_KEY = 'urlaub-2027:plan'
const REGIONS: Region[] = ['HE', 'RP']
const EVES: EveRule[] = ['full', 'half', 'off']

function sanitize(raw: unknown, year: number): Plan | null {
  if (!raw || typeof raw !== 'object') return null
  const { settings, booked } = raw as Partial<Plan>
  if (!settings || !Array.isArray(booked)) return null
  const number = (v: unknown, fallback: number) => (typeof v === 'number' && v >= 0 ? v : fallback)
  const date = new RegExp(`^${year}-\\d{2}-\\d{2}$`)
  return {
    settings: {
      region: REGIONS.includes(settings.region) ? settings.region : DEFAULT_SETTINGS.region,
      entitlement: number(settings.entitlement, DEFAULT_SETTINGS.entitlement),
      carryover: number(settings.carryover, 0),
      eves: EVES.includes(settings.eves) ? settings.eves : DEFAULT_SETTINGS.eves,
    },
    booked: booked.filter((d): d is ISODate => typeof d === 'string' && date.test(d)).sort(),
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
  return { settings: { ...settings, carryover: 0 }, booked: [] }
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
    clear: () => update((p) => ({ ...p, booked: [] })),
  }
}
