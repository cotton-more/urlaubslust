import type { EveRule, Settings } from '../domain/calendar'
import { RegionSelect, Reveal, Segmented, Stepper } from './controls'

interface Props {
  year: number
  settings: Settings
  onChange: (patch: Partial<Settings>) => void
}

export function SettingsPanel({ year, settings, onChange }: Props) {
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
          <p>Остаток прошлого года нужно взять до 31 марта, иначе он сгорает (§ 7 Abs. 3 BUrlG).</p>
        </div>
      </Reveal>
    </div>
  )
}
