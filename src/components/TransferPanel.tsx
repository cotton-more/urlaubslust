import { useState } from 'react'
import { Reveal } from './controls'
import { decodePlans, encodePlans, type Years } from '../usePlan'

interface Props {
  years: Years
  onImport: (years: Years) => void
}

export function TransferPanel({ years, onImport }: Props) {
  const [input, setInput] = useState('')
  const [message, setMessage] = useState<[string, boolean] | null>(null)
  const code = encodePlans(years)

  const copy = () =>
    navigator.clipboard
      .writeText(code)
      .then(() => setMessage(['Код скопирован — вставь его в другом браузере.', true]))
      .catch(() => setMessage(['Не получилось скопировать — выдели код ниже вручную.', false]))

  const load = () => {
    const next = decodePlans(input)
    if (!next) return setMessage(['Это не похоже на код плана.', false])
    if (Object.keys(years).length > 0 && !confirm('Заменить планы на все годы загруженными?')) return
    onImport(next)
    setInput('')
    setMessage([`Загружено: ${Object.keys(next).sort().join(', ')}.`, true])
  }

  return (
    <div className="grid gap-3 rounded-3xl border border-white bg-white/70 p-5 text-sm shadow-sm shadow-stone-900/5 backdrop-blur-xl">
      <p className="text-xs leading-relaxed text-stone-500">
        Планы хранятся только в этом браузере. Чтобы открыть их на другом устройстве, скопируй код и загрузи его там — переносятся все годы сразу.
      </p>
      <button
        type="button"
        onClick={copy}
        className="rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-blush-300 hover:text-blush-600 active:scale-[0.98]"
      >
        Скопировать код плана
      </button>
      <textarea
        value={input}
        onChange={(e) => setInput(e.target.value)}
        placeholder="Вставь код сюда…"
        rows={3}
        spellCheck={false}
        className="w-full resize-none rounded-2xl border border-stone-200 bg-white px-4 py-2.5 font-mono text-xs break-all outline-none transition focus:border-blush-300 focus:ring-4 focus:ring-blush-200/50"
      />
      <button
        type="button"
        onClick={load}
        disabled={!input.trim()}
        className="rounded-2xl border border-stone-200 bg-white px-4 py-2.5 text-sm font-semibold text-stone-700 transition hover:border-blush-300 hover:text-blush-600 active:scale-[0.98] disabled:pointer-events-none disabled:opacity-40"
      >
        Загрузить план из кода
      </button>
      {message && <p className={`px-1 text-xs ${message[1] ? 'text-sage-700' : 'text-berry-600'}`}>{message[0]}</p>}
      <Reveal title="Показать код">
        <p className="mt-2 font-mono break-all text-stone-600 select-all">{code}</p>
      </Reveal>
    </div>
  )
}
