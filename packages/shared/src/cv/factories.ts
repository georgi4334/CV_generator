import { createId } from '../common/id'
import type { CvLanguage } from './common'
import { DEFAULT_DESIGN } from './design'
import { CV_SCHEMA_VERSION, type CvDocument } from './document'
import type { Column, Section, SectionOf, SectionType } from './sections'

type ItemOf<T extends SectionType> = SectionOf<T> extends { items: Array<infer I> } ? I : never
type ItemSectionType = Exclude<SectionType, 'summary'>

const emptyRange = { startDate: null, endDate: null, isCurrent: false }

/** A blank item for a section; the editor shows placeholders for the empty fields. */
export function createItem<T extends ItemSectionType>(type: T): ItemOf<T> {
  const id = createId()
  const items: { [K in ItemSectionType]: ItemOf<K> } = {
    experience: {
      id,
      title: '',
      company: '',
      location: '',
      ...emptyRange,
      bullets: [''],
      logoUrl: null,
    },
    education: { id, degree: '', institution: '', location: '', ...emptyRange, bullets: [] },
    skills: { id, name: '', level: null },
    achievements: { id, icon: 'star', title: '', description: '' },
    courses: { id, title: '', institution: '', date: null },
    projects: { id, name: '', role: '', link: '', ...emptyRange, description: '', bullets: [] },
    languages: { id, name: '', level: 3 },
    certificates: { id, name: '', issuer: '', date: null, expiryDate: null, link: '' },
    custom: { id, title: '', subtitle: '', date: '', description: '', bullets: [] },
  }
  return items[type]
}

/** A new section with one blank item (or empty text for the summary). */
export function createSection<T extends SectionType>(type: T, column: Column): SectionOf<T> {
  const base = { id: createId(), title: null, column, visible: true }
  const sections: { [K in SectionType]: SectionOf<K> } = {
    summary: { ...base, type: 'summary', text: '' },
    experience: { ...base, type: 'experience', items: [createItem('experience')], showLogos: true },
    education: { ...base, type: 'education', items: [createItem('education')] },
    skills: { ...base, type: 'skills', items: [createItem('skills')], levelDisplay: 'none' },
    achievements: { ...base, type: 'achievements', items: [createItem('achievements')] },
    courses: { ...base, type: 'courses', items: [createItem('courses')] },
    projects: { ...base, type: 'projects', items: [createItem('projects')] },
    languages: {
      ...base,
      type: 'languages',
      items: [createItem('languages')],
      levelDisplay: 'dots',
    },
    certificates: { ...base, type: 'certificates', items: [createItem('certificates')] },
    custom: { ...base, type: 'custom', items: [createItem('custom')] },
  }
  return sections[type]
}

/** The default section layout from the reference editor screenshot. */
export const DEFAULT_SECTION_LAYOUT: ReadonlyArray<[SectionType, Column]> = [
  ['summary', 'main'],
  ['experience', 'main'],
  ['achievements', 'sidebar'],
  ['skills', 'sidebar'],
  ['courses', 'sidebar'],
  ['education', 'sidebar'],
]

export function createEmptyCv(
  language: CvLanguage = 'en-US',
  layout: ReadonlyArray<[SectionType, Column]> = DEFAULT_SECTION_LAYOUT,
): CvDocument {
  const sections: Section[] = layout.map(([type, column]) => createSection(type, column))
  return {
    schemaVersion: CV_SCHEMA_VERSION,
    language,
    header: {
      name: '',
      headline: '',
      email: '',
      phone: '',
      location: '',
      link: '',
      photoUrl: null,
      showPhoto: false,
      photoShape: 'circle',
    },
    sections,
    design: { ...DEFAULT_DESIGN },
  }
}
