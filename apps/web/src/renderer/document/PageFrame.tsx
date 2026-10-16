import type { CvDesign, CvHeader } from '@cv/shared'
import type { CSSProperties } from 'react'
import type { Block } from '@/renderer/sections/blocks'
import { HeaderControls } from '@/renderer/editing/controls'
import { backgroundImage } from '@/renderer/templates/backgrounds'
import {
  sidebarFor,
  type SidebarFill,
  type TemplateDefinition,
} from '@/renderer/templates/templates'
import { pageStyle, SOLID_SIDEBAR_VARS } from '@/renderer/templates/pageStyle'
import { withAlpha, type LayoutTokens } from '@/renderer/templates/tokens'

function sidebarStyle(fill: SidebarFill, accent: string): CSSProperties {
  if (fill === 'solid')
    return { ...SOLID_SIDEBAR_VARS, background: accent, color: 'var(--cv-text)' }
  if (fill === 'tint') return { background: withAlpha(accent, 0.08) }
  return {}
}

interface PageFrameProps {
  template: TemplateDefinition
  design: CvDesign
  tokens: LayoutTokens
  header: CvHeader
  /** The header is drawn on the first page only. */
  isFirstPage: boolean
  headerHeight: number
  main: Block[]
  sidebar: Block[]
  /** The hidden copy used to measure blocks: no fixed height, every block tagged. */
  measuring?: boolean
  className?: string
}

export function PageFrame({
  template,
  design,
  tokens,
  header,
  isFirstPage,
  headerHeight,
  main,
  sidebar,
  measuring = false,
  className,
}: PageFrameProps) {
  const { margin, sectionGap, itemGap } = tokens
  const { Header } = template
  const fullHeader = template.headerPlacement === 'full'
  const { width: sidebarWidth, fill } = sidebarFor(template, design.columnLayout)
  const twoColumns = template.columns === 2
  const filledSidebar = fill !== 'none'

  // A full-width header is measured with its padding (and band), a header in
  // the main column without it; see the capacity calculation in CvRenderer.
  const headerContent = isFirstPage ? (
    <HeaderControls
      supportsPhoto={template.supportsPhoto}
      hasPhoto={header.showPhoto && header.photoUrl !== null}
    >
      <Header header={header} />
    </HeaderControls>
  ) : null
  const headerNode =
    headerContent && !fullHeader ? (
      <div data-measure-header={measuring || undefined}>{headerContent}</div>
    ) : null

  const renderBlocks = (blocks: Block[]) =>
    blocks.map((block, index) => {
      const startsColumn = index === 0
      const marginTop = startsColumn
        ? isFirstPage
          ? sectionGap
          : 0
        : block.kind === 'section'
          ? sectionGap
          : itemGap
      return (
        <div
          key={block.key}
          data-measure-block={measuring ? block.key : undefined}
          style={{ marginTop }}
        >
          {block.node}
        </div>
      )
    })

  // Vertical padding: the page margin, except under a full-width header.
  const columnPaddingTop = fullHeader && isFirstPage ? 0 : margin
  const innerGap = Math.round(margin * 0.6)

  const mainColumn = (
    <div
      className="min-w-0 flex-1"
      style={{
        paddingTop: columnPaddingTop,
        paddingBottom: margin,
        paddingLeft: !twoColumns || template.sidebarSide === 'right' ? margin : innerGap,
        paddingRight: !twoColumns || template.sidebarSide === 'left' ? margin : innerGap,
      }}
    >
      {!fullHeader && headerNode}
      {renderBlocks(main)}
    </div>
  )

  const sidebarColumn = twoColumns ? (
    <div
      className="shrink-0"
      style={{
        width: `${sidebarWidth * 100}%`,
        paddingTop: columnPaddingTop,
        paddingBottom: margin,
        paddingLeft:
          template.sidebarSide === 'left'
            ? margin
            : filledSidebar
              ? Math.round(margin * 0.8)
              : innerGap,
        paddingRight:
          template.sidebarSide === 'right'
            ? margin
            : filledSidebar
              ? Math.round(margin * 0.8)
              : innerGap,
        ...sidebarStyle(fill, design.accentColor),
      }}
    >
      {/* Line the sidebar up with the main column's first section, below the header. */}
      {!fullHeader && isFirstPage && <div style={{ height: headerHeight }} />}
      {renderBlocks(sidebar)}
    </div>
  ) : null

  return (
    <div
      className={`relative flex flex-col overflow-hidden bg-white ${className ?? ''}`}
      data-cv-page={measuring ? undefined : design.pageSize}
      style={{
        ...pageStyle(design, tokens),
        backgroundImage: backgroundImage(design.background, design.accentColor),
        height: measuring ? undefined : tokens.page.height,
      }}
    >
      {fullHeader && headerContent && (
        <div
          data-measure-header={measuring || undefined}
          style={{
            paddingTop: margin,
            paddingLeft: margin,
            paddingRight: margin,
            ...(template.headerBand
              ? {
                  ...SOLID_SIDEBAR_VARS,
                  background: design.accentColor,
                  color: 'var(--cv-text)',
                  paddingBottom: Math.round(margin * 0.7),
                }
              : {}),
          }}
        >
          {headerContent}
        </div>
      )}
      <div
        className={`flex flex-1 ${template.sidebarSide === 'left' ? 'flex-row-reverse' : 'flex-row'}`}
      >
        {mainColumn}
        {sidebarColumn}
      </div>
    </div>
  )
}
