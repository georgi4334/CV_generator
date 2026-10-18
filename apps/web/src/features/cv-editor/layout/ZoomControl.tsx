import { Maximize, Minus, Plus } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { ZOOM_MAX, ZOOM_MIN, ZOOM_STEP, useEditorUi } from '@/features/cv-editor/state/editorUi'

/** The next step up or down from `percent`, e.g. 55 → 60 or 50. */
const stepZoom = (percent: number, direction: 1 | -1) =>
  direction === 1
    ? Math.floor(percent / ZOOM_STEP) * ZOOM_STEP + ZOOM_STEP
    : Math.ceil(percent / ZOOM_STEP) * ZOOM_STEP - ZOOM_STEP

/**
 * Zoom for the page: smaller and bigger buttons, a slider and the current
 * percentage. The percentage button goes back to the default size (fitted to
 * the screen, or 100% where the page fits).
 */
export function ZoomControl({ percent, fitted }: { percent: number; fitted: boolean }) {
  const { t } = useTranslation()
  const setZoom = useEditorUi((s) => s.setZoom)
  const button = 'btn-icon p-1.5'

  return (
    <div
      role="group"
      aria-label={t('editor.zoom.group')}
      // Floats over the white page: the stronger glass keeps its numbers readable there.
      className="glass-pill pointer-events-auto flex items-center gap-1 bg-glass-strong! px-1.5 py-1"
    >
      <button
        type="button"
        className={button}
        aria-label={t('editor.zoom.zoomOut')}
        title={t('editor.zoom.zoomOut')}
        disabled={percent <= ZOOM_MIN}
        onClick={() => setZoom(stepZoom(percent, -1))}
      >
        <Minus className="size-4" aria-hidden />
      </button>
      <input
        type="range"
        min={ZOOM_MIN}
        max={ZOOM_MAX}
        step={5}
        value={percent}
        aria-label={t('editor.zoom.label')}
        aria-valuetext={`${percent}%`}
        className="hidden w-28 accent-brand sm:block"
        onChange={(e) => setZoom(Number(e.target.value))}
      />
      <button
        type="button"
        className={button}
        aria-label={t('editor.zoom.zoomIn')}
        title={t('editor.zoom.zoomIn')}
        disabled={percent >= ZOOM_MAX}
        onClick={() => setZoom(stepZoom(percent, 1))}
      >
        <Plus className="size-4" aria-hidden />
      </button>
      <span aria-live="polite" className="w-11 text-center text-sm font-medium tabular-nums">
        {percent}%
      </span>
      <button
        type="button"
        className={button}
        aria-label={t('editor.zoom.fit')}
        title={t('editor.zoom.fit')}
        aria-pressed={fitted}
        onClick={() => setZoom(null)}
      >
        <Maximize className="size-4" aria-hidden />
      </button>
    </div>
  )
}
