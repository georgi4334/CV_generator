import type { Column, Section } from '@cv/shared'

/** Sections of one column, in page order. */
export const sectionsIn = <T extends Pick<Section, 'column'>>(sections: T[], column: Column) =>
  sections.filter((s) => s.column === column)

/**
 * Moves a section to `toIndex` within `toColumn` (an index among that column's
 * sections). The document keeps main sections first, then sidebar ones; only
 * the order inside each column matters for rendering.
 */
export function moveSection<T extends Pick<Section, 'id' | 'column'>>(
  sections: T[],
  sectionId: string,
  toColumn: Column,
  toIndex: number,
): T[] {
  const moving = sections.find((s) => s.id === sectionId)
  if (!moving) return sections
  const rest = sections.filter((s) => s.id !== sectionId)
  const target = sectionsIn(rest, toColumn)
  const index = Math.max(0, Math.min(toIndex, target.length))
  target.splice(index, 0, { ...moving, column: toColumn })
  const other = sectionsIn(rest, toColumn === 'main' ? 'sidebar' : 'main')
  return toColumn === 'main' ? [...target, ...other] : [...other, ...target]
}
