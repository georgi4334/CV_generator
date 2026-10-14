import type { CvDocument } from '@cv/shared'
import { memo } from 'react'
import { CvRenderer } from './CvRenderer'
import type { RenderMode } from './context'
import { PAGE_SIZE_PX } from './tokens'

/**
 * The first page of a CV, scaled down to `width` pixels. Not interactive.
 * Use mode "edit" to show placeholders on an empty CV.
 */
export const CvThumbnail = memo(function CvThumbnail({
  cv,
  width,
  mode = 'preview',
}: {
  cv: CvDocument
  width: number
  mode?: RenderMode
}) {
  const page = PAGE_SIZE_PX[cv.design.pageSize]
  const scale = width / page.width
  return (
    <div
      aria-hidden
      inert
      className="pointer-events-none overflow-hidden rounded border border-slate-200 bg-white dark:border-slate-700"
      style={{ width, height: Math.round(page.height * scale) }}
    >
      <div style={{ width: page.width, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <CvRenderer cv={cv} mode={mode} />
      </div>
    </div>
  )
})
