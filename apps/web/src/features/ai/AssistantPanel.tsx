import { cvFields, type AiField } from '@cv/shared'
import { LoaderCircle, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useAssist } from '../../lib/aiQueries'
import { useCv } from '../../lib/cvQueries'
import { useJobs } from '../../lib/jobQueries'
import { AiErrorMessage, AiGate, aiButton, aiField, aiSecondary } from './AiGate'
import { useAiTarget, type AiTarget } from './aiTarget'

const SUMMARY = 'summary'

function JobSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const jobs = (useJobs().data ?? []).filter((j) => j.description.trim())
  if (jobs.length === 0) return null
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">Aim at a saved job (optional)</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={aiField}>
        <option value="">— None —</option>
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {j.position} at {j.company}
          </option>
        ))}
      </select>
    </label>
  )
}

function Instruction({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">Instructions (optional)</span>
      <input
        value={value}
        maxLength={500}
        onChange={(e) => onChange(e.target.value)}
        placeholder="e.g. shorter, more confident, mention leadership"
        className={aiField}
      />
    </label>
  )
}

function Proposal({
  texts,
  list,
  onUse,
  onDiscard,
  useLabel,
}: {
  texts: string[]
  list: boolean
  onUse: () => void
  onDiscard: () => void
  useLabel: string
}) {
  return (
    <section
      aria-label="Proposal"
      className="space-y-2 rounded-lg border border-teal-200 bg-teal-50/50 p-3 dark:border-teal-900 dark:bg-teal-950/30"
    >
      {list ? (
        <ul className="list-disc space-y-1 pl-4 text-sm">
          {texts.map((t) => (
            <li key={t}>{t}</li>
          ))}
        </ul>
      ) : (
        texts.map((t) => (
          <p key={t} className="text-sm whitespace-pre-line">
            {t}
          </p>
        ))
      )}
      <div className="flex gap-2">
        <button type="button" className={aiButton} onClick={onUse}>
          {useLabel}
        </button>
        <button type="button" className={aiSecondary} onClick={onDiscard}>
          Discard
        </button>
      </div>
    </section>
  )
}

function CvAssistant({ target }: { target: AiTarget }) {
  const cv = target.cv!
  const assist = useAssist()
  const jobs = useJobs().data ?? []
  const [what, setWhat] = useState(cv.summaryPath ? SUMMARY : (cv.entries[0]?.path ?? SUMMARY))
  const [instruction, setInstruction] = useState('')
  const [jobId, setJobId] = useState(cv.jobId ?? '')
  const [texts, setTexts] = useState<string[] | null>(null)

  const entry = cv.entries.find((e) => e.path === what)
  const isSummary = what === SUMMARY
  const hasText = isSummary
    ? Boolean(cv.summaryPath && target.getText(cv.summaryPath)?.trim())
    : target.fields.some((f) => f.path.startsWith(`${what}.bullets.`))
  const missingSummary = isSummary && !cv.summaryPath
  const job = jobs.find((j) => j.id === jobId)

  const run = () =>
    assist.mutate(
      {
        task: isSummary ? 'summary' : 'bullets',
        language: target.language,
        fields: target.fields,
        targetPath: isSummary ? cv.summaryPath! : what,
        instruction,
        jobDescription: job?.description ?? '',
      },
      { onSuccess: (r) => setTexts(r.texts) },
    )

  const use = () => {
    if (!texts) return
    if (isSummary) target.setText(cv.summaryPath!, texts[0]!)
    else if (entry) cv.setBullets(entry, texts)
    setTexts(null)
  }

  return (
    <>
      <label className="block space-y-1 text-sm">
        <span className="font-medium">Write</span>
        <select
          value={what}
          onChange={(e) => {
            setWhat(e.target.value)
            setTexts(null)
          }}
          className={aiField}
        >
          <option value={SUMMARY}>Summary</option>
          {cv.entries.map((e) => (
            <option key={e.path} value={e.path}>
              Bullets – {e.label}
            </option>
          ))}
        </select>
      </label>
      {missingSummary ? (
        <p className="text-sm text-slate-600 dark:text-slate-300">
          This CV has no visible Summary section. Add one with Rearrange → Add section, then come
          back.
        </p>
      ) : (
        <>
          <Instruction value={instruction} onChange={setInstruction} />
          <JobSelect value={jobId} onChange={setJobId} />
          <button type="button" className={aiButton} onClick={run} disabled={assist.isPending}>
            {assist.isPending ? (
              <LoaderCircle className="size-4 animate-spin" aria-hidden />
            ) : (
              <Sparkles className="size-4" aria-hidden />
            )}
            {assist.isPending ? 'Writing…' : hasText ? 'Improve' : 'Write'}
          </button>
        </>
      )}
      {assist.isError && <AiErrorMessage error={assist.error} />}
      {texts && !assist.isPending && (
        <Proposal
          texts={texts}
          list={!isSummary}
          onUse={use}
          onDiscard={() => setTexts(null)}
          useLabel={hasText ? 'Replace' : 'Insert'}
        />
      )}
    </>
  )
}

function LetterAssistant({ target }: { target: AiTarget }) {
  const letter = target.letter!
  const assist = useAssist()
  const linkedCv = useCv(letter.cvId ?? undefined).data
  const job = (useJobs().data ?? []).find((j) => j.id === letter.jobId)
  const [instruction, setInstruction] = useState('')
  const [texts, setTexts] = useState<string[] | null>(null)

  const run = () => {
    // The CV supplies the facts; its paths are prefixed so they never mix with the letter's.
    const fromCv: AiField[] = linkedCv
      ? cvFields(linkedCv.document).map((f) => ({
          ...f,
          path: `cv.${f.path}`,
          label: `CV › ${f.label}`,
        }))
      : []
    assist.mutate(
      {
        task: 'letter',
        language: target.language,
        fields: [...fromCv, ...target.fields],
        instruction,
        jobDescription: job?.description ?? '',
        company: job?.company ?? '',
        position: job?.position ?? '',
      },
      { onSuccess: (r) => setTexts(r.texts) },
    )
  }

  return (
    <>
      <p className="text-sm text-slate-600 dark:text-slate-300">
        Writes the letter’s paragraphs from {linkedCv ? `“${linkedCv.title}”` : 'the letter'}
        {job ? ` for ${job.position} at ${job.company}` : ''}.
      </p>
      {!letter.cvId && (
        <p className="text-xs text-amber-700 dark:text-amber-400">
          Link a CV above for a letter based on your experience.
        </p>
      )}
      {job && !job.description.trim() && (
        <p className="text-xs text-slate-500">
          Tip: add the job description in Saved Jobs for a more specific letter.
        </p>
      )}
      <Instruction value={instruction} onChange={setInstruction} />
      <button type="button" className={aiButton} onClick={run} disabled={assist.isPending}>
        {assist.isPending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="size-4" aria-hidden />
        )}
        {assist.isPending ? 'Writing…' : 'Write the letter'}
      </button>
      {assist.isError && <AiErrorMessage error={assist.error} />}
      {texts && !assist.isPending && (
        <Proposal
          texts={texts}
          list={false}
          onUse={() => {
            letter.setParagraphs(texts)
            setTexts(null)
          }}
          onDiscard={() => setTexts(null)}
          useLabel="Replace paragraphs"
        />
      )}
    </>
  )
}

/** The AI Assistant: writes or improves the summary, bullets, or a letter's paragraphs. */
export function AssistantPanel() {
  const target = useAiTarget()
  return (
    <AiGate>
      {target.kind === 'cv' ? <CvAssistant target={target} /> : <LetterAssistant target={target} />}
    </AiGate>
  )
}
