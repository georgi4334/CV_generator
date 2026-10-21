import { describe, expect, it } from 'vitest'
import { createCoverLetter } from '../cover-letter/coverLetter'
import { createEmptyCv, createSection } from '../cv/factories'
import { PROFESSION_IDS } from '../cv/professions'
import type { CvDocument } from '../cv/document'
import type { Section } from '../cv/sections'
import { createExampleCv } from '../examples'
import { createResignationLetter } from '../resignation/resignation'
import {
  HIDDEN_PERSONAL,
  HIDDEN_PERSONAL_PATHS,
  SHARE_SLUG_PATTERN,
  ShareLinkSchema,
  ShareStateSchema,
  SharedDocumentSchema,
  UpdateShareInputSchema,
  hidePersonalDetails,
  sharePath,
} from './share'
import { CvDocumentSchema } from '../cv/document'
import { CoverLetterDocumentSchema } from '../cover-letter/coverLetter'
import { ResignationDocumentSchema } from '../resignation/resignation'

const today = new Date(2026, 9, 15)

/** A CV with a person's header and one summary whose text is `text`. */
function cvWith(name: string, text: string, extra: Partial<CvDocument['header']> = {}): CvDocument {
  const cv = createEmptyCv('en-US', [['summary', 'main']])
  cv.header = { ...cv.header, name, ...extra }
  const summary = cv.sections[0]!
  if (summary.type !== 'summary') throw new Error('expected a summary')
  summary.text = text
  return cv
}
const summaryOf = (cv: CvDocument) => {
  const s = cv.sections[0]!
  return s.type === 'summary' ? s.text : ''
}

describe('share link schemas', () => {
  const link = {
    slug: 'abcDEF12_-xyz',
    isActive: true,
    hidePersonal: false,
    createdAt: '2026-10-20T10:00:00.000Z',
    updatedAt: '2026-10-20T10:00:00.000Z',
  }

  it('reads a link and a state without a link', () => {
    expect(ShareLinkSchema.safeParse(link).success).toBe(true)
    expect(ShareStateSchema.safeParse({ link: null }).success).toBe(true)
    expect(ShareStateSchema.safeParse({ link }).success).toBe(true)
    expect(ShareStateSchema.safeParse({}).success).toBe(false)
  })

  it.each([
    ['a string flag', { isActive: 'true' }],
    ['a missing flag', { hidePersonal: undefined }],
    ['a date without time', { createdAt: '2026-10-20' }],
    ['a numeric slug', { slug: 12345678 }],
  ])('rejects a link with %s', (_label, change) => {
    expect(ShareLinkSchema.safeParse({ ...link, ...change }).success).toBe(false)
  })

  it('strips unknown keys of a link (such as an owner id)', () => {
    expect(ShareLinkSchema.parse({ ...link, ownerId: 'u1' })).not.toHaveProperty('ownerId')
  })
})

describe('UpdateShareInputSchema edge cases', () => {
  it.each([{ isActive: undefined }, { hidePersonal: undefined }, { other: true }])(
    'treats %j as nothing to change',
    (input) => {
      expect(UpdateShareInputSchema.safeParse(input).success).toBe(false)
    },
  )

  it.each([
    [{ isActive: 'yes' }],
    [{ isActive: 1 }],
    [{ isActive: null }],
    [{ hidePersonal: 'true' }],
    [{ hidePersonal: 0 }],
    [{ isActive: true, hidePersonal: 'no' }],
  ])('rejects %j', (input) => {
    expect(UpdateShareInputSchema.safeParse(input).success).toBe(false)
  })

  it('accepts false values (turning something off is a change)', () => {
    expect(UpdateShareInputSchema.safeParse({ isActive: false, hidePersonal: false }).success).toBe(
      true,
    )
  })

  it.each([null, undefined, 'x', 5, []])('rejects a body that is %j', (body) => {
    expect(UpdateShareInputSchema.safeParse(body).success).toBe(false)
  })
})

describe('share slugs and paths', () => {
  it.each(['abcdefgh', 'A1_-b2C3', 'x'.repeat(43), 'x'.repeat(64)])(
    'accepts the slug %s',
    (slug) => {
      expect(SHARE_SLUG_PATTERN.test(slug)).toBe(true)
    },
  )

  it.each([
    '',
    'short',
    'x'.repeat(7),
    'x'.repeat(65),
    'has space1',
    'slash/slash',
    'dot.dot.dot',
    '../../etc',
    'tab\tchar12',
    'new\nline12',
    'abcdefgh\n',
    'émoji-ünï',
    'plus+plus1',
    'eq==eq==eq',
  ])('rejects the slug %j', (slug) => {
    expect(SHARE_SLUG_PATTERN.test(slug)).toBe(false)
  })

  it('builds the public path', () => {
    expect(sharePath('abc')).toBe('/s/abc')
    expect(sharePath('')).toBe('/s/')
  })
})

describe('SharedDocumentSchema', () => {
  const base = { title: 'T', hidePersonal: true, updatedAt: '2026-10-20T10:00:00.000Z' }

  it('tells the three document types apart by their type', () => {
    const cv = SharedDocumentSchema.safeParse({ ...base, type: 'cv', document: createEmptyCv() })
    const letter = SharedDocumentSchema.safeParse({
      ...base,
      type: 'coverLetter',
      document: createCoverLetter({ today }),
    })
    const resignation = SharedDocumentSchema.safeParse({
      ...base,
      type: 'resignation',
      document: createResignationLetter({ today }),
    })
    expect([cv.success, letter.success, resignation.success]).toEqual([true, true, true])
  })

  it('refuses a document that does not match its type', () => {
    expect(
      SharedDocumentSchema.safeParse({
        ...base,
        type: 'cv',
        document: createCoverLetter({ today }),
      }).success,
    ).toBe(false)
    expect(
      SharedDocumentSchema.safeParse({ ...base, type: 'coverLetter', document: createEmptyCv() })
        .success,
    ).toBe(false)
    expect(
      SharedDocumentSchema.safeParse({
        ...base,
        type: 'resignation',
        document: createCoverLetter({ today }),
      }).success,
    ).toBe(false)
  })

  it.each(['job', 'CV', '', null, undefined])('refuses the type %j', (type) => {
    expect(
      SharedDocumentSchema.safeParse({ ...base, type, document: createEmptyCv() }).success,
    ).toBe(false)
  })

  it('accepts an empty title (titles are cleared when personal details are hidden)', () => {
    expect(
      SharedDocumentSchema.safeParse({ ...base, title: '', type: 'cv', document: createEmptyCv() })
        .success,
    ).toBe(true)
  })
})

describe('HIDDEN_PERSONAL', () => {
  it('has no real-looking data and no accidental letters of a real name', () => {
    expect(HIDDEN_PERSONAL.email).toMatch(/^x+@x+\.x+$/)
    expect(HIDDEN_PERSONAL.phone).toMatch(/^[+0 ]+$/)
    for (const value of Object.values(HIDDEN_PERSONAL)) expect(value.trim()).toBe(value)
  })

  it('lists the document paths of the fields that hold stand-ins, once each', () => {
    expect(HIDDEN_PERSONAL_PATHS.size).toBe(18)
    expect(HIDDEN_PERSONAL_PATHS.has('header.name')).toBe(true)
    expect(HIDDEN_PERSONAL_PATHS.has('employer.postalCode')).toBe(true)
    expect(HIDDEN_PERSONAL_PATHS.has('header.headline')).toBe(false)
  })
})

describe('hidePersonalDetails: a CV with every field empty', () => {
  it('copes with empty names, empty sections and no sections at all', () => {
    const empty = createEmptyCv('bg', [])
    expect(hidePersonalDetails(empty)).toEqual(empty)
    const withBlank = createEmptyCv()
    expect(() => hidePersonalDetails(withBlank)).not.toThrow()
    expect(CvDocumentSchema.safeParse(hidePersonalDetails(withBlank)).success).toBe(true)
  })

  it('treats a whitespace-only name or email as empty and stands in nothing', () => {
    const cv = cvWith('   ', 'text', { email: ' \t', phone: '\n' })
    const hidden = hidePersonalDetails(cv)
    expect(hidden.header).toMatchObject({ name: '', email: '', phone: '' })
  })
})

describe('hidePersonalDetails: what is replaced and what is kept', () => {
  it('keeps the design, the language and the schema version', () => {
    const cv = createExampleCv('designer')
    const hidden = hidePersonalDetails(cv)
    expect(hidden.design).toEqual(cv.design)
    expect(hidden.language).toBe(cv.language)
    expect(hidden.schemaVersion).toBe(cv.schemaVersion)
  })

  it('keeps ids, types, columns, visibility, levels and dates in the sections', () => {
    const cv = createExampleCv('software-developer')
    const hidden = hidePersonalDetails(cv)
    const strip = (c: CvDocument) =>
      c.sections.map((s) => [s.id, s.type, s.column, s.visible, s.title === null])
    expect(strip(hidden)).toEqual(strip(cv))
    const dates = (c: CvDocument) =>
      JSON.stringify(
        c.sections.flatMap((s) =>
          'items' in s ? s.items.map((i) => ('startDate' in i ? i.startDate : null)) : [],
        ),
      )
    expect(dates(hidden)).toBe(dates(cv))
  })

  it('hides a photo even when the CV has one and shows it', () => {
    const cv = cvWith('Maria Petrova', '', { photoUrl: '/uploads/me.png', showPhoto: true })
    const hidden = hidePersonalDetails(cv)
    expect(hidden.header.photoUrl).toBeNull()
    expect(hidden.header.showPhoto).toBe(false)
  })

  it('keeps the photo shape and position', () => {
    const cv = cvWith('Maria Petrova', '', { photoShape: 'square', photoPosition: 'top-right' })
    expect(hidePersonalDetails(cv).header).toMatchObject({
      photoShape: 'square',
      photoPosition: 'top-right',
    })
  })

  it.each(PROFESSION_IDS)("leaves nothing of the %s example's name and contacts", (id) => {
    const cv = createExampleCv(id)
    const text = JSON.stringify(hidePersonalDetails(cv))
    for (const secret of [cv.header.name, cv.header.email, cv.header.phone, cv.header.link])
      if (secret) expect(text.toLowerCase(), secret).not.toContain(secret.toLowerCase())
  })

  it('a valid CV stays a valid CV, for every example', () => {
    for (const id of PROFESSION_IDS)
      expect(CvDocumentSchema.safeParse(hidePersonalDetails(createExampleCv(id))).success, id).toBe(
        true,
      )
  })

  it('does not change the original document, deeply', () => {
    const cv = createExampleCv('healthcare')
    const before = JSON.stringify(cv)
    hidePersonalDetails(cv)
    expect(JSON.stringify(cv)).toBe(before)
  })

  it('returns new objects for the parts it rewrites, so the result can be edited safely', () => {
    const cv = createExampleCv('designer')
    const hidden = hidePersonalDetails(cv)
    expect(hidden).not.toBe(cv)
    expect(hidden.header).not.toBe(cv.header)
    expect(hidden.sections).not.toBe(cv.sections)
    hidden.sections[0]!.visible = !hidden.sections[0]!.visible
    expect(cv.sections[0]!.visible).not.toBe(hidden.sections[0]!.visible)
  })
})

describe('hidePersonalDetails: idempotence', () => {
  const cv = (() => {
    const doc = cvWith(
      'Maria Petrova',
      'Maria Petrova, maria@example.com, +359 88 123 4567, maria.design. Ask maria.',
      {
        email: 'maria@example.com',
        phone: '+359 88 123 4567',
        link: 'maria.design',
        location: 'Sofia',
        headline: 'Maria Petrova, designer',
      },
    )
    return doc
  })()

  it('scrubbing a CV twice gives the same result as once', () => {
    const once = hidePersonalDetails(cv)
    expect(hidePersonalDetails(once)).toEqual(once)
  })

  it('scrubbing a cover letter twice gives the same result as once', () => {
    const letter = createCoverLetter({ cv, company: 'Northwind Labs', today })
    letter.recipient = {
      name: 'Dana Whitfield',
      title: 'Head of People',
      company: 'Northwind Labs',
      address: '9 Canal Street',
    }
    letter.paragraphs = ['Dear Dana, I am Maria Petrova and want to join Northwind Labs.', '', '']
    const once = hidePersonalDetails(letter)
    expect(hidePersonalDetails(once)).toEqual(once)
  })

  it('scrubbing a resignation letter twice gives the same result as once', () => {
    const letter = createResignationLetter({
      cv,
      company: 'Pixel & Pine Ltd',
      contact: 'Jordan Reyes',
      today,
    })
    letter.employer.address = '7 Harbour Road'
    letter.employer.city = 'Varna'
    letter.paragraphs.push('Thanks, Jordan. Pixel & Pine was great. Maria')
    const once = hidePersonalDetails(letter)
    expect(hidePersonalDetails(once)).toEqual(once)
  })

  it.each(PROFESSION_IDS)('is idempotent for the %s example', (id) => {
    const once = hidePersonalDetails(createExampleCv(id))
    expect(hidePersonalDetails(once)).toEqual(once)
  })

  it('does not change a document whose personal details already are the stand-ins', () => {
    const doc = cvWith(HIDDEN_PERSONAL.name, `Hello ${HIDDEN_PERSONAL.name}`, {
      email: HIDDEN_PERSONAL.email,
      phone: HIDDEN_PERSONAL.phone,
      link: HIDDEN_PERSONAL.link,
      location: HIDDEN_PERSONAL.location,
    })
    expect(hidePersonalDetails(doc)).toEqual(doc)
  })
})

describe('hidePersonalDetails: names inside text', () => {
  it('hides a name written in upper case, lower case and mixed case', () => {
    const hidden = hidePersonalDetails(
      cvWith('Maria Petrova', 'MARIA PETROVA, maria petrova and MaRiA'),
    )
    expect(summaryOf(hidden)).toBe(`${HIDDEN_PERSONAL.name}, ${HIDDEN_PERSONAL.name} and Xxxxx`)
  })

  it('hides a first or last name on its own, only as a whole word', () => {
    const hidden = hidePersonalDetails(
      cvWith('Maria Petrova', 'Thanks Maria! Mariana and Petrovanka stay. (Petrova)'),
    )
    expect(summaryOf(hidden)).toBe('Thanks Xxxxx! Mariana and Petrovanka stay. (Xxxxx)')
  })

  it('does not touch words that merely contain the name', () => {
    const hidden = hidePersonalDetails(cvWith('Ana Lee', 'Analytics, banana, Leeds and Leeward'))
    expect(summaryOf(hidden)).toBe('Analytics, banana, Leeds and Leeward')
  })

  it('does not treat digits as a boundary: "Ana2" and "2Ana" stay', () => {
    const hidden = hidePersonalDetails(cvWith('Ana Lee', 'Ana2 and 2Ana and Ana_ and -Ana-'))
    expect(summaryOf(hidden)).toBe('Ana2 and 2Ana and Xxxxx_ and -Xxxxx-')
  })

  it('replaces the longest match first: the full name before its parts', () => {
    const hidden = hidePersonalDetails(
      cvWith('Ana Maria Lee', 'Ana Maria Lee wrote this; Ana Maria too'),
    )
    expect(summaryOf(hidden)).toBe(`${HIDDEN_PERSONAL.name} wrote this; Xxxxx Xxxxx too`)
  })

  it('does not hide words of fewer than three letters on their own, but hides the whole name', () => {
    const hidden = hidePersonalDetails(cvWith('Li Wu', 'Li Wu and Li and Wu'))
    expect(summaryOf(hidden)).toBe(`${HIDDEN_PERSONAL.name} and Li and Wu`)
  })

  it('hides nothing in the text for a one-character name, but still masks the header', () => {
    const hidden = hidePersonalDetails(cvWith('A', 'A good day for A.'))
    expect(summaryOf(hidden)).toBe('A good day for A.')
    expect(hidden.header.name).toBe(HIDDEN_PERSONAL.name)
  })

  it('hides a two-character name written whole (the minimum for the full name)', () => {
    const hidden = hidePersonalDetails(cvWith('Bo', 'Bo said hi; Bob did not'))
    expect(summaryOf(hidden)).toBe(`${HIDDEN_PERSONAL.name} said hi; Bob did not`)
  })

  it('hides names with accents and other scripts, in any case', () => {
    const hidden = hidePersonalDetails(cvWith('José Ñandú', 'JOSÉ and ñandú; Мария е тук'))
    expect(summaryOf(hidden)).toBe('Xxxxx and Xxxxx; Мария е тук')
    const bg = hidePersonalDetails(
      cvWith('Мария Петрова', 'Здравей, мария ПЕТРОВА! Мариам остава.'),
    )
    expect(summaryOf(bg)).toBe(`Здравей, ${HIDDEN_PERSONAL.name}! Мариам остава.`)
  })

  it('hides a right-to-left name', () => {
    const hidden = hidePersonalDetails(cvWith('محمد علي', 'قال محمد علي مرحبا'))
    expect(summaryOf(hidden)).toContain(HIDDEN_PERSONAL.name)
    expect(summaryOf(hidden)).not.toContain('محمد')
  })

  it('hides the email, phone and link wherever the text repeats them', () => {
    const doc = cvWith(
      'Maria Petrova',
      'Write to MARIA@EXAMPLE.COM, call +359 88 123 4567 or visit maria.design.',
      {
        email: 'maria@example.com',
        phone: '+359 88 123 4567',
        link: 'maria.design',
      },
    )
    expect(summaryOf(hidePersonalDetails(doc))).toBe(
      `Write to ${HIDDEN_PERSONAL.email}, call ${HIDDEN_PERSONAL.phone} or visit ${HIDDEN_PERSONAL.link}.`,
    )
  })

  it('hides the name in custom section titles, skills, bullets and links of every section type', () => {
    const cv = createExampleCv('software-developer')
    cv.header.name = 'Zoltan Quixote'
    for (const section of cv.sections as Section[]) {
      section.title = `Zoltan's ${section.type}`
      if (section.type === 'summary') section.text = 'Zoltan Quixote'
      else
        for (const item of section.items as unknown as Array<Record<string, unknown>>)
          for (const [key, value] of Object.entries(item)) {
            if (key === 'id' || key === 'icon') continue
            if (typeof value === 'string' && value) item[key] = `${value} Zoltan`
            if (Array.isArray(value)) item[key] = [...value, 'Quixote']
          }
    }
    const hidden = hidePersonalDetails(cv)
    expect(JSON.stringify(hidden)).not.toMatch(/Zoltan|Quixote/i)
  })

  it('keeps structural strings even when the person is named after them', () => {
    const cv = createExampleCv('software-developer')
    cv.header.name = 'Summary Experience Skills'
    cv.header.email = 'main@sidebar.dots'
    const hidden = hidePersonalDetails(cv)
    expect(CvDocumentSchema.safeParse(hidden).success).toBe(true)
    expect(hidden.sections.map((s) => s.type)).toEqual(cv.sections.map((s) => s.type))
    const skills = hidden.sections.find((s) => s.type === 'skills')
    const original = cv.sections.find((s) => s.type === 'skills')
    expect(skills && 'levelDisplay' in skills && skills.levelDisplay).toBe(
      original && 'levelDisplay' in original && original.levelDisplay,
    )
  })

  it('hides a name that is also an icon key without breaking the achievement icon', () => {
    const cv = createExampleCv('sales-marketing')
    cv.header.name = 'Star Trophy'
    const before = cv.sections.find((s) => s.type === 'achievements')
    const hidden = hidePersonalDetails(cv)
    const after = hidden.sections.find((s) => s.type === 'achievements')
    expect(
      after && 'items' in after && after.items.map((i) => ('icon' in i ? i.icon : '')),
    ).toEqual(before && 'items' in before && before.items.map((i) => ('icon' in i ? i.icon : '')))
  })
})

describe('hidePersonalDetails: special characters in names never break the pattern', () => {
  it.each([
    'C++ Dev',
    'a.b',
    '(',
    '((',
    '\\',
    '\\\\ x',
    '[a-z]+',
    'a|b',
    '^$',
    '$&',
    '${x}',
    '*+?',
    '{1,2}',
    'a(b',
    'x)y',
    '.*',
    '\\p{L}',
    '(?<=x)',
    "O'Brien",
    'Jean-Luc Picard',
    'Zoë 😀 Ünal',
    'name\u0000nul',
    'zero​width',
    '\n',
    '   ',
    '',
  ])('does not throw for the name %j', (name) => {
    const doc = cvWith(name, `text with ${name} inside and more text`)
    expect(() => hidePersonalDetails(doc)).not.toThrow()
    expect(CvDocumentSchema.safeParse(hidePersonalDetails(doc)).success).toBe(true)
  })

  it('treats a dot in a name literally: "a.b" does not match "axb"', () => {
    const hidden = hidePersonalDetails(cvWith('a.b', 'a.b and axb and a-b'))
    expect(summaryOf(hidden)).toBe(`${HIDDEN_PERSONAL.name} and axb and a-b`)
  })

  it('hides "C++" in a full name without eating "C" or "CC"', () => {
    const hidden = hidePersonalDetails(cvWith('C++ Dev', 'C++ Dev knows C and CC'))
    expect(summaryOf(hidden)).toBe(`${HIDDEN_PERSONAL.name} knows C and CC`)
  })

  it('treats | in a name literally', () => {
    const hidden = hidePersonalDetails(cvWith('a|b', 'a|b and a and b'))
    expect(summaryOf(hidden)).toBe(`${HIDDEN_PERSONAL.name} and a and b`)
  })

  it('treats $& and $1 in a name or text literally in the replacement', () => {
    const hidden = hidePersonalDetails(cvWith('Maria Petrova', '$& $1 $$ Maria'))
    expect(summaryOf(hidden)).toBe('$& $1 $$ Xxxxx')
  })

  it('handles a 5,000 character name and a text that repeats it', () => {
    const name = `${'Verylongname '.repeat(400)}Last`
    const doc = cvWith(name, `${name} and Last and Verylongname`)
    const started = Date.now()
    const hidden = hidePersonalDetails(doc)
    expect(Date.now() - started).toBeLessThan(1500)
    expect(summaryOf(hidden)).toBe(`${HIDDEN_PERSONAL.name} and Xxxxx and Xxxxx`)
  })

  it('handles a 5,000 character signature made of 800 different words (the longest a saved letter can hold)', () => {
    const words = Array.from({ length: 800 }, (_, i) => `Word${i}`)
    const signature = words.join(' ').slice(0, 5000)
    const letter = createCoverLetter({ today })
    letter.signature = signature
    letter.paragraphs = ['Word5 and Word100 are here.', '', '']
    const hidden = hidePersonalDetails(letter)
    expect(hidden.paragraphs[0]).toBe('Xxxxx and Xxxxx are here.')
  })
})

describe('hidePersonalDetails: abuse and large documents', () => {
  it('scrubs 3,000 sections of 10 bullets within a second or two', () => {
    const cv = createEmptyCv('en-US', [])
    cv.header.name = 'Maria Petrova'
    for (let i = 0; i < 3000; i++) {
      const section = createSection('experience', 'main')
      section.items[0]!.bullets = Array.from(
        { length: 10 },
        (_, j) => `Maria led project ${j} with Petrova`,
      )
      cv.sections.push(section)
    }
    const started = Date.now()
    const hidden = hidePersonalDetails(cv)
    expect(Date.now() - started).toBeLessThan(2500)
    expect(JSON.stringify(hidden)).not.toMatch(/Maria|Petrova/)
  })

  it('scrubs one 1 MB text that repeats the name every few words', () => {
    const doc = cvWith('Maria Petrova', 'Maria wrote this. '.repeat(60_000))
    const hidden = hidePersonalDetails(doc)
    expect(summaryOf(hidden)).not.toContain('Maria')
    expect(summaryOf(hidden).length).toBe('Xxxxx wrote this. '.length * 60_000)
  })

  it('does not treat a text with only "Xxxxx" differently from other text', () => {
    const hidden = hidePersonalDetails(cvWith('Maria Petrova', 'Xxxxx Xxxxx'))
    expect(summaryOf(hidden)).toBe('Xxxxx Xxxxx')
  })

  it('survives a cover letter with an empty paragraph list', () => {
    const letter = createCoverLetter({ today })
    letter.paragraphs = []
    expect(() => hidePersonalDetails(letter)).not.toThrow()
    expect(hidePersonalDetails(letter).paragraphs).toEqual([])
  })
})

describe('hidePersonalDetails: cover letters with missing parts', () => {
  it('copes with a letter where every field is empty', () => {
    const letter = createCoverLetter({ today })
    letter.greeting = ''
    letter.closing = ''
    letter.signature = ''
    letter.paragraphs = ['']
    const hidden = hidePersonalDetails(letter)
    expect(hidden.recipient).toEqual({ name: '', title: '', company: '', address: '' })
    expect(hidden.signature).toBe('')
    expect(CoverLetterDocumentSchema.safeParse(hidden).success).toBe(true)
  })

  it('hides a recipient company in the text when only the company is known', () => {
    const letter = createCoverLetter({ company: 'Northwind Labs', today })
    letter.paragraphs = ['I admire northwind labs.', '', '']
    expect(hidePersonalDetails(letter).paragraphs[0]).toBe(`I admire ${HIDDEN_PERSONAL.company}.`)
  })

  it('keeps the recipient title and the letter date', () => {
    const letter = createCoverLetter({ today })
    letter.recipient.title = 'Head of People'
    const hidden = hidePersonalDetails(letter)
    expect(hidden.recipient.title).toBe('Head of People')
    expect(hidden.date).toBe(letter.date)
  })

  // BUG: the recipient's job title is copied unchanged and never scrubbed, so a title that names
  // the company or the person leaks both even though the company and name fields are masked.
  // Reproduce: createCoverLetter() with recipient { name: 'Dana Whitfield', title: 'CEO of Northwind
  // Labs', company: 'Northwind Labs', address: '' } -> hidden.recipient.title is still
  // 'CEO of Northwind Labs' (expected 'CEO of Xxxxx Xxxxx').
  it.fails('does not leave the company in the recipient title', () => {
    const letter = createCoverLetter({ today })
    letter.recipient = {
      name: 'Dana Whitfield',
      title: 'CEO of Northwind Labs',
      company: 'Northwind Labs',
      address: '',
    }
    expect(hidePersonalDetails(letter).recipient.title).not.toContain('Northwind')
  })

  it('hides the sender name found in the letter header headline and in every paragraph', () => {
    const cv = cvWith('Maria Petrova', '', { headline: 'Maria Petrova | UX' })
    const letter = createCoverLetter({ cv, today })
    letter.paragraphs = ['I am Maria.', 'PETROVA here.', 'Maria Petrova']
    expect(JSON.stringify(hidePersonalDetails(letter))).not.toMatch(/Maria|Petrova/i)
  })
})

describe('hidePersonalDetails: resignation letters with missing parts', () => {
  it('copes with a letter where every field is empty', () => {
    const letter = createResignationLetter({ today })
    letter.subject = ''
    letter.greeting = ''
    letter.closing = ''
    letter.date = ''
    letter.signature = ''
    letter.paragraphs = ['']
    const hidden = hidePersonalDetails(letter)
    expect(hidden.sender).toEqual({ name: '', email: '', phone: '', residence: '' })
    expect(hidden.employer).toEqual({
      company: '',
      contact: '',
      address: '',
      postalCode: '',
      city: '',
    })
    expect(ResignationDocumentSchema.safeParse(hidden).success).toBe(true)
  })

  it('masks only the employer parts that are filled in', () => {
    const letter = createResignationLetter({ company: 'Acme', today })
    const hidden = hidePersonalDetails(letter)
    expect(hidden.employer).toEqual({
      company: HIDDEN_PERSONAL.company,
      contact: '',
      address: '',
      postalCode: '',
      city: '',
    })
  })

  it('hides the residence, address and city when the text mentions them', () => {
    const letter = createResignationLetter({ today })
    letter.sender = {
      name: 'Maria Petrova',
      email: '',
      phone: '',
      residence: '12 Oak Street, Sofia',
    }
    letter.employer = {
      company: 'Acme',
      contact: '',
      address: '7 Harbour Road',
      postalCode: '1000',
      city: 'Varna',
    }
    letter.paragraphs = ['I live at 12 Oak Street, Sofia.', 'Send it to 7 Harbour Road in Varna.']
    const text = JSON.stringify(hidePersonalDetails(letter))
    expect(text).not.toMatch(/Oak Street|Harbour|Varna/)
  })

  it('does not hide a short city name that is part of a longer word', () => {
    const letter = createResignationLetter({ today })
    letter.employer.city = 'Ur'
    letter.employer.company = 'Acme'
    letter.paragraphs = ['Ur is old; urban life; Ur.']
    expect(hidePersonalDetails(letter).paragraphs[0]).toBe(
      `${HIDDEN_PERSONAL.location} is old; urban life; ${HIDDEN_PERSONAL.location}.`,
    )
  })

  it('keeps the date, language and design', () => {
    const letter = createResignationLetter({ company: 'Acme', language: 'bg', today })
    const hidden = hidePersonalDetails(letter)
    expect(hidden.date).toBe(letter.date)
    expect(hidden.language).toBe('bg')
    expect(hidden.design).toEqual(letter.design)
  })

  it('does not change the letter it is given', () => {
    const letter = createResignationLetter({
      cv: createExampleCv('designer'),
      company: 'Acme',
      contact: 'Jo Smith',
      today,
    })
    const before = JSON.stringify(letter)
    hidePersonalDetails(letter)
    expect(JSON.stringify(letter)).toBe(before)
  })
})

describe('hidePersonalDetails: known gaps in matching', () => {
  // BUG: names are matched code point for code point after lower-casing, with no Unicode
  // normalisation. A name typed as "José" (precomposed é) is not found when the text spells it
  // with a combining accent ("Jose" + U+0301), so the real name stays in the shared text.
  // Reproduce: cvWith('José Ñandú', 'Hola José!') -> summary text keeps "José".
  it.fails(
    'hides a name written with combining accents when the header uses precomposed letters',
    () => {
      const hidden = hidePersonalDetails(cvWith('José Ñandú', 'Hola José!'))
      expect(summaryOf(hidden)).not.toContain('Jose')
    },
  )

  // BUG: only whitespace splits a name into words, so a hyphenated first name such as
  // "Anne-Marie" is hidden only as a whole; "Anne" or "Marie" alone stay in the text.
  // Reproduce: cvWith('Anne-Marie Dupont', 'Thanks Anne!') -> text keeps "Anne".
  it.fails('hides the parts of a hyphenated first name on their own', () => {
    const hidden = hidePersonalDetails(cvWith('Anne-Marie Dupont', 'Thanks Anne! Marie is great.'))
    expect(summaryOf(hidden)).not.toMatch(/Anne|Marie/)
  })
})
