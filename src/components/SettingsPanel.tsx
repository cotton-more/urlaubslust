import { useRef, useState } from 'react'
import { hasRule, type CompanyDays, type Day, type DayRule, type Settings } from '../domain/calendar'
import type { ISODate } from '../domain/dates'
import { dayLabel } from '../format'
import { RULE_LABELS } from './DayMenu'
import { RegionSelect, Reveal, Segmented, Stepper } from './controls'

interface Props {
  year: number
  days: readonly Day[]
  settings: Settings
  companyDays: CompanyDays
  onChange: (patch: Partial<Settings>) => void
  onDayRule: (date: ISODate, rule: DayRule) => void
}

export function SettingsPanel({ year, days, settings, companyDays, onChange, onDayRule }: Props) {
  return (
    <div className="grid gap-4 rounded-3xl border border-white bg-white/70 p-5 shadow-sm shadow-stone-900/5 backdrop-blur-xl">
      <div className="grid grid-cols-2 gap-3">
        <Stepper label={`Отпуск в ${year}, раб. дней`} step={1} value={settings.entitlement} onChange={(entitlement) => onChange({ entitlement })} />
        <Stepper label={`Остаток с ${year - 1}`} step={0.5} value={settings.carryover} onChange={(carryover) => onChange({ carryover })} />
      </div>
      <div className="grid gap-2">
        <RegionSelect
          role="work"
          caption="Работа — её праздники"
          value={settings.work}
          other={{ region: settings.home, tag: 'дом' }}
          onChange={(work) => onChange({ work })}
        />
        <RegionSelect
          role="home"
          caption="Дом — школьные каникулы"
          value={settings.home}
          other={{ region: settings.work, tag: 'работа' }}
          onChange={(home) => onChange({ home })}
        />
      </div>
      <EveSetting caption="24.12 в фирме" value={settings.christmasEve} onChange={(christmasEve) => onChange({ christmasEve })} />
      <EveSetting caption="31.12 в фирме" value={settings.newYearsEve} onChange={(newYearsEve) => onChange({ newYearsEve })} />
      <CompanyDaysList year={year} days={days} companyDays={companyDays} onDayRule={onDayRule} />
      <Reveal title="Как считается">
        <div className="mt-2 grid gap-2 pl-3">
          <p>
            Отпуск списывается только за рабочие дни. Выходные и гос. праздники внутри отпуска не тратят дни (§ 3 BUrlG) —
            их можно даже не кликать, они сами войдут в период отпуска.
          </p>
          <p>
            Праздники действуют по месту работы (Arbeitsort), а не по месту жительства. Праздники земли, где живёшь,
            но не работаешь, обведены пунктиром — в эти дни ты работаешь.
          </p>
          <p>
            Настройки свои у каждого года. Год, который ещё не планировался, берёт их у предыдущего — так что переезд
            или новую работу достаточно указать в первом году, где они начинаются.
          </p>
          <p>
            Свои дни фирмы — закрытый Brückentag, полдня перед корпоративом — задаются правым кликом по дню в
            календаре и действуют только в этом году. 24.12 и 31.12 переходят и в следующие годы.
          </p>
          <p>Остаток прошлого года нужно взять до 31 марта, иначе он сгорает (§ 7 Abs. 3 BUrlG).</p>
        </div>
      </Reveal>
    </div>
  )
}

function EveSetting({ caption, value, onChange }: { caption: string; value: DayRule; onChange: (rule: DayRule) => void }) {
  return (
    <div className="grid gap-1.5">
      <span className="text-xs text-stone-500">{caption}</span>
      <Segmented<DayRule>
        value={value}
        options={RULE_LABELS}
        onChange={onChange}
      />
    </div>
  )
}

/** This year's own company days; a right click on a day in the calendar adds one too. */
function CompanyDaysList({
  year,
  days,
  companyDays,
  onDayRule,
}: {
  year: number
  days: readonly Day[]
  companyDays: CompanyDays
  onDayRule: (date: ISODate, rule: DayRule) => void
}) {
  const picker = useRef<HTMLInputElement>(null)
  const [hint, setHint] = useState<string | null>(null)
  const entries = Object.entries(companyDays).sort(([a], [b]) => a.localeCompare(b)) as [ISODate, DayRule][]

  const add = (date: string) => {
    const day = days.find((d) => d.date === date)
    if (!day) return
    if (date.endsWith('-12-24') || date.endsWith('-12-31')) setHint('24.12 и 31.12 настраиваются выше.')
    else if (!hasRule(day)) setHint(`${dayLabel(date)} и так выходной.`)
    else {
      setHint(null)
      onDayRule(day.date, companyDays[day.date] ?? 'off')
    }
  }

  return (
    <div className="grid gap-1.5">
      <span className="text-xs text-stone-500">Свои дни фирмы в {year}</span>
      {entries.map(([date, rule]) => (
        <div key={date} className="flex items-center gap-2">
          <span className="w-24 shrink-0 text-xs font-medium text-stone-700">{dayLabel(date)}</span>
          <div className="min-w-0 flex-1">
            <Segmented<DayRule> value={rule} options={RULE_LABELS.slice(1)} onChange={(next) => onDayRule(date, next)} />
          </div>
          <button
            type="button"
            aria-label={`Убрать ${dayLabel(date)}`}
            onClick={() => onDayRule(date, 'full')}
            className="grid size-7 shrink-0 cursor-pointer place-items-center rounded-full text-stone-400 transition hover:bg-berry-400/10 hover:text-berry-600"
          >
            ×
          </button>
        </div>
      ))}
      <div className="relative flex flex-wrap items-center gap-x-2 gap-y-1">
        <button
          type="button"
          onClick={() => picker.current?.showPicker()}
          className="cursor-pointer rounded-xl border border-dashed border-stone-300 px-3 py-1.5 text-xs font-semibold text-stone-600 transition hover:border-blush-300 hover:text-blush-600"
        >
          + день
        </button>
        <span className="text-[11px] text-stone-500">или правый клик по дню в календаре</span>
        <input
          ref={picker}
          type="date"
          tabIndex={-1}
          aria-hidden
          min={`${year}-01-01`}
          max={`${year}-12-31`}
          value=""
          onChange={(e) => add(e.target.value)}
          className="pointer-events-none absolute size-0 opacity-0"
        />
      </div>
      {hint && <span className="text-[11px] text-berry-600">{hint}</span>}
    </div>
  )
}
