import {
  CV_LANGUAGES,
  PROFESSIONS,
  TEMPLATE_IDS,
  type CvDocument,
  type CvLanguage,
  type ProfessionId,
  type TemplateId,
} from '@cv/shared'
import { Info } from 'lucide-react'
import { memo } from 'react'
import { RecommendedBadge } from '../../components/Badges'
import { CvThumbnail, getTemplate, templateChoice, withTemplate } from '../../cv-renderer'
import { CV_LANGUAGE_NAMES } from '../../lib/languages'
import { useEditorUi } from '../../stores/editorUi'
import { useCvEditor } from './cvEditorStore'
import { useDesignTarget } from './designTarget'

/** The user's CV in another template, the way choosing it would look. */
const TemplateThumbnail = memo(function TemplateThumbnail({
  cv,
  templateId,
}: {
  cv: CvDocument
  templateId: TemplateId
}) {
  return <CvThumbnail cv={withTemplate(cv, templateId)} width={120} />
})

const segment = 'flex-1 rounded-md py-1.5 text-sm font-medium'

/** `professionId` marks the templates recommended for the CV's profession. */
export function TemplatesPanel({ professionId = null }: { professionId?: ProfessionId | null }) {
  const cv = useCvEditor((s) => s.cv)
  const { kind, design, language, updateDesign, setLanguage, renderThumbnail } = useDesignTarget()
  const closePanel = useEditorUi((s) => s.closePanel)
  if (!design) return null
  const current = design.templateId
  const thumbnail =
    renderThumbnail ??
    ((id: TemplateId) => (cv ? <TemplateThumbnail cv={cv} templateId={id} /> : null))
  const recommended: readonly TemplateId[] = professionId
    ? PROFESSIONS[professionId].recommendedTemplates
    : []

  return (
    <>
      <ul className="grid grid-cols-2 gap-3" aria-label="Templates">
        {TEMPLATE_IDS.map((id) => {
          const selected = id === current
          const isRecommended = recommended.includes(id)
          return (
            <li key={id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => updateDesign(templateChoice(id))}
                className={`group relative w-full rounded-lg p-1 text-center text-xs ${
                  selected
                    ? 'ring-2 ring-teal-600'
                    : 'hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-600'
                }`}
              >
                {thumbnail(id)}
                <span
                  className={`mt-1 block ${selected ? 'font-semibold text-teal-700 dark:text-teal-300' : ''}`}
                >
                  {getTemplate(id).name}
                </span>
                {isRecommended && (
                  <>
                    {' '}
                    <RecommendedBadge compact className="absolute top-1.5 left-1.5" />
                  </>
                )}
              </button>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={closePanel}
        className="mt-4 w-full rounded-lg bg-teal-700 py-2 text-sm font-medium text-white hover:bg-teal-800"
      >
        Continue Editing
      </button>

      <div className="mt-5 flex items-center gap-3">
        <span className="w-24 text-sm">Document size:</span>
        <div
          role="radiogroup"
          aria-label="Document size"
          className="flex flex-1 gap-1 rounded-lg bg-slate-100 p-1 dark:bg-slate-800"
        >
          {(['A4', 'Letter'] as const).map((size) => (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={design.pageSize === size}
              onClick={() => updateDesign({ pageSize: size })}
              className={`${segment} ${
                design.pageSize === size
                  ? 'bg-white text-teal-700 shadow-sm dark:bg-slate-700 dark:text-teal-300'
                  : 'text-slate-600 dark:text-slate-300'
              }`}
            >
              {size === 'A4' ? 'A4' : 'US Letter'}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-4 flex items-center gap-3">
        <span className="flex w-24 items-center gap-1 text-sm">
          {kind === 'cv' ? 'Resume language' : 'Letter language'}
          <span
            title={
              kind === 'cv'
                ? "Sets the section titles, date formats and placeholders on your CV. It does not change the app's language."
                : "Sets the placeholders on your letter. It does not change the app's language or your text."
            }
            className="text-slate-400"
          >
            <Info className="size-3.5" aria-hidden />
          </span>
        </span>
        <select
          className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
          value={language}
          onChange={(e) => setLanguage(e.target.value as CvLanguage)}
        >
          {CV_LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {CV_LANGUAGE_NAMES[language]}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}
