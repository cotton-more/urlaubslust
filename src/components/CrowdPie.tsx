import type { Region } from '../domain/holidays'
import { crowdSectors, type Sector } from '../domain/schoolBreaks'

/** A point on the unit circle, `share` of a clockwise turn from 12 o'clock. */
function point(share: number): string {
  const angle = share * 2 * Math.PI
  return `${Math.sin(angle).toFixed(4)} ${(-Math.cos(angle)).toFixed(4)}`
}

function slice({ from, to }: Pick<Sector, 'from' | 'to'>): string {
  const large = to - from > 0.5 ? 1 : 0
  return `M0 0 L${point(from)} A1 1 0 ${large} 1 ${point(to)}Z`
}

interface Props {
  /** Länder on break: one filled sector each, sized by population. */
  onBreak?: readonly Region[]
  /** Without Länder, a plain filled share 0–1 (an average, say). */
  share?: number
  className?: string
}

/** How much of Germany is on school breaks, as a pie that is full when every Land is. */
export function CrowdPie({ onBreak, share = 0, className = '' }: Props) {
  const filled = onBreak ? crowdSectors(onBreak).filter((s) => s.onBreak) : share > 0 ? [{ from: 0, to: share }] : []
  return (
    <svg viewBox="-1 -1 2 2" aria-hidden className={className}>
      <circle r="1" className="fill-stone-100" />
      {filled.map((s) =>
        s.to - s.from > 0.9999 ? (
          <circle key={s.from} r="1" className="fill-crowd-3" />
        ) : (
          <path key={s.from} d={slice(s)} className="fill-crowd-3 stroke-white" strokeWidth={0.015} strokeLinejoin="round" />
        ),
      )}
    </svg>
  )
}
