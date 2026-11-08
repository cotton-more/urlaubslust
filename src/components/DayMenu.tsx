import { useEffect, useRef } from 'react'
import { ruleOf, type Day, type DayRule } from '../domain/calendar'
import { dayLabel } from '../format'

export const RULE_LABELS: [DayRule, string][] = [
  ['full', 'рабочий'],
  ['half', '½ дня'],
  ['off', 'выходной'],
]

interface Props {
  day: Day
  /** Where it was opened, in viewport pixels. */
  x: number
  y: number
  onPick: (rule: DayRule) => void
  onClose: () => void
}

/** The company rule for one day, opened with a right click on it. */
export function DayMenu({ day, x, y, onPick, onClose }: Props) {
  const ref = useRef<HTMLDivElement>(null)
  const current = ruleOf(day)

  useEffect(() => {
    const outside = (e: PointerEvent) => !ref.current?.contains(e.target as Node) && onClose()
    const key = (e: KeyboardEvent) => e.key === 'Escape' && onClose()
    window.addEventListener('pointerdown', outside)
    window.addEventListener('keydown', key)
    window.addEventListener('scroll', onClose, true)
    window.addEventListener('resize', onClose)
    ref.current?.querySelector<HTMLButtonElement>('[aria-checked="true"]')?.focus()
    return () => {
      window.removeEventListener('pointerdown', outside)
      window.removeEventListener('keydown', key)
      window.removeEventListener('scroll', onClose, true)
      window.removeEventListener('resize', onClose)
    }
  }, [onClose])

  const width = 176
  const left = Math.min(x, window.innerWidth - width - 8)
  const top = Math.min(y, window.innerHeight - 170)
  return (
    <div
      ref={ref}
      role="menu"
      style={{ left, top, width }}
      className="fixed z-30 grid gap-0.5 rounded-2xl border border-white bg-white/95 p-1.5 shadow-xl shadow-stone-900/15 backdrop-blur-xl"
    >
      <div className="px-2 pt-1 pb-1.5 text-[11px] text-stone-500">{dayLabel(day.date)} в фирме</div>
      {RULE_LABELS.map(([rule, label]) => (
        <button
          key={rule}
          type="button"
          role="menuitemradio"
          aria-checked={rule === current}
          onClick={() => {
            onPick(rule)
            onClose()
          }}
          className="flex cursor-pointer items-center justify-between rounded-xl px-2 py-1.5 text-left text-sm text-stone-700 outline-none hover:bg-blush-50 focus-visible:bg-blush-50 aria-checked:font-semibold aria-checked:text-stone-900"
        >
          {label}
          {rule === current && <span className="text-blush-600">✓</span>}
        </button>
      ))}
    </div>
  )
}
