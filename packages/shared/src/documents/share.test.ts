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
