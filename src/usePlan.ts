import { useEffect, useState } from 'react'
import type { ISODate } from './domain/dates'
import type { EveRule, Settings } from './domain/calendar'
import type { Region } from './domain/holidays'

export interface Plan {
  settings: Settings
  booked: ISODate[]
}

const DEFAULT_PLAN: Plan = { settings: { region: 'HE', entitlement: 30, carryover: 0, eves: 'full' }, booked: [] }
const STORAGE_KEY = 'urlaub-2027:plan'
const REGIONS: Region[] = ['HE', 'RP']
const EVES: EveRule[] = ['full', 'half', 'off']

function sanitize(raw: unknown): Plan | null {
  if (!raw || typeof raw !== 'object') return null
  const { settings, booked } = raw as Partial<Plan>
  if (!settings || !Array.isArray(booked)) return null
  const number = (v: unknown, fallback: number) => (typeof v === 'number' && v >= 0 ? v : fallback)
  return {
    settings: {
      region: REGIONS.includes(settings.region) ? settings.region : DEFAULT_PLAN.settings.region,
      entitlement: number(settings.entitlement, DEFAULT_PLAN.settings.entitlement),
      carryover: number(settings.carryover, 0),
      eves: EVES.includes(settings.eves) ? settings.eves : DEFAULT_PLAN.settings.eves,
    },
    booked: booked.filter((d): d is ISODate => typeof d === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(d)).sort(),
  }
}

/** The whole plan as one base64 string, to carry it to another browser. */
export function encodePlan(plan: Plan): string {
  return btoa(JSON.stringify(plan))
}

/** The plan behind a string from encodePlan, or null when it is not one. */
export function decodePlan(code: string): Plan | null {
  try {
    return sanitize(JSON.parse(atob(code.replace(/\s+/g, ''))))
  } catch {
    return null
  }
}

function load(): Plan {
  try {
    return sanitize(JSON.parse(localStorage.getItem(STORAGE_KEY) ?? 'null')) ?? DEFAULT_PLAN
  } catch {
    return DEFAULT_PLAN
  }
}

/** The plan lives in this browser's localStorage; encodePlan/decodePlan move it between devices. */
export function usePlan() {
  const [plan, setPlan] = useState<Plan>(load)
  const [saved, setSaved] = useState(true)

  useEffect(() => {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(plan))
      setSaved(true)
    } catch {
      setSaved(false)
    }
  }, [plan])

  return {
    plan,
    saved,
    replace: setPlan,
    setSettings: (patch: Partial<Settings>) => setPlan((p) => ({ ...p, settings: { ...p.settings, ...patch } })),
    book: (dates: readonly ISODate[], on: boolean) =>
      setPlan((p) => {
        const next = new Set(p.booked)
        for (const d of dates) {
          if (on) next.add(d)
          else next.delete(d)
        }
        return { ...p, booked: [...next].sort() }
      }),
    clear: () => setPlan((p) => ({ ...p, booked: [] })),
  }
}
