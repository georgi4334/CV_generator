import { describe, expect, it } from 'vitest'
import { UpdateResignationInputSchema } from '../api/api'
import { CV_LANGUAGES } from '../cv/common'
import { createExampleCv } from '../examples'
import { HIDDEN_PERSONAL, hidePersonalDetails } from '../documents/share'
import {
  createResignationLetter,
  RESIGNATION_LIMITS,
  ResignationDocumentSchema,
  resignationFieldMaxLength,
  resignationWithinLimits,
} from './resignation'

const today = new Date(2026, 9, 15)

describe('createResignationLetter', () => {
  it.each(CV_LANGUAGES)('produces a valid letter in %s', (language) => {
    const letter = createResignationLetter({ language, today })
    expect(ResignationDocumentSchema.parse(letter)).toEqual(letter)
    expect(letter.subject).not.toBe('')
    expect(letter.closing).not.toBe('')
    expect(letter.paragraphs.length).toBeGreaterThan(0)
  })

  it('takes the sender and the design from a CV', () => {
    const cv = createExampleCv('designer')
    const letter = createResignationLetter({ cv, today })
    expect(letter.sender).toEqual({
      name: cv.header.name,
      email: cv.header.email,
      phone: cv.header.phone,
      residence: cv.header.location,
    })
    expect(letter.signature).toBe(cv.header.name)
    expect(letter.design).toEqual(cv.design)
    expect(letter.language).toBe(cv.language)
  })

  it('names the company and the contact person in the greeting and the text', () => {
    const letter = createResignationLetter({ company: 'Acme', contact: 'Jo Smith', today })
    expect(letter.greeting).toBe('Dear Jo Smith,')
    expect(letter.paragraphs[0]).toContain('at Acme')
    expect(letter.employer).toMatchObject({ company: 'Acme', contact: 'Jo Smith' })
    const bare = createResignationLetter({ today })
    expect(bare.greeting).toBe('Dear Sir or Madam,')
    expect(bare.paragraphs[0]).not.toContain(' at ')
  })

  it('writes the date out in the letter language', () => {
    expect(createResignationLetter({ today }).date).toBe('October 15, 2026')
    expect(createResignationLetter({ language: 'en-GB', today }).date).toBe('15 October 2026')
    expect(createResignationLetter({ language: 'bg', today }).date).toContain('2026')
  })
})

describe('resignation limits', () => {
  it('refuses to save text longer than its limit, but still reads it', () => {
    const letter = createResignationLetter({ today })
    expect(UpdateResignationInputSchema.safeParse({ revision: 1, document: letter }).success).toBe(
      true,
    )
    const long = { ...letter, sender: { ...letter.sender, phone: '9'.repeat(500) } }
    expect(resignationWithinLimits(long)).toBe(false)
    expect(UpdateResignationInputSchema.safeParse({ revision: 1, document: long }).success).toBe(
      false,
    )
    expect(ResignationDocumentSchema.safeParse(long).success).toBe(true)
    const tooLongSubject = { ...letter, subject: 'x'.repeat(RESIGNATION_LIMITS.subject + 1) }
    expect(resignationWithinLimits(tooLongSubject)).toBe(false)
  })

  it('knows the limit of a path, and no other', () => {
    expect(resignationFieldMaxLength('sender.phone')).toBe(RESIGNATION_LIMITS.sender.phone)
    expect(resignationFieldMaxLength('employer.postalCode')).toBe(
      RESIGNATION_LIMITS.employer.postalCode,
    )
    expect(resignationFieldMaxLength('subject')).toBe(RESIGNATION_LIMITS.subject)
    expect(resignationFieldMaxLength('paragraphs.0')).toBeUndefined()
  })
})

describe('hiding personal details in a resignation letter', () => {
  const letter = createResignationLetter({
    cv: createExampleCv('designer'),
    company: 'Pixel & Pine Ltd',
    contact: 'Jordan Reyes',
    today,
  })
  const withAddress = {
    ...letter,
    employer: { ...letter.employer, address: '7 Harbour Road', postalCode: '1000', city: 'Varna' },
  }

  it('replaces the sender, the employer and the signature, and scrubs the text', () => {
    const hidden = hidePersonalDetails(withAddress)
    expect(hidden.sender.name).toBe(HIDDEN_PERSONAL.name)
    expect(hidden.employer).toEqual({
      company: HIDDEN_PERSONAL.company,
      contact: HIDDEN_PERSONAL.name,
      address: HIDDEN_PERSONAL.address,
      postalCode: HIDDEN_PERSONAL.postalCode,
      city: HIDDEN_PERSONAL.location,
    })
    expect(hidden.signature).toBe(HIDDEN_PERSONAL.name)
    const text = JSON.stringify(hidden)
    for (const secret of ['Pixel', 'Jordan', 'Reyes', letter.sender.email, letter.sender.phone])
      expect(text, secret).not.toContain(secret)
    // The words around the names stay.
    expect(hidden.paragraphs[0]).toContain(HIDDEN_PERSONAL.company)
    expect(hidden.greeting).toBe(`Dear ${HIDDEN_PERSONAL.name},`)
    expect(withAddress.sender.name).not.toBe(HIDDEN_PERSONAL.name)
  })

  it('keeps empty fields empty', () => {
    const hidden = hidePersonalDetails(createResignationLetter({ today }))
    expect(hidden.sender.name).toBe('')
    expect(hidden.employer.company).toBe('')
    expect(hidden.signature).toBe('')
  })
})
