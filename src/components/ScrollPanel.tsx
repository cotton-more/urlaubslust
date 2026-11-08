import { useEffect, useRef, useState, type ReactNode } from 'react'

interface Edges {
  /** There is content above the visible part. */
  above: boolean
  /** There is content below it. */
  more: boolean
  /** Titles of the blocks that start below the visible part. */
  below: string[]
}

const FADE_TOP = 24
const FADE_BOTTOM = 72
/** Room left under the panel, to the window's bottom edge. */
const GAP_BELOW = 16
/** From this width on the panel sits next to the calendar and scrolls on its own. */
const SIDE_BY_SIDE = '(min-width: 1024px)'

function measure(el: HTMLElement): Edges {
  const bottom = el.scrollTop + el.clientHeight
  const below = [...el.querySelectorAll<HTMLElement>('[data-title]')]
    .filter((block) => block.offsetTop + 24 > bottom)
    .map((block) => block.dataset.title!)
  return { above: el.scrollTop > 4, more: el.scrollHeight - bottom > 4, below }
}

/**
 * A column that scrolls on its own, and says so: the edges fade where content continues, and a pill names the blocks
 * below. Blocks are named by a `data-title` attribute anywhere inside.
 */
export function ScrollPanel({ className = '', children }: { className?: string; children: ReactNode }) {
  const root = useRef<HTMLDivElement>(null)
  const ref = useRef<HTMLDivElement>(null)
  const [edges, setEdges] = useState<Edges>({ above: false, more: false, below: [] })
  const [maxHeight, setMaxHeight] = useState<number>()

  // As tall as the window below the panel's top edge: under the page header at first, the full height once sticky.
  // A fixed calc(100vh - …) would push the bottom, and the pill with it, off screen until the page is scrolled.
  useEffect(() => {
    const wide = window.matchMedia(SIDE_BY_SIDE)
    const fit = () => {
      if (!root.current || !wide.matches) return setMaxHeight(undefined)
      const top = Math.max(root.current.getBoundingClientRect().top, 0)
      setMaxHeight(Math.round(window.innerHeight - top - GAP_BELOW))
    }
    // The header above can change height (data arriving, text wrapping) without any scroll or resize.
    const page = new ResizeObserver(fit)
    page.observe(document.body)
    fit()
    window.addEventListener('scroll', fit, { passive: true })
    window.addEventListener('resize', fit)
    wide.addEventListener('change', fit)
    return () => {
      page.disconnect()
      window.removeEventListener('scroll', fit)
      window.removeEventListener('resize', fit)
      wide.removeEventListener('change', fit)
    }
  }, [])

  useEffect(() => {
    const el = ref.current
    if (!el) return
    const update = () =>
      setEdges((prev) => {
        const next = measure(el)
        return prev.above === next.above && prev.more === next.more && prev.below.join() === next.below.join() ? prev : next
      })
    // Content grows and shrinks when blocks unfold, without the panel itself changing size.
    const resize = new ResizeObserver(update)
    const watch = () => {
      resize.disconnect()
      resize.observe(el)
      for (const child of el.children) resize.observe(child)
    }
    const mutations = new MutationObserver(() => {
      watch()
      update()
    })
    watch()
    mutations.observe(el, { childList: true, subtree: true })
    el.addEventListener('scroll', update, { passive: true })
    update()
    return () => {
      resize.disconnect()
      mutations.disconnect()
      el.removeEventListener('scroll', update)
    }
  }, [])

  const { more, below } = edges
  const mask = `linear-gradient(to bottom, transparent 0, #000 ${edges.above ? FADE_TOP : 0}px, #000 calc(100% - ${more ? FADE_BOTTOM : 0}px), transparent 100%)`

  return (
    <div ref={root} style={{ maxHeight }} className={`relative flex min-h-0 flex-col ${className}`}>
      <div
        ref={ref}
        style={{ maskImage: mask, WebkitMaskImage: mask }}
        className="relative grid min-h-0 content-start gap-6 overflow-y-auto pb-4 [scrollbar-width:none]"
      >
        {children}
      </div>
      <button
        type="button"
        tabIndex={more ? 0 : -1}
        aria-hidden={!more}
        onClick={() => ref.current?.scrollBy({ top: ref.current.clientHeight * 0.7, behavior: 'smooth' })}
        className={`absolute bottom-1 left-1/2 flex max-w-[calc(100%-1rem)] -translate-x-1/2 cursor-pointer items-center gap-1.5 rounded-full border border-stone-200 bg-white/90 px-3 py-1.5 text-xs text-stone-600 shadow-md shadow-stone-900/10 backdrop-blur-xl transition duration-200 hover:border-blush-200 hover:text-stone-900 ${more ? 'translate-y-0 opacity-100' : 'pointer-events-none translate-y-2 opacity-0'}`}
      >
        <span aria-hidden>↓</span>
        <span className="truncate">{below.length > 0 ? `ещё: ${below.join(', ')}` : 'ещё ниже'}</span>
      </button>
    </div>
  )
}
