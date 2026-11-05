import type { Usage } from '../domain/plan'
import { days, num, periods } from '../format'

interface Props {
  year: number
  usage: Usage
  daysOff: number
  tripCount: number
}

const R = 52
const CIRCUMFERENCE = 2 * Math.PI * R

export function Summary({ year, usage, daysOff, tripCount }: Props) {
  const share = usage.total > 0 ? Math.min(usage.used / usage.total, 1) : 0
  const over = usage.remaining < 0
  return (
    <div className="rounded-3xl border border-white bg-white/75 p-6 shadow-sm shadow-stone-900/5 backdrop-blur-xl">
      <div className="flex items-center gap-6">
        <div className="relative size-32 shrink-0">
          <svg viewBox="0 0 120 120" className="size-full -rotate-90">
            <defs>
              <linearGradient id="ring" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0%" stopColor="#c8436a" />
                <stop offset="55%" stopColor="#d4516a" />
                <stop offset="100%" stopColor="#d9603f" />
              </linearGradient>
            </defs>
            <circle cx="60" cy="60" r={R} fill="none" stroke="rgb(15 23 42 / 0.07)" strokeWidth="10" />
            <circle
              cx="60"
              cy="60"
              r={R}
              fill="none"
              stroke={over ? '#c0444f' : 'url(#ring)'}
              strokeWidth="10"
              strokeLinecap="round"
              strokeDasharray={CIRCUMFERENCE}
              strokeDashoffset={CIRCUMFERENCE * (1 - share)}
              className="transition-[stroke-dashoffset] duration-500 ease-out"
            />
          </svg>
          <div className="absolute inset-0 grid place-content-center text-center">
            <span className={`font-display text-3xl font-bold ${over ? 'text-berry-600' : 'text-stone-900'}`}>{num(usage.remaining)}</span>
            <span className="text-[11px] tracking-wide text-stone-500">{over ? 'перебор' : 'осталось'}</span>
          </div>
        </div>
        <dl className="grid gap-3 text-sm">
          <div>
            <dt className="text-stone-500">Потрачено</dt>
            <dd className="font-display text-xl font-bold">
              {num(usage.used)} <span className="text-sm font-medium text-stone-500">из {num(usage.total)}</span>
            </dd>
          </div>
          <div>
            <dt className="text-stone-500">Всего дней свободы</dt>
            <dd className="font-display text-xl font-bold bg-linear-to-r from-blush-600 to-peach-600 bg-clip-text text-transparent">
              {num(daysOff)}
            </dd>
            <dd className="text-xs text-stone-500">
              {tripCount > 0 ? `${periods(tripCount)} отпуска, с выходными и праздниками` : 'с выходными и праздниками'}
            </dd>
          </div>
        </dl>
      </div>
      {usage.carryoverAtRisk > 0 && (
        <p className="mt-5 rounded-2xl bg-butter-100 px-4 py-3 text-xs leading-relaxed text-butter-800 ring-1 ring-inset ring-butter-300/60">
          <b>{days(usage.carryoverAtRisk)}</b> остатка с {year - 1} ещё не запланировано до 31 марта — после этого он
          сгорает (§ 7 Abs. 3 BUrlG).
        </p>
      )}
    </div>
  )
}
