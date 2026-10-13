import { z } from 'zod'
import { DateRangeSchema, IdSchema, LevelSchema, YearMonthSchema } from './common'

// ----- Items -----

export const ExperienceItemSchema = z.object({
  id: IdSchema,
  title: z.string(),
  company: z.string(),
  location: z.string(),
  ...DateRangeSchema.shape,
  bullets: z.array(z.string()),
  logoUrl: z.string().nullable(),
})

export const EducationItemSchema = z.object({
  id: IdSchema,
  degree: z.string(),
  institution: z.string(),
  location: z.string(),
  ...DateRangeSchema.shape,
  bullets: z.array(z.string()),
})

export const SkillItemSchema = z.object({
  id: IdSchema,
  name: z.string(),
  level: LevelSchema.nullable(),
})

/** `icon` is a key from the icon picker (Step 5), e.g. "trophy". */
export const AchievementItemSchema = z.object({
  id: IdSchema,
  icon: z.string(),
  title: z.string(),
  description: z.string(),
})

export const CourseItemSchema = z.object({
  id: IdSchema,
  title: z.string(),
  institution: z.string(),
  date: YearMonthSchema.nullable(),
})

export const ProjectItemSchema = z.object({
  id: IdSchema,
  name: z.string(),
  role: z.string(),
  link: z.string(),
  ...DateRangeSchema.shape,
  description: z.string(),
  bullets: z.array(z.string()),
})

export const LanguageItemSchema = z.object({
  id: IdSchema,
  name: z.string(),
  /** 1 = beginner … 5 = native. */
  level: LevelSchema,
})

export const CertificateItemSchema = z.object({
  id: IdSchema,
  name: z.string(),
  issuer: z.string(),
  date: YearMonthSchema.nullable(),
  link: z.string(),
})

export const CustomItemSchema = z.object({
  id: IdSchema,
  title: z.string(),
  subtitle: z.string(),
  date: z.string(),
  description: z.string(),
  bullets: z.array(z.string()),
})

// ----- Sections -----

export const SECTION_TYPES = [
  'summary',
  'experience',
  'education',
  'skills',
  'achievements',
  'courses',
  'projects',
  'languages',
  'certificates',
  'custom',
] as const
export type SectionType = (typeof SECTION_TYPES)[number]

export const ColumnSchema = z.enum(['main', 'sidebar'])
export type Column = z.infer<typeof ColumnSchema>

const sectionBase = {
  id: IdSchema,
  /** `null` uses the default title for the CV language (see `getSectionTitle`). */
  title: z.string().nullable(),
  column: ColumnSchema,
  visible: z.boolean(),
}

export const SummarySectionSchema = z.object({
  ...sectionBase,
  type: z.literal('summary'),
  text: z.string(),
})

export const ExperienceSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('experience'),
  items: z.array(ExperienceItemSchema),
  showLogos: z.boolean(),
})

export const EducationSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('education'),
  items: z.array(EducationItemSchema),
})

export const SkillsSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('skills'),
  items: z.array(SkillItemSchema),
  /** How levels are shown: hidden, a bar, or dots (●●●●○). */
  levelDisplay: z.enum(['none', 'bar', 'dots']),
})

export const AchievementsSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('achievements'),
  items: z.array(AchievementItemSchema),
})

export const CoursesSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('courses'),
  items: z.array(CourseItemSchema),
})

export const ProjectsSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('projects'),
  items: z.array(ProjectItemSchema),
})

export const LanguagesSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('languages'),
  items: z.array(LanguageItemSchema),
  levelDisplay: z.enum(['none', 'bar', 'dots', 'text']),
})

export const CertificatesSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('certificates'),
  items: z.array(CertificateItemSchema),
})

export const CustomSectionSchema = z.object({
  ...sectionBase,
  type: z.literal('custom'),
  items: z.array(CustomItemSchema),
})

export const SectionSchema = z.discriminatedUnion('type', [
  SummarySectionSchema,
  ExperienceSectionSchema,
  EducationSectionSchema,
  SkillsSectionSchema,
  AchievementsSectionSchema,
  CoursesSectionSchema,
  ProjectsSectionSchema,
  LanguagesSectionSchema,
  CertificatesSectionSchema,
  CustomSectionSchema,
])

export type Section = z.infer<typeof SectionSchema>
export type SectionOf<T extends SectionType> = Extract<Section, { type: T }>

export type ExperienceItem = z.infer<typeof ExperienceItemSchema>
export type EducationItem = z.infer<typeof EducationItemSchema>
export type SkillItem = z.infer<typeof SkillItemSchema>
export type AchievementItem = z.infer<typeof AchievementItemSchema>
export type CourseItem = z.infer<typeof CourseItemSchema>
export type ProjectItem = z.infer<typeof ProjectItemSchema>
export type LanguageItem = z.infer<typeof LanguageItemSchema>
export type CertificateItem = z.infer<typeof CertificateItemSchema>
export type CustomItem = z.infer<typeof CustomItemSchema>
