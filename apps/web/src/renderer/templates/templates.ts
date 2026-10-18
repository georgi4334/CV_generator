import type { CvDesign, CvDocument, CvHeader, TemplateId } from '@cv/shared'
import type { FC } from 'react'
import type { TitleVariant } from '@/renderer/context'
import {
  BoldHeader,
  CompactHeader,
  ContemporaryHeader,
  CreativeHeader,
  ElegantHeader,
  ExecutiveHeader,
  ModernHeader,
  MonogramHeader,
  PolishedHeader,
  PortfolioHeader,
  SingleColumnHeader,
  SpotlightHeader,
  StylishHeader,
  VividHeader,
} from './headers'

export type SidebarFill = 'none' | 'tint' | 'solid'

export type TemplateSuggestion = Pick<
  CvDesign,
  'fontFamily' | 'columnLayout' | 'sectionSpacing' | 'fontSize' | 'lineHeight'
>
type SidebarOption = { width: number; fill: SidebarFill }

export interface TemplateDefinition {
  id: TemplateId
  name: string
  columns: 1 | 2
  sidebarSide: 'left' | 'right'
  /**
   * "main": header sits at the top of the main column; "full": spans the page;
   * "sidebar": at the top of the sidebar (two columns only).
   */
  headerPlacement: 'main' | 'full' | 'sidebar'
  /** A full-width header drawn on an accent-colored band. */
  headerBand?: boolean
  titleVariant: TitleVariant
  /** Experience, education and project entries sit on a vertical line. */
  timeline?: boolean
  Header: FC<{ header: CvHeader }>
  /** Sidebar width (fraction of the page) and background for each Column layout option (1–4). */
  sidebarOptions: [SidebarOption, SidebarOption, SidebarOption, SidebarOption]
  /**
   * The template's suggested look, applied when the template is chosen (and by
   * "Reset to defaults"). The user can change every value afterwards.
   */
  suggested: TemplateSuggestion
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
    titleVariant: 'underline',
    Header: PolishedHeader,
    sidebarOptions: [
      { width: 0.3, fill: 'none' },
      { width: 0.34, fill: 'none' },
      { width: 0.34, fill: 'tint' },
      { width: 0.36, fill: 'solid' },
    ],
    suggested: {
      fontFamily: 'Rubik',
      columnLayout: 4,
      sectionSpacing: 2,
      fontSize: 2,
      lineHeight: 2,
    },
  },
  contemporary: {
    id: 'contemporary',
    name: 'Contemporary',
    columns: 2,
    sidebarSide: 'right',
    headerPlacement: 'full',
    headerBand: true,
    titleVariant: 'accent-small',
    Header: ContemporaryHeader,
    sidebarOptions: [
      { width: 0.3, fill: 'none' },
      { width: 0.34, fill: 'none' },
      { width: 0.34, fill: 'tint' },
      { width: 0.36, fill: 'tint' },
    ],
    suggested: {
      fontFamily: 'Inter',
      columnLayout: 3,
      sectionSpacing: 2,
      fontSize: 2,
      lineHeight: 2,
    },
  },
  creative: {
    id: 'creative',
    name: 'Creative',
    columns: 2,
    sidebarSide: 'left',
    headerPlacement: 'main',
    titleVariant: 'bar',
    Header: CreativeHeader,
    sidebarOptions: [
      { width: 0.3, fill: 'none' },
      { width: 0.34, fill: 'tint' },
      { width: 0.36, fill: 'tint' },
      { width: 0.38, fill: 'solid' },
    ],
    suggested: {
      fontFamily: 'Montserrat',
      columnLayout: 4,
      sectionSpacing: 2,
      fontSize: 2,
      lineHeight: 2,
    },
  },
  timeline: {
    id: 'timeline',
    name: 'Timeline',
    columns: 1,
    sidebarSide: 'right',
    headerPlacement: 'full',
    titleVariant: 'accent-rule',
    timeline: true,
    Header: CompactHeader,
    sidebarOptions: NO_SIDEBAR,
    suggested: {
      fontFamily: 'Roboto',
      columnLayout: 1,
      sectionSpacing: 2,
      fontSize: 2,
      lineHeight: 2,
    },
  },
  stylish: {
    id: 'stylish',
    name: 'Stylish',
    columns: 2,
    sidebarSide: 'left',
    headerPlacement: 'full',
    titleVariant: 'pill',
    Header: StylishHeader,
    // A solid sidebar would hide the pill-shaped titles, so it stays light.
    sidebarOptions: [
      { width: 0.3, fill: 'none' },
      { width: 0.34, fill: 'none' },
      { width: 0.34, fill: 'tint' },
      { width: 0.38, fill: 'tint' },
    ],
    suggested: {
      fontFamily: 'Lora',
      columnLayout: 3,
      sectionSpacing: 2,
      fontSize: 2,
      lineHeight: 3,
    },
  },
  'single-column': {
    id: 'single-column',
    name: 'Single column',
    columns: 1,
    sidebarSide: 'right',
    headerPlacement: 'full',
    titleVariant: 'accent-rule',
    Header: SingleColumnHeader,
    sidebarOptions: NO_SIDEBAR,
    suggested: {
      fontFamily: 'Source Sans 3',
      columnLayout: 1,
      sectionSpacing: 2,
      fontSize: 3,
      lineHeight: 2,
    },
  },
  compact: {
    id: 'compact',
    name: 'Compact',
    columns: 2,
    sidebarSide: 'left',
    headerPlacement: 'full',
    titleVariant: 'accent-small',
    Header: CompactHeader,
    sidebarOptions: [
      { width: 0.28, fill: 'none' },
      { width: 0.32, fill: 'none' },
      { width: 0.32, fill: 'tint' },
      { width: 0.32, fill: 'solid' },
    ],
    suggested: {
      fontFamily: 'Open Sans',
      columnLayout: 3,
      sectionSpacing: 1,
      fontSize: 1,
      lineHeight: 1,
    },
  },
  multicolumn: {
    id: 'multicolumn',
    name: 'Multicolumn',
    columns: 2,
    sidebarSide: 'right',
    headerPlacement: 'full',
    titleVariant: 'accent-rule',
    Header: SingleColumnHeader,
    sidebarOptions: [
      { width: 0.42, fill: 'none' },
      { width: 0.46, fill: 'none' },
      { width: 0.5, fill: 'none' },
      { width: 0.5, fill: 'tint' },
    ],
    suggested: {
      fontFamily: 'PT Sans',
      columnLayout: 3,
      sectionSpacing: 2,
      fontSize: 2,
      lineHeight: 2,
    },
  },
  portfolio: {
    id: 'portfolio',
    name: 'Portfolio',
    columns: 2,
    sidebarSide: 'left',
    headerPlacement: 'sidebar',
    titleVariant: 'caps',
    Header: PortfolioHeader,
    sidebarOptions: [
      { width: 0.32, fill: 'none' },
      { width: 0.34, fill: 'tint' },
      { width: 0.36, fill: 'solid' },
      { width: 0.38, fill: 'solid' },
    ],
    suggested: {
      fontFamily: 'Source Sans 3',
      columnLayout: 4,
      sectionSpacing: 2,
      fontSize: 2,
      lineHeight: 2,
    },
  },
  elegant: {
    id: 'elegant',
    name: 'Elegant',
    columns: 2,
    sidebarSide: 'right',
    headerPlacement: 'full',
    titleVariant: 'elegant',
    Header: ElegantHeader,
    sidebarOptions: [
      { width: 0.3, fill: 'none' },
      { width: 0.34, fill: 'none' },
      { width: 0.34, fill: 'tint' },
      { width: 0.36, fill: 'tint' },
    ],
    suggested: {
      fontFamily: 'Lora',
      columnLayout: 3,
      sectionSpacing: 2,
      fontSize: 2,
      lineHeight: 3,
    },
  },
  vivid: {
    id: 'vivid',
    name: 'Vivid',
    columns: 2,
    sidebarSide: 'left',
    headerPlacement: 'full',
    headerBand: true,
    titleVariant: 'block',
    Header: VividHeader,
    sidebarOptions: [
      { width: 0.3, fill: 'none' },
      { width: 0.34, fill: 'tint' },
      { width: 0.36, fill: 'tint' },
      { width: 0.36, fill: 'solid' },
    ],
    suggested: {
      fontFamily: 'Rubik',
      columnLayout: 3,
      sectionSpacing: 2,
      fontSize: 2,
      lineHeight: 2,
    },
  },
  spotlight: {
    id: 'spotlight',
    name: 'Spotlight',
    columns: 2,
    sidebarSide: 'right',
    headerPlacement: 'sidebar',
    titleVariant: 'pill',
    Header: SpotlightHeader,
    sidebarOptions: [
      { width: 0.32, fill: 'none' },
      { width: 0.34, fill: 'tint' },
      { width: 0.36, fill: 'solid' },
      { width: 0.38, fill: 'solid' },
    ],
    suggested: {
      fontFamily: 'Roboto',
      columnLayout: 4,
      sectionSpacing: 2,
      fontSize: 2,
      lineHeight: 2,
    },
  },
  modern: {
    id: 'modern',
    name: 'Modern',
    columns: 2,
    sidebarSide: 'right',
    headerPlacement: 'full',
    titleVariant: 'accent-rule',
    Header: ModernHeader,
    sidebarOptions: [
      { width: 0.3, fill: 'none' },
      { width: 0.34, fill: 'none' },
      { width: 0.34, fill: 'tint' },
      { width: 0.36, fill: 'tint' },
    ],
    suggested: {
      fontFamily: 'Open Sans',
      columnLayout: 2,
      sectionSpacing: 2,
      fontSize: 2,
      lineHeight: 2,
    },
  },
  bold: {
    id: 'bold',
    name: 'Bold',
    columns: 2,
    sidebarSide: 'right',
    headerPlacement: 'full',
    titleVariant: 'caps',
    Header: BoldHeader,
    sidebarOptions: [
      { width: 0.3, fill: 'none' },
      { width: 0.34, fill: 'none' },
      { width: 0.34, fill: 'tint' },
      { width: 0.36, fill: 'tint' },
    ],
    suggested: {
      fontFamily: 'Montserrat',
      columnLayout: 2,
      sectionSpacing: 2,
      fontSize: 2,
      lineHeight: 2,
    },
  },
  monogram: {
    id: 'monogram',
    name: 'Monogram',
    columns: 2,
    sidebarSide: 'left',
    headerPlacement: 'full',
    titleVariant: 'accent-small',
    Header: MonogramHeader,
    sidebarOptions: [
      { width: 0.28, fill: 'none' },
      { width: 0.32, fill: 'none' },
      { width: 0.32, fill: 'tint' },
      { width: 0.34, fill: 'solid' },
    ],
    suggested: {
      fontFamily: 'Inter',
      columnLayout: 2,
      sectionSpacing: 2,
      fontSize: 2,
      lineHeight: 2,
    },
  },
  executive: {
    id: 'executive',
    name: 'Executive',
    columns: 2,
    sidebarSide: 'left',
    headerPlacement: 'full',
    headerBand: true,
    titleVariant: 'block',
    Header: ExecutiveHeader,
    sidebarOptions: [
      { width: 0.3, fill: 'none' },
      { width: 0.32, fill: 'tint' },
      { width: 0.34, fill: 'tint' },
      { width: 0.34, fill: 'solid' },
    ],
    suggested: {
      fontFamily: 'Noto Serif',
      columnLayout: 2,
      sectionSpacing: 2,
      fontSize: 2,
      lineHeight: 2,
    },
  },
}

export function getTemplate(id: TemplateId): TemplateDefinition {
  return TEMPLATES[id] ?? TEMPLATES.polished
}

/** What choosing a template changes: the template itself plus its suggested look. */
export function templateChoice(id: TemplateId): Partial<CvDesign> {
  return { templateId: id, ...getTemplate(id).suggested }
}

/** The CV as it would look after choosing another template. */
export function withTemplate(cv: CvDocument, id: TemplateId): CvDocument {
  return { ...cv, design: { ...cv.design, ...templateChoice(id) } }
}

/** Sidebar width and background for the chosen Column layout option. */
export function sidebarFor(template: TemplateDefinition, columnLayout: number): SidebarOption {
  return template.sidebarOptions[Math.min(Math.max(columnLayout, 1), 4) - 1]!
}
