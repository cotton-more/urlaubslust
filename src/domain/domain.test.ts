import { describe, expect, it } from 'vitest'
import { iso } from './dates'
import { easterSunday, legalHolidays } from './holidays'
import { buildYear, type Settings } from './calendar'
import type { Region } from './holidays'
import { bridgeDays, holidayLuck, longStretches, trips, usage, workdaysBetween } from './plan'
import { toICS } from './ics'
import { blankPlan, decodePlans, encodePlans, withDayRule } from '../usePlan'
import { crowd, crowdSectors, parseSchoolBreaks, schoolBreaksURL } from './schoolBreaks'

const settings: Settings = { work: 'HE', home: 'RP', entitlement: 30, carryover: 0, christmasEve: 'full', newYearsEve: 'full' }
const RLP_BREAKS_2027 = [
  { name: 'Weihnachtsferien', start: '2026-12-23', end: '2027-01-08', regions: ['RP'] as Region[] },
  { name: 'Osterferien', start: '2027-03-22', end: '2027-04-02', regions: ['RP'] as Region[] },
  { name: 'Sommerferien', start: '2027-06-28', end: '2027-08-06', regions: ['RP'] as Region[] },
  { name: 'Weihnachtsferien', start: '2027-12-23', end: '2028-01-07', regions: ['RP'] as Region[] },
]
const hessen = buildYear(2027, settings, RLP_BREAKS_2027)
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

  it('marks Allerheiligen as a home holiday when working in Hessen and living in Rheinland-Pfalz', () => {
    expect(day('2027-11-01').kind).toBe('workday')
    expect(day('2027-11-01').elsewhere?.name).toBe('Allerheiligen')
    const rlp = buildYear(2027, { ...settings, work: 'RP' })
    expect(day('2027-11-01', rlp).kind).toBe('holiday')
    expect(day('2027-11-01', buildYear(2027, { ...settings, home: 'HE' })).elsewhere).toBeUndefined()
  })

  it('knows the holidays of other Bundesländer', () => {
    const holidays = (work: Settings['work'], year = 2027) =>
      buildYear(year, { ...settings, work, home: work })
        .filter((d) => d.holiday)
        .map((d) => d.holiday!.name)
    expect(holidays('BY')).toContain('Heilige Drei Könige')
    expect(holidays('BE')).toContain('Internationaler Frauentag')
    expect(holidays('NI')).toContain('Reformationstag')
    expect(holidays('TH')).toContain('Weltkindertag')
    expect(holidays('HE')).toHaveLength(10)
    expect(holidays('SN', 2026)).toHaveLength(11)
  })

  it('puts Buß- und Bettag on the Wednesday before 23 November', () => {
    const date = (year: number) => legalHolidays(year).find((h) => h.name === 'Buß- und Bettag')!.date
    expect([2026, 2027, 2028, 2033].map(date)).toEqual(['2026-11-18', '2027-11-17', '2028-11-22', '2033-11-16'])
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

  it('applies company days on weekdays, before the rule for 24.12 and 31.12, but never on holidays', () => {
    const days = buildYear(2027, {
      ...settings,
      christmasEve: 'off',
      companyDays: { '2027-05-07': 'off', '2027-02-08': 'half', '2027-12-24': 'half', '2027-05-06': 'off' },
    })
    expect(day('2027-05-07', days)).toMatchObject({ kind: 'company', cost: 0 })
    expect(day('2027-02-08', days)).toMatchObject({ kind: 'workday', cost: 0.5 })
    expect(day('2027-12-24', days).cost).toBe(0.5)
    expect(day('2027-05-06', days)).toMatchObject({ kind: 'holiday', cost: 0 })
  })

  it('lets a weekend or holiday be worked, costing vacation like any working day', () => {
    const days = buildYear(2027, { ...settings, companyDays: { '2027-03-06': 'full', '2027-05-06': 'half' } })
    expect(day('2027-03-06', days)).toMatchObject({ kind: 'workday', restDay: true, cost: 1 })
    expect(day('2027-05-06', days)).toMatchObject({ kind: 'workday', restDay: true, cost: 0.5, holiday: { name: 'Christi Himmelfahrt' } })
    expect(day('2027-03-07', days)).toMatchObject({ kind: 'weekend', restDay: true, cost: 0 })
    expect(usage(days, new Set(['2027-03-06', '2027-05-06', '2027-03-07']), settings).used).toBe(1.5)
  })

  it('applies the company rule for Heiligabend and Silvester separately', () => {
    const days = buildYear(2027, { ...settings, christmasEve: 'half', newYearsEve: 'off' })
    expect(day('2027-12-24', days)).toMatchObject({ kind: 'workday', cost: 0.5 })
    expect(day('2027-12-31', days)).toMatchObject({ kind: 'company', cost: 0 })
    expect(day('2027-12-31', buildYear(2027, { ...settings, christmasEve: 'off' }))).toMatchObject({ kind: 'workday', cost: 1 })
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
    const rlp = buildYear(2027, { ...settings, work: 'RP' })
    expect(bridgeDays(rlp).map((d) => d.date)).toEqual(['2027-05-07', '2027-05-28'])
  })
})

describe('holiday luck', () => {
  const lost = (year: number, work: Settings['work'] = 'HE') =>
    holidayLuck(buildYear(year, { ...settings, work, home: work })).weekend.map((h) => h.name)

  it('counts the holidays lost to weekends', () => {
    expect(lost(2027)).toEqual(['Tag der Arbeit', 'Tag der Deutschen Einheit', '1. Weihnachtstag', '2. Weihnachtstag'])
    expect(holidayLuck(hessen).weekday).toHaveLength(6)
    expect(lost(2028)).toEqual(['Neujahr'])
    expect(lost(2029)).toEqual([])
  })

  it('depends on the Land of work', () => {
    expect(lost(2027, 'RP')).toHaveLength(4) // Allerheiligen is a Monday
    expect(lost(2026, 'RP')).toEqual(['Tag der Deutschen Einheit', 'Allerheiligen', '2. Weihnachtstag'])
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
  const plan = {
    settings: { ...settings, carryover: 2.5, christmasEve: 'half' as const },
    booked: ['2027-05-18', '2027-03-30'],
    companyDays: { '2027-05-07': 'off' as const },
  }
  const years = { 2027: plan, 2028: { settings, booked: ['2028-01-03'], companyDays: {} } }

  it('round-trips every year, sorting the days', () => {
    expect(decodePlans(encodePlans(years))).toEqual({ ...years, 2027: { ...plan, booked: ['2027-03-30', '2027-05-18'] } })
  })

  it('tolerates line breaks pasted into the code', () => {
    const code = encodePlans(years)
    expect(decodePlans(`  ${code.slice(0, 20)}\n${code.slice(20)}\n`)?.[2027].booked).toHaveLength(2)
  })

  it('drops days that belong to another year', () => {
    const code = encodePlans({ 2027: { settings, booked: ['2027-01-04', '2028-01-03'], companyDays: { '2028-01-03': 'off' } } })
    expect(decodePlans(code)?.[2027]).toMatchObject({ booked: ['2027-01-04'], companyDays: {} })
  })

  it('reads plans from before company days as having none', () => {
    expect(decodePlans(btoa(JSON.stringify({ 2027: { settings, booked: [] } })))?.[2027].companyDays).toEqual({})
  })

  it('splits the single region of older plans into work there and school breaks from Rheinland-Pfalz', () => {
    const old = { settings: { region: 'HE', entitlement: 29, carryover: 0, eves: 'full' }, booked: [] }
    expect(decodePlans(btoa(JSON.stringify({ 2027: old })))?.[2027].settings).toMatchObject({ work: 'HE', home: 'RP' })
  })

  it('applies the single eves rule of older plans to both Heiligabend and Silvester', () => {
    const old = { settings: { ...settings, christmasEve: undefined, newYearsEve: undefined, eves: 'half' }, booked: [] }
    expect(decodePlans(btoa(JSON.stringify({ 2027: old })))?.[2027].settings).toMatchObject({ christmasEve: 'half', newYearsEve: 'half' })
  })

  it('reads a code from the single-year version', () => {
    expect(decodePlans(btoa(JSON.stringify(plan)))).toEqual({ 2027: { ...plan, booked: ['2027-03-30', '2027-05-18'] } })
  })

  it('rejects anything that is not a plan', () => {
    expect(decodePlans('hello')).toBeNull()
    expect(decodePlans(btoa('{"foo":1}'))).toBeNull()
    expect(decodePlans('')).toBeNull()
  })
})

describe('school breaks', () => {
  it('asks OpenHolidays for every Bundesland in one year', () => {
    expect(schoolBreaksURL(2028)).toBe(
      'https://openholidaysapi.org/SchoolHolidays?countryIsoCode=DE&languageIsoCode=DE&validFrom=2028-01-01&validTo=2028-12-31',
    )
  })

  it('reads an OpenHolidays response, keeping allgemeinbildende Schulen where a Land splits by school type', () => {
    const entry = (startDate: string, endDate: string, text: string, codes: string[], groups?: string[]) => ({
      startDate,
      endDate,
      name: [{ language: 'EN', text: 'Holidays' }, { language: 'DE', text }],
      subdivisions: codes.map((code) => ({ code })),
      ...(groups && { groups: groups.map((code) => ({ code })) }),
    })
    const raw = [
      entry('2028-04-10', '2028-04-21', 'Osterferien', ['DE-RP', 'DE-SL']),
      entry('2027-12-23', '2028-01-07', 'Weihnachtsferien', ['DE-RP']),
      entry('2028-07-10', '2028-08-19', 'Sommerferien', ['DE-MV'], ['DE-MV-ABS']),
      entry('2028-07-17', '2028-08-26', 'Sommerferien', ['DE-MV'], ['DE-MV-BBS']),
      entry('soon', '2028-01-07', 'Kaputt', ['DE-RP']),
      entry('2028-01-01', '2028-01-07', 'Nirgends', ['DE-XX']),
    ]
    expect(parseSchoolBreaks(raw)).toEqual([
      { name: 'Weihnachtsferien', start: '2027-12-23', end: '2028-01-07', regions: ['RP'] },
      { name: 'Osterferien', start: '2028-04-10', end: '2028-04-21', regions: ['RP', 'SL'] },
      { name: 'Sommerferien', start: '2028-07-10', end: '2028-08-19', regions: ['MV'] },
    ])
    expect(() => parseSchoolBreaks({ error: 'nope' })).toThrow()
  })

  it('weighs the Länder on break by population', () => {
    expect(crowd([])).toBe(0)
    expect(crowd(['BW', 'BY', 'BE', 'BB', 'HB', 'HH', 'HE', 'MV', 'NI', 'NW', 'RP', 'SL', 'SN', 'ST', 'SH', 'TH'])).toBeCloseTo(1)
    expect(crowd(['NW'])).toBeCloseTo(0.215, 2)
  })

  it('draws Germany as one sector per Land, the Länder on break first and largest first', () => {
    const sectors = crowdSectors(['SL', 'NW'])
    expect(sectors).toHaveLength(16)
    expect(sectors.slice(0, 3).map((s) => [s.region, s.onBreak])).toEqual([['NW', true], ['SL', true], ['BY', false]])
    expect(sectors[1].to).toBeCloseTo(crowd(['SL', 'NW']))
    expect(sectors.at(-1)?.to).toBeCloseTo(1)
    expect(sectors.every((s, i) => i === 0 || s.from === sectors[i - 1].to)).toBe(true)
  })

  it('tells each day who is on break, and which break is at home', () => {
    const breaks = [
      { name: 'Sommerferien', start: '2027-06-28', end: '2027-08-06', regions: ['RP', 'SL'] as Region[] },
      { name: 'Sommerferien', start: '2027-07-22', end: '2027-09-01', regions: ['NW'] as Region[] },
    ]
    const days = buildYear(2027, settings, breaks)
    expect(day('2027-07-01', days)).toMatchObject({ onBreak: ['RP', 'SL'], schoolBreak: { name: 'Sommerferien' } })
    expect(day('2027-08-02', days).onBreak).toEqual(['RP', 'SL', 'NW'])
    expect(day('2027-08-20', days)).toMatchObject({ onBreak: ['NW'], schoolBreak: undefined })
    expect(day('2027-08-20', days).crowd).toBeCloseTo(crowd(['NW']))
  })
})

describe('long stretches', () => {
  it('finds stretches over ten weeks without a long weekend, ignoring plain weekends', () => {
    // Hessen 2027 with 24.12 and 31.12 worked: after Neujahr nothing until Easter, after Pfingsten nothing at all
    // (Fronleichnam on a Thursday alone and Christmas on a weekend make no break).
    expect(longStretches(hessen, new Set()).map((s) => [s.start, s.end])).toEqual([
      ['2027-01-04', '2027-03-25'],
      ['2027-05-18', '2027-12-31'],
    ])
  })

  it('suggests one day that makes a long weekend near the middle, and splitting there leaves no long stretch', () => {
    const autumn = longStretches(hessen, new Set())[1]
    const tip = autumn.tip!
    expect(tip.gain).toBeGreaterThanOrEqual(3)
    expect(tip.day.date > '2027-08-15' && tip.day.date < '2027-10-01').toBe(true)
    const after = longStretches(hessen, new Set([tip.day.date])).filter((s) => s.start >= autumn.start)
    expect(after.every((s) => s.length <= autumn.length / 2 + 7)).toBe(true)
  })

  it('counts a booked week as a break', () => {
    const booked = new Set(workdaysBetween(hessen, '2027-08-30', '2027-09-03'))
    expect(longStretches(hessen, booked).some((s) => s.start <= '2027-09-01' && s.end >= '2027-09-01')).toBe(false)
  })
})

describe('day rules', () => {
  const plan = { settings, booked: [], companyDays: { '2027-05-07': 'off' as const } }

  it('stores a rule only while it differs from the day\'s default', () => {
    expect(withDayRule(plan, { date: '2027-03-06', restDay: true }, 'full').companyDays).toEqual({ '2027-05-07': 'off', '2027-03-06': 'full' })
    expect(withDayRule(plan, { date: '2027-05-07', restDay: false }, 'full').companyDays).toEqual({})
    expect(withDayRule(plan, { date: '2027-03-06', restDay: true }, 'off')).toEqual(plan)
  })

  it('sends 24.12 and 31.12 on weekdays to their settings, and on a weekend to the company days', () => {
    expect(withDayRule(plan, { date: '2027-12-24', restDay: false }, 'off')).toMatchObject({ settings: { christmasEve: 'off' }, companyDays: plan.companyDays })
    expect(withDayRule(plan, { date: '2027-12-31', restDay: false }, 'half').settings.newYearsEve).toBe('half')
    expect(withDayRule(plan, { date: '2028-12-24', restDay: true }, 'full')).toMatchObject({ settings, companyDays: { '2028-12-24': 'full' } })
  })
})

describe('years', () => {
  it('starts a new year with the settings of the closest earlier one, without carryover', () => {
    const years = {
      2027: { settings: { ...settings, entitlement: 29, carryover: 3 }, booked: ['2027-01-04'], companyDays: { '2027-05-07': 'off' as const } },
    }
    expect(blankPlan(years, 2029)).toEqual({ settings: { ...settings, entitlement: 29, carryover: 0 }, booked: [], companyDays: {} })
    expect(blankPlan(years, 2026).settings.entitlement).toBe(29)
    expect(blankPlan({}, 2027).booked).toEqual([])
  })


  it('computes the holidays of any year', () => {
    const days = buildYear(2028, settings)
    expect(days).toHaveLength(366)
    expect(days.find((d) => d.date === '2028-04-14')?.holiday?.name).toBe('Karfreitag')
  })
})
