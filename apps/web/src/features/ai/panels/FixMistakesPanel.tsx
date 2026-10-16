import { applySuggestion, type AiSuggestion } from '@cv/shared'
import { Check, LoaderCircle, SpellCheck, X } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useFixMistakes } from '@/features/ai/queries'
import { AiErrorMessage, AiGate, AiResultSkeleton, aiButton, aiSecondary, Change } from './AiGate'
import { useAiTarget } from '@/features/ai/aiTarget'

type Status = 'open' | 'accepted' | 'rejected' | 'stale'

/** Spelling and grammar: each suggestion can be accepted or rejected. */
export function FixMistakesPanel() {
  const { t } = useTranslation()
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
      <p className="text-sm text-fg-soft">{t('ai.fix.intro')}</p>
      <button type="button" className={aiButton} onClick={run} disabled={check.isPending}>
        {check.isPending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <SpellCheck className="size-4" aria-hidden />
        )}
        {check.isPending
          ? t('ai.fix.checking')
          : suggestions
            ? t('ai.fix.checkAgain')
            : t('ai.fix.check')}
      </button>
      {check.isError && <AiErrorMessage error={check.error} />}
      {check.isPending && <AiResultSkeleton blocks={3} />}

      {suggestions && !check.isPending && (
        <section aria-label={t('ai.fix.suggestions')} className="space-y-3">
          {suggestions.length === 0 ? (
            <p role="status" className="text-sm text-success-fg">
              {t('ai.fix.none')}
            </p>
          ) : (
            <div className="flex items-center justify-between text-sm">
              <span role="status">{t('ai.fix.open', { open, count: suggestions.length })}</span>
              {open > 1 && (
                <button
                  type="button"
                  className={aiSecondary}
                  onClick={() => status.forEach((s, i) => s === 'open' && accept(i))}
                >
                  {t('ai.fix.acceptAll')}
                </button>
              )}
            </div>
          )}
          <ul className="space-y-2">
            {suggestions.map((s, index) => (
              <li
                key={`${s.path}-${s.original}-${index}`}
                aria-label={`${s.original} → ${s.replacement}`}
                className={`rounded-control border border-line p-3 ${status[index] === 'open' ? '' : 'opacity-60'}`}
              >
                <p className="mb-1 text-xs text-fg-muted">{s.label}</p>
                <Change original={s.original} replacement={s.replacement} />
                {s.reason && <p className="mt-1 text-xs text-fg-muted">{s.reason}</p>}
                <div className="mt-2 flex items-center gap-2 text-xs">
                  {status[index] === 'open' ? (
                    <>
                      <button type="button" className={aiSecondary} onClick={() => accept(index)}>
                        <Check className="size-3.5" aria-hidden /> {t('ai.fix.accept')}
                      </button>
                      <button type="button" className={aiSecondary} onClick={() => reject(index)}>
                        <X className="size-3.5" aria-hidden /> {t('ai.fix.reject')}
                      </button>
                    </>
                  ) : (
                    <span className="text-fg-muted">
                      {
                        {
                          accepted: t('ai.fix.accepted'),
                          rejected: t('ai.fix.rejected'),
                          stale: t('ai.fix.stale'),
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
