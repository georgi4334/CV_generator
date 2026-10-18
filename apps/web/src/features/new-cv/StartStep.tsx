import {
  CV_LANGUAGES,
  TITLE_MAX,
  type CvDocument,
  type CvLanguage,
  type ProfessionId,
  type TemplateId,
} from '@cv/shared'
import { LoaderCircle } from 'lucide-react'
import { useMemo, useRef, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { card, primaryButton } from '@/shared/ui/PageHeader'
import { CvThumbnail } from '@/renderer'
import type { RenderMode } from '@/renderer/context'
import { errorMessage } from '@/shared/api/errorMessage'
import { useCreateCv } from '@/features/cv-editor/queries'
import { buildNewCv, type StartFrom } from './buildNewCv'
import { runViewTransition } from '@/shared/lib/viewTransitions'

/** Width in pixels of the example CV preview. */
const EXAMPLE_PREVIEW_WIDTH = 260

const field = 'input w-auto'

function StartOption({
  value,
  selected,
  onSelect,
  title,
  description,
  cv,
  mode,
}: {
  value: StartFrom
  selected: boolean
  onSelect: (value: StartFrom) => void
  title: string
  description: string
  cv: CvDocument
  /** "edit" shows the placeholders of a blank CV. */
  mode: RenderMode
}) {
  return (
    <label
      className={`${card} flex cursor-pointer flex-col gap-4 p-4 ${
        selected ? 'border-brand-line ring-2 ring-brand-line ' : ''
      }`}
    >
      <span className="flex items-start gap-3">
        <input
          type="radio"
          name="startFrom"
          value={value}
          checked={selected}
          onChange={() => onSelect(value)}
          className="mt-1 size-4 accent-brand-line"
        />
        <span>
          <span className="block font-medium">{title}</span>
          <span className="mt-0.5 block text-sm text-fg-muted">{description}</span>
        </span>
      </span>
      <span className="flex justify-center">
        <CvThumbnail cv={cv} width={EXAMPLE_PREVIEW_WIDTH} mode={mode} />
      </span>
    </label>
  )
}

export function StartStep({
  professionId,
  templateId,
}: {
  professionId: ProfessionId | null
  templateId: TemplateId
}) {
  const { t } = useTranslation()
  const navigate = useNavigate()
  const create = useCreateCv()
  // A quick double click submits twice before the button can disable itself.
  const submitted = useRef(false)
  const profession = professionId ? t(`labels.profession.${professionId}.name`) : null
  const [startFrom, setStartFrom] = useState<StartFrom>(profession ? 'example' : 'blank')
  const [title, setTitle] = useState(
    profession ? t('newCv.defaultTitle', { profession }) : t('newCv.untitled'),
  )
  const [language, setLanguage] = useState<CvLanguage>('en-US')

  // Built once per choice, so the CV that is created is exactly the one previewed.
  const documents = useMemo(
    () => ({
      example: professionId
        ? buildNewCv({ professionId, templateId, startFrom: 'example', language })
        : null,
      blank: buildNewCv({ professionId, templateId, startFrom: 'blank', language }),
    }),
    [professionId, templateId, language],
  )

  const submit = (event: FormEvent) => {
    event.preventDefault()
    if (submitted.current) return
    submitted.current = true
    create.mutate(
      {
        title: title.trim() || undefined,
        professionId,
        document: documents[startFrom] ?? documents.blank,
      },
      {
        onError: () => {
          submitted.current = false
        },
        // The new CV opens like an app: the wizard steps back as the page grows in.
        onSuccess: (record) =>
          runViewTransition('doc-open', () =>
            navigate(`/cvs/${record.id}/edit`, { replace: true, flushSync: true }),
          ),
      },
    )
  }

  return (
    <form onSubmit={submit} className="space-y-6">
      <fieldset>
        <legend className="sr-only">{t('newCv.startLegend')}</legend>
        <div className="grid gap-4 md:grid-cols-2">
          {profession && documents.example && (
            <StartOption
              value="example"
              selected={startFrom === 'example'}
              onSelect={setStartFrom}
              title={t('newCv.startExample')}
              description={t('newCv.startExampleDescription', { profession })}
              cv={documents.example}
              mode="preview"
            />
          )}
          <StartOption
            value="blank"
            selected={startFrom === 'blank'}
            onSelect={setStartFrom}
            title={t('newCv.startBlank')}
            description={
              profession
                ? t('newCv.startBlankProfession', { profession })
                : t('newCv.startBlankGeneral')
            }
            cv={documents.blank}
            mode="edit"
          />
        </div>
        {!profession && <p className="mt-3 text-sm text-fg-muted">{t('newCv.examplesHint')}</p>}
      </fieldset>

      <div className={`${card} flex flex-wrap items-end gap-4 p-4`}>
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">{t('newCv.cvName')}</span>
          <input
            value={title}
            maxLength={TITLE_MAX}
            onChange={(e) => setTitle(e.target.value)}
            className={field}
          />
        </label>
        <label className="flex min-w-48 flex-col gap-1 text-sm">
          <span className="font-medium">{t('newCv.cvLanguage')}</span>
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
        <button type="submit" disabled={create.isPending} className={primaryButton}>
          {create.isPending && <LoaderCircle className="size-4 animate-spin" aria-hidden />}
          {create.isPending ? t('newCv.creating') : t('newCv.createCv')}
        </button>
      </div>
      <p className="-mt-3 text-xs text-fg-muted">
        {startFrom === 'example' ? t('newCv.languageNoteExample') : t('newCv.languageNote')}
      </p>

      {create.isError && (
        <p
          role="alert"
          className="rounded-control border border-danger-line bg-danger-soft px-4 py-2 text-sm text-danger-fg"
        >
          {t('newCv.createFailed', { message: errorMessage(create.error) })}
        </p>
      )}
    </form>
  )
}
