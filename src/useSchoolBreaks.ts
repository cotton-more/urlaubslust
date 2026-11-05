import { useEffect, useState } from 'react'
import { parseSchoolBreaks, schoolBreaksURL, type SchoolBreak } from './domain/schoolBreaks'

export type BreaksStatus = 'loading' | 'ready' | 'failed'

const cacheKey = (year: number) => `urlaub:ferien:DE:${year}`

function cached(year: number): SchoolBreak[] | null {
  try {
    return parseSchoolBreaks(JSON.parse(localStorage.getItem(cacheKey(year)) ?? 'null'))
  } catch {
    return null
  }
}

/**
 * School breaks of every Bundesland for a year, from OpenHolidays. A cached copy shows at once and offline;
 * the API is asked again every time, since dates for later years get published and corrected.
 */
export function useSchoolBreaks(year: number) {
  const [result, setResult] = useState<{ key: string; breaks: SchoolBreak[]; status: BreaksStatus } | null>(null)
  const key = cacheKey(year)

  useEffect(() => {
    let current = true
    const copy = cached(year)
    setResult({ key, breaks: copy ?? [], status: copy ? 'ready' : 'loading' })
    fetch(schoolBreaksURL(year))
      .then((r) => (r.ok ? r.json() : Promise.reject(r.status)))
      .then((raw) => {
        const breaks = parseSchoolBreaks(raw)
        try {
          localStorage.setItem(key, JSON.stringify(raw))
        } catch {
          // no cache then, just this session
        }
        if (current) setResult({ key, breaks, status: 'ready' })
      })
      .catch(() => current && !copy && setResult({ key, breaks: [], status: 'failed' }))
    return () => {
      current = false
    }
  }, [key, year])

  return result?.key === key ? result : { key, breaks: [], status: 'loading' as const }
}
