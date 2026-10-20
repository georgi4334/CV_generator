import { describe, expect, it } from 'vitest'
import {
  ApiErrorSchema,
  CreateCoverLetterInputSchema,
  CreateCvInputSchema,
  CreateResignationInputSchema,
  CreateVersionInputSchema,
  CvVersionSummarySchema,
  DuplicateCvInputSchema,
  PLANS,
  PLAN_LIMITS,
  ProfessionIdSchema,
  TITLE_MAX,
  UPLOAD_CONTENT_TYPES,
  UPLOAD_MAX_BYTES,
  UpdateCoverLetterInputSchema,
  UpdateCvInputSchema,
  UpdateResignationInputSchema,
  UploadSchema,
} from './api'
import { createCoverLetter } from '../cover-letter/coverLetter'
import { createEmptyCv } from '../cv/factories'
import { PROFESSION_IDS } from '../cv/professions'
import { createResignationLetter } from '../resignation/resignation'
import { HEADER_LIMITS } from '../cv/header'
import { TEXT_MAX } from '../common/textLimit'

const uuid = '123e4567-e89b-12d3-a456-426614174000'

describe('titles', () => {
  const create = (title: unknown) => CreateCvInputSchema.safeParse({ title })

  it('accepts 1 to 200 characters and rejects 0 and 201', () => {
    expect(create('x').success).toBe(true)
    expect(create('x'.repeat(TITLE_MAX)).success).toBe(true)
    expect(create('x'.repeat(TITLE_MAX + 1)).success).toBe(false)
    expect(create('').success).toBe(false)
  })

  it('rejects a whitespace-only title and trims the rest', () => {
    expect(create(' \t\n ').success).toBe(false)
    expect(create('  My CV  ').data?.title).toBe('My CV')
  })

  it('trims before measuring, so 200 characters plus padding pass', () => {
    expect(create(` ${'x'.repeat(TITLE_MAX)} `).success).toBe(true)
  })

  it('keeps emoji, RTL and Cyrillic titles', () => {
    for (const title of ['CV 🚀', 'سيرة ذاتية', 'Автобиография'])
      expect(create(title).data?.title).toBe(title)
  })

  it.each([null, 5, [], {}, true])('rejects a title that is %j', (title) => {
    expect(create(title).success).toBe(false)
  })

  it('is optional on create', () => {
    expect(CreateCvInputSchema.safeParse({}).success).toBe(true)
    expect(CreateCoverLetterInputSchema.safeParse({}).success).toBe(true)
    expect(CreateResignationInputSchema.safeParse({}).success).toBe(true)
  })

  it('applies to cover letters, resignations and updates too', () => {
    const tooLong = 'x'.repeat(TITLE_MAX + 1)
    expect(CreateCoverLetterInputSchema.safeParse({ title: tooLong }).success).toBe(false)
    expect(CreateResignationInputSchema.safeParse({ title: tooLong }).success).toBe(false)
    expect(UpdateCvInputSchema.safeParse({ title: tooLong }).success).toBe(false)
    expect(UpdateCoverLetterInputSchema.safeParse({ title: '' }).success).toBe(false)
    expect(UpdateResignationInputSchema.safeParse({ title: '  ' }).success).toBe(false)
  })
})

describe('references to other records', () => {
  it('accepts a uuid and null for jobId, and rejects anything else', () => {
    expect(CreateCvInputSchema.safeParse({ jobId: uuid }).success).toBe(true)
    expect(CreateCvInputSchema.safeParse({ jobId: null }).success).toBe(true)
    for (const jobId of ['', '1', 'abc', `${uuid}x`, 5, "' OR 1=1 --"])
      expect(CreateCvInputSchema.safeParse({ jobId }).success, String(jobId)).toBe(false)
  })

  it('checks cvId of a cover letter and jobId of an update', () => {
    expect(CreateCoverLetterInputSchema.safeParse({ cvId: 'nope' }).success).toBe(false)
    expect(UpdateCoverLetterInputSchema.safeParse({ cvId: uuid, jobId: uuid }).success).toBe(true)
    expect(UpdateCvInputSchema.safeParse({ jobId: 'nope' }).success).toBe(false)
  })

  it('needs a uuid job when duplicating for a job, and allows none', () => {
    expect(DuplicateCvInputSchema.safeParse({}).success).toBe(true)
    expect(DuplicateCvInputSchema.safeParse({ jobId: uuid }).success).toBe(true)
    expect(DuplicateCvInputSchema.safeParse({ jobId: null }).success).toBe(false)
    expect(DuplicateCvInputSchema.safeParse({ jobId: 'x' }).success).toBe(false)
  })

  it('knows the offered professions, allows null, and rejects the rest', () => {
    for (const id of PROFESSION_IDS) expect(ProfessionIdSchema.safeParse(id).success).toBe(true)
    expect(CreateCvInputSchema.safeParse({ professionId: null }).success).toBe(true)
    for (const professionId of ['astronaut', '', 'Designer', 5])
      expect(CreateCvInputSchema.safeParse({ professionId }).success, String(professionId)).toBe(
        false,
      )
  })
})

describe('saving a document needs a valid revision', () => {
  const doc = createEmptyCv()
  const save = (revision: unknown) => UpdateCvInputSchema.safeParse({ revision, document: doc })

  it('accepts a positive integer', () => {
    expect(save(1).success).toBe(true)
    expect(save(Number.MAX_SAFE_INTEGER).success).toBe(true)
  })

  it.each([0, -1, 1.5, NaN, Infinity, -Infinity, '1', null, [], {}, true])(
    'rejects revision %j',
    (revision) => {
      expect(save(revision).success).toBe(false)
    },
  )

  it('refuses a document without any revision, for all three document types', () => {
    expect(UpdateCvInputSchema.safeParse({ document: doc }).error?.issues[0]?.path).toEqual([
      'revision',
    ])
    expect(UpdateCoverLetterInputSchema.safeParse({ document: createCoverLetter() }).success).toBe(
      false,
    )
    expect(
      UpdateResignationInputSchema.safeParse({ document: createResignationLetter() }).success,
    ).toBe(false)
  })

  it('allows a rename or a relink without a revision', () => {
    expect(UpdateCvInputSchema.safeParse({ title: 'New' }).success).toBe(true)
    expect(UpdateCvInputSchema.safeParse({ revision: 3, title: 'New' }).success).toBe(true)
    expect(UpdateCvInputSchema.safeParse({}).success).toBe(true)
  })

  it('treats document: null as invalid rather than as "no document"', () => {
    expect(UpdateCvInputSchema.safeParse({ revision: 1, document: null }).success).toBe(false)
  })
})

describe('saved document limits', () => {
  const save = (document: unknown) => UpdateCvInputSchema.safeParse({ revision: 1, document })

  it('accepts a summary of exactly TEXT_MAX characters and rejects one more', () => {
    const cv = createEmptyCv()
    const summary = cv.sections.find((s) => s.type === 'summary')!
    if (summary.type !== 'summary') throw new Error('expected a summary')
    summary.text = 'x'.repeat(TEXT_MAX)
    expect(save(cv).success).toBe(true)
    summary.text = 'x'.repeat(TEXT_MAX + 1)
    expect(save(cv).success).toBe(false)
  })

  it('finds a long bullet deep inside a section', () => {
    const cv = createEmptyCv()
    const experience = cv.sections.find((s) => s.type === 'experience')!
    if (experience.type !== 'experience') throw new Error('expected experience')
    experience.items[0]!.bullets = ['fine', 'y'.repeat(TEXT_MAX + 1)]
    expect(save(cv).success).toBe(false)
  })

  it('finds a long custom section title and a long skill name', () => {
    const cv = createEmptyCv('en-US', [['skills', 'main']])
    const skills = cv.sections[0]!
    if (skills.type !== 'skills') throw new Error('expected skills')
    skills.items[0]!.name = 'z'.repeat(TEXT_MAX + 1)
    expect(save(cv).success).toBe(false)
    skills.items[0]!.name = 'ok'
    skills.title = 'z'.repeat(TEXT_MAX + 1)
    expect(save(cv).success).toBe(false)
  })

  it('refuses an overlong header field on a cover letter, as on a CV', () => {
    const letter = createCoverLetter()
    letter.header.phone = '1'.repeat(HEADER_LIMITS.phone + 1)
    expect(UpdateCoverLetterInputSchema.safeParse({ revision: 1, document: letter }).success).toBe(
      false,
    )
    letter.header.phone = '1'.repeat(HEADER_LIMITS.phone)
    expect(UpdateCoverLetterInputSchema.safeParse({ revision: 1, document: letter }).success).toBe(
      true,
    )
  })

  it('refuses a cover letter paragraph over the text limit, and a 21st paragraph', () => {
    const letter = createCoverLetter()
    letter.paragraphs = ['x'.repeat(TEXT_MAX + 1)]
    expect(CreateCoverLetterInputSchema.safeParse({ document: letter }).success).toBe(false)
    letter.paragraphs = Array.from({ length: 21 }, () => 'p')
    expect(CreateCoverLetterInputSchema.safeParse({ document: letter }).success).toBe(false)
  })

  it('refuses a resignation with a field over its own limit on create and update', () => {
    const letter = createResignationLetter()
    letter.employer.postalCode = '1'.repeat(21)
    expect(CreateResignationInputSchema.safeParse({ document: letter }).success).toBe(false)
    expect(UpdateResignationInputSchema.safeParse({ revision: 1, document: letter }).success).toBe(
      false,
    )
  })

  it('reports a long CV text without throwing when the document is also missing fields', () => {
    expect(() => save({ sections: 'x'.repeat(TEXT_MAX + 1) })).not.toThrow()
    expect(save({ sections: 'x' }).success).toBe(false)
  })

  it('does not leak extra keys of the document into what the API stores', () => {
    const cv = { ...createEmptyCv(), ownerId: 'someone-else' }
    expect(JSON.stringify(save(cv).data)).not.toContain('someone-else')
  })

  it('handles a 300-section CV of ordinary size quickly', () => {
    const cv = createEmptyCv(
      'en-US',
      Array.from({ length: 300 }, () => ['experience', 'main'] as const),
    )
    const started = Date.now()
    expect(save(cv).success).toBe(true)
    expect(Date.now() - started).toBeLessThan(1000)
  })

  it('refuses 2,000 sections that each have a too long text without throwing', () => {
    const cv = createEmptyCv(
      'en-US',
      Array.from({ length: 2000 }, () => ['summary', 'main'] as const),
    )
    for (const section of cv.sections)
      if (section.type === 'summary') section.text = 'x'.repeat(TEXT_MAX + 1)
    expect(save(cv).success).toBe(false)
  })
})

describe('other API shapes', () => {
  it('ApiErrorSchema needs a code and a message, and takes any details', () => {
    expect(ApiErrorSchema.safeParse({ error: { code: 'bad', message: 'No' } }).success).toBe(true)
    expect(
      ApiErrorSchema.safeParse({ error: { code: 'bad', message: 'No', details: [1, { a: 2 }] } })
        .success,
    ).toBe(true)
    expect(ApiErrorSchema.safeParse({ error: { code: 'bad' } }).success).toBe(false)
    expect(ApiErrorSchema.safeParse({ code: 'bad', message: 'No' }).success).toBe(false)
    expect(ApiErrorSchema.safeParse(null).success).toBe(false)
  })

  it('CreateVersionInputSchema allows no label, trims it, and caps it at 100', () => {
    expect(CreateVersionInputSchema.safeParse({}).success).toBe(true)
    expect(CreateVersionInputSchema.parse({ label: '  v1  ' }).label).toBe('v1')
    expect(CreateVersionInputSchema.safeParse({ label: 'x'.repeat(100) }).success).toBe(true)
    expect(CreateVersionInputSchema.safeParse({ label: 'x'.repeat(101) }).success).toBe(false)
    expect(CreateVersionInputSchema.safeParse({ label: '' }).success).toBe(false)
    expect(CreateVersionInputSchema.safeParse({ label: '   ' }).success).toBe(false)
    expect(CreateVersionInputSchema.safeParse({ label: null }).success).toBe(false)
  })

  it('CvVersionSummarySchema accepts a null label but needs the auto flag', () => {
    const version = { id: 'v', label: null, auto: true, createdAt: '2026-10-20T10:00:00Z' }
    expect(CvVersionSummarySchema.safeParse(version).success).toBe(true)
    expect(CvVersionSummarySchema.safeParse({ ...version, auto: undefined }).success).toBe(false)
    expect(CvVersionSummarySchema.safeParse({ ...version, label: undefined }).success).toBe(false)
  })

  it('UploadSchema allows a size of 0 but not a negative or fractional one', () => {
    const upload = { id: 'u', url: '/uploads/u', contentType: 'image/png', size: 0 }
    expect(UploadSchema.safeParse(upload).success).toBe(true)
    expect(UploadSchema.safeParse({ ...upload, size: -1 }).success).toBe(false)
    expect(UploadSchema.safeParse({ ...upload, size: 1.5 }).success).toBe(false)
    expect(UploadSchema.safeParse({ ...upload, size: NaN }).success).toBe(false)
    expect(UploadSchema.safeParse({ ...upload, size: UPLOAD_MAX_BYTES }).success).toBe(true)
  })

  it('allows only common raster image types for uploads, never svg', () => {
    expect([...UPLOAD_CONTENT_TYPES]).toEqual(['image/png', 'image/jpeg', 'image/webp'])
    expect(UPLOAD_MAX_BYTES).toBe(5 * 1024 * 1024)
  })
})

describe('plan limits', () => {
  it.each(PLANS)('the %s plan has positive limits', (plan) => {
    const limits = PLAN_LIMITS[plan]
    expect(limits.maxVersionsPerCv).toBeGreaterThan(0)
    expect(limits.aiRequestsPerDay).toBeGreaterThan(0)
    if (limits.maxCvs !== null) expect(limits.maxCvs).toBeGreaterThan(0)
  })

  it('gives pro at least as much as free in every respect', () => {
    expect(
      PLAN_LIMITS.pro.maxCvs === null || PLAN_LIMITS.pro.maxCvs >= (PLAN_LIMITS.free.maxCvs ?? 0),
    ).toBe(true)
    expect(PLAN_LIMITS.pro.maxVersionsPerCv).toBeGreaterThanOrEqual(
      PLAN_LIMITS.free.maxVersionsPerCv,
    )
    expect(PLAN_LIMITS.pro.aiRequestsPerDay).toBeGreaterThanOrEqual(
      PLAN_LIMITS.free.aiRequestsPerDay,
    )
  })

  it('has a limit entry for every plan and nothing else', () => {
    expect(Object.keys(PLAN_LIMITS).sort()).toEqual([...PLANS].sort())
  })
})
