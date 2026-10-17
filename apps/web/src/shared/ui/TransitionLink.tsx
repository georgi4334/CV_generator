import { Link, useNavigate, type LinkProps } from 'react-router'
import {
  canTransition,
  isPlainClick,
  runViewTransition,
  type TransitionKind,
} from '@/shared/lib/viewTransitions'

/**
 * A link that animates to its page. For `doc-open`, the thumbnail grows into
 * the open document: the element inside the link marked
 * `data-transition-source`, or the one `transitionSource` finds.
 */
export function TransitionLink({
  transition,
  docId,
  transitionSource,
  to,
  onClick,
  ...rest
}: LinkProps & {
  transition: TransitionKind
  docId?: string
  transitionSource?: (link: HTMLAnchorElement) => HTMLElement | null | undefined
}) {
  const navigate = useNavigate()
  return (
    <Link
      to={to}
      {...rest}
      onClick={(event) => {
        onClick?.(event)
        if (event.defaultPrevented || !isPlainClick(event) || !canTransition()) return
        event.preventDefault()
        const link = event.currentTarget
        const source =
          transitionSource?.(link) ??
          link.querySelector<HTMLElement>('[data-transition-source]') ??
          undefined
        runViewTransition(transition, () => navigate(to, { flushSync: true }), { source, docId })
      }}
    />
  )
}
