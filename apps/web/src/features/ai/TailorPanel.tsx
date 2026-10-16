import { matchKeywords, type AiSuggestion, type Keyword, type TailorResult } from '@cv/shared'
import { CopyPlus, LoaderCircle, ScanSearch } from 'lucide-react'
import { useState } from 'react'
import { useNavigate } from 'react-router'
import { useTailor } from '../../lib/aiQueries'
import { toApiRequestError } from '../../lib/api'
import { useJobs, useUpdateJob } from '../../lib/jobQueries'
import { useEditorUi } from '../../stores/editorUi'
import { AiErrorMessage, AiGate, aiButton, aiField, aiSecondary, Change } from './AiGate'
import { useAiTarget } from './aiTarget'

const PASTE = 'paste'

function scoreLabel(score: number) {
  if (score >= 70) return { text: 'Good match', bar: 'bg-emerald-500' }
  if (score >= 40) return { text: 'Partial match', bar: 'bg-amber-500' }
  return { text: 'Low match', bar: 'bg-red-500' }
}

function Chips({ keywords, tone }: { keywords: Keyword[]; tone: 'found' | 'missing' }) {
  const style =
    tone === 'found'
      ? 'bg-emerald-50 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300'
      : 'bg-amber-50 text-amber-900 dark:bg-amber-950 dark:text-amber-300'
  return (
    <ul className="flex flex-wrap gap-1.5">
      {keywords.map((k) => (
        <li
          key={k.term}
          className={`rounded-full px-2 py-0.5 text-xs ${style} ${k.importance === 'high' ? 'font-semibold' : ''}`}
          title={k.importance === 'high' ? 'Important in the posting' : undefined}
        >
          {k.term}
        </li>
      ))}
    </ul>
  )
}

/** Check & Tailor: how well this CV matches a posting, and rewrites to close the gaps. */
export function TailorPanel() {
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
    if (skipped) notify(`${skipped} suggestion(s) skipped: the text changed since the check.`)
  }

  const saveCopy = async () => {
    const rewrites: AiSuggestion[] = result!.rewrites.filter((_, i) => selected[i] && !applied[i])
    setCopying(true)
    try {
      const id = await cv.createTailoredCopy(rewrites, job?.id ?? null)
      notify('Tailored copy created. You are now editing the copy.')
      navigate(`/cvs/${id}/edit`)
    } catch (error) {
      notify(`Could not create the copy: ${toApiRequestError(error).message}`)
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
        <span className="font-medium">Job posting</span>
        <select
          value={source}
          onChange={(e) => {
            setSource(e.target.value)
            setResult(null)
          }}
          className={aiField}
        >
          <option value={PASTE}>Paste a job posting…</option>
          {jobs.map((j) => (
            <option key={j.id} value={j.id}>
              {j.position} at {j.company}
              {j.description.trim() ? '' : ' (no description yet)'}
            </option>
          ))}
        </select>
      </label>
      {needsText && (
        <label className="block space-y-1 text-sm">
          <span className="font-medium">
            {job ? 'Paste the posting (it is saved with the job)' : 'Posting text'}
          </span>
          <textarea
            rows={6}
            value={pasted}
            onChange={(e) => setPasted(e.target.value)}
            placeholder="Paste the full job description…"
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
        {tailor.isPending ? 'Checking…' : result ? 'Check again' : 'Check match'}
      </button>
      {tailor.isError && <AiErrorMessage error={tailor.error} />}

      {result && match && label && !tailor.isPending && (
        <section aria-label="Match" className="space-y-4">
          <div>
            <div className="flex items-baseline justify-between">
              <span
                className="text-3xl font-semibold tabular-nums"
                aria-label={`Match score ${match.score}%`}
              >
                {match.score}%
              </span>
              <span className="text-sm text-slate-600 dark:text-slate-300">{label.text}</span>
            </div>
            <div className="mt-1 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-slate-800">
              <div className={`h-full ${label.bar}`} style={{ width: `${match.score}%` }} />
            </div>
            <p className="mt-1 text-xs text-slate-500">
              Share of the posting’s keywords found in your CV (important ones count double).
            </p>
          </div>

          {match.missing.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium">Missing ({match.missing.length})</h3>
              <Chips keywords={match.missing} tone="missing" />
            </div>
          )}
          {match.matched.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium">Found in your CV ({match.matched.length})</h3>
              <Chips keywords={match.matched} tone="found" />
            </div>
          )}

          {result.advice.length > 0 && (
            <div className="space-y-1.5">
              <h3 className="text-sm font-medium">Advice</h3>
              <ul className="list-disc space-y-1 pl-4 text-sm text-slate-700 dark:text-slate-300">
                {result.advice.map((a) => (
                  <li key={a}>{a}</li>
                ))}
              </ul>
            </div>
          )}

          <div className="space-y-2">
            <h3 className="text-sm font-medium">Suggested rewrites</h3>
            {result.rewrites.length === 0 ? (
              <p className="text-sm text-slate-500">No rewrites suggested.</p>
            ) : (
              <>
                <p className="text-xs text-slate-500">
                  Only keep what is true for you. Every change can be undone.
                </p>
                <ul className="space-y-2">
                  {result.rewrites.map((r, i) => (
                    <li
                      key={r.path}
                      className="rounded-lg border border-slate-200 p-3 dark:border-slate-700"
                    >
                      <label className="flex items-start gap-2">
                        <input
                          type="checkbox"
                          className="mt-1"
                          checked={selected[i] ?? false}
                          disabled={applied[i]}
                          onChange={(e) =>
                            setSelected((s) => s.map((v, j) => (j === i ? e.target.checked : v)))
                          }
                          aria-label={`Use rewrite of ${r.label}`}
                        />
                        <span className="min-w-0 flex-1">
                          <span className="block text-xs text-slate-500">{r.label}</span>
                          <Change original={r.original} replacement={r.replacement} />
                          {r.reason && (
                            <span className="mt-1 block text-xs text-slate-500">{r.reason}</span>
                          )}
                        </span>
                      </label>
                      <div className="mt-2 pl-6 text-xs">
                        {applied[i] ? (
                          <span className="text-emerald-700 dark:text-emerald-400">Applied</span>
                        ) : (
                          <button
                            type="button"
                            className={aiSecondary}
                            onClick={() => applyHere([i])}
                          >
                            Apply
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
                Apply {open.length} selected to this CV
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
                ? 'Creating copy…'
                : open.length
                  ? `Save as tailored copy (${open.length} rewrites)`
                  : 'Save as tailored copy'}
            </button>
            <p className="text-xs text-slate-500">
              {job
                ? `The copy is linked to “${job.position} at ${job.company}”; this CV stays as it is.`
                : 'This CV stays as it is.'}
            </p>
          </div>
        </section>
      )}
    </AiGate>
  )
}
