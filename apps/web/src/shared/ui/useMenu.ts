import { useEffect, useRef, type KeyboardEvent } from 'react'

/** The menu's own items: not those of a menu inside it (a theme picker has its own keys). */
const ITEMS = ':scope > [role^="menuitem"]:not(:disabled)'

/**
 * The keyboard behaviour of a popup menu (the ARIA menu pattern): opening it
 * moves focus to its first item, the arrow keys, Home and End move between
 * items, Escape closes it and gives focus back to its button, and Tab leaves it.
 * Put `ref={triggerRef}` on the button, `ref={menuRef}` on the element with
 * `role="menu"` and `onKeyDown` on a wrapper around both.
 */
export function useMenu(open: boolean, setOpen: (open: boolean) => void) {
  const triggerRef = useRef<HTMLButtonElement>(null)
  const menuRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (open) menuRef.current?.querySelector<HTMLElement>(ITEMS)?.focus()
  }, [open])

  const onKeyDown = (event: KeyboardEvent) => {
    if (!open) {
      if (event.key === 'ArrowDown' && event.target === triggerRef.current) {
        event.preventDefault()
        setOpen(true)
      }
      return
    }
    if (event.key === 'Escape') {
      event.preventDefault()
      event.stopPropagation()
      setOpen(false)
      triggerRef.current?.focus()
      return
    }
    if (event.key === 'Tab') {
      setOpen(false)
      return
    }
    const items = [...(menuRef.current?.querySelectorAll<HTMLElement>(ITEMS) ?? [])]
    if (items.length === 0) return
    const index = items.indexOf(event.target as HTMLElement)
    // Keys typed in something else inside the menu (a select, a nested menu) are theirs.
    if (index < 0 && event.target !== triggerRef.current) return
    const target = {
      ArrowDown: index + 1,
      ArrowUp: index < 0 ? items.length - 1 : index - 1,
      Home: 0,
      End: items.length - 1,
    }[event.key]
    if (target === undefined) return
    event.preventDefault()
    items[(target + items.length) % items.length]?.focus()
  }

  return { triggerRef, menuRef, onKeyDown }
}
