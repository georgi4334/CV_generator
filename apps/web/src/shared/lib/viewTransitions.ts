import type { CSSProperties, MouseEvent } from 'react'
import { useDocTransition } from '@/shared/stores/docTransition'

/**
 * Page transitions with the browser's View Transitions API: tabs slide
 * sideways, a document zooms open from its thumbnail and shrinks back when
 * closed. Browsers without the API, and people who prefer reduced motion,
 * simply get the new page. The animations are in shared/styles/transitions.css.
 */
export type TransitionKind = 'tab-forward' | 'tab-back' | 'doc-open' | 'doc-close'

/** The view-transition name shared by a document's thumbnail and its open page. */
export const DOC_TRANSITION_NAME = 'doc'

const reducedMotion = () => window.matchMedia?.('(prefers-reduced-motion: reduce)').matches ?? false

/** True when this browser can animate between pages and the person wants motion. */
export const canTransition = () =>
  typeof document !== 'undefined' &&
  typeof document.startViewTransition === 'function' &&
  !reducedMotion()

/** A left click without modifier keys: opening in a new tab must keep working. */
export const isPlainClick = (event: MouseEvent) =>
  event.button === 0 && !event.metaKey && !event.ctrlKey && !event.shiftKey && !event.altKey

/**
 * Runs `update` (usually a navigation) inside a view transition of the given
 * kind. For opening a document, `source` (its thumbnail) becomes the shared
 * element the page grows out of.
 */
export function runViewTransition(
  kind: TransitionKind,
  update: () => void | Promise<void>,
  { source, docId }: { source?: HTMLElement | null; docId?: string } = {},
) {
  if (!canTransition()) {
    void update()
    return
  }
  const root = document.documentElement
  if (source) source.style.viewTransitionName = DOC_TRANSITION_NAME
  if (kind === 'doc-open' && docId) useDocTransition.setState({ openedId: docId })
  root.dataset.transition = kind
  const transition = document.startViewTransition(update)
  void transition.finished.finally(() => {
    if (root.dataset.transition === kind) delete root.dataset.transition
    if (source) source.style.viewTransitionName = ''
    if (kind === 'doc-close') useDocTransition.setState({ openedId: null })
  })
}

/** Style for a document's thumbnail: named while it is the one being closed into. */
export function useDocTransitionStyle(docId: string): CSSProperties | undefined {
  const openedId = useDocTransition((s) => s.openedId)
  return openedId === docId ? { viewTransitionName: DOC_TRANSITION_NAME } : undefined
}
