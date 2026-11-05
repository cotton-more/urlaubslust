import { useEffect, useMemo, useRef, useState, type PointerEvent, type ReactNode } from 'react'
import { buildYear, isOff, type Day } from './domain/calendar'
import type { ISODate } from './domain/dates'
import { REGIONS } from './domain/holidays'
import { POPULATION, type SchoolBreak } from './domain/schoolBreaks'
import { toICS } from './domain/ics'
import { bridgeDays, trips, usage, workdaysBetween, type Trip } from './domain/plan'
import { dayLabel, days as daysWord, rangeLabel } from './format'
import { usePlan, type Years } from './usePlan'
import { useSchoolBreaks, type BreaksStatus } from './useSchoolBreaks'
import { CROWD_STEPS, MonthCard, type View } from './components/MonthCard'
import { Segmented } from './components/controls'
import { Summary } from './components/Summary'
import { SettingsPanel } from './components/SettingsPanel'
import { BridgeTips, TripList } from './components/TripList'
import { TransferPanel } from './components/TransferPanel'

export default function App() {
  const { year, setYear, years, plan, saved, replaceAll, setSettings, book, clear } = usePlan()
  const { settings } = plan
  const [hovered, setHovered] = useState<Day | null>(null)
  const [view, setView] = useState<View>('plan')
  const drag = useRef<boolean | null>(null)
  const anchor = useRef<ISODate | null>(null)

  const schoolBreaks = useSchoolBreaks(year)
  const days = useMemo(
    () => buildYear(year, settings, schoolBreaks.breaks),
    [year, settings.work, settings.home, settings.eves, schoolBreaks.breaks],
  )
  const booked = useMemo(() => new Set(plan.booked), [plan.booked])
  const tripList = useMemo(() => trips(days, booked), [days, booked])
  const stats = usage(days, booked, settings)
  const crowdOf = (trip: Trip) => {
    const span = days.filter((d) => d.date >= trip.start && d.date <= trip.end)
    return span.reduce((sum, d) => sum + d.crowd, 0) / span.length
  }
  const covered = useMemo(() => {
    const inTrips = new Set<ISODate>()
    for (const t of tripList) for (const d of days) if (d.date >= t.start && d.date <= t.end && isOff(d)) inTrips.add(d.date)
    return inTrips
  }, [days, tripList])
  const bridges = useMemo(() => bridgeDays(days), [days])
  const bridgeDates = useMemo(() => new Set(bridges.map((d) => d.date)), [bridges])
  const tips = useMemo(
    () =>
      bridges
        .filter((d) => !booked.has(d.date))
        .map((day) => {
          const i = days.indexOf(day)
          const neighbour = [days[i - 1], days[i + 1]].find((d) => d.holiday || d.kind === 'company')
          const gain = trips(days, new Set([day.date])).find((t) => t.start <= day.date && t.end >= day.date)!.length
          return { day, gain, reason: neighbour?.holiday?.name ?? neighbour?.observance?.name ?? 'мост' }
        }),
    [bridges, booked, days],
  )

  useEffect(() => {
    const stop = () => (drag.current = null)
    window.addEventListener('pointerup', stop)
    window.addEventListener('pointercancel', stop)
    return () => {
      window.removeEventListener('pointerup', stop)
      window.removeEventListener('pointercancel', stop)
    }
  }, [])

  const press = (day: Day, event: PointerEvent) => {
    if (isOff(day) || event.button !== 0) return
    event.preventDefault()
    const on = !booked.has(day.date)
    book(event.shiftKey && anchor.current ? workdaysBetween(days, anchor.current, day.date) : [day.date], on)
    anchor.current = day.date
    drag.current = on
  }
  const enter = (day: Day) => {
    setHovered(day)
    if (drag.current !== null && !isOff(day)) book([day.date], drag.current)
  }
  const removeTrip = (trip: Trip) => book(trip.booked, false)
  const exportICS = () => {
    const url = URL.createObjectURL(new Blob([toICS(tripList, year, new Date())], { type: 'text/calendar;charset=utf-8' }))
    const link = Object.assign(document.createElement('a'), { href: url, download: `urlaub-${year}.ics` })
    link.click()
    URL.revokeObjectURL(url)
  }
  const daysOff = tripList.reduce((sum, t) => sum + t.length, 0)

  return (
    <div className="relative min-h-screen overflow-x-hidden">
      <div aria-hidden className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 -left-32 size-[34rem] rounded-full bg-blush-200/50 blur-[120px]" />
        <div className="absolute top-1/3 -right-40 size-[30rem] rounded-full bg-peach-200/50 blur-[120px]" />
        <div className="absolute -bottom-40 left-1/3 size-[30rem] rounded-full bg-lilac-200/50 blur-[120px]" />
      </div>

      <div className="relative mx-auto max-w-[1600px] px-4 py-8 sm:px-8">
        <header className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <p className="mb-2 text-xs font-semibold tracking-[0.3em] text-stone-500 uppercase">
              {settings.work === settings.home ? REGIONS[settings.work] : `работа: ${REGIONS[settings.work]} · дом: ${REGIONS[settings.home]}`}
            </p>
            <h1 className="font-display text-4xl font-bold tracking-tight sm:text-5xl">
              Отпуск{' '}
              <span className="bg-linear-to-r from-blush-600 to-peach-600 bg-clip-text text-transparent">{year}</span>
            </h1>
            <YearPicker year={year} planned={years} onChange={setYear} />
          </div>
          <div className="flex items-center gap-3">
            <span className="flex items-center gap-2 rounded-full border border-stone-200 bg-white/70 px-3 py-1.5 text-xs text-stone-500">
              <span className={`size-1.5 rounded-full ${saved ? 'bg-sage-400' : 'bg-berry-400'}`} />
              {saved ? 'сохранено в браузере' : 'не сохраняется'}
            </span>
            {plan.booked.length > 0 && (
              <button
                type="button"
                onClick={() => confirm(`Сбросить все отмеченные дни ${year} года?`) && clear()}
                className="rounded-full border border-stone-200 bg-white/70 px-3 py-1.5 text-xs text-stone-500 transition hover:border-berry-400/50 hover:text-berry-600"
              >
                сбросить всё
              </button>
            )}
          </div>
        </header>

        <div className="grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,1fr)_360px]">
          <main>
            <Legend home={settings.home} view={view} onView={setView} />
            <div
              className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 2xl:grid-cols-4"
              onPointerLeave={() => setHovered(null)}
            >
              {Array.from({ length: 12 }, (_, month) => (
                <MonthCard
                  key={month}
                  view={view}
                  year={year}
                  month={month}
                  days={days.filter((d) => d.month === month)}
                  booked={booked}
                  covered={covered}
                  bridges={bridgeDates}
                  onPress={press}
                  onEnter={enter}
                  onKeyToggle={(day) => book([day.date], !booked.has(day.date))}
                />
              ))}
            </div>
          </main>

          <aside className="order-first grid min-w-0 grid-cols-1 content-start gap-6 xl:order-none xl:sticky xl:top-8 xl:max-h-[calc(100vh-4rem)] xl:overflow-y-auto xl:pb-4 [scrollbar-width:none]">
            <Summary year={year} usage={stats} daysOff={daysOff} tripCount={tripList.length} />
            <SettingsPanel year={year} settings={settings} onChange={setSettings} />
            <Section title="Периоды отпуска">
              <TripList trips={tripList} crowdOf={crowdOf} onRemove={removeTrip} />
              {tripList.length > 0 && (
                <div className="grid gap-2">
                  <button
                    type="button"
                    onClick={exportICS}
                    className="flex items-center justify-center gap-2 rounded-2xl bg-linear-to-r from-blush-600 to-peach-600 px-4 py-3 text-sm font-semibold text-white shadow-md shadow-blush-600/25 transition hover:shadow-blush-600/40 active:scale-[0.98]"
                  >
                    <span aria-hidden>📅</span> Скачать для календаря (.ics)
                  </button>
                  <p className="px-1 text-xs leading-relaxed text-stone-500">
                    Google Календарь → ⚙ Настройки → Импорт и экспорт → выбрать файл. Удобно импортировать в отдельный
                    календарь «Отпуск» — его легко очистить и залить заново.
                  </p>
                </div>
              )}
            </Section>
            <Section title="Другое устройство">
              <TransferPanel years={years} onImport={replaceAll} />
            </Section>
            <Section title={`Школьные каникулы · ${settings.home}`}>
              <SchoolBreaks
                year={year}
                region={REGIONS[settings.home]}
                status={schoolBreaks.status}
                breaks={schoolBreaks.breaks.filter((b) => b.regions.includes(settings.home))}
              />
            </Section>
            {tips.length > 0 && (
              <Section title="Brückentage">
                <BridgeTips tips={tips} onTake={(day) => book([day.date], true)} />
              </Section>
            )}
          </aside>
        </div>
      </div>

      <HoverBar day={hovered} booked={hovered ? booked.has(hovered.date) : false} work={REGIONS[settings.work]} home={settings.home} />
    </div>
  )
}

function Section({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="grid gap-3">
      <h3 className="px-1 text-xs font-semibold tracking-[0.2em] text-stone-500 uppercase">{title}</h3>
      {children}
    </section>
  )
}

function YearPicker({ year, planned, onChange }: { year: number; planned: Years; onChange: (year: number) => void }) {
  const near = [year - 1, year, year + 1]
  const button = 'rounded-full px-2.5 py-1 text-xs font-semibold transition'
  return (
    <nav className="mt-3 flex items-center gap-1 text-stone-500">
      <button type="button" onClick={() => onChange(year - 1)} aria-label="Предыдущий год" className={`${button} hover:bg-white/70 hover:text-stone-900`}>
        ‹
      </button>
      {near.map((y) => (
        <button
          key={y}
          type="button"
          onClick={() => onChange(y)}
          className={`${button} ${y === year ? 'bg-white text-stone-900 shadow-sm' : 'hover:bg-white/70 hover:text-stone-900'}`}
        >
          {y}
          {y !== year && planned[y]?.booked.length ? <span className="ml-1 inline-block size-1 rounded-full bg-blush-500 align-middle" /> : null}
        </button>
      ))}
      <button type="button" onClick={() => onChange(year + 1)} aria-label="Следующий год" className={`${button} hover:bg-white/70 hover:text-stone-900`}>
        ›
      </button>
    </nav>
  )
}

interface SchoolBreaksProps {
  year: number
  region: string
  breaks: readonly SchoolBreak[]
  status: BreaksStatus
}

function SchoolBreaks({ year, region, breaks, status }: SchoolBreaksProps) {
  const own = String(year)
  const empty = {
    loading: 'Загружаю каникулы…',
    failed: 'Не получилось загрузить каникулы — нет связи с openholidaysapi.org.',
    ready: `${region} ещё не опубликовала каникулы на ${year} год.`,
  }[status]
  return (
    <div className="rounded-3xl border border-white bg-white/70 p-4 text-sm shadow-sm shadow-stone-900/5">
      {breaks.length === 0 && <p className="text-stone-500">{empty}</p>}
      <ul className="grid gap-1.5">
        {breaks.map((b) => (
          <li key={`${b.start}-${b.name}`} className="flex items-center gap-3">
            <span className="h-[3px] w-4 shrink-0 rounded-full bg-lilac-500/55" />
            <span className="flex-1 text-stone-700">{b.name}</span>
            <span className="text-xs text-stone-500 tabular-nums">
              {rangeLabel(b.start, b.end)}
              {!b.start.startsWith(own) || !b.end.startsWith(own) ? ` ${b.start.slice(2, 4)}/${b.end.slice(2, 4)}` : ''}
            </span>
          </li>
        ))}
      </ul>
      <p className="mt-3 text-xs leading-relaxed text-stone-500">
        Только для справки, отпуск не меняют. Данные — openholidaysapi.org. Плюс у школ бывают свои bewegliche
        Ferientage — их даты знает только школа.
      </p>
    </div>
  )
}

function Legend({ home, view, onView }: { home: string; view: View; onView: (view: View) => void }) {
  const items: [string, string][] = [
    ['bg-linear-to-br from-blush-600 to-peach-600', 'отпуск'],
    ['bg-blush-100 ring-1 ring-inset ring-blush-200', 'выходные внутри отпуска'],
    ['bg-sage-100 ring-1 ring-inset ring-sage-300', 'праздник'],
    ['outline-1 outline-dashed outline-butter-500', `праздник только дома (${home})`],
    ['bg-butter-500 !size-1.5 rounded-full', 'мостик'],
    ['bg-mist-500 !size-1.5 rounded-full', 'особый день'],
    ['bg-lilac-500/55 !h-[3px] !w-3 rounded-full', `школьные каникулы ${home}`],
  ]
  return (
    <div className="mb-5 flex flex-wrap items-center justify-between gap-x-6 gap-y-3 px-1 text-xs text-stone-500">
      {view === 'plan' ? (
        <div className="flex flex-wrap gap-x-5 gap-y-2">
          {items.map(([swatch, label]) => (
            <span key={label} className="flex items-center gap-2">
              <span className={`size-3 rounded ${swatch}`} />
              {label}
            </span>
          ))}
        </div>
      ) : (
        <div className="flex flex-wrap items-center gap-x-4 gap-y-2">
          <span>Какая доля Германии на школьных каникулах (по населению земель):</span>
          <span className="flex items-center gap-1">
            {CROWD_STEPS.map((step, i) => (
              <span key={step} className="grid justify-items-center gap-1">
                <span className={`h-3 w-8 rounded ${step} ring-1 ring-stone-200 ring-inset`} />
                <span className="text-[10px] tabular-nums">{i === 0 ? '0' : `≤${i * 20}%`}</span>
              </span>
            ))}
          </span>
          <span className="flex items-center gap-2">
            <span className="size-3 rounded ring-2 ring-blush-600 ring-inset" />
            отпуск
          </span>
        </div>
      )}
      <div className="w-64">
        <Segmented<View>
          value={view}
          options={[
            ['plan', 'план'],
            ['crowd', 'загруженность'],
          ]}
          onChange={onView}
        />
      </div>
    </div>
  )
}

function HoverBar({ day, booked, work, home }: { day: Day | null; booked: boolean; work: string; home: string }) {
  const lines: string[] = []
  if (day) {
    if (day.holiday) lines.push(`${day.holiday.name} — праздник в ${work}`)
    else if (day.kind === 'weekend') lines.push('выходной')
    else if (day.kind === 'company') lines.push('фирма не работает')
    else if (booked) lines.push(`в отпуске · −${daysWord(day.cost)}`)
    else lines.push(day.cost < 1 ? 'рабочий полдня' : 'рабочий день')
    if (day.elsewhere) lines.push(`${day.elsewhere.name} — праздник дома (${home}), но не на работе`)
    if (day.observance && !day.holiday) lines.push(`${day.observance.name}: ${day.observance.note}`)
    if (day.schoolBreak) lines.push(`${day.schoolBreak.name} в школах ${home}`)
    if (day.onBreak.length === 16) lines.push('каникулы во всех землях')
    else if (day.onBreak.length > 0) {
      const regions = [...day.onBreak].sort((a, b) => POPULATION[b] - POPULATION[a]).join(', ')
      lines.push(`каникулы у ${Math.round(day.crowd * 100)}% Германии: ${regions}`)
    }
  }
  return (
    <div
      className={`pointer-events-none fixed bottom-6 left-1/2 z-10 max-w-[calc(100vw-2rem)] -translate-x-1/2 rounded-2xl border border-stone-200 bg-white/90 px-5 py-3 text-sm text-stone-800 shadow-xl shadow-stone-900/10 backdrop-blur-xl transition duration-200 ${day ? 'translate-y-0 opacity-100' : 'translate-y-3 opacity-0'}`}
    >
      {day && (
        <>
          <span className="font-semibold">{dayLabel(day.date)}</span>
          {lines.map((line) => (
            <span key={line} className="text-stone-500">
              {' · '}
              {line}
            </span>
          ))}
        </>
      )}
    </div>
  )
}
