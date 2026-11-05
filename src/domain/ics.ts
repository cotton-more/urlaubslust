import { addDays, iso, parse, type ISODate } from './dates'
import type { Trip } from './plan'

const compact = (date: ISODate) => date.replaceAll('-', '')
const german = (date: ISODate) => `${date.slice(8, 10)}.${date.slice(5, 7)}.`
const amount = (n: number, one: string, many: string) => `${String(n).replace('.', ',')} ${n === 1 ? one : many}`

/**
 * An iCalendar file with one all-day "Urlaub" event per vacation period, spanning the first to the last
 * booked day (weekends and holidays in between included). The UID is derived from the period's first booked day.
 */
export function toICS(trips: readonly Trip[], year: number, now: Date): string {
  const stamp = now.toISOString().replace(/[-:]/g, '').replace(/\.\d+Z$/, 'Z')
  const events = trips.map((trip) => {
    const first = trip.booked[0]
    const last = trip.booked[trip.booked.length - 1]
    return [
      'BEGIN:VEVENT',
      `UID:urlaub-${year}-${first}@urlaub-planer`,
      `DTSTAMP:${stamp}`,
      `DTSTART;VALUE=DATE:${compact(first)}`,
      `DTEND;VALUE=DATE:${compact(iso(addDays(parse(last), 1)))}`,
      'SUMMARY:Urlaub',
      `DESCRIPTION:${amount(trip.cost, 'Urlaubstag', 'Urlaubstage')}\\, ${trip.length} Tage frei (${german(trip.start)}–${german(trip.end)})`,
      'TRANSP:OPAQUE',
      'END:VEVENT',
    ]
  })
  return [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//urlaub//Urlaubsplaner//DE',
    'CALSCALE:GREGORIAN',
    'METHOD:PUBLISH',
    `X-WR-CALNAME:Urlaub ${year}`,
    ...events.flat(),
    'END:VCALENDAR',
    '',
  ].join('\r\n')
}
