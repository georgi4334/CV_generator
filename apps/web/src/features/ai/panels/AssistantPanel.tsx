import { AI_INSTRUCTION_MAX, cvFields, type AiField } from '@cv/shared'
import { LoaderCircle, Sparkles } from 'lucide-react'
import { useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAssist } from '@/features/ai/queries'
import { useCv } from '@/features/cv-editor/queries'
import { useJobs } from '@/features/jobs/queries'
import { AiErrorMessage, AiGate, aiButton, aiField, aiSecondary } from './AiGate'
import { useAiTarget, type AiTarget } from '@/features/ai/aiTarget'

const SUMMARY = 'summary'

function JobSelect({ value, onChange }: { value: string; onChange: (id: string) => void }) {
  const { t } = useTranslation()
  const jobs = (useJobs().data ?? []).filter((j) => j.description.trim())
  if (jobs.length === 0) return null
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{t('ai.assistant.aimAtJob')}</span>
      <select value={value} onChange={(e) => onChange(e.target.value)} className={aiField}>
        <option value="">{t('ai.assistant.none')}</option>
        {jobs.map((j) => (
          <option key={j.id} value={j.id}>
            {t('ai.jobOption', { position: j.position, company: j.company })}
          </option>
        ))}
      </select>
    </label>
  )
}

function Instruction({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const { t } = useTranslation()
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{t('ai.assistant.instructions')}</span>
      <input
        value={value}
        maxLength={AI_INSTRUCTION_MAX}
        onChange={(e) => onChange(e.target.value)}
        placeholder={t('ai.assistant.instructionsPlaceholder')}
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
  const { t } = useTranslation()
  return (
    <section
      aria-label={t('ai.assistant.proposal')}
      className="space-y-2 rounded-control border border-brand-line bg-brand-soft/50 p-3"
    >
      {list ? (
        <ul className="list-disc space-y-1 pl-4 text-sm">
          {texts.map((text) => (
            <li key={text}>{text}</li>
          ))}
        </ul>
      ) : (
        texts.map((text) => (
          <p key={text} className="text-sm whitespace-pre-line">
            {text}
          </p>
        ))
      )}
      <div className="flex gap-2">
        <button type="button" className={aiButton} onClick={onUse}>
          {useLabel}
        </button>
        <button type="button" className={aiSecondary} onClick={onDiscard}>
          {t('ai.assistant.discard')}
        </button>
      </div>
    </section>
  )
}

function CvAssistant({ target }: { target: AiTarget }) {
  const { t } = useTranslation()
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
        <span className="font-medium">{t('ai.assistant.write')}</span>
        <select
          value={what}
          onChange={(e) => {
            setWhat(e.target.value)
            setTexts(null)
          }}
          className={aiField}
        >
          <option value={SUMMARY}>{t('ai.assistant.summary')}</option>
          {cv.entries.map((e) => (
            <option key={e.path} value={e.path}>
              {t('ai.assistant.bulletsFor', { label: e.label })}
            </option>
          ))}
        </select>
      </label>
      {missingSummary ? (
        <p className="text-sm text-fg-soft">{t('ai.assistant.noSummary')}</p>
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
            {assist.isPending
              ? t('ai.assistant.writing')
              : hasText
                ? t('ai.assistant.improve')
                : t('ai.assistant.write')}
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
          useLabel={hasText ? t('ai.assistant.replace') : t('ai.assistant.insert')}
        />
      )}
    </>
  )
}

function LetterAssistant({ target }: { target: AiTarget }) {
  const { t } = useTranslation()
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
      <p className="text-sm text-fg-soft ">
        {t('ai.assistant.letterIntro', {
          source: linkedCv ? `“${linkedCv.title}”` : t('ai.assistant.theLetter'),
          job: job
            ? t('ai.assistant.forJob', { position: job.position, company: job.company })
            : '',
        })}
      </p>
      {!letter.cvId && <p className="text-xs text-warning-fg ">{t('ai.assistant.linkCv')}</p>}
      {job && !job.description.trim() && (
        <p className="text-xs text-fg-muted">{t('ai.assistant.jobTip')}</p>
      )}
      <Instruction value={instruction} onChange={setInstruction} />
      <button type="button" className={aiButton} onClick={run} disabled={assist.isPending}>
        {assist.isPending ? (
          <LoaderCircle className="size-4 animate-spin" aria-hidden />
        ) : (
          <Sparkles className="size-4" aria-hidden />
        )}
        {assist.isPending ? t('ai.assistant.writing') : t('ai.assistant.writeLetter')}
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
          useLabel={t('ai.assistant.replaceParagraphs')}
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
