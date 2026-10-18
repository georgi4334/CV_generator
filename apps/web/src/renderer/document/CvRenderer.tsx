import type { CvDocument } from '@cv/shared'
import { useLayoutEffect, useMemo, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { buildBlocks, type Block } from '@/renderer/sections/blocks'
import { RenderContext, type RenderMode } from '@/renderer/context'
import type { EditorApi } from '@/renderer/editing/editorApi'
import { PageFrame } from './PageFrame'
import { paginateColumn } from './paginate'
import { getTemplate } from '@/renderer/templates/templates'
import { layoutTokens } from '@/renderer/templates/tokens'

interface Measurements {
  header: number
  blocks: Record<string, number>
}

function readMeasurements(root: HTMLElement): Measurements {
  const header = root.querySelector<HTMLElement>('[data-measure-header]')?.offsetHeight ?? 0
  const blocks: Record<string, number> = {}
  root.querySelectorAll<HTMLElement>('[data-measure-block]').forEach((el) => {
    blocks[el.dataset.measureBlock!] = el.offsetHeight
  })
  return { header, blocks }
}

const sameMeasurements = (a: Measurements | null, b: Measurements) =>
  a !== null && a.header === b.header && JSON.stringify(a.blocks) === JSON.stringify(b.blocks)

interface CvRendererProps {
  cv: CvDocument
  mode: RenderMode
  /** Makes the pages editable in place (edit mode only). */
  editor?: EditorApi
  pageClassName?: string
  /** Blur the stand-ins of a share link that hides personal details. */
  hidePersonal?: boolean
  /** Draw links as plain text, for thumbnails that are themselves a link. */
  staticLinks?: boolean
}

/**
 * Renders a CV as real-size pages. All blocks are first drawn into a hidden,
 * unpaginated copy of the page to measure their heights; the visible pages are
 * then filled block by block, so content flows onto as many pages as needed.
 */
export function CvRenderer({
  cv,
  mode,
  editor,
  pageClassName,
  hidePersonal = false,
  staticLinks = false,
}: CvRendererProps) {
  const { t } = useTranslation()
  const template = getTemplate(cv.design.templateId)
  const tokens = layoutTokens(cv.design)
  const measureRef = useRef<HTMLDivElement>(null)
  const [measured, setMeasured] = useState<Measurements | null>(null)

  const { main, sidebar } = useMemo(() => {
    const visible = cv.sections
    const mainSections =
      template.columns === 1 ? visible : visible.filter((s) => s.column === 'main')
    const sidebarSections =
      template.columns === 1 ? [] : visible.filter((s) => s.column === 'sidebar')
    // Single-column templates show main sections first, then the former sidebar ones.
    const ordered =
      template.columns === 1
        ? [
            ...mainSections.filter((s) => s.column === 'main'),
            ...mainSections.filter((s) => s.column === 'sidebar'),
          ]
        : mainSections
    return {
      main: buildBlocks(ordered, cv.language, mode),
      sidebar: buildBlocks(sidebarSections, cv.language, mode),
    }
  }, [cv.sections, cv.language, mode, template.columns])

  // Re-measure after every render (content or design changed) and whenever the
  // hidden page changes size, e.g. when a web font finishes loading.
  useLayoutEffect(() => {
    const root = measureRef.current
    if (!root) return
    const update = () => {
      const next = readMeasurements(root)
      setMeasured((prev) => (sameMeasurements(prev, next) ? prev : next))
    }
    update()
    const observer = typeof ResizeObserver === 'undefined' ? null : new ResizeObserver(update)
    observer?.observe(root)
    document.fonts?.ready.then(update).catch(() => {})
    return () => observer?.disconnect()
  })

  const pages = useMemo(() => {
    if (!measured) return [{ main, sidebar }]
    const content = tokens.page.height - 2 * tokens.margin
    // A full-width header is measured including the top margin; a header in the
    // main column is measured without it.
    const headerSpace =
      template.headerPlacement === 'full' ? measured.header - tokens.margin : measured.header
    const first = content - headerSpace - tokens.sectionGap
    const toMeasured = (blocks: Block[]) =>
      blocks.map((b) => ({
        height: measured.blocks[b.key] ?? 0,
        gapBefore: b.kind === 'section' ? tokens.sectionGap : tokens.itemGap,
      }))
    const mainPages = paginateColumn(toMeasured(main), first, content)
    const sidebarPages = paginateColumn(toMeasured(sidebar), first, content)
    const count = Math.max(mainPages.length, sidebarPages.length)
    return Array.from({ length: count }, (_, i) => ({
      main: (mainPages[i] ?? []).map((index) => main[index]!),
      sidebar: (sidebarPages[i] ?? []).map((index) => sidebar[index]!),
    }))
  }, [
    measured,
    main,
    sidebar,
    tokens.page.height,
    tokens.margin,
    tokens.sectionGap,
    tokens.itemGap,
    template.headerPlacement,
  ])

  const frameProps = {
    template,
    design: cv.design,
    tokens,
    header: cv.header,
    headerHeight: measured?.header ?? 0,
  }
  const context = {
    mode,
    language: cv.language,
    titleVariant: template.titleVariant,
    inlineSkills: template.columns === 1,
    timeline: template.timeline ?? false,
    measuring: false,
    hidePersonal,
    staticLinks,
    editor: editor ?? null,
  }
  const measuringContext = { ...context, measuring: true, editor: null }

  return (
    <RenderContext.Provider value={context}>
      <div
        role="document"
        aria-label={t('labels.documentType.cv')}
        className="flex flex-col gap-6"
        data-page-count={pages.length}
      >
        {pages.map((page, i) => (
          <PageFrame
            key={i}
            {...frameProps}
            isFirstPage={i === 0}
            main={page.main}
            sidebar={page.sidebar}
            className={pageClassName}
          />
        ))}
      </div>
      <div
        ref={measureRef}
        aria-hidden
        className="pointer-events-none fixed top-0 -left-[10000px] invisible"
      >
        <RenderContext.Provider value={measuringContext}>
          <PageFrame {...frameProps} isFirstPage main={main} sidebar={sidebar} measuring />
        </RenderContext.Provider>
      </div>
    </RenderContext.Provider>
  )
}
