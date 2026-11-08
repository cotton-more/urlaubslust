import { parse, utc, type ISODate } from './domain/dates'

const format = (options: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat('ru-RU', { timeZone: 'UTC', ...options })
const monthFormat = format({ month: 'long' })
const dayFormat = format({ weekday: 'short', day: 'numeric', month: 'long' })
const shortFormat = format({ day: 'numeric', month: 'short' })

export const WEEKDAYS = ['Пн', 'Вт', 'Ср', 'Чт', 'Пт', 'Сб', 'Вс']

export function monthName(year: number, month: number): string {
  const name = monthFormat.format(utc(year, month + 1, 1))
  return name[0].toUpperCase() + name.slice(1)
}

export const dayLabel = (date: ISODate) => dayFormat.format(parse(date))
export const shortDate = (date: ISODate) => shortFormat.format(parse(date))

export function rangeLabel(start: ISODate, end: ISODate): string {
  return start === end ? shortFormat.format(parse(start)) : `${shortFormat.format(parse(start))} – ${shortFormat.format(parse(end))}`
}

export const num = (n: number) => n.toLocaleString('ru-RU', { maximumFractionDigits: 1 })

function plural(n: number, one: string, few: string, many: string): string {
  const abs = Math.abs(n)
  if (!Number.isInteger(abs)) return `${num(n)} ${few}`
  const [mod10, mod100] = [abs % 10, abs % 100]
  const word = mod10 === 1 && mod100 !== 11 ? one : mod10 >= 2 && mod10 <= 4 && (mod100 < 12 || mod100 > 14) ? few : many
  return `${num(n)} ${word}`
}

/** «1 день», «2 дня», «5 дней», «1,5 дня». */
export const days = (n: number) => plural(n, 'день', 'дня', 'дней')

/** «1 неделя», «2 недели», «5 недель». */
export const weeks = (n: number) => plural(n, 'неделя', 'недели', 'недель')

/** «1 период», «2 периода», «5 периодов». */
export const periods = (n: number) => plural(n, 'период', 'периода', 'периодов')
