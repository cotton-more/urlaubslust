import { useState, type ReactNode } from 'react'
import {
  Disclosure,
  DisclosureButton,
  DisclosurePanel,
  Listbox,
  ListboxButton,
  ListboxOption,
  ListboxOptions,
  Radio,
  RadioGroup,
} from '@headlessui/react'
import { REGIONS, type Region } from '../domain/holidays'
import { num } from '../format'

const FOCUS = 'outline-none data-focus:ring-4 data-focus:ring-blush-200/60'

/** Options side by side with a white pill sliding to the chosen one. */
export function Segmented<T extends string>({ value, options, onChange }: { value: T; options: [T, string][]; onChange: (v: T) => void }) {
  const index = Math.max(0, options.findIndex(([key]) => key === value))
  return (
    <RadioGroup value={value} onChange={onChange} className="relative grid auto-cols-fr grid-flow-col rounded-2xl bg-stone-100 p-1">
      <span
        aria-hidden
        className="absolute inset-y-1 left-1 rounded-xl bg-white shadow-sm shadow-stone-900/10 transition-transform duration-300 ease-out"
        style={{ width: `calc((100% - 0.5rem) / ${options.length})`, transform: `translateX(${index * 100}%)` }}
      />
      {options.map(([key, label]) => (
        <Radio
          key={key}
          value={key}
          className={`relative cursor-pointer rounded-xl px-2 py-1.5 text-center text-xs font-semibold text-stone-500 transition-colors data-checked:text-stone-900 data-hover:text-stone-800 ${FOCUS}`}
        >
          {label}
        </Radio>
      ))}
    </RadioGroup>
  )
}

/** A number with − and + around it; typing works too, with a comma or a dot. */
export function Stepper({ label, value, step, onChange }: { label: string; value: number; step: number; onChange: (v: number) => void }) {
  const [draft, setDraft] = useState<string | null>(null)
  const set = (n: number) => onChange(Math.min(366, Math.max(0, Math.round(n * 2) / 2)))
  const button =
    'grid size-8 shrink-0 cursor-pointer place-items-center rounded-full bg-stone-100 text-base leading-none text-stone-500 transition hover:bg-blush-100 hover:text-blush-700 active:scale-90 disabled:pointer-events-none disabled:opacity-30'
  return (
    <label className="grid gap-1.5">
      <span className="text-xs text-stone-500">{label}</span>
      <span className="flex items-center gap-1 rounded-2xl border border-stone-200 bg-white p-1.5 transition focus-within:border-blush-300 focus-within:ring-4 focus-within:ring-blush-200/50">
        <button type="button" tabIndex={-1} aria-label="Меньше" disabled={value <= 0} onClick={() => set(value - step)} className={button}>
          −
        </button>
        <input
          inputMode="decimal"
          value={draft ?? num(value)}
          onChange={(e) => {
            setDraft(e.target.value)
            const n = Number(e.target.value.replace(',', '.'))
            if (e.target.value.trim() !== '' && Number.isFinite(n)) set(n)
          }}
          onBlur={() => setDraft(null)}
          onKeyDown={(e) => {
            if (e.key !== 'ArrowUp' && e.key !== 'ArrowDown') return
            e.preventDefault()
            setDraft(null)
            set(value + (e.key === 'ArrowUp' ? step : -step))
          }}
          className="w-full min-w-0 bg-transparent text-center font-display text-lg font-bold tabular-nums outline-none"
        />
        <button type="button" tabIndex={-1} aria-label="Больше" onClick={() => set(value + step)} className={button}>
          +
        </button>
      </span>
    </label>
  )
}

const CHIP = {
  work: 'bg-linear-to-br from-blush-600 to-peach-600 text-white shadow-sm shadow-blush-600/30',
  home: 'bg-linear-to-br from-lilac-500 to-mist-500 text-white shadow-sm shadow-lilac-500/30',
}

/** A Bundesland picker; `other` is the state chosen in the sibling picker, tagged in the list. */
export function RegionSelect({
  role,
  caption,
  value,
  other,
  onChange,
}: {
  role: 'work' | 'home'
  caption: string
  value: Region
  other: { region: Region; tag: string }
  onChange: (v: Region) => void
}) {
  return (
    <Listbox value={value} onChange={onChange}>
      <ListboxButton
        className={`group flex w-full cursor-pointer items-center gap-3 rounded-2xl border border-stone-200 bg-white p-2 pr-3 text-left transition hover:border-blush-200 data-open:border-blush-300 ${FOCUS}`}
      >
        <span className={`grid size-10 shrink-0 place-items-center rounded-xl font-display text-xs font-bold ${CHIP[role]}`}>{value}</span>
        <span className="min-w-0 flex-1">
          <span className="block text-[11px] text-stone-500">{caption}</span>
          <span className="block truncate text-sm font-semibold text-stone-900">{REGIONS[value]}</span>
        </span>
        <svg viewBox="0 0 20 20" className="size-4 shrink-0 text-stone-400 transition group-data-open:rotate-180" aria-hidden>
          <path d="M5 8l5 5 5-5" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </ListboxButton>
      <ListboxOptions
        anchor={{ to: 'bottom', gap: 8 }}
        transition
        className="z-20 w-(--button-width) origin-top overflow-y-auto rounded-2xl border border-white bg-white/90 p-1.5 shadow-xl shadow-stone-900/15 backdrop-blur-xl transition duration-150 ease-out [--anchor-max-height:20rem] outline-none data-closed:scale-95 data-closed:opacity-0"
      >
        {(Object.keys(REGIONS) as Region[]).map((r) => (
          <ListboxOption
            key={r}
            value={r}
            className="group flex cursor-pointer items-center gap-3 rounded-xl px-2 py-1.5 text-sm text-stone-700 select-none data-focus:bg-blush-50 data-selected:font-semibold data-selected:text-stone-900"
          >
            <span
              className={`grid size-7 shrink-0 place-items-center rounded-lg font-display text-[10px] font-bold ${r === value ? CHIP[role] : 'bg-stone-100 text-stone-500'}`}
            >
              {r}
            </span>
            <span className="flex-1 truncate">{REGIONS[r]}</span>
            {r === other.region && <span className="rounded-full bg-stone-100 px-2 py-0.5 text-[10px] text-stone-500">{other.tag}</span>}
            <svg viewBox="0 0 20 20" className="invisible size-4 shrink-0 text-blush-600 group-data-selected:visible" aria-hidden>
              <path d="M4.5 10.5l3.5 3.5 7.5-8" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </ListboxOption>
        ))}
      </ListboxOptions>
    </Listbox>
  )
}

/** A quiet "› title" that unfolds its content. */
export function Reveal({ title, children }: { title: string; children: ReactNode }) {
  return (
    <Disclosure>
      <DisclosureButton className="group flex cursor-pointer items-center gap-1.5 rounded-lg text-xs text-stone-600 transition outline-none hover:text-stone-900 data-focus:text-blush-600">
        <span className="inline-block transition group-data-open:rotate-90">›</span>
        {title}
      </DisclosureButton>
      <DisclosurePanel
        transition
        className="origin-top text-xs leading-relaxed text-stone-500 transition duration-200 ease-out data-closed:-translate-y-1 data-closed:opacity-0"
      >
        {children}
      </DisclosurePanel>
    </Disclosure>
  )
}
