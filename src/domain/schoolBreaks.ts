import type { ISODate } from './dates'

/** A Schulferien period; dates inclusive. */
export interface SchoolBreak {
  name: string
  start: ISODate
  end: ISODate
}

/**
 * Schulferien Rheinland-Pfalz as published so far (Ministerium für Bildung RLP, via kalenderpedia.de).
 * No Winter- or Pfingstferien in these years; each school adds up to six bewegliche Ferientage of its own.
 */
export const SCHOOL_BREAKS_RLP: readonly SchoolBreak[] = [
  { name: 'Weihnachtsferien', start: '2026-12-23', end: '2027-01-08' },
  { name: 'Osterferien', start: '2027-03-22', end: '2027-04-02' },
  { name: 'Sommerferien', start: '2027-06-28', end: '2027-08-06' },
  { name: 'Herbstferien', start: '2027-10-04', end: '2027-10-15' },
  { name: 'Weihnachtsferien', start: '2027-12-23', end: '2028-01-07' },
  { name: 'Osterferien', start: '2028-04-10', end: '2028-04-21' },
  { name: 'Sommerferien', start: '2028-07-03', end: '2028-08-11' },
  { name: 'Herbstferien', start: '2028-10-09', end: '2028-10-20' },
  { name: 'Weihnachtsferien', start: '2028-12-21', end: '2029-01-08' },
  { name: 'Osterferien', start: '2029-03-26', end: '2029-04-06' },
  { name: 'Sommerferien', start: '2029-07-16', end: '2029-08-24' },
  { name: 'Herbstferien', start: '2029-10-22', end: '2029-11-02' },
  { name: 'Weihnachtsferien', start: '2029-12-24', end: '2030-01-09' },
  { name: 'Osterferien', start: '2030-04-15', end: '2030-04-30' },
  { name: 'Sommerferien', start: '2030-07-22', end: '2030-08-30' },
]

/** The breaks that overlap the given year, including those spilling over from or into its neighbours. */
export function schoolBreaksIn(year: number): SchoolBreak[] {
  return SCHOOL_BREAKS_RLP.filter((b) => b.start <= `${year}-12-31` && b.end >= `${year}-01-01`)
}

export function schoolBreakOn(date: ISODate): SchoolBreak | undefined {
  return SCHOOL_BREAKS_RLP.find((b) => b.start <= date && date <= b.end)
}
