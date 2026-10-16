import { applySuggestion, type AiSuggestion } from '@cv/shared'
import { Check, LoaderCircle, SpellCheck, X } from 'lucide-react'
import { useState } from 'react'
import { useFixMistakes } from '../../lib/aiQueries'
import { AiErrorMessage, AiGate, aiButton, aiSecondary, Change } from './AiGate'
import { useAiTarget } from './aiTarget'

type Status = 'open' | 'accepted' | 'rejected' | 'stale'

/** Spelling and grammar: each suggestion can be accepted or rejected. */
export function FixMistakesPanel() {
  const target = useAiTarget()
  const check = useFixMistakes()
  const [suggestions, setSuggestions] = useState<AiSuggestion[] | null>(null)
  const [status, setStatus] = useState<Status[]>([])

  const run = () =>
    check.mutate(
      { language: target.language, fields: target.fields },
      {
        onSuccess: (result) => {
          setSuggestions(result.suggestions)
          setStatus(result.suggestions.map(() => 'open'))
        },
      },
    )

  const accept = (index: number) => {
    const suggestion = suggestions![index]!
    const current = target.getText(suggestion.path)
    const next = current === null ? null : applySuggestion(current, suggestion)
    if (next !== null) target.setText(suggestion.path, next)
    setStatus((s) => s.map((v, i) => (i === index ? (next === null ? 'stale' : 'accepted') : v)))
  }
  const reject = (index: number) =>
    setStatus((s) => s.map((v, i) => (i === index ? 'rejected' : v)))

  const open = status.filter((s) => s === 'open').length

  return (
    <AiGate>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Finds spelling, grammar and punctuation mistakes. Accept or reject each one; accepted fixes
        can be undone with Ctrl+Z.
      </p>
      <button type="button" className={aiButton} onClick={run} disabled={check.isPending}>
        {check.isPending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <SpellCheck className="size-4" aria-hidden />
        )}
        {check.isPending ? 'Checking…' : suggestions ? 'Check again' : 'Check spelling & grammar'}
      </button>
      {check.isError && <AiErrorMessage error={check.error} />}

      {suggestions && !check.isPending && (
        <section aria-label="Suggestions" className="space-y-3">
          {suggestions.length === 0 ? (
            <p role="status" className="text-sm text-emerald-700 dark:text-emerald-400">
              No mistakes found.
            </p>
          ) : (
            <div className="flex items-center justify-between text-sm">
              <span role="status">
                {open} of {suggestions.length}{' '}
                {suggestions.length === 1 ? 'suggestion' : 'suggestions'} open
              </span>
              {open > 1 && (
                <button
                  type="button"
                  className={aiSecondary}
                  onClick={() => status.forEach((s, i) => s === 'open' && accept(i))}
                >
                  Accept all
                </button>
              )}
            </div>
          )}
          <ul className="space-y-2">
            {suggestions.map((s, index) => (
              <li
                key={`${s.path}-${s.original}-${index}`}
                aria-label={`${s.original} → ${s.replacement}`}
                className={`rounded-lg border border-slate-200 p-3 dark:border-slate-700 ${status[index] === 'open' ? '' : 'opacity-60'}`}
              >
                <p className="mb-1 text-xs text-slate-500 dark:text-slate-400">{s.label}</p>
                <Change original={s.original} replacement={s.replacement} />
                {s.reason && <p className="mt-1 text-xs text-slate-500">{s.reason}</p>}
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {status[index] === 'open' ? (
                    <>
                      <button type="button" className={aiSecondary} onClick={() => accept(index)}>
                        <Check className="size-3.5" aria-hidden /> Accept
                      </button>
                      <button type="button" className={aiSecondary} onClick={() => reject(index)}>
                        <X className="size-3.5" aria-hidden /> Reject
                      </button>
                    </>
                  ) : (
                    <span className="text-slate-500">
                      {
                        {
                          accepted: 'Accepted',
                          rejected: 'Rejected',
                          stale: 'The text changed since the check; not applied.',
                        }[status[index] as Exclude<Status, 'open'>]
                      }
                    </span>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </AiGate>
  )
}
