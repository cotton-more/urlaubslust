import type { ISODate } from './dates'
import type { Region } from './holidays'

/** A Schulferien period; dates inclusive. */
export interface SchoolBreak {
  name: string
  start: ISODate
  end: ISODate
}

/** OpenHolidays (openholidaysapi.org): school holidays of one Bundesland overlapping one year. */
export function schoolBreaksURL(region: Region, year: number): string {
  const query = new URLSearchParams({
    countryIsoCode: 'DE',
    subdivisionCode: `DE-${region}`,
    languageIsoCode: 'DE',
    validFrom: `${year}-01-01`,
    validTo: `${year}-12-31`,
  })
  return `https://openholidaysapi.org/SchoolHolidays?${query}`
}

/** The breaks in an OpenHolidays response, oldest first; throws when it is not one. */
export function parseSchoolBreaks(raw: unknown): SchoolBreak[] {
  if (!Array.isArray(raw)) throw new Error('not a list')
  return raw
    .map((h) => ({
      name: String(h.name?.find((n: { language: string }) => n.language === 'DE')?.text ?? h.name?.[0]?.text ?? 'Ferien'),
      start: String(h.startDate),
      end: String(h.endDate),
    }))
    .filter((b) => /^\d{4}-\d{2}-\d{2}$/.test(b.start) && /^\d{4}-\d{2}-\d{2}$/.test(b.end))
    .sort((a, b) => a.start.localeCompare(b.start))
}

export function schoolBreakOn(breaks: readonly SchoolBreak[], date: ISODate): SchoolBreak | undefined {
  return breaks.find((b) => b.start <= date && date <= b.end)
}
