import type { CoverLetterDocument, CvDocument } from '@cv/shared'
import { memo } from 'react'
import { CvRenderer } from './CvRenderer'
import { LetterRenderer } from './LetterRenderer'
import type { RenderMode } from '@/renderer/context'
import { PAGE_SIZE_PX } from '@/renderer/templates/tokens'

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
      className="pointer-events-none overflow-hidden rounded border border-line bg-surface"
      style={{ width, height: Math.round(page.height * scale) }}
    >
      <div style={{ width: page.width, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <CvRenderer cv={cv} mode={mode} />
      </div>
    </div>
  )
})

/** The first page of a cover letter, scaled down to `width` pixels. Not interactive. */
export const LetterThumbnail = memo(function LetterThumbnail({
  letter,
  width,
  mode = 'preview',
}: {
  letter: CoverLetterDocument
  width: number
  /** "edit" shows the hints of empty fields. */
  mode?: RenderMode
}) {
  const page = PAGE_SIZE_PX[letter.design.pageSize]
  const scale = width / page.width
  return (
    <div
      aria-hidden
      inert
      className="pointer-events-none overflow-hidden rounded border border-line bg-surface"
      style={{ width, height: Math.round(page.height * scale) }}
    >
      <div style={{ width: page.width, transform: `scale(${scale})`, transformOrigin: 'top left' }}>
        <LetterRenderer letter={letter} mode={mode} />
      </div>
    </div>
  )
})
