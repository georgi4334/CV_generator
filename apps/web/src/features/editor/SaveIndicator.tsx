import { CircleAlert, CircleCheck, CloudOff, LoaderCircle } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { errorMessage } from '../../lib/errorMessage'
import { useSaveState } from './editorSession'

/** "Saved ✓", "Saving…", or what went wrong, next to the CV title. */
export function SaveIndicator() {
  const { t } = useTranslation()
  const { status, error } = useSaveState()
  const base = 'inline-flex items-center gap-1 whitespace-nowrap text-xs'

  if (status === 'saving' || status === 'pending') {
    return (
      <span role="status" className={`${base} text-slate-500`}>
        <LoaderCircle className="size-3.5 animate-spin" /> {t('common.saving')}
      </span>
    )
  }
  if (status === 'error') {
    const offline = error?.retryable
    return (
      <span
        role="status"
        className={`${base} text-amber-600 dark:text-amber-400`}
        title={error ? errorMessage(error) : undefined}
      >
        {offline ? <CloudOff className="size-3.5" /> : <CircleAlert className="size-3.5" />}
        {offline ? t('editor.save.notSavedRetrying') : t('editor.save.notSaved')}
      </span>
    )
  }
  if (status === 'conflict') {
    return (
      <span role="status" className={`${base} text-red-600 dark:text-red-400`}>
        <CircleAlert className="size-3.5" /> {t('editor.save.changedElsewhere')}
      </span>
    )
  }
  return (
    <span role="status" className={`${base} text-emerald-700 dark:text-emerald-400`}>
      <CircleCheck className="size-3.5" /> {t('common.saved')}
    </span>
  )
}
