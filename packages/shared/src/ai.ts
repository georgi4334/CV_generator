import { z } from 'zod'
import type { CoverLetterDocument } from './coverLetter'
import { CvLanguageSchema, type CvLanguage } from './cv/common'
import type { CvDocument } from './cv/document'
import type { Section } from './cv/sections'

/*
 * AI features (Step 16): Fix Mistakes, Check & Tailor and the AI Assistant.
 * The browser sends the text of the open document as a list of fields, each
 * with the path the editor uses for it, so a suggestion can be applied to the
 * exact field it belongs to.
 */

export const AI_FIELD_MAX = 4000
export const AI_FIELDS_MAX = 250
/** All fields together. Keeps requests inside the provider's limits. */
export const AI_TOTAL_MAX = 30_000
export const JOB_DESCRIPTION_MAX = 20_000
export const AI_INSTRUCTION_MAX = 500

export const AiFieldSchema = z.object({
  /** Editor path, e.g. `sections.<id>.items.<id>.bullets.0` or `paragraphs.1`. */
  path: z.string().min(1).max(300),
  /** Where the text is, for the AI and for the user, e.g. "Experience › Designer at Acme". */
  label: z.string().max(300),
  text: z.string().max(AI_FIELD_MAX),
})
export type AiField = z.infer<typeof AiFieldSchema>

const FieldsSchema = z
  .array(AiFieldSchema)
  .max(AI_FIELDS_MAX)
  .refine(
    (fields) => fields.reduce((sum, f) => sum + f.text.length, 0) <= AI_TOTAL_MAX,
    'The document is too long for the AI. Shorten it or hide some sections.',
  )

const JobDescriptionSchema = z
  .string()
  .trim()
  .min(30, 'Paste the job posting (at least a few sentences)')
  .max(JOB_DESCRIPTION_MAX)

export const FixMistakesInputSchema = z.object({
  language: CvLanguageSchema,
  fields: FieldsSchema,
})
export type FixMistakesInput = z.infer<typeof FixMistakesInputSchema>

/** Replace `original` (a part of the field's text) with `replacement`. */
export const AiSuggestionSchema = z.object({
  path: z.string(),
  label: z.string(),
  original: z.string(),
  replacement: z.string(),
  reason: z.string(),
})
export type AiSuggestion = z.infer<typeof AiSuggestionSchema>

export const AiUsageSchema = z.object({
  used: z.number().int(),
  limit: z.number().int(),
})
export type AiUsage = z.infer<typeof AiUsageSchema>

export const FixMistakesResultSchema = z.object({
  suggestions: z.array(AiSuggestionSchema),
  usage: AiUsageSchema,
})
export type FixMistakesResult = z.infer<typeof FixMistakesResultSchema>

export const TailorInputSchema = z.object({
  language: CvLanguageSchema,
  fields: FieldsSchema,
  jobDescription: JobDescriptionSchema,
})
export type TailorInput = z.infer<typeof TailorInputSchema>

export const KeywordSchema = z.object({
  term: z.string(),
  importance: z.enum(['high', 'medium']),
})
export type Keyword = z.infer<typeof KeywordSchema>

export const TailorResultSchema = z.object({
  keywords: z.array(KeywordSchema),
  /** Short, practical advice on how the CV fits the posting. */
  advice: z.array(z.string()),
  /** `original` is the field's whole text. */
  rewrites: z.array(AiSuggestionSchema),
  usage: AiUsageSchema,
})
export type TailorResult = z.infer<typeof TailorResultSchema>

export const ASSIST_TASKS = ['summary', 'bullets', 'letter'] as const
export type AssistTask = (typeof ASSIST_TASKS)[number]

export const AssistInputSchema = z.object({
  task: z.enum(ASSIST_TASKS),
  language: CvLanguageSchema,
  /** The document (for a letter: the linked CV and the letter) the AI may use as facts. */
  fields: FieldsSchema,
  /** summary: the summary's path; bullets: the experience/project item's path. */
  targetPath: z.string().max(300).optional(),
  /** "More concise", "emphasise leadership"… */
  instruction: z.string().trim().max(AI_INSTRUCTION_MAX).default(''),
  /** Optional posting to aim the text at. */
  jobDescription: z.string().trim().max(JOB_DESCRIPTION_MAX).default(''),
  /** For letters: the company and position, when known. */
  company: z.string().trim().max(200).default(''),
  position: z.string().trim().max(200).default(''),
})
export type AssistInput = z.input<typeof AssistInputSchema>

export const AssistResultSchema = z.object({
  /** summary: one text; bullets: the bullets; letter: the paragraphs. */
  texts: z.array(z.string()),
  usage: AiUsageSchema,
})
export type AssistResult = z.infer<typeof AssistResultSchema>

export const AiStatusSchema = z.object({
  enabled: z.boolean(),
  /** Shown to the user: where their text is sent. */
  provider: z.string(),
  usage: AiUsageSchema,
})
export type AiStatus = z.infer<typeof AiStatusSchema>

// ----- Fields of a document -----

const SECTION_LABELS: Record<Section['type'], string> = {
  summary: 'Summary',
  experience: 'Experience',
  education: 'Education',
  skills: 'Skills',
  achievements: 'Achievements',
  courses: 'Courses',
  projects: 'Projects',
  languages: 'Languages',
  certificates: 'Certificates',
  custom: 'Section',
}

const join = (...parts: string[]) => parts.filter((p) => p.trim()).join(' at ')

interface ItemTexts {
  id: string
  /** Names the item in labels, e.g. "Designer at Acme". */
  title: string
  texts: [key: string, text: string][]
  bullets: string[]
}

function itemTexts(section: Exclude<Section, { type: 'summary' }>): ItemTexts[] {
  switch (section.type) {
    case 'experience':
      return section.items.map((i) => ({
        id: i.id,
        title: join(i.title, i.company),
        texts: [
          ['title', i.title],
          ['company', i.company],
        ],
        bullets: i.bullets,
      }))
    case 'education':
      return section.items.map((i) => ({
        id: i.id,
        title: join(i.degree, i.institution),
        texts: [
          ['degree', i.degree],
          ['institution', i.institution],
        ],
        bullets: i.bullets,
      }))
    case 'skills':
    case 'languages':
      return section.items.map((i) => ({
        id: i.id,
        title: '',
        texts: [['name', i.name]],
        bullets: [],
      }))
    case 'achievements':
      return section.items.map((i) => ({
        id: i.id,
        title: i.title,
        texts: [
          ['title', i.title],
          ['description', i.description],
        ],
        bullets: [],
      }))
    case 'courses':
      return section.items.map((i) => ({
        id: i.id,
        title: '',
        texts: [
          ['title', i.title],
          ['institution', i.institution],
        ],
        bullets: [],
      }))
    case 'projects':
      return section.items.map((i) => ({
        id: i.id,
        title: i.name,
        texts: [
          ['name', i.name],
          ['role', i.role],
          ['description', i.description],
        ],
        bullets: i.bullets,
      }))
    case 'certificates':
      return section.items.map((i) => ({
        id: i.id,
        title: '',
        texts: [
          ['name', i.name],
          ['issuer', i.issuer],
        ],
        bullets: [],
      }))
    case 'custom':
      return section.items.map((i) => ({
        id: i.id,
        title: i.title,
        texts: [
          ['title', i.title],
          ['subtitle', i.subtitle],
          ['description', i.description],
        ],
        bullets: i.bullets,
      }))
  }
}

/** The text of a CV that the AI may read or improve (visible sections only, no contact details). */
export function cvFields(cv: CvDocument): AiField[] {
  const fields: AiField[] = []
  const add = (path: string, label: string, text: string) => {
    if (text.trim()) fields.push({ path, label, text })
  }
  add('header.headline', 'Headline', cv.header.headline)

  for (const section of cv.sections) {
    if (!section.visible) continue
    const name = section.title?.trim() || SECTION_LABELS[section.type]
    const base = `sections.${section.id}`
    if (section.type === 'summary') {
      add(`${base}.text`, name, section.text)
      continue
    }
    for (const item of itemTexts(section)) {
      const at = `${base}.items.${item.id}`
      const label = item.title ? `${name} › ${item.title}` : name
      for (const [key, text] of item.texts) add(`${at}.${key}`, label, text)
      item.bullets.forEach((bullet, index) =>
        add(`${at}.bullets.${index}`, `${label} › bullet ${index + 1}`, bullet),
      )
    }
  }
  return fields
}

/** The text of a cover letter that the AI may read or improve. */
export function letterFields(letter: CoverLetterDocument): AiField[] {
  const fields: AiField[] = []
  const add = (path: string, label: string, text: string) => {
    if (text.trim()) fields.push({ path, label, text })
  }
  add('greeting', 'Greeting', letter.greeting)
  letter.paragraphs.forEach((text, index) =>
    add(`paragraphs.${index}`, `Paragraph ${index + 1}`, text),
  )
  add('closing', 'Closing', letter.closing)
  return fields
}

// ----- Keyword match (Check & Tailor) -----

const escape = (text: string) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
const fold = (text: string) => text.normalize('NFKC').toLowerCase()

/** True when `term` appears in `text` as a whole word or phrase (any case, any script). */
export function containsTerm(text: string, term: string): boolean {
  const needle = fold(term).trim()
  if (!needle) return false
  const pattern = new RegExp(
    `(?<![\\p{L}\\p{N}])${escape(needle).replace(/\s+/g, '\\s+')}(?![\\p{L}\\p{N}])`,
    'u',
  )
  return pattern.test(fold(text))
}

export interface KeywordMatch {
  matched: Keyword[]
  missing: Keyword[]
  /** 0–100; important keywords count double. */
  score: number
}

/**
 * How well a CV covers the posting's keywords. Counted here, not by the AI,
 * so the score is the same every time and goes up as soon as a keyword is added.
 */
export function matchKeywords(fields: AiField[], keywords: Keyword[]): KeywordMatch {
  const text = fields.map((f) => f.text).join('\n')
  const matched: Keyword[] = []
  const missing: Keyword[] = []
  for (const keyword of keywords)
    (containsTerm(text, keyword.term) ? matched : missing).push(keyword)
  const weight = (list: Keyword[]) =>
    list.reduce((sum, k) => sum + (k.importance === 'high' ? 2 : 1), 0)
  const total = weight(keywords)
  return { matched, missing, score: total ? Math.round((weight(matched) / total) * 100) : 0 }
}

/** Applies a suggestion to the current text; null when the text no longer contains it. */
export function applySuggestion(
  text: string,
  suggestion: Pick<AiSuggestion, 'original' | 'replacement'>,
) {
  const at = text.indexOf(suggestion.original)
  if (at < 0) return null
  return text.slice(0, at) + suggestion.replacement + text.slice(at + suggestion.original.length)
}

export const AI_LANGUAGE_NAMES: Record<CvLanguage, string> = {
  'en-US': 'English (US spelling)',
  'en-GB': 'English (UK spelling)',
  bg: 'Bulgarian',
}
