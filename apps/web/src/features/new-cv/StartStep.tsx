import {
  CV_LANGUAGES,
  type CvDocument,
  type CvLanguage,
  type ProfessionId,
  type TemplateId,
} from '@cv/shared'
import { LoaderCircle } from 'lucide-react'
import { useMemo, useState, type FormEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { useNavigate } from 'react-router'
import { card, primaryButton } from '@/shared/ui/PageHeader'
import { CvThumbnail } from '@/renderer'
import type { RenderMode } from '@/renderer/context'
import { errorMessage } from '@/shared/api/errorMessage'
import { useCreateCv } from '@/features/cv-editor/queries'
import { buildNewCv, type StartFrom } from './buildNewCv'

const field =
  'rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm dark:border-slate-600 dark:bg-slate-800'

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
        selected ? 'border-teal-600 ring-2 ring-teal-600 dark:border-teal-500' : ''
      }`}
    >
      <span className="flex items-start gap-3">
        <input
          type="radio"
          name="startFrom"
          value={value}
          checked={selected}
          onChange={() => onSelect(value)}
          className="mt-1 size-4 accent-teal-600"
        />
        <span>
          <span className="block font-medium">{title}</span>
          <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">
            {description}
          </span>
        </span>
      </span>
      <span className="flex justify-center">
        <CvThumbnail cv={cv} width={260} mode={mode} />
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
    create.mutate(
      {
        title: title.trim() || undefined,
        professionId,
        document: documents[startFrom] ?? documents.blank,
      },
      { onSuccess: (record) => navigate(`/cvs/${record.id}/edit`, { replace: true }) },
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
        {!profession && (
          <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
            {t('newCv.examplesHint')}
          </p>
        )}
      </fieldset>

      <div className={`${card} flex flex-wrap items-end gap-4 p-4`}>
        <label className="flex min-w-56 flex-1 flex-col gap-1 text-sm">
          <span className="font-medium">{t('newCv.cvName')}</span>
          <input
            value={title}
            maxLength={200}
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
      <p className="-mt-3 text-xs text-slate-500 dark:text-slate-400">
        {startFrom === 'example' ? t('newCv.languageNoteExample') : t('newCv.languageNote')}
      </p>

      {create.isError && (
        <p
          role="alert"
          className="rounded-lg border border-red-200 bg-red-50 px-4 py-2 text-sm text-red-900 dark:border-red-900 dark:bg-red-950/60 dark:text-red-200"
        >
          {t('newCv.createFailed', { message: errorMessage(create.error) })}
        </p>
      )}
    </form>
  )
}
