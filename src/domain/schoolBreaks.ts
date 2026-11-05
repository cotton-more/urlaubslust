import type { ISODate } from './dates'
import { REGIONS, type Region } from './holidays'

/** A Schulferien period and the Bundesländer that have it; dates inclusive. */
export interface SchoolBreak {
  name: string
  start: ISODate
  end: ISODate
  regions: Region[]
}

/** Inhabitants in millions (Destatis, 2023): how much of Germany is off when a Land has school breaks. */
export const POPULATION: Record<Region, number> = {
  BW: 11.28,
  BY: 13.37,
  BE: 3.76,
  BB: 2.57,
  HB: 0.68,
  HH: 1.89,
  HE: 6.39,
  MV: 1.63,
  NI: 8.14,
  NW: 18.14,
  RP: 4.16,
  SL: 0.99,
  SN: 4.09,
  ST: 2.17,
  SH: 2.95,
  TH: 2.11,
}
const TOTAL = Object.values(POPULATION).reduce((a, b) => a + b, 0)

/** Share of Germany's population living in the given Länder, 0–1. */
export const crowd = (regions: readonly Region[]) => regions.reduce((sum, r) => sum + POPULATION[r], 0) / TOTAL

/** OpenHolidays (openholidaysapi.org): school holidays of every Bundesland overlapping one year. */
export function schoolBreaksURL(year: number): string {
  const query = new URLSearchParams({
    countryIsoCode: 'DE',
    languageIsoCode: 'DE',
    validFrom: `${year}-01-01`,
    validTo: `${year}-12-31`,
  })
  return `https://openholidaysapi.org/SchoolHolidays?${query}`
}

const DATE = /^\d{4}-\d{2}-\d{2}$/

/**
 * The breaks in an OpenHolidays response, oldest first; throws when it is not one.
 * Where a Land splits dates by school type (Mecklenburg-Vorpommern), only allgemeinbildende Schulen count.
 */
export function parseSchoolBreaks(raw: unknown): SchoolBreak[] {
  if (!Array.isArray(raw)) throw new Error('not a list')
  return raw
    .filter((h) => !h.groups?.length || h.groups.some((g: { code: string }) => g.code.endsWith('-ABS')))
    .map((h) => ({
      name: String(h.name?.find((n: { language: string }) => n.language === 'DE')?.text ?? h.name?.[0]?.text ?? 'Ferien'),
      start: String(h.startDate),
      end: String(h.endDate),
      regions: (h.subdivisions ?? [])
        .map((s: { code: string }) => s.code.replace(/^DE-/, ''))
        .filter((r: string): r is Region => r in REGIONS),
    }))
    .filter((b) => DATE.test(b.start) && DATE.test(b.end) && b.regions.length > 0)
    .sort((a, b) => a.start.localeCompare(b.start))
}
