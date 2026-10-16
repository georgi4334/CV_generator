import type { ReactNode } from 'react'
import { useAiStatus } from '../../lib/aiQueries'
import { toApiRequestError } from '../../lib/api'

export const aiButton =
  'inline-flex items-center justify-center gap-2 rounded-lg bg-teal-600 px-3 py-2 text-sm font-medium text-white hover:bg-teal-700 disabled:cursor-not-allowed disabled:opacity-50'
export const aiSecondary =
  'inline-flex items-center gap-1.5 rounded-md border border-slate-300 px-2.5 py-1 text-xs font-medium text-slate-700 hover:bg-slate-100 disabled:opacity-50 dark:border-slate-600 dark:text-slate-200 dark:hover:bg-slate-800'
export const aiField =
  'w-full rounded-lg border border-slate-300 bg-white px-2.5 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800'

/** Shows the panel only when AI is set up, with today's remaining requests below it. */
export function AiGate({ children }: { children: ReactNode }) {
  const status = useAiStatus()
  if (status.isPending) return <p className="text-sm text-slate-500">Checking AI…</p>
  if (status.isError) {
    return <AiErrorMessage error={status.error} />
  }
  if (!status.data.enabled) {
    return (
      <div className="space-y-2 text-sm text-slate-600 dark:text-slate-300">
        <p className="font-medium">AI is not set up on this server.</p>
        <p>
          Add a free Google Gemini API key as <code>GEMINI_API_KEY</code> in{' '}
          <code>apps/api/.env</code> and restart the API.
        </p>
      </div>
    )
  }
  const { used, limit } = status.data.usage
  const left = Math.max(0, limit - used)
  return (
    <div className="flex flex-col gap-4">
      {children}
      <p className="border-t border-slate-200 pt-3 text-xs text-slate-500 dark:border-slate-700 dark:text-slate-400">
        {left} of {limit} AI requests left today. Your text is sent to {status.data.provider} to
        create suggestions; nothing changes until you accept it.
      </p>
    </div>
  )
}

export function AiErrorMessage({ error }: { error: unknown }) {
  return (
    <p role="alert" className="text-sm text-red-600 dark:text-red-400">
      {toApiRequestError(error).message}
    </p>
  )
}

/** "original → replacement", with the change highlighted. */
export function Change({ original, replacement }: { original: string; replacement: string }) {
  return (
    <p className="text-sm break-words">
      <del className="rounded bg-red-50 px-0.5 text-red-700 dark:bg-red-950 dark:text-red-300">
        {original}
      </del>{' '}
      →{' '}
      <ins className="rounded bg-emerald-50 px-0.5 text-emerald-800 no-underline dark:bg-emerald-950 dark:text-emerald-300">
        {replacement}
      </ins>
    </p>
  )
}
