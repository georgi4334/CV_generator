import { createCoverLetter, CV_LANGUAGES, type CvLanguage } from '@cv/shared'
import { LoaderCircle } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate, useSearchParams } from 'react-router'
import { card, PageHeader, primaryButton, secondaryButton } from '@/shared/ui/PageHeader'
import { LetterThumbnail } from '@/renderer'
import { errorMessage } from '@/shared/api/errorMessage'
import { useCv, useCvList } from '@/features/cv-editor/queries'
import { useJobs } from '@/features/jobs/queries'
import { useCreateLetter } from '@/features/cover-letters/queries'

const field =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800'

/**
 * /cover-letters/new: choose the CV the letter goes with (its header and design
 * are copied, so both match) and, optionally, the saved job it is for.
 * `?cvId=` and `?jobId=` preselect them (e.g. from a saved job).
 */
export function NewLetterPage() {
  const { t } = useTranslation()
  const [params] = useSearchParams()
  const navigate = useNavigate()
  const cvs = useCvList()
  const jobs = useJobs().data ?? []
  const create = useCreateLetter()

  const cvOptions = (cvs.data ?? []).filter((doc) => doc.type === 'cv')
  const [chosenCv, setChosenCv] = useState<string | null>(params.get('cvId'))
  // Until the user picks, use the most recently edited CV.
  const cvId = chosenCv ?? cvOptions[0]?.id ?? ''
  const [jobId, setJobId] = useState(params.get('jobId') ?? '')
  const cv = useCv(cvId || undefined).data
  const job = jobs.find((j) => j.id === jobId)
  const [chosenLanguage, setLanguage] = useState<CvLanguage | null>(null)
  const language = chosenLanguage ?? cv?.document.language ?? 'en-US'
  const [chosenTitle, setTitle] = useState<string | null>(null)
  const title =
    chosenTitle ??
    (job ? t('letters.defaultTitleCompany', { company: job.company }) : t('letters.defaultTitle'))

  const cvDocument = cvId ? (cv?.document ?? null) : null
  const company = job?.company ?? ''
  const letter = useMemo(
    () => createCoverLetter({ cv: cvDocument, company, language }),
    [cvDocument, company, language],
  )
  const waitingForCv = Boolean(cvId) && !cv

  const submit = (event: FormEvent) => {
    event.preventDefault()
    create.mutate(
      {
        title: title.trim() || undefined,
        cvId: cvId || null,
        jobId: jobId || null,
        document: letter,
      },
      { onSuccess: (record) => navigate(`/cover-letters/${record.id}/edit`, { replace: true }) },
    )
  }

  return (
    <>
      <PageHeader
        title={t('letters.newTitle')}
        description={t('letters.newDescription')}
        actions={
          <Link to="/documents/cover-letters" className={secondaryButton}>
            {t('common.cancel')}
          </Link>
        }
      />
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className={`${card} space-y-4 p-5`}>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{t('letters.cv')}</span>
            <select
              value={cvId}
              onChange={(e) => {
                setChosenCv(e.target.value)
                setLanguage(null)
              }}
              className={field}
            >
              <option value="">{t('letters.noCv')}</option>
              {cvOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{t('letters.jobOptional')}</span>
            <select value={jobId} onChange={(e) => setJobId(e.target.value)} className={field}>
              <option value="">{t('common.none')}</option>
              {jobs.map((option) => (
                <option key={option.id} value={option.id}>
                  {t('letters.jobOption', { position: option.position, company: option.company })}
                </option>
              ))}
            </select>
            <span className="block text-xs text-slate-500 dark:text-slate-400">
              {t('letters.jobHint')}
            </span>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{t('letters.letterLanguage')}</span>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value as CvLanguage)}
              className={field}
            >
              {CV_LANGUAGES.map((code) => (
                <option key={code} value={code}>
                  {t(`labels.cvLanguage.${code}`)}
                </option>
              ))}
            </select>
          </label>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{t('letters.name')}</span>
            <input
              value={title}
              maxLength={200}
              onChange={(e) => setTitle(e.target.value)}
              className={field}
            />
          </label>
          {create.isError && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {t('letters.createFailed', { message: errorMessage(create.error) })}
            </p>
          )}
          <button
            type="submit"
            disabled={create.isPending || waitingForCv}
            className={primaryButton}
          >
            {create.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {create.isPending ? t('letters.creating') : t('letters.create')}
          </button>
        </div>
        <div className="flex justify-center lg:block">
          <LetterThumbnail letter={letter} width={300} mode="edit" />
        </div>
      </form>
    </>
  )
}
