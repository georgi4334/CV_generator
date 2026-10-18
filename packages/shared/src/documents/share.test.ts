import { describe, expect, it } from 'vitest'
import { createCoverLetter } from '../cover-letter/coverLetter'
import { createEmptyCv } from '../cv/factories'
import { HIDDEN_PERSONAL, UpdateShareInputSchema, hidePersonalDetails } from './share'

const header = {
  name: 'Maria Petrova',
  headline: 'Product designer',
  email: 'maria@example.com',
  phone: '+359 88 123 4567',
  location: 'Sofia',
  link: 'maria.design',
  photoUrl: '/uploads/me.jpg',
  showPhoto: true,
}

describe('hidePersonalDetails', () => {
  it('replaces the name, contacts and photo of a CV, keeping the headline', () => {
    const cv = { ...createEmptyCv(), header: { ...createEmptyCv().header, ...header } }
    const hidden = hidePersonalDetails(cv)
    expect(hidden.header).toMatchObject({
      name: HIDDEN_PERSONAL.name,
      email: HIDDEN_PERSONAL.email,
      phone: HIDDEN_PERSONAL.phone,
      location: HIDDEN_PERSONAL.location,
      link: HIDDEN_PERSONAL.link,
      headline: 'Product designer',
      photoUrl: null,
      showPhoto: false,
    })
    expect(JSON.stringify(hidden)).not.toMatch(/Maria|Petrova|example\.com|123 4567|me\.jpg/)
    // The original is not changed.
    expect(cv.header.name).toBe('Maria Petrova')
  })

  it('keeps empty fields empty', () => {
    const hidden = hidePersonalDetails(createEmptyCv())
    expect(hidden.header.name).toBe('')
    expect(hidden.header.phone).toBe('')
  })

  it('also hides the signature of a letter', () => {
    const cv = { ...createEmptyCv(), header: { ...createEmptyCv().header, ...header } }
    const hidden = hidePersonalDetails(createCoverLetter({ cv }))
    expect(hidden.signature).toBe(HIDDEN_PERSONAL.name)
    expect(JSON.stringify(hidden)).not.toMatch(/Maria|example\.com/)
  })
})

describe('UpdateShareInputSchema', () => {
  it('needs at least one change', () => {
    expect(UpdateShareInputSchema.safeParse({}).success).toBe(false)
    expect(UpdateShareInputSchema.safeParse({ hidePersonal: true }).success).toBe(true)
    expect(UpdateShareInputSchema.safeParse({ isActive: false }).success).toBe(true)
  })
})

describe('hiding names inside the text', () => {
  const cv = { ...createEmptyCv(), header: { ...createEmptyCv().header, ...header } }

  it('swaps the name and contacts in CV sections, whole words only', () => {
    const summary = cv.sections.find((section) => section.type === 'summary')!
    if (summary.type !== 'summary') throw new Error('expected a summary')
    summary.text =
      'Maria Petrova builds products. Ask maria for details, maria@example.com or call +359 88 123 4567. Petrovanka is a village; analytics matter.'
    const hidden = hidePersonalDetails(cv)
    const text = JSON.stringify(hidden.sections)
    expect(text).not.toMatch(/Maria|Petrova(?!nka)|maria@example\.com|123 4567/i)
    expect(text).toContain(HIDDEN_PERSONAL.name)
    expect(text).toContain(HIDDEN_PERSONAL.email)
    // Words that only contain a name stay.
    expect(text).toContain('Petrovanka')
    expect(text).toContain('analytics')
    // Ids are not text.
    expect(hidden.sections.map((section) => section.id)).toEqual(cv.sections.map((s) => s.id))
  })

  it('hides the recipient of a cover letter, and names in the text, but keeps their job title', () => {
    const letter = createCoverLetter({ cv })
    letter.recipient = {
      name: 'Dana Whitfield',
      title: 'Head of People',
      company: 'Northwind Labs',
      address: '9 Canal Street, Leeds',
    }
    letter.greeting = 'Dear Dana,'
    letter.paragraphs = ['Thank you, Dana Whitfield. I am excited about Northwind Labs.', '', '']
    const hidden = hidePersonalDetails(letter)
    expect(hidden.recipient).toEqual({
      name: HIDDEN_PERSONAL.name,
      title: 'Head of People',
      company: HIDDEN_PERSONAL.company,
      address: HIDDEN_PERSONAL.address,
    })
    expect(hidden.greeting).toBe('Dear Xxxxx,')
    expect(JSON.stringify(hidden)).not.toMatch(/Dana|Whitfield|Northwind|Canal Street|Maria/)
    expect(letter.recipient.name).toBe('Dana Whitfield')
  })

  it('also hides the name from the signature when the letter header lacks it', () => {
    const letter = createCoverLetter({ cv: createEmptyCv() })
    letter.signature = 'Ivan Georgiev'
    letter.paragraphs = ['Thanks, Ivan.']
    expect(JSON.stringify(hidePersonalDetails(letter))).not.toContain('Ivan')
  })
})
