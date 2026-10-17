import { matchKeywords, type AiSuggestion, type Keyword, type TailorResult } from '@cv/shared'
import { CopyPlus, LoaderCircle, ScanSearch } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { useTailor } from '@/features/ai/queries'
import { errorMessage } from '@/shared/api/errorMessage'
import { useJobs, useUpdateJob } from '@/features/jobs/queries'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import {
  AiErrorMessage,
  AiGate,
  AiResultSkeleton,
  aiButton,
  aiField,
  aiSecondary,
  Change,
} from './AiGate'
import { useAiTarget } from '@/features/ai/aiTarget'

const PASTE = 'paste'

/** Match scores (0–100) at or above which a CV counts as a good or partial match. */
const GOOD_MATCH = 70
const PARTIAL_MATCH = 40

function scoreLabel(score: number) {
  if (score >= GOOD_MATCH) return { key: 'ai.tailor.goodMatch', bar: 'bg-success' } as const
  if (score >= PARTIAL_MATCH) return { key: 'ai.tailor.partialMatch', bar: 'bg-warning' } as const
  return { key: 'ai.tailor.lowMatch', bar: 'bg-danger' } as const
}

function Chips({ keywords, tone }: { keywords: Keyword[]; tone: 'found' | 'missing' }) {
  const { t } = useTranslation()
  const style =
    tone === 'found' ? 'bg-success-soft text-success-fg' : 'bg-warning-soft text-warning-fg'
  return (
    <ul className="flex flex-wrap gap-1.5">
      {keywords.map((k) => (
        <li
          key={k.term}
          className={`rounded-pill px-2 py-0.5 text-xs ${style} ${k.importance === 'high' ? 'font-semibold' : ''}`}
          title={k.importance === 'high' ? t('ai.tailor.important') : undefined}
        >
          {k.term}
        </li>
      ))}
    </ul>
  )
}

/** Check & Tailor: how well this CV matches a posting, and rewrites to close the gaps. */
export function TailorPanel() {
  const { t } = useTranslation()
  const target = useAiTarget()
  const cv = target.cv!
  const navigate = useNavigate()
  const notify = useEditorUi((s) => s.notify)
  const jobs = useJobs().data ?? []
  const updateJob = useUpdateJob()
  const tailor = useTailor()
  const [source, setSource] = useState<string>(() => cv.jobId ?? PASTE)
  const [pasted, setPasted] = useState('')
  const [result, setResult] = useState<TailorResult | null>(null)
  const [selected, setSelected] = useState<boolean[]>([])
  const [applied, setApplied] = useState<boolean[]>([])
  const [copying, setCopying] = useState(false)

  const job = jobs.find((j) => j.id === source)
  const posting = job?.description.trim() ? job.description : pasted
  const needsText = !job?.description.trim()

  const run = () => {
    // A posting pasted for a saved job is kept with the job for next time.
    if (job && !job.description.trim() && pasted.trim()) {
      updateJob.mutate({ id: job.id, change: { description: pasted.trim() } })
    }
    tailor.mutate(
      { language: target.language, fields: target.fields, jobDescription: posting },
      {
        onSuccess: (r) => {
          setResult(r)
          setSelected(r.rewrites.map(() => true))
          setApplied(r.rewrites.map(() => false))
        },
      },
    )
  }

  /** Applies rewrites whose field still has the text they were made for. */
  const applyHere = (indexes: number[]) => {
    let skipped = 0
    const done = [...applied]
    for (const i of indexes) {
      const rewrite = result!.rewrites[i]!
      if (target.getText(rewrite.path) === rewrite.original) {
        target.setText(rewrite.path, rewrite.replacement)
        done[i] = true
      } else skipped++
    }
    setApplied(done)
    if (skipped) notify(t('ai.tailor.skipped', { count: skipped }))
  }

  const saveCopy = async () => {
    const rewrites: AiSuggestion[] = result!.rewrites.filter((_, i) => selected[i] && !applied[i])
    setCopying(true)
    try {
      const id = await cv.createTailoredCopy(rewrites, job?.id ?? null)
      notify(t('ai.tailor.copyCreated'), 'success')
      navigate(`/cvs/${id}/edit`)
    } catch (error) {
      notify(t('ai.tailor.copyFailed', { message: errorMessage(error) }), 'error')
    } finally {
      setCopying(false)
    }
  }

  // Re-counted on every edit, so the score rises as keywords are added.
  const match = result ? matchKeywords(target.fields, result.keywords) : null
  const label = match ? scoreLabel(match.score) : null
  const open = result
    ? result.rewrites.map((_, i) => i).filter((i) => selected[i] && !applied[i])
    : []

  return (
    <AiGate>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">{t('ai.tailor.jobPosting')}</span>
        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value)
            setResult(null)
          }}
          className={aiField}
        >
          <option value={PASTE}>{t('ai.tailor.pasteOption')}</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {t(j.description.trim() ? 'ai.jobOption' : 'ai.jobOptionNoDescription', {
                position: j.position,
                company: j.company,
              })}
            </option>
          ))}
        </select>
      </label>
      {needsText && (
        <label className="block space-y-1 text-sm">
          <span className="font-medium">
            {job ? t('ai.tailor.pasteForJob') : t('ai.tailor.postingText')}
          </span>
          <textarea
            rows={6}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder={t('ai.tailor.pastePlaceholder')}
            className={aiField}
          />
        </label>
      )}
      <button
        type="button"
        className={aiButton}
        onClick={run}
        disabled={tailor.isPending || posting.trim().length < 30}
      >
        {tailor.isPending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <ScanSearch className="size-4" aria-hidden />
        )}
        {tailor.isPending
          ? t('ai.tailor.checking')
          : result
            ? t('ai.tailor.checkAgain')
            : t('ai.tailor.checkMatch')}
      </button>
      {tailor.isError && <AiErrorMessage error={tailor.error} />}
      {tailor.isPending && <AiResultSkeleton />}

      {result && match && label && !tailor.isPending && (
        <section aria-label={t('ai.tailor.match')} className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between">
              <span
                className="text-3xl font-semibold tabular-nums"
                aria-label={t('ai.tailor.score', { score: match.score })}
              >
                {match.score}%
              </span>
              <span className="text-sm text-fg-soft">{t(label.key)}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-pill bg-muted">
              <div className={`h-full ${label.bar}`} style={{ width: `${match.score}%` }} />
            </div>
            <p className="mt-1 text-xs text-fg-muted">{t('ai.tailor.scoreHint')}</p>
          </div>

          {match.missing.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium">
                {t('ai.tailor.missing', { count: match.missing.length })}
              </h3>
              <Chips keywords={match.missing} tone="missing" />
            </div>
          )}
          {match.matched.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium">
                {t('ai.tailor.found', { count: match.matched.length })}
              </h3>
              <Chips keywords={match.matched} tone="found" />
            </div>
          )}

          {result.advice.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium">{t('ai.tailor.advice')}</h3>
              <ul className="list-disc space-y-1 pl-4 text-sm text-fg-soft">
                {result.advice.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium">{t('ai.tailor.rewrites')}</h3>
            {result.rewrites.length === 0 ? (
              <p className="text-sm text-fg-muted">{t('ai.tailor.noRewrites')}</p>
            ) : (
              <>
                <p className="text-xs text-fg-muted">{t('ai.tailor.rewritesHint')}</p>
                <ul className="space-y-2">
                  {result.rewrites.map((r, i) => (
                    <li key={r.path} className="rounded-control border border-line p-3">
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selected[i] ?? false}
                          disabled={applied[i]}
                          onChange={(e) =>
                            setSelected((s) => s.map((v, j) => (j === i ? e.target.checked : v)))
                          }
                          aria-label={t('ai.tailor.useRewrite', { label: r.label })}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs text-fg-muted">{r.label}</span>
                          <Change original={r.original} replacement={r.replacement} />
                          {r.reason && (
                            <span className="mt-1 block text-xs text-fg-muted">{r.reason}</span>
                          )}
                        </span>
                      </label>
                      <div className="mt-2 pl-6 text-xs">
                        {applied[i] ? (
                          <span className="text-success-fg">{t('ai.tailor.applied')}</span>
                        ) : (
                          <button
                            type="button"
                            className={aiSecondary}
                            onClick={() => applyHere([i])}
                          >
                            {t('ai.tailor.apply')}
                          </button>
                        )}
                      </div>
                    </li>
                  ))}
                </ul>
              </>
            )}
          </div>

          <div className="flex flex-col gap-2">
            {open.length > 0 && (
              <button type="button" className={aiSecondary} onClick={() => applyHere(open)}>
                {t('ai.tailor.applySelected', { count: open.length })}
              </button>
            )}
            <button
              type="button"
              className={aiButton}
              disabled={copying}
              onClick={() => void saveCopy()}
            >
              <CopyPlus className="size-4" aria-hidden />
              {copying
                ? t('ai.tailor.creatingCopy')
                : open.length
                  ? t('ai.tailor.saveCopy', { count: open.length })
                  : t('ai.tailor.saveCopy')}
            </button>
            <p className="text-xs text-fg-muted">
              {job
                ? t('ai.tailor.linkedCopy', {
                    job: t('ai.jobOption', { position: job.position, company: job.company }),
                  })
                : t('ai.tailor.stays')}
            </p>
          </div>
        </section>
      )}
    </AiGate>
  )
}
