import {
  JOB_DESCRIPTION_MAX,
  JOB_NOTES_MAX,
  JOB_SALARY_MAX,
  JOB_TEXT_MAX,
  type Job,
  type UpdateJobInput,
} from '@cv/shared'
import { CopyPlus, FilePen, Trash2, X } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Modal } from '@/shared/ui/Modal'
import { useModalClose } from '@/shared/ui/useModalClose'
import { primaryButton, secondaryButton } from '@/shared/ui/PageHeader'
import { errorMessage } from '@/shared/api/errorMessage'
import { useCvList } from '@/features/cv-editor/queries'
import { useCoverLetterList } from '@/features/cover-letters/queries'
import { NEW_LETTER_PATH } from '@/shared/lib/paths'
import { formatDate, localToday } from '@/shared/lib/format'
import { useCreateJob, useTailorCv, useUpdateJob } from '@/features/jobs/queries'
import { DateInput, DocumentSelect, StatusSelect, TypeSelect } from './fields'
import { statusChange } from '@/features/jobs/jobHelpers'

type Draft = Pick<
  Job,
  | 'position'
  | 'company'
  | 'status'
  | 'type'
  | 'dateApplied'
  | 'cvId'
  | 'coverLetterId'
  | 'notes'
  | 'location'
  | 'salary'
  | 'contact'
  | 'description'
>

const EMPTY: Draft = {
  position: '',
  company: '',
  status: 'to_apply',
  type: null,
  dateApplied: null,
  cvId: null,
  coverLetterId: null,
  notes: '',
  location: '',
  salary: '',
  contact: '',
  description: '',
}

const toDraft = (job: Job): Draft =>
  Object.fromEntries(Object.keys(EMPTY).map((key) => [key, job[key as keyof Draft]])) as Draft

const field = 'input'

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="font-medium text-fg-soft">{label}</span>
      {children}
    </label>
  )
}

/** Only what changed, so an edit never overwrites a field another tab just saved. */
function changes(job: Job, draft: Draft): UpdateJobInput {
  return Object.fromEntries(
    Object.entries(draft).filter(([key, value]) => job[key as keyof Draft] !== value),
  ) as UpdateJobInput
}

/**
 * "+ Add job" (no `job`) and the job details: every field, the CV sent with
 * "Create tailored copy", and delete.
 */
export function JobDrawer({
  job,
  onClose,
  onDelete,
}: {
  job: Job | null
  onClose: () => void
  onDelete: (job: Job) => void
}) {
  const { t } = useTranslation()
  const headingId = useId()
  // Slides back out to the right before it goes.
  const { closing, requestClose, closed } = useModalClose(onClose)
  const cvs = (useCvList().data ?? []).filter((doc) => doc.type === 'cv')
  const letters = useCoverLetterList().data ?? []
  const create = useCreateJob()
  const update = useUpdateJob()
  const tailor = useTailorCv()
  const [draft, setDraft] = useState<Draft>(() => (job ? toDraft(job) : EMPTY))
  const [tailored, setTailored] = useState<{ id: string; title: string } | null>(null)
  const set = (change: Partial<Draft>) => setDraft((d) => ({ ...d, ...change }))
  const saving = create.isPending || update.isPending
  const error = create.error ?? update.error ?? tailor.error

  const submit = (event: FormEvent) => {
    event.preventDefault()
    const trimmed = { ...draft, position: draft.position.trim(), company: draft.company.trim() }
    if (job) {
      const change = changes(job, trimmed)
      if (Object.keys(change).length === 0) return requestClose()
      update.mutate({ id: job.id, change }, { onSuccess: requestClose })
    } else {
      create.mutate({ ...trimmed, dateSaved: localToday() }, { onSuccess: requestClose })
    }
  }

  const makeTailoredCopy = () => {
    if (!job || !draft.cvId) return
    tailor.mutate(
      { cvId: draft.cvId, jobId: job.id },
      {
        onSuccess: (copy) => {
          set({ cvId: copy.id })
          setTailored({ id: copy.id, title: copy.title })
        },
      },
    )
  }

  return (
    <Modal
      labelledBy={headingId}
      onClose={closed}
      onCloseRequest={requestClose}
      closing={closing}
      variant="drawer"
    >
      <form onSubmit={submit} className="flex h-full flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div className="min-w-0">
            <h2 id={headingId} className="truncate text-lg font-semibold">
              {job ? job.position : t('jobs.drawer.addTitle')}
            </h2>
            {job && (
              <p className="text-sm text-fg-muted">
                {t('jobs.drawer.saved', { date: formatDate(job.dateSaved) })}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={requestClose}
            aria-label={t('common.close')}
            className="rounded-tight p-1 text-fg-muted hover:bg-muted"
          >
            <X className="size-4" />
          </button>
        </header>

        <div className="flex-1 space-y-5 overflow-y-auto px-5 py-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Field label={t('jobs.drawer.position')}>
              <input
                required
                autoFocus={!job}
                maxLength={JOB_TEXT_MAX}
                value={draft.position}
                onChange={(e) => set({ position: e.target.value })}
                className={field}
              />
            </Field>
            <Field label={t('jobs.drawer.company')}>
              <input
                required
                maxLength={JOB_TEXT_MAX}
                value={draft.company}
                onChange={(e) => set({ company: e.target.value })}
                className={field}
              />
            </Field>
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-fg-soft">{t('jobs.drawer.status')}</span>
              <span>
                <StatusSelect
                  value={draft.status}
                  label={t('jobs.drawer.status')}
                  onChange={(status) => set(statusChange(draft, status))}
                />
              </span>
            </div>
            <Field label={t('jobs.drawer.dateApplied')}>
              <DateInput
                value={draft.dateApplied}
                label={t('jobs.drawer.dateApplied')}
                onChange={(dateApplied) => set({ dateApplied })}
                className={field}
              />
            </Field>
            <Field label={t('jobs.drawer.type')}>
              <TypeSelect
                value={draft.type}
                label={t('jobs.drawer.type')}
                onChange={(type) => set({ type })}
                className={field}
              />
            </Field>
            <Field label={t('jobs.drawer.location')}>
              <input
                maxLength={JOB_TEXT_MAX}
                placeholder={t('jobs.drawer.locationPlaceholder')}
                value={draft.location}
                onChange={(e) => set({ location: e.target.value })}
                className={field}
              />
            </Field>
            <Field label={t('jobs.drawer.salary')}>
              <input
                maxLength={JOB_SALARY_MAX}
                placeholder={t('jobs.drawer.salaryPlaceholder')}
                value={draft.salary}
                onChange={(e) => set({ salary: e.target.value })}
                className={field}
              />
            </Field>
            <Field label={t('jobs.drawer.contact')}>
              <input
                maxLength={JOB_TEXT_MAX}
                placeholder={t('jobs.drawer.contactPlaceholder')}
                value={draft.contact}
                onChange={(e) => set({ contact: e.target.value })}
                className={field}
              />
            </Field>
          </div>

          <Field label={t('jobs.drawer.description')}>
            <textarea
              rows={5}
              maxLength={JOB_DESCRIPTION_MAX}
              placeholder={t('jobs.drawer.descriptionPlaceholder')}
              value={draft.description}
              onChange={(e) => set({ description: e.target.value })}
              className={field}
            />
          </Field>

          <fieldset className="space-y-2 rounded-control border border-line p-3">
            <legend className="px-1 text-sm font-medium text-fg-soft">
              {t('jobs.drawer.documents')}
            </legend>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-fg-soft">{t('jobs.drawer.resume')}</span>
              <DocumentSelect
                value={draft.cvId}
                docs={cvs}
                label={t('jobs.drawer.resume')}
                onChange={(cvId) => set({ cvId })}
                className={field}
              />
            </div>
            {job ? (
              <div className="space-y-1">
                <button
                  type="button"
                  onClick={makeTailoredCopy}
                  disabled={!draft.cvId || tailor.isPending}
                  className={`${secondaryButton} disabled:cursor-not-allowed disabled:opacity-50`}
                >
                  <CopyPlus className="size-4" />
                  {tailor.isPending ? t('jobs.drawer.copying') : t('jobs.drawer.tailor')}
                </button>
                <p className="text-xs text-fg-muted">
                  {draft.cvId
                    ? t('jobs.drawer.tailorHint', { company: job.company })
                    : t('jobs.drawer.tailorPick')}
                </p>
                {tailored && (
                  <p role="status" className="text-sm text-brand-fg">
                    {t('jobs.drawer.created', { title: tailored.title })}{' '}
                    <Link to={`/cvs/${tailored.id}/edit`} className="font-medium underline">
                      {t('jobs.drawer.openIt')}
                    </Link>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-fg-muted">{t('jobs.drawer.tailorAfterSave')}</p>
            )}
            <div className="flex flex-col gap-1 border-t border-line pt-3 text-sm">
              <span className="text-fg-soft">{t('jobs.drawer.coverLetter')}</span>
              <DocumentSelect
                value={draft.coverLetterId}
                docs={letters}
                label={t('jobs.drawer.coverLetter')}
                onChange={(coverLetterId) => set({ coverLetterId })}
                className={field}
              />
              {job && (
                <Link
                  to={`${NEW_LETTER_PATH}?jobId=${job.id}${draft.cvId ? `&cvId=${draft.cvId}` : ''}`}
                  className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-brand-fg hover:underline"
                >
                  <FilePen className="size-4" aria-hidden /> {t('jobs.drawer.writeLetter')}
                </Link>
              )}
            </div>
          </fieldset>

          <Field label={t('jobs.drawer.notes')} wide>
            <textarea
              rows={5}
              maxLength={JOB_NOTES_MAX}
              value={draft.notes}
              onChange={(e) => set({ notes: e.target.value })}
              className={field}
            />
          </Field>

          {error && (
            <p role="alert" className="text-sm text-danger-fg">
              {errorMessage(error)}
            </p>
          )}
        </div>

        <footer className="flex items-center gap-2 border-t border-line px-5 py-3">
          {job && (
            <button
              type="button"
              onClick={() => onDelete(job)}
              className="mr-auto inline-flex items-center gap-1.5 rounded-control px-3 py-2 text-sm text-danger-fg hover:bg-danger-soft"
            >
              <Trash2 className="size-4" /> {t('common.delete')}
            </button>
          )}
          <button type="button" onClick={requestClose} className={`${secondaryButton} ml-auto`}>
            {t('common.cancel')}
          </button>
          <button type="submit" disabled={saving} className={primaryButton}>
            {saving ? t('common.saving') : job ? t('common.save') : t('jobs.drawer.submitAdd')}
          </button>
        </footer>
      </form>
    </Modal>
  )
}
