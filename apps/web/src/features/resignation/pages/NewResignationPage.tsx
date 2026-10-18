import {
  createResignationLetter,
  CV_LANGUAGES,
  formatLetterDate,
  RESIGNATION_LIMITS,
  type CvLanguage,
  type ResignationDocument,
} from '@cv/shared'
import { LoaderCircle } from 'lucide-react'
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { Link, useNavigate } from 'react-router'
import { ResignationThumbnail } from '@/renderer'
import { errorMessage } from '@/shared/api/errorMessage'
import { localToday } from '@/shared/lib/format'
import { runViewTransition } from '@/shared/lib/viewTransitions'
import { card, PageHeader, primaryButton, secondaryButton } from '@/shared/ui/PageHeader'
import { useCv, useCvList } from '@/features/cv-editor/queries'
import { useCreateResignation } from '@/features/resignation/queries'

const field = 'input'

interface Details {
  senderName: string
  senderEmail: string
  senderPhone: string
  senderResidence: string
  company: string
  contact: string
  address: string
  postalCode: string
  city: string
  subject: string
}
const SENDER_KEYS = ['senderName', 'senderEmail', 'senderPhone', 'senderResidence'] as const

/** A labelled text input. */
function Text({
  label,
  value,
  max,
  type = 'text',
  onChange,
}: {
  label: string
  value: string
  max: number
  type?: string
  onChange: (value: string) => void
}) {
  return (
    <label className="block space-y-1 text-sm">
      <span className="font-medium">{label}</span>
      <input
        type={type}
        value={value}
        maxLength={max}
        onChange={(e) => onChange(e.target.value)}
        className={field}
      />
    </label>
  )
}

function Group({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <fieldset className="space-y-3 border-t border-line pt-4 first:border-0 first:pt-0">
      <legend className="mb-1 text-sm font-semibold text-fg">{title}</legend>
      {children}
    </fieldset>
  )
}

/**
 * /documents → "Create new resignation letter": who is leaving, who receives the
 * letter, the subject and the date. A CV can fill in the sender and the look.
 * Everything can be edited on the page afterwards.
 */
export function NewResignationPage() {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const cvs = useCvList()
  const create = useCreateResignation()
  // A quick double click submits twice before the button can disable itself.
  const submitted = useRef(false)

  const cvOptions = (cvs.data ?? []).filter((doc) => doc.type === 'cv')
  const [cvId, setCvId] = useState('')
  const cv = useCv(cvId || undefined).data
  const [chosenLanguage, setLanguage] = useState<CvLanguage | null>(null)
  const language = chosenLanguage ?? cv?.document.language ?? 'en-US'
  const [isoDate, setIsoDate] = useState(localToday())
  const [title, setTitle] = useState<string | null>(null)
  const [edits, setEdits] = useState<Partial<Details>>({})

  const today = useMemo(() => (isoDate ? new Date(`${isoDate}T12:00:00`) : new Date()), [isoDate])
  const waitingForCv = Boolean(cvId) && !cv

  const letter: ResignationDocument = useMemo(() => {
    const base = createResignationLetter({
      cv: cvId ? (cv?.document ?? null) : null,
      company: edits.company ?? '',
      contact: edits.contact ?? '',
      language,
      today,
    })
    return {
      ...base,
      sender: {
        name: edits.senderName ?? base.sender.name,
        email: edits.senderEmail ?? base.sender.email,
        phone: edits.senderPhone ?? base.sender.phone,
        residence: edits.senderResidence ?? base.sender.residence,
      },
      employer: {
        ...base.employer,
        address: edits.address ?? '',
        postalCode: edits.postalCode ?? '',
        city: edits.city ?? '',
      },
      subject: edits.subject ?? base.subject,
      signature: edits.senderName ?? base.signature,
    }
  }, [cv, cvId, edits, language, today])

  const set = (key: keyof Details) => (value: string) =>
    setEdits((current) => ({ ...current, [key]: value }))
  const L = RESIGNATION_LIMITS
  const defaultTitle = edits.company?.trim()
    ? t('resignation.defaultTitleCompany', { company: edits.company.trim() })
    : t('resignation.defaultTitle')

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (submitted.current) return
    submitted.current = true
    create.mutate(
      { title: (title ?? defaultTitle).trim() || undefined, document: letter },
      {
        onError: () => {
          submitted.current = false
        },
        // The new letter opens like an app: the form steps back as the page grows in.
        onSuccess: (record) =>
          runViewTransition('doc-open', () =>
            navigate(`/resignations/${record.id}/edit`, { replace: true, flushSync: true }),
          ),
      },
    )
  }

  return (
    <>
      <PageHeader
        title={t('resignation.newTitle')}
        description={t('resignation.newDescription')}
        actions={
          <Link to="/documents/resignations" className={secondaryButton}>
            {t('common.cancel')}
          </Link>
        }
      />
      <form onSubmit={submit} className="grid gap-6 lg:grid-cols-[1fr_auto]">
        <div className={`${card} space-y-5 p-5`}>
          <label className="block space-y-1 text-sm">
            <span className="font-medium">{t('resignation.fillFromCv')}</span>
            <select
              value={cvId}
              onChange={(e) => {
                setCvId(e.target.value)
                setLanguage(null)
                // The new CV's details replace what was typed for the sender.
                setEdits((current) => {
                  const next = { ...current }
                  for (const key of SENDER_KEYS) delete next[key]
                  return next
                })
              }}
              className={field}
            >
              <option value="">{t('resignation.noCv')}</option>
              {cvOptions.map((option) => (
                <option key={option.id} value={option.id}>
                  {option.title}
                </option>
              ))}
            </select>
            <span className="block text-xs text-fg-muted">{t('resignation.fillFromCvHint')}</span>
          </label>

          <Group title={t('resignation.you')}>
            <Text
              label={t('resignation.yourName')}
              value={letter.sender.name}
              max={L.sender.name}
              onChange={set('senderName')}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <Text
                label={t('resignation.yourEmail')}
                type="email"
                value={letter.sender.email}
                max={L.sender.email}
                onChange={set('senderEmail')}
              />
              <Text
                label={t('resignation.yourPhone')}
                type="tel"
                value={letter.sender.phone}
                max={L.sender.phone}
                onChange={set('senderPhone')}
              />
            </div>
            <Text
              label={t('resignation.yourResidence')}
              value={letter.sender.residence}
              max={L.sender.residence}
              onChange={set('senderResidence')}
            />
          </Group>

          <Group title={t('resignation.employer')}>
            <div className="grid gap-3 sm:grid-cols-2">
              <Text
                label={t('resignation.company')}
                value={edits.company ?? ''}
                max={L.employer.company}
                onChange={set('company')}
              />
              <Text
                label={t('resignation.contact')}
                value={edits.contact ?? ''}
                max={L.employer.contact}
                onChange={set('contact')}
              />
            </div>
            <Text
              label={t('resignation.address')}
              value={edits.address ?? ''}
              max={L.employer.address}
              onChange={set('address')}
            />
            <div className="grid gap-3 sm:grid-cols-[8rem_1fr]">
              <Text
                label={t('resignation.postalCode')}
                value={edits.postalCode ?? ''}
                max={L.employer.postalCode}
                onChange={set('postalCode')}
              />
              <Text
                label={t('resignation.city')}
                value={edits.city ?? ''}
                max={L.employer.city}
                onChange={set('city')}
              />
            </div>
          </Group>

          <Group title={t('resignation.letter')}>
            <Text
              label={t('resignation.subject')}
              value={letter.subject}
              max={L.subject}
              onChange={set('subject')}
            />
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="block space-y-1 text-sm">
                <span className="font-medium">{t('resignation.date')}</span>
                <input
                  type="date"
                  value={isoDate}
                  onChange={(e) => setIsoDate(e.target.value)}
                  className={field}
                />
              </label>
              <label className="block space-y-1 text-sm">
                <span className="font-medium">{t('resignation.letterLanguage')}</span>
                <select
                  value={language}
                  onChange={(e) => {
                    setLanguage(e.target.value as CvLanguage)
                    // The subject follows the language until it has been edited.
                    setEdits((current) => {
                      const { subject: _subject, ...rest } = current
                      return rest
                    })
                  }}
                  className={field}
                >
                  {CV_LANGUAGES.map((code) => (
                    <option key={code} value={code}>
                      {t(`labels.cvLanguage.${code}`)}
                    </option>
                  ))}
                </select>
              </label>
            </div>
            <p className="text-xs text-fg-muted">{formatLetterDate(today, language)}</p>
          </Group>

          <Text
            label={t('resignation.name')}
            value={title ?? defaultTitle}
            max={200}
            onChange={setTitle}
          />
          {create.isError && (
            <p role="alert" className="text-sm text-danger-fg">
              {t('resignation.createFailed', { message: errorMessage(create.error) })}
            </p>
          )}
          <button
            type="submit"
            disabled={create.isPending || waitingForCv}
            className={primaryButton}
          >
            {create.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
            {create.isPending ? t('resignation.creating') : t('resignation.create')}
          </button>
        </div>
        <div className="flex justify-center lg:block">
          <ResignationThumbnail letter={letter} width={300} mode="edit" />
        </div>
      </form>
    </>
  )
}
