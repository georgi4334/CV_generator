import {
  CV_LANGUAGES,
  LETTER_TEMPLATE_IDS,
  PROFESSIONS,
  TEMPLATE_CATEGORIES,
  TEMPLATE_IDS,
  templatesIn,
  type CvDocument,
  type CvLanguage,
  type ProfessionId,
  type TemplateId,
} from '@cv/shared'
import { Info } from 'lucide-react'
import { memo } from 'react'
import { useTranslation } from 'react-i18next'
import { RecommendedBadge } from '@/shared/ui/Badges'
import { FitToWidth } from '@/shared/ui/FitToWidth'
import { TEMPLATE_THUMBNAIL_WIDTH } from './templateThumbnail'
import { CvThumbnail, templateChoice, withTemplate } from '@/renderer'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { useCvEditor } from '@/features/cv-editor/state/cvEditorStore'
import { useDesignTarget } from '@/features/cv-editor/state/designTarget'

/** The user's CV in another template, the way choosing it would look. */
const TemplateThumbnail = memo(function TemplateThumbnail({
  cv,
  templateId,
}: {
  cv: CvDocument
  templateId: TemplateId
}) {
  return <CvThumbnail cv={withTemplate(cv, templateId)} width={TEMPLATE_THUMBNAIL_WIDTH} />
})

const segment = 'flex-1 rounded-md py-1.5 text-sm font-medium'

/** `professionId` marks the templates recommended for the CV's profession. */
export function TemplatesPanel({ professionId = null }: { professionId?: ProfessionId | null }) {
  const { t } = useTranslation()
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
  // The extra CV templates are for CVs only.
  const available: readonly TemplateId[] = kind === 'cv' ? TEMPLATE_IDS : LETTER_TEMPLATE_IDS

  return (
    <>
      <div className="space-y-4" role="group" aria-label={t('editor.panels.templates')}>
        {TEMPLATE_CATEGORIES.map((category) => {
          const ids = templatesIn(category, available)
          if (ids.length === 0) return null
          return (
            <section key={category} aria-labelledby={`template-category-${category}`}>
              <h3
                id={`template-category-${category}`}
                className="mb-2 text-xs font-semibold tracking-wide text-fg-muted uppercase"
              >
                {t(`labels.templateCategory.${category}`)}
              </h3>
              <ul className="grid grid-cols-2 gap-3">
                {ids.map((id) => {
                  const selected = id === current
                  const isRecommended = recommended.includes(id)
                  return (
                    <li key={id}>
                      <button
                        type="button"
                        aria-pressed={selected}
                        onClick={() => updateDesign(templateChoice(id))}
                        className={`group relative w-full rounded-control p-1 text-center text-xs ${
                          selected
                            ? 'ring-2 ring-brand-line'
                            : 'hover:ring-2 hover:ring-line-strong '
                        }`}
                      >
                        {/* Fits the column, so the selection ring lines up and nothing scrolls sideways. */}
                        <FitToWidth width={TEMPLATE_THUMBNAIL_WIDTH}>{thumbnail(id)}</FitToWidth>
                        <span
                          className={`mt-1 block ${selected ? 'font-semibold text-brand-fg ' : ''}`}
                        >
                          {t(`labels.template.${id}`)}
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
            </section>
          )
        })}
      </div>

      <button
        type="button"
        onClick={closePanel}
        className="mt-4 w-full rounded-control bg-brand py-2 text-sm font-medium text-on-brand hover:bg-brand-hover"
      >
        {t('editor.templates.continueEditing')}
      </button>

      <div className="mt-5 flex items-center gap-3">
        <span className="w-24 text-sm">{t('editor.templates.documentSizeLabel')}</span>
        <div
          role="radiogroup"
          aria-label={t('editor.templates.documentSize')}
          className="flex flex-1 gap-1 rounded-control bg-muted p-1"
        >
          {(['A4', 'Letter'] as const).map((size) => (
            <button
              key={size}
              type="button"
              role="radio"
              aria-checked={design.pageSize === size}
              onClick={() => updateDesign({ pageSize: size })}
              className={`${segment} ${
                design.pageSize === size ? 'bg-surface text-brand-fg shadow-card ' : 'text-fg-soft '
              }`}
            >
              {size === 'A4' ? 'A4' : t('editor.templates.usLetter')}
            </button>
          ))}
        </div>
      </div>

      <label className="mt-4 flex items-center gap-3">
        <span className="flex w-24 items-center gap-1 text-sm">
          {kind === 'cv'
            ? t('editor.templates.resumeLanguage')
            : t('editor.templates.letterLanguage')}
          <span
            title={
              kind === 'cv'
                ? t('editor.templates.resumeLanguageHint')
                : t('editor.templates.letterLanguageHint')
            }
            className="text-fg-faint"
          >
            <Info className="size-3.5" aria-hidden />
          </span>
        </span>
        <select
          className="flex-1 rounded-control border border-line-strong bg-surface px-2 py-1.5 text-sm"
          value={language}
          onChange={(e) => setLanguage(e.target.value as CvLanguage)}
        >
          {CV_LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {t(`labels.cvLanguage.${language}`)}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}
