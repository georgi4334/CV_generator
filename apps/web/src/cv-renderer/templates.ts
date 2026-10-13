import type { CvHeader, TemplateId } from '@cv/shared'
import type { FC } from 'react'
import type { TitleVariant } from './context'
import { CompactHeader, PolishedHeader, SingleColumnHeader } from './headers'

export type SidebarFill = 'none' | 'tint' | 'solid'

export interface TemplateDefinition {
  id: TemplateId
  name: string
  columns: 1 | 2
  sidebarSide: 'left' | 'right'
  /** "main": header sits at the top of the main column; "full": spans the page. */
  headerPlacement: 'main' | 'full'
  supportsPhoto: boolean
  titleVariant: TitleVariant
  Header: FC<{ header: CvHeader }>
  /** Sidebar width (fraction of the page) and background for each Column layout option (1–4). */
  sidebar: (columnLayout: number) => { width: number; fill: SidebarFill }
}

const polished: TemplateDefinition = {
  id: 'polished',
  name: 'Polished',
  columns: 2,
  sidebarSide: 'right',
  headerPlacement: 'main',
  supportsPhoto: true,
  titleVariant: 'underline',
  Header: PolishedHeader,
  sidebar: (layout) =>
    [
      { width: 0.3, fill: 'none' as const },
      { width: 0.34, fill: 'none' as const },
      { width: 0.34, fill: 'tint' as const },
      { width: 0.36, fill: 'solid' as const },
    ][layout - 1] ?? { width: 0.36, fill: 'solid' },
}

const singleColumn: TemplateDefinition = {
  id: 'single-column',
  name: 'Single column',
  columns: 1,
  sidebarSide: 'right',
  headerPlacement: 'full',
  supportsPhoto: false,
  titleVariant: 'accent-rule',
  Header: SingleColumnHeader,
  sidebar: () => ({ width: 0, fill: 'none' }),
}

const compact: TemplateDefinition = {
  id: 'compact',
  name: 'Compact',
  columns: 2,
  sidebarSide: 'left',
  headerPlacement: 'full',
  supportsPhoto: true,
  titleVariant: 'accent-small',
  Header: CompactHeader,
  sidebar: (layout) =>
    [
      { width: 0.28, fill: 'none' as const },
      { width: 0.32, fill: 'none' as const },
      { width: 0.32, fill: 'tint' as const },
      { width: 0.32, fill: 'solid' as const },
    ][layout - 1] ?? { width: 0.32, fill: 'tint' },
}

const IMPLEMENTED: Partial<Record<TemplateId, TemplateDefinition>> = {
  polished,
  'single-column': singleColumn,
  compact,
}

/** Until the remaining templates are built (Step 7), each one falls back to its closest match. */
const FALLBACK: Record<TemplateId, TemplateId> = {
  polished: 'polished',
  contemporary: 'polished',
  creative: 'polished',
  stylish: 'polished',
  timeline: 'single-column',
  'single-column': 'single-column',
  compact: 'compact',
  multicolumn: 'compact',
}

export function getTemplate(id: TemplateId): TemplateDefinition {
  return IMPLEMENTED[id] ?? IMPLEMENTED[FALLBACK[id]] ?? polished
}
