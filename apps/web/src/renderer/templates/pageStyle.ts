import type { CvDesign } from '@cv/shared'
import type { CSSProperties } from 'react'
import { FONT_STACKS } from './fonts'
import type { LayoutTokens } from './tokens'

/** Text colors on a solid accent background (sidebar, header band). */
export const SOLID_SIDEBAR_VARS = {
  '--cv-text': '#ffffff',
  '--cv-strong': '#ffffff',
  '--cv-muted': 'rgba(255, 255, 255, 0.78)',
  '--cv-muted-strong': 'rgba(255, 255, 255, 0.88)',
  '--cv-accent-text': '#ffffff',
  '--cv-rule': 'rgba(255, 255, 255, 0.3)',
  '--cv-hover': 'rgba(255, 255, 255, 0.14)',
  // Filled titles stay visible on the accent background.
  '--cv-title-bg': 'rgba(255, 255, 255, 0.2)',
} as CSSProperties

/** Font, size and colors of a page (CV or cover letter). */
export function pageStyle(design: CvDesign, tokens: LayoutTokens): CSSProperties {
  return {
    width: tokens.page.width,
    fontFamily: FONT_STACKS[design.fontFamily],
    fontSize: tokens.fontSize,
    lineHeight: tokens.lineHeight,
    color: 'var(--cv-text)',
    '--cv-text': '#1f2937',
    '--cv-strong': '#4b5563',
    '--cv-muted': '#6b7280',
    '--cv-muted-strong': '#4b5563',
    '--cv-accent': design.accentColor,
    '--cv-accent-text': design.accentColor,
    '--cv-rule': 'rgba(15, 23, 42, 0.14)',
    '--cv-hover': 'rgba(15, 23, 42, 0.06)',
    '--cv-title-bg': design.accentColor,
  } as CSSProperties
}
