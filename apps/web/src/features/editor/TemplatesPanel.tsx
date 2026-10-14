import {
  CV_LANGUAGES,
  TEMPLATE_IDS,
  type CvDocument,
  type CvLanguage,
  type TemplateId,
} from '@cv/shared'
import { Info } from 'lucide-react'
import { memo } from 'react'
import { CvRenderer, getTemplate } from '../../cv-renderer'
import { PAGE_SIZE_PX } from '../../cv-renderer/tokens'
import { useEditorUi } from '../../stores/editorUi'
import { useCvEditor } from './cvEditorStore'

const LANGUAGE_NAMES: Record<CvLanguage, string> = {
  'en-US': 'English (US)',
  'en-GB': 'English (UK)',
  bg: 'Български (Bulgarian)',
}

const THUMB_WIDTH = 120

/** First page of the user's CV in another template, scaled down. */
const TemplateThumbnail = memo(function TemplateThumbnail({
  cv,
  templateId,
}: {
  cv: CvDocument
  templateId: TemplateId
}) {
  const page = PAGE_SIZE_PX[cv.design.pageSize]
  const scale = THUMB_WIDTH / page.width
  // Show the template the way choosing it would: with its suggested font and layout.
  const preview = {
    ...cv,
    design: { ...cv.design, templateId, ...getTemplate(templateId).suggested },
  }
  return (
    <div
      aria-hidden
      inert
      className="pointer-events-none overflow-hidden rounded border border-slate-200 bg-white dark:border-slate-700"
      style={{ width: THUMB_WIDTH, height: Math.round(page.height * scale) }}
    >
      <div style={{ width: page.width, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <CvRenderer cv={preview} mode="preview" />
      </div>
    </div>
  )
})

const segment = 'flex-1 rounded-md py-1.5 text-sm font-medium'

export function TemplatesPanel() {
  const cv = useCvEditor((s) => s.cv)
  const updateDesign = useCvEditor((s) => s.updateDesign)
  const setLanguage = useCvEditor((s) => s.setLanguage)
  const closePanel = useEditorUi((s) => s.closePanel)
  if (!cv) return null
  const current = cv.design.templateId

  return (
    <>
      <ul className="grid grid-cols-2 gap-3" aria-label="Templates">
        {TEMPLATE_IDS.map((id) => {
          const selected = id === current
          return (
            <li key={id}>
              <button
                type="button"
                aria-pressed={selected}
                onClick={() => updateDesign({ templateId: id, ...getTemplate(id).suggested })}
                className={`group w-full rounded-lg p-1 text-center text-xs ${
                  selected
                    ? 'ring-2 ring-teal-600'
                    : 'hover:ring-2 hover:ring-slate-300 dark:hover:ring-slate-600'
                }`}
              >
                <TemplateThumbnail cv={cv} templateId={id} />
                <span
                  className={`mt-1 block ${selected ? 'font-semibold text-teal-700 dark:text-teal-300' : ''}`}
                >
                  {getTemplate(id).name}
                </span>
              </button>
            </li>
          )
        })}
      </ul>

      <button
        type="button"
        onClick={closePanel}
        className="mt-4 w-full rounded-lg bg-teal-600 py-2 text-sm font-medium text-white hover:bg-teal-700"
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
              aria-checked={cv.design.pageSize === size}
              onClick={() => updateDesign({ pageSize: size })}
              className={`${segment} ${
                cv.design.pageSize === size
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
          Resume language
          <span
            title="Sets the section titles, date formats and placeholders on your CV. It does not change the app's language."
            className="text-slate-400"
          >
            <Info className="size-3.5" aria-hidden />
          </span>
        </span>
        <select
          className="flex-1 rounded-lg border border-slate-300 bg-white px-2 py-1.5 text-sm dark:border-slate-600 dark:bg-slate-800"
          value={cv.language}
          onChange={(e) => setLanguage(e.target.value as CvLanguage)}
        >
          {CV_LANGUAGES.map((language) => (
            <option key={language} value={language}>
              {LANGUAGE_NAMES[language]}
            </option>
          ))}
        </select>
      </label>
    </>
  )
}
