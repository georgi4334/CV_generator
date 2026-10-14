import type { Column, SectionType } from './cv/sections'
import type { TemplateId } from './cv/design'

export const PROFESSION_IDS = [
  'software-developer',
  'designer',
  'sales-marketing',
  'healthcare',
  'academic',
] as const
export type ProfessionId = (typeof PROFESSION_IDS)[number]

/** Saved CVs store the profession as text; this checks it is one we still offer. */
export const isProfessionId = (value: unknown): value is ProfessionId =>
  PROFESSION_IDS.includes(value as ProfessionId)

export interface Profession {
  id: ProfessionId
  name: string
  /** Who the preset is for, shown when choosing a profession. */
  description: string
  /** First entry is the default template for this profession. */
  recommendedTemplates: TemplateId[]
  /** Sections a new CV for this profession starts with, in order. */
  sections: Array<[SectionType, Column]>
}

export const PROFESSIONS: Record<ProfessionId, Profession> = {
  'software-developer': {
    id: 'software-developer',
    name: 'Software Developer',
    description: 'Developers, engineers, IT and data roles',
    recommendedTemplates: ['polished', 'compact', 'single-column'],
    sections: [
      ['summary', 'main'],
      ['experience', 'main'],
      ['projects', 'main'],
      ['skills', 'sidebar'],
      ['achievements', 'sidebar'],
      ['education', 'sidebar'],
      ['certificates', 'sidebar'],
      ['languages', 'sidebar'],
    ],
  },
  designer: {
    id: 'designer',
    name: 'Designer',
    description: 'UI/UX, graphic and product designers',
    recommendedTemplates: ['creative', 'stylish', 'contemporary'],
    sections: [
      ['summary', 'main'],
      ['experience', 'main'],
      ['projects', 'main'],
      ['skills', 'sidebar'],
      ['education', 'sidebar'],
      ['courses', 'sidebar'],
      ['languages', 'sidebar'],
    ],
  },
  'sales-marketing': {
    id: 'sales-marketing',
    name: 'Sales & Marketing',
    description: 'Sales, marketing, account and business roles',
    recommendedTemplates: ['polished', 'contemporary', 'timeline'],
    sections: [
      ['summary', 'main'],
      ['experience', 'main'],
      ['achievements', 'sidebar'],
      ['skills', 'sidebar'],
      ['education', 'sidebar'],
      ['languages', 'sidebar'],
    ],
  },
  healthcare: {
    id: 'healthcare',
    name: 'Healthcare',
    description: 'Nurses, doctors, therapists and care staff',
    recommendedTemplates: ['single-column', 'timeline', 'polished'],
    sections: [
      ['summary', 'main'],
      ['experience', 'main'],
      ['education', 'main'],
      ['certificates', 'sidebar'],
      ['skills', 'sidebar'],
      ['languages', 'sidebar'],
    ],
  },
  academic: {
    id: 'academic',
    name: 'Academic & Research',
    description: 'Researchers, lecturers and PhD candidates',
    recommendedTemplates: ['single-column', 'multicolumn', 'timeline'],
    sections: [
      ['summary', 'main'],
      ['education', 'main'],
      ['experience', 'main'],
      ['projects', 'main'],
      ['skills', 'sidebar'],
      ['courses', 'sidebar'],
      ['languages', 'sidebar'],
    ],
  },
}
