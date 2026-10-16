import { JOB_DESCRIPTION_MAX, type Job, type UpdateJobInput } from '@cv/shared'
import { CopyPlus, FilePen, Trash2, X } from 'lucide-react'
import { useId, useState, type FormEvent, type ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { Modal } from '../../components/Modal'
import { primaryButton, secondaryButton } from '../../components/PageHeader'
import { errorMessage } from '../../lib/errorMessage'
import { useCvList } from '../../lib/cvQueries'
import { useCoverLetterList } from '../../lib/letterQueries'
import { NEW_LETTER_PATH } from '../../lib/paths'
import { formatDate, localToday } from '../../lib/format'
import { useCreateJob, useTailorCv, useUpdateJob } from '../../lib/jobQueries'
import { DateInput, DocumentSelect, StatusSelect, TypeSelect } from './fields'
import { statusChange } from './jobHelpers'

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

const field =
  'w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800'

function Field({ label, children, wide }: { label: string; children: ReactNode; wide?: boolean }) {
  return (
    <label className={`flex flex-col gap-1 text-sm ${wide ? 'sm:col-span-2' : ''}`}>
      <span className="font-medium text-slate-700 dark:text-slate-300">{label}</span>
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
      if (Object.keys(change).length === 0) return onClose()
      update.mutate({ id: job.id, change }, { onSuccess: onClose })
    } else {
      create.mutate({ ...trimmed, dateSaved: localToday() }, { onSuccess: onClose })
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
    <Modal labelledBy={headingId} onClose={onClose} variant="drawer">
      <form onSubmit={submit} className="flex h-full flex-col">
        <header className="flex items-start justify-between gap-4 border-b border-slate-200 px-5 py-4 dark:border-slate-800">
          <div className="min-w-0">
            <h2 id={headingId} className="truncate text-lg font-semibold">
              {job ? job.position : t('jobs.drawer.addTitle')}
            </h2>
            {job && (
              <p className="text-sm text-slate-500 dark:text-slate-400">
                {t('jobs.drawer.saved', { date: formatDate(job.dateSaved) })}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label={t('common.close')}
            className="rounded p-1 text-slate-500 hover:bg-slate-100 dark:hover:bg-slate-800"
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
                maxLength={200}
                value={draft.position}
                onChange={(e) => set({ position: e.target.value })}
                className={field}
              />
            </Field>
            <Field label={t('jobs.drawer.company')}>
              <input
                required
                maxLength={200}
                value={draft.company}
                onChange={(e) => set({ company: e.target.value })}
                className={field}
              />
            </Field>
            <div className="flex flex-col gap-1 text-sm">
              <span className="font-medium text-slate-700 dark:text-slate-300">
                {t('jobs.drawer.status')}
              </span>
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
                maxLength={200}
                placeholder={t('jobs.drawer.locationPlaceholder')}
                value={draft.location}
                onChange={(e) => set({ location: e.target.value })}
                className={field}
              />
            </Field>
            <Field label={t('jobs.drawer.salary')}>
              <input
                maxLength={100}
                placeholder={t('jobs.drawer.salaryPlaceholder')}
                value={draft.salary}
                onChange={(e) => set({ salary: e.target.value })}
                className={field}
              />
            </Field>
            <Field label={t('jobs.drawer.contact')}>
              <input
                maxLength={200}
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

          <fieldset className="space-y-2 rounded-lg border border-slate-200 p-3 dark:border-slate-700">
            <legend className="px-1 text-sm font-medium text-slate-700 dark:text-slate-300">
              {t('jobs.drawer.documents')}
            </legend>
            <div className="flex flex-col gap-1 text-sm">
              <span className="text-slate-600 dark:text-slate-400">{t('jobs.drawer.resume')}</span>
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
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {draft.cvId
                    ? t('jobs.drawer.tailorHint', { company: job.company })
                    : t('jobs.drawer.tailorPick')}
                </p>
                {tailored && (
                  <p role="status" className="text-sm text-teal-700 dark:text-teal-300">
                    {t('jobs.drawer.created', { title: tailored.title })}{' '}
                    <Link to={`/cvs/${tailored.id}/edit`} className="font-medium underline">
                      {t('jobs.drawer.openIt')}
                    </Link>
                  </p>
                )}
              </div>
            ) : (
              <p className="text-xs text-slate-500 dark:text-slate-400">
                {t('jobs.drawer.tailorAfterSave')}
              </p>
            )}
            <div className="flex flex-col gap-1 border-t border-slate-200 pt-3 text-sm dark:border-slate-700">
              <span className="text-slate-600 dark:text-slate-400">
                {t('jobs.drawer.coverLetter')}
              </span>
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
                  className="inline-flex w-fit items-center gap-1.5 text-sm font-medium text-teal-700 hover:underline dark:text-teal-300"
                >
                  <FilePen className="size-4" aria-hidden /> {t('jobs.drawer.writeLetter')}
                </Link>
              )}
            </div>
          </fieldset>

          <Field label={t('jobs.drawer.notes')} wide>
            <textarea
              rows={5}
              maxLength={5000}
              value={draft.notes}
              onChange={(e) => set({ notes: e.target.value })}
              className={field}
            />
          </Field>

          {error && (
            <p role="alert" className="text-sm text-red-600 dark:text-red-400">
              {errorMessage(error)}
            </p>
          )}
        </div>

        <footer className="flex items-center gap-2 border-t border-slate-200 px-5 py-3 dark:border-slate-800">
          {job && (
            <button
              type="button"
              onClick={() => onDelete(job)}
              className="mr-auto inline-flex items-center gap-1.5 rounded-lg px-3 py-2 text-sm text-red-600 hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950"
            >
              <Trash2 className="size-4" /> {t('common.delete')}
            </button>
          )}
          <button type="button" onClick={onClose} className={`${secondaryButton} ml-auto`}>
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
