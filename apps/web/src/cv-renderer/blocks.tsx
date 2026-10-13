import { getSectionTitle, type CvLanguage, type Section } from '@cv/shared'
import type { ReactNode } from 'react'
import type { RenderMode } from './context'
import {
  AchievementView,
  CertificateView,
  CourseView,
  CustomView,
  EducationView,
  ExperienceView,
  LanguageView,
  ProjectView,
  SkillsView,
  SummaryView,
} from './items'
import { SectionTitle } from './primitives'

/** The smallest unit that pagination moves between pages. */
export interface Block {
  key: string
  /** First block of a section (starts with its title) or a following item. */
  kind: 'section' | 'item'
  node: ReactNode
}

const isBlank = (value: unknown): boolean => {
  if (typeof value === 'string') return value.trim() === ''
  if (Array.isArray(value)) return value.every(isBlank)
  return true
}

const IGNORED_KEYS = new Set(['id', 'icon'])

/** True when every text field of an item is empty (the id and icon don't count). */
export function isItemEmpty(item: Record<string, unknown>): boolean {
  return Object.entries(item).every(([key, value]) => {
    if (IGNORED_KEYS.has(key)) return true
    if (typeof value === 'string' || Array.isArray(value)) return isBlank(value)
    return true
  })
}

function renderItem(section: Section, item: unknown): ReactNode {
  switch (section.type) {
    case 'experience':
      return <ExperienceView item={item as never} showLogo={section.showLogos} />
    case 'education':
      return <EducationView item={item as never} />
    case 'achievements':
      return <AchievementView item={item as never} />
    case 'courses':
      return <CourseView item={item as never} />
    case 'projects':
      return <ProjectView item={item as never} />
    case 'certificates':
      return <CertificateView item={item as never} />
    case 'languages':
      return <LanguageView item={item as never} display={section.levelDisplay} />
    case 'custom':
      return <CustomView item={item as never} />
    default:
      return null
  }
}

/**
 * Turns sections into blocks. A section's title is kept together with its first
 * item so a title never ends up alone at the bottom of a page.
 */
export function buildBlocks(sections: Section[], language: CvLanguage, mode: RenderMode): Block[] {
  const blocks: Block[] = []

  for (const section of sections) {
    if (!section.visible) continue
    const title = <SectionTitle>{getSectionTitle(section, language)}</SectionTitle>

    if (section.type === 'summary') {
      if (mode === 'preview' && !section.text.trim()) continue
      blocks.push({
        key: section.id,
        kind: 'section',
        node: (
          <>
            {title}
            <SummaryView text={section.text} />
          </>
        ),
      })
      continue
    }

    if (section.type === 'skills') {
      if (mode === 'preview' && section.items.every((s) => !s.name.trim())) continue
      blocks.push({
        key: section.id,
        kind: 'section',
        node: (
          <>
            {title}
            <SkillsView items={section.items} display={section.levelDisplay} />
          </>
        ),
      })
      continue
    }

    const items: Array<{ id: string }> =
      mode === 'preview'
        ? section.items.filter((item) => !isItemEmpty(item as Record<string, unknown>))
        : section.items
    if (items.length === 0) {
      if (mode === 'edit') blocks.push({ key: section.id, kind: 'section', node: title })
      continue
    }

    items.forEach((item, index) => {
      const content = renderItem(section, item)
      blocks.push(
        index === 0
          ? {
              key: `${section.id}:${item.id}`,
              kind: 'section',
              node: (
                <>
                  {title}
                  {content}
                </>
              ),
            }
          : { key: `${section.id}:${item.id}`, kind: 'item', node: content },
      )
    })
  }

  return blocks
}
