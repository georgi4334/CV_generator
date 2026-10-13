import type { CvDesign, CvHeader, TemplateId } from '@cv/shared'
import type { FC } from 'react'
import type { TitleVariant } from './context'
import {
  CompactHeader,
  ContemporaryHeader,
  CreativeHeader,
  PolishedHeader,
  SingleColumnHeader,
  StylishHeader,
} from './headers'

export type SidebarFill = 'none' | 'tint' | 'solid'
type SidebarOption = { width: number; fill: SidebarFill }

export interface TemplateDefinition {
  id: TemplateId
  name: string
  columns: 1 | 2
  sidebarSide: 'left' | 'right'
  /** "main": header sits at the top of the main column; "full": spans the page. */
  headerPlacement: 'main' | 'full'
  /** A full-width header drawn on an accent-colored band. */
  headerBand?: boolean
  supportsPhoto: boolean
  titleVariant: TitleVariant
  /** Experience, education and project entries sit on a vertical line. */
  timeline?: boolean
  Header: FC<{ header: CvHeader }>
  /** Sidebar width (fraction of the page) and background for each Column layout option (1–4). */
  sidebarOptions: [SidebarOption, SidebarOption, SidebarOption, SidebarOption]
  /** Design values applied by "Reset to template defaults". */
  defaults?: Partial<CvDesign>
}

const NO_SIDEBAR: TemplateDefinition['sidebarOptions'] = [
  { width: 0, fill: 'none' },
  { width: 0, fill: 'none' },
  { width: 0, fill: 'none' },
  { width: 0, fill: 'none' },
]

export const TEMPLATES: Record<TemplateId, TemplateDefinition> = {
  polished: {
    id: 'polished',
    name: 'Polished',
    columns: 2,
    sidebarSide: 'right',
    headerPlacement: 'main',
    supportsPhoto: true,
    titleVariant: 'underline',
    Header: PolishedHeader,
    sidebarOptions: [
      { width: 0.3, fill: 'none' },
      { width: 0.34, fill: 'none' },
      { width: 0.34, fill: 'tint' },
      { width: 0.36, fill: 'solid' },
    ],
    defaults: { columnLayout: 4 },
  },
  contemporary: {
    id: 'contemporary',
    name: 'Contemporary',
    columns: 2,
    sidebarSide: 'right',
    headerPlacement: 'full',
    headerBand: true,
    supportsPhoto: true,
    titleVariant: 'accent-small',
    Header: ContemporaryHeader,
    sidebarOptions: [
      { width: 0.3, fill: 'none' },
      { width: 0.34, fill: 'none' },
      { width: 0.34, fill: 'tint' },
      { width: 0.36, fill: 'tint' },
    ],
    defaults: { columnLayout: 3 },
  },
  creative: {
    id: 'creative',
    name: 'Creative',
    columns: 2,
    sidebarSide: 'left',
    headerPlacement: 'main',
    supportsPhoto: true,
    titleVariant: 'bar',
    Header: CreativeHeader,
    sidebarOptions: [
      { width: 0.3, fill: 'none' },
      { width: 0.34, fill: 'tint' },
      { width: 0.36, fill: 'tint' },
      { width: 0.38, fill: 'solid' },
    ],
    defaults: { columnLayout: 4, fontFamily: 'Montserrat' },
  },
  timeline: {
    id: 'timeline',
    name: 'Timeline',
    columns: 1,
    sidebarSide: 'right',
    headerPlacement: 'full',
    supportsPhoto: true,
    titleVariant: 'accent-rule',
    timeline: true,
    Header: CompactHeader,
    sidebarOptions: NO_SIDEBAR,
  },
  stylish: {
    id: 'stylish',
    name: 'Stylish',
    columns: 2,
    sidebarSide: 'left',
    headerPlacement: 'full',
    supportsPhoto: true,
    titleVariant: 'pill',
    Header: StylishHeader,
    // A solid sidebar would hide the pill-shaped titles, so it stays light.
    sidebarOptions: [
      { width: 0.3, fill: 'none' },
      { width: 0.34, fill: 'none' },
      { width: 0.34, fill: 'tint' },
      { width: 0.38, fill: 'tint' },
    ],
    defaults: { columnLayout: 3, fontFamily: 'Lora' },
  },
  'single-column': {
    id: 'single-column',
    name: 'Single column',
    columns: 1,
    sidebarSide: 'right',
    headerPlacement: 'full',
    supportsPhoto: false,
    titleVariant: 'accent-rule',
    Header: SingleColumnHeader,
    sidebarOptions: NO_SIDEBAR,
  },
  compact: {
    id: 'compact',
    name: 'Compact',
    columns: 2,
    sidebarSide: 'left',
    headerPlacement: 'full',
    supportsPhoto: true,
    titleVariant: 'accent-small',
    Header: CompactHeader,
    sidebarOptions: [
      { width: 0.28, fill: 'none' },
      { width: 0.32, fill: 'none' },
      { width: 0.32, fill: 'tint' },
      { width: 0.32, fill: 'solid' },
    ],
    defaults: { columnLayout: 3, sectionSpacing: 1, fontSize: 1, lineHeight: 1 },
  },
  multicolumn: {
    id: 'multicolumn',
    name: 'Multicolumn',
    columns: 2,
    sidebarSide: 'right',
    headerPlacement: 'full',
    supportsPhoto: false,
    titleVariant: 'accent-rule',
    Header: SingleColumnHeader,
    sidebarOptions: [
      { width: 0.42, fill: 'none' },
      { width: 0.46, fill: 'none' },
      { width: 0.5, fill: 'none' },
      { width: 0.5, fill: 'tint' },
    ],
    defaults: { columnLayout: 3 },
  },
}

export function getTemplate(id: TemplateId): TemplateDefinition {
  return TEMPLATES[id] ?? TEMPLATES.polished
}

/** Sidebar width and background for the chosen Column layout option. */
export function sidebarFor(template: TemplateDefinition, columnLayout: number): SidebarOption {
  return template.sidebarOptions[Math.min(Math.max(columnLayout, 1), 4) - 1]!
}
