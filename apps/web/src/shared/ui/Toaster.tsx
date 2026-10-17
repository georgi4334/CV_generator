import { CircleAlert, CircleCheck, CircleX, Info, X, type LucideIcon } from 'lucide-react'
import { useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import {
  dismissToast,
  removeToast,
  TOAST_MS,
  useToasts,
  type Toast,
  type ToastTone,
} from '@/shared/stores/toasts'

const TONES: Record<ToastTone, { icon: LucideIcon; bubble: string }> = {
  info: { icon: Info, bubble: 'bg-brand-soft text-brand-fg' },
  success: { icon: CircleCheck, bubble: 'bg-success-soft text-success-fg' },
  warning: { icon: CircleAlert, bubble: 'bg-warning-soft text-warning-fg' },
  error: { icon: CircleX, bubble: 'bg-danger-soft text-danger-fg' },
}

function ToastCard({ toast }: { toast: Toast }) {
  const { t } = useTranslation()
  const { icon: Icon, bubble } = TONES[toast.tone]
  const duration = toast.duration === undefined ? defaultDuration(toast.tone) : toast.duration

  useEffect(() => {
    if (duration === null || toast.leaving) return
    const timer = setTimeout(() => dismissToast(toast.id), duration)
    return () => clearTimeout(timer)
  }, [duration, toast.id, toast.leaving, toast.message])

  return (
    <div
      role={toast.tone === 'error' ? 'alert' : 'status'}
      onAnimationEnd={() => toast.leaving && removeToast(toast.id)}
      className={`glass-solid pointer-events-auto flex items-start gap-3 p-3 pr-2 shadow-overlay ${
        toast.leaving ? 'animate-toast-out' : 'animate-toast-in'
      } motion-reduce:animate-none`}
    >
      <span className={`flex size-8 shrink-0 items-center justify-center rounded-pill ${bubble}`}>
        <Icon className="size-4" aria-hidden />
      </span>
      <div className="min-w-0 flex-1 self-center text-sm text-fg">{toast.message}</div>
      <button
        type="button"
        onClick={() => {
          toast.onDismiss?.()
          dismissToast(toast.id)
        }}
        aria-label={t('common.close')}
        className="btn-icon p-1"
      >
        <X className="size-4" aria-hidden />
      </button>
    </div>
  )
}

const defaultDuration = (tone: ToastTone) =>
  tone === 'info' || tone === 'success' ? TOAST_MS : null

/**
 * Notifications as frosted cards in the bottom-right corner (above the tab
 * bar on phones). Errors and warnings stay until closed; others fade away.
 */
export function Toaster() {
  const { t } = useTranslation()
  const toasts = useToasts((s) => s.toasts)
  if (toasts.length === 0) return null
  return (
    <section aria-label={t('common.notifications')} className="toaster">
      {toasts.map((toast) => (
        <ToastCard key={toast.id} toast={toast} />
      ))}
    </section>
  )
}
