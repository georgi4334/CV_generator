import type { CvDesign, PageSize } from '@cv/shared'

const MM_TO_PX = 96 / 25.4

export const PAGE_SIZE_PX: Record<PageSize, { width: number; height: number }> = {
  A4: { width: Math.round(210 * MM_TO_PX), height: Math.round(297 * MM_TO_PX) },
  Letter: { width: Math.round(215.9 * MM_TO_PX), height: Math.round(279.4 * MM_TO_PX) },
}

// Values for each 1–5 step of the Design & Font sliders.
const MARGIN_MM = [10, 14, 18, 22, 26] as const
const SECTION_GAP_PX = [12, 18, 24, 30, 38] as const
const FONT_SIZE_PX = [11.5, 12.5, 13.5, 14.5, 15.5] as const
const LINE_HEIGHT = [1.25, 1.35, 1.45, 1.55, 1.7] as const

const step = <T>(values: readonly T[], level: number): T =>
  values[Math.min(Math.max(level, 1), 5) - 1]!

export interface LayoutTokens {
  page: { width: number; height: number }
  margin: number
  sectionGap: number
  itemGap: number
  fontSize: number
  lineHeight: number
}

/** Turns the design settings into pixel values used for layout and pagination. */
export function layoutTokens(design: CvDesign): LayoutTokens {
  const sectionGap = step(SECTION_GAP_PX, design.sectionSpacing)
  return {
    page: PAGE_SIZE_PX[design.pageSize],
    margin: Math.round(step(MARGIN_MM, design.pageMargins) * MM_TO_PX),
    sectionGap,
    itemGap: Math.round(sectionGap * 0.5),
    fontSize: step(FONT_SIZE_PX, design.fontSize),
    lineHeight: step(LINE_HEIGHT, design.lineHeight),
  }
}

/** #RRGGBB → rgba() with the given alpha. */
export function withAlpha(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16)
  return `rgba(${(n >> 16) & 255}, ${(n >> 8) & 255}, ${n & 255}, ${alpha})`
}
