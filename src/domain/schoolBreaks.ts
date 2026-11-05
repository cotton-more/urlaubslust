import type { ISODate } from './dates'

/** A Schulferien period; dates inclusive. */
export interface SchoolBreak {
  name: string
  start: ISODate
  end: ISODate
}

/**
 * Schulferien Rheinland-Pfalz touching 2027 (Ministerium für Bildung RLP, via kalenderpedia.de).
 * No Winter- or Pfingstferien this year; each school adds up to six bewegliche Ferientage of its own.
 */
export const SCHOOL_BREAKS_RLP: readonly SchoolBreak[] = [
  { name: 'Weihnachtsferien', start: '2026-12-23', end: '2027-01-08' },
  { name: 'Osterferien', start: '2027-03-22', end: '2027-04-02' },
  { name: 'Sommerferien', start: '2027-06-28', end: '2027-08-06' },
  { name: 'Herbstferien', start: '2027-10-04', end: '2027-10-15' },
  { name: 'Weihnachtsferien', start: '2027-12-23', end: '2028-01-07' },
]

export function schoolBreakOn(date: ISODate): SchoolBreak | undefined {
  return SCHOOL_BREAKS_RLP.find((b) => b.start <= date && date <= b.end)
}
