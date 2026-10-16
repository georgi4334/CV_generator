import { CircleAlert, CircleCheck, CloudOff, LoaderCircle } from 'lucide-react'
import { useSaveState } from './editorSession'

/** "Saved ✓", "Saving…", or what went wrong, next to the CV title. */
export function SaveIndicator() {
  const { status, error } = useSaveState()
  const base = 'inline-flex items-center gap-1 whitespace-nowrap text-xs'

  if (status === 'saving' || status === 'pending') {
    return (
      <span role="status" className={`${base} text-slate-500`}>
        <LoaderCircle className="size-3.5 animate-spin" /> Saving…
      </span>
    )
  }
  if (status === 'error') {
    const offline = error?.retryable
    return (
      <span
        role="status"
        className={`${base} text-amber-600 dark:text-amber-400`}
        title={error?.message}
      >
        {offline ? <CloudOff className="size-3.5" /> : <CircleAlert className="size-3.5" />}
        {offline ? 'Not saved, retrying…' : 'Not saved'}
      </span>
    )
  }
  if (status === 'conflict') {
    return (
      <span role="status" className={`${base} text-red-600 dark:text-red-400`}>
        <CircleAlert className="size-3.5" /> Changed elsewhere
      </span>
    )
  }
  return (
    <span role="status" className={`${base} text-emerald-700 dark:text-emerald-400`}>
      <CircleCheck className="size-3.5" /> Saved
    </span>
  )
}
