import { useLayoutEffect, useRef } from 'react'
import { useTranslation } from 'react-i18next'
import { NavLink } from 'react-router'

export interface Tab {
  to: string
  label: 'nav.dashboard' | 'nav.documents' | 'nav.savedJobs'
  end: boolean
}

/**
 * The header's tabs as a frosted pill. The highlight is one pill that glides
 * to the chosen tab (like a phone's segmented control), so changing tabs
 * feels like one app rather than a new page.
 */
export function TabPill({ tabs, current }: { tabs: Tab[]; current: number }) {
  const { t, i18n } = useTranslation()
  const nav = useRef<HTMLElement>(null)
  const highlight = useRef<HTMLSpanElement>(null)

  // Placed with the DOM directly: it follows the tab's real size (which changes
  // with the language) without waiting for a render.
  useLayoutEffect(() => {
    const list = nav.current
    const pill = highlight.current
    if (!list || !pill) return
    const place = () => {
      const tab = list.querySelector<HTMLElement>(`[data-tab="${current}"]`)
      pill.style.opacity = tab ? '1' : '0'
      if (!tab) return
      pill.style.width = `${tab.offsetWidth}px`
      pill.style.transform = `translateX(${tab.offsetLeft}px)`
    }
    place()
    // Glide only after the first placement, so it does not fly in on load.
    requestAnimationFrame(() => pill.setAttribute('data-ready', ''))
    if (typeof ResizeObserver === 'undefined') return
    const observer = new ResizeObserver(place)
    observer.observe(list)
    return () => observer.disconnect()
  }, [current, i18n.language])

  return (
    <nav
      ref={nav}
      aria-label={t('nav.main')}
      className="glass-pill relative flex items-center gap-0.5"
    >
      <span
        ref={highlight}
        aria-hidden
        className="pointer-events-none absolute inset-y-1 left-0 rounded-pill bg-glass-strong shadow-glass data-ready:transition-[transform,width] data-ready:duration-(--duration-page) data-ready:ease-(--ease-spring) motion-reduce:transition-none"
      />
      {tabs.map((tab, index) => (
        <NavLink
          key={tab.to}
          to={tab.to}
          end={tab.end}
          data-tab={index}
          aria-current={index === current ? 'page' : undefined}
          className={`pill-item relative ${index === current ? 'text-fg hover:bg-transparent' : ''}`}
        >
          {t(tab.label)}
        </NavLink>
      ))}
    </nav>
  )
}
