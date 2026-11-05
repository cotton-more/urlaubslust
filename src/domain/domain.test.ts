import { describe, expect, it } from 'vitest'
import { iso } from './dates'
import { easterSunday, legalHolidays } from './holidays'
import { buildYear, type Settings } from './calendar'
import { bridgeDays, trips, usage, workdaysBetween } from './plan'
import { toICS } from './ics'
import { decodePlan, encodePlan } from '../usePlan'

const settings: Settings = { region: 'HE', entitlement: 30, carryover: 0, eves: 'full' }
const hessen = buildYear(2027, settings)
const day = (date: string, days = hessen) => days.find((d) => d.date === date)!

describe('holidays', () => {
  it('finds Easter Sunday', () => {
    expect(iso(easterSunday(2027))).toBe('2027-03-28')
    expect(iso(easterSunday(2026))).toBe('2026-04-05')
    expect(iso(easterSunday(2024))).toBe('2024-03-31')
  })

  it('lists the movable holidays of 2027', () => {
    const dates = Object.fromEntries(legalHolidays(2027).map((h) => [h.name, h.date]))
    expect(dates).toMatchObject({
      Karfreitag: '2027-03-26',
      Ostermontag: '2027-03-29',
      'Christi Himmelfahrt': '2027-05-06',
      Pfingstmontag: '2027-05-17',
      Fronleichnam: '2027-05-27',
    })
  })

  it('makes Allerheiligen a holiday only in Rheinland-Pfalz', () => {
    expect(day('2027-11-01').kind).toBe('workday')
    expect(day('2027-11-01').elsewhere?.name).toBe('Allerheiligen')
    const rlp = buildYear(2027, { ...settings, region: 'RP' })
    expect(day('2027-11-01', rlp).kind).toBe('holiday')
  })
})

describe('calendar', () => {
  it('has 365 days, weekends and holidays cost nothing', () => {
    expect(hessen).toHaveLength(365)
    expect(day('2027-01-02')).toMatchObject({ kind: 'weekend', cost: 0 })
    expect(day('2027-05-06')).toMatchObject({ kind: 'holiday', cost: 0 })
    expect(day('2027-05-07')).toMatchObject({ kind: 'workday', cost: 1 })
  })

  it('counts Hessen working days in 2027', () => {
    expect(hessen.filter((d) => d.kind === 'workday')).toHaveLength(255) // 261 weekdays, 6 of them holidays
  })

  it('marks the Rheinland-Pfalz school holidays without changing what a day costs', () => {
    expect(day('2027-01-08').schoolBreak?.name).toBe('Weihnachtsferien')
    expect(day('2027-01-11').schoolBreak).toBeUndefined()
    expect(day('2027-03-22')).toMatchObject({ kind: 'workday', cost: 1, schoolBreak: { name: 'Osterferien' } })
    expect(day('2027-08-06').schoolBreak?.name).toBe('Sommerferien')
    expect(day('2027-12-31').schoolBreak?.name).toBe('Weihnachtsferien')
  })

  it('applies the company rule for Heiligabend and Silvester', () => {
    expect(day('2027-12-24', buildYear(2027, { ...settings, eves: 'half' })).cost).toBe(0.5)
    expect(day('2027-12-31', buildYear(2027, { ...settings, eves: 'off' }))).toMatchObject({ kind: 'company', cost: 0 })
  })
})

describe('plan', () => {
  it('stretches a week off over both weekends and charges only working days', () => {
    const booked = new Set(workdaysBetween(hessen, '2027-05-03', '2027-05-07'))
    expect(trips(hessen, booked)).toEqual([
      { start: '2027-05-01', end: '2027-05-09', length: 9, cost: 4, booked: [...booked].filter((d) => d !== '2027-05-06') },
    ])
  })

  it('charges the Easter week without Karfreitag and Ostermontag', () => {
    const booked = new Set(workdaysBetween(hessen, '2027-03-22', '2027-04-02'))
    expect(usage(hessen, booked, settings)).toMatchObject({ used: 8, remaining: 22 })
    expect(trips(hessen, booked)[0]).toMatchObject({ start: '2027-03-20', end: '2027-04-04', length: 16 })
  })

  it('tracks Resturlaub booked before it expires on 31 March', () => {
    const booked = new Set(['2027-03-30', '2027-03-31', '2027-04-01'])
    expect(usage(hessen, booked, { ...settings, carryover: 5 })).toMatchObject({
      total: 35,
      used: 3,
      carryoverUsed: 2,
      carryoverAtRisk: 3,
    })
  })

  it('finds the bridge days', () => {
    expect(bridgeDays(hessen).map((d) => d.date)).toEqual(['2027-05-07', '2027-05-28'])
    const rlp = buildYear(2027, { ...settings, region: 'RP' })
    expect(bridgeDays(rlp).map((d) => d.date)).toEqual(['2027-05-07', '2027-05-28'])
  })
})

describe('ics export', () => {
  it('writes one all-day event per period, from the first to the last booked day', () => {
    const booked = new Set([...workdaysBetween(hessen, '2027-08-02', '2027-08-10'), '2027-05-18'])
    const ics = toICS(trips(hessen, booked), 2027, new Date('2026-11-04T20:00:00Z'))
    const events = ics.split('BEGIN:VEVENT').slice(1)
    expect(events).toHaveLength(2)
    expect(events[0]).toContain('DTSTART;VALUE=DATE:20270518\r\nDTEND;VALUE=DATE:20270519')
    expect(events[0]).toContain('DESCRIPTION:1 Urlaubstag\\, 4 Tage frei (15.05.–18.05.)')
    expect(events[1]).toContain('DTSTART;VALUE=DATE:20270802\r\nDTEND;VALUE=DATE:20270811')
    expect(events[1]).toContain('UID:urlaub-2027-2027-08-02@urlaub-planer')
    expect(ics).toMatch(/^BEGIN:VCALENDAR\r\n[\s\S]*DTSTAMP:20261104T200000Z[\s\S]*END:VCALENDAR\r\n$/)
  })
})

describe('plan code', () => {
  const plan = { settings: { ...settings, carryover: 2.5, eves: 'half' as const }, booked: ['2027-05-18', '2027-03-30'] }

  it('round-trips a plan, sorting the days', () => {
    expect(decodePlan(encodePlan(plan))).toEqual({ ...plan, booked: ['2027-03-30', '2027-05-18'] })
  })

  it('tolerates line breaks pasted into the code', () => {
    const code = encodePlan(plan)
    expect(decodePlan(`  ${code.slice(0, 20)}\n${code.slice(20)}\n`)?.booked).toHaveLength(2)
  })

  it('rejects anything that is not a plan', () => {
    expect(decodePlan('hello')).toBeNull()
    expect(decodePlan(btoa('{"foo":1}'))).toBeNull()
    expect(decodePlan('')).toBeNull()
  })
})
