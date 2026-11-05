import type { EveRule, Settings } from '../domain/calendar'
import { REGIONS, type Region } from '../domain/holidays'

interface Props {
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
}

function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  return (
    <div className="flex rounded-2xl bg-stone-100 p-1">
      {options.map(([key, label]) => (
        <button
          key={key}
          type="button"
          onClick={() => onChange(key)}
          className={`flex-1 rounded-xl px-2 py-1.5 text-xs font-semibold transition ${value === key ? 'bg-white text-stone-900 shadow-sm' : 'text-stone-500 hover:text-stone-800'}`}
        >
          {label}
        </button>
      ))}
    </div>
  )
}

function NumberField({ label, value, onChange }: { label: string; value: number; onChange: (v: number) => void }) {
  return (
    <label className="grid gap-1.5">
      <span className="text-xs text-stone-500">{label}</span>
      <input
        type="number"
        min={0}
        max={366}
        step={0.5}
        value={value}
        onChange={(e) => onChange(Math.max(0, Number(e.target.value) || 0))}
        className="w-full rounded-2xl border border-stone-200 bg-white px-4 py-2.5 font-display text-lg font-bold outline-none transition focus:border-blush-300 focus:ring-4 focus:ring-blush-200/50"
      />
    </label>
  )
}

export function SettingsPanel({ settings, onChange }: Props) {
  return (
    <div className="grid gap-4 rounded-3xl border border-white bg-white/70 p-5 shadow-sm shadow-stone-900/5 backdrop-blur-xl">
      <div className="grid grid-cols-2 gap-3">
        <NumberField label="Отпуск в 2027, раб. дней" value={settings.entitlement} onChange={(entitlement) => onChange({ entitlement })} />
        <NumberField label="Остаток с 2026" value={settings.carryover} onChange={(carryover) => onChange({ carryover })} />
      </div>
      <div className="grid gap-1.5">
        <span className="text-xs text-stone-500">Где работаешь — чьи праздники</span>
        <Segmented<Region>
          value={settings.region}
          options={(Object.keys(REGIONS) as Region[]).map((r) => [r, `${REGIONS[r].city} · ${r}`])}
          onChange={(region) => onChange({ region })}
        />
      </div>
      <div className="grid gap-1.5">
        <span className="text-xs text-stone-500">24.12 и 31.12 в фирме</span>
        <Segmented<EveRule>
          value={settings.eves}
          options={[
            ['full', 'рабочий'],
            ['half', '½ дня'],
            ['off', 'выходной'],
          ]}
          onChange={(eves) => onChange({ eves })}
        />
      </div>
      <details className="group text-xs leading-relaxed text-stone-500">
        <summary className="cursor-pointer list-none text-stone-600 transition hover:text-stone-900">
          <span className="mr-1 inline-block transition group-open:rotate-90">›</span> Как считается
        </summary>
        <div className="mt-2 grid gap-2 pl-3">
          <p>
            Отпуск списывается только за рабочие дни. Выходные и гос. праздники внутри отпуска не тратят дни (§ 3 BUrlG) —
            их можно даже не кликать, они сами войдут в период отпуска.
          </p>
          <p>
            Праздники действуют по месту работы (Arbeitsort): офис во Франкфурте — Гессен, home office в Майнце — Рейнланд-Пфальц.
            В 2027 разница одна: <b className="text-stone-800">Allerheiligen, пн 1 ноября</b> (пунктир на календаре).
          </p>
          <p>Остаток прошлого года нужно взять до 31 марта, иначе он сгорает (§ 7 Abs. 3 BUrlG).</p>
        </div>
      </details>
    </div>
  )
}
