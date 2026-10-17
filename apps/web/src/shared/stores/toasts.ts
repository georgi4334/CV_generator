import type { ReactNode } from 'react'
import { create } from 'zustand'
import { canAnimate } from '@/shared/lib/motion'

export type ToastTone = 'info' | 'success' | 'warning' | 'error'

export interface Toast {
  id: string
  tone: ToastTone
  message: ReactNode
  /** Milliseconds on screen; null stays until closed. Default: info and success go away, the rest stay. */
  duration?: number | null
  /** Playing its exit animation. */
  leaving?: boolean
  /** Called when the person closes it with ✕. */
  onDismiss?: () => void
}

/** How long info and success toasts stay unless told otherwise. */
export const TOAST_MS = 5000

let counter = 0

/** The toasts on screen, newest last (shown in the bottom-right corner by `Toaster`). */
export const useToasts = create<{ toasts: Toast[] }>(() => ({ toasts: [] }))

/** Shows a toast and returns its id; a toast with the same id is replaced, not repeated. */
export function showToast(toast: Omit<Toast, 'id' | 'leaving'> & { id?: string }): string {
  const id = toast.id ?? `toast-${++counter}`
  useToasts.setState(({ toasts }) => {
    const next = { ...toast, id }
    const exists = toasts.some((t) => t.id === id)
    return { toasts: exists ? toasts.map((t) => (t.id === id ? next : t)) : [...toasts, next] }
  })
  return id
}

/** Removes a toast at once. */
export function removeToast(id: string) {
  useToasts.setState(({ toasts }) => ({ toasts: toasts.filter((t) => t.id !== id) }))
}

/** Closes a toast with its exit animation (at once where nothing animates). */
export function dismissToast(id: string) {
  if (!canAnimate()) return removeToast(id)
  useToasts.setState(({ toasts }) => ({
    toasts: toasts.map((t) => (t.id === id ? { ...t, leaving: true } : t)),
  }))
}
