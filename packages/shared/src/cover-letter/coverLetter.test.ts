import { describe, expect, it } from 'vitest'
import { createCoverLetter, CoverLetterDocumentSchema } from './coverLetter'
import { createExampleCv } from '../examples'

const today = new Date(2026, 9, 15)

describe('createCoverLetter', () => {
  it('takes header and design from the CV and the company from the job', () => {
    const cv = createExampleCv('designer')
    const letter = createCoverLetter({ cv, company: 'Acme', today })
    expect(letter.header).toEqual(cv.header)
    expect(letter.header).not.toBe(cv.header)
    expect(letter.design).toEqual(cv.design)
    expect(letter.recipient.company).toBe('Acme')
    expect(letter.signature).toBe(cv.header.name)
    expect(letter.date).toBe('October 15, 2026')
    expect(CoverLetterDocumentSchema.safeParse(letter).success).toBe(true)
  })

  it('starts empty without a CV, with three paragraphs to fill in', () => {
    const letter = createCoverLetter({ today })
    expect(letter.header.name).toBe('')
    expect(letter.paragraphs).toEqual(['', '', ''])
    expect(letter.greeting).toBe('Dear Hiring Manager,')
    expect(CoverLetterDocumentSchema.safeParse(letter).success).toBe(true)
  })

  it('writes greeting, closing and date in the letter language', () => {
    const letter = createCoverLetter({ language: 'bg', today })
    expect(letter).toMatchObject({ greeting: 'Уважаеми г-н/г-жо,', closing: 'С уважение,' })
    expect(letter.date).toContain('2026')
    expect(letter.date).toMatch(/октомври/)
    expect(createCoverLetter({ language: 'en-GB', today }).date).toBe('15 October 2026')
  })
})
