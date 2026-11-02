import {
  createCoverLetter,
  createEmptyCv,
  createResignationLetter,
  HIDDEN_PERSONAL,
} from '@cv/shared'
import { eq } from 'drizzle-orm'
import { describe, expect, it } from 'vitest'
import { shareLinks, users } from '../../src/db/schema/index'
import { apiCaller, countBy, inParallel, unknownId } from '../support/api'
import { dbAvailable, useTestApp } from '../support/context'

const KINDS = [
  { name: 'CV', path: '/cvs', type: 'cv' },
  { name: 'cover letter', path: '/cover-letters', type: 'coverLetter' },
  { name: 'resignation letter', path: '/resignations', type: 'resignation' },
] as const

describe.skipIf(!dbAvailable)('share links: edge cases and abuse', () => {
  const ctx = useTestApp()
  const call = apiCaller(ctx)
  const publicGet = (slug: string) => call('GET', `/shared/${slug}`, undefined, null)
  const makeCv = async (document?: object) =>
    (await call('POST', '/cvs', document ? { document } : {})).json() as {
      id: string
      revision: number
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      document: any
    }
  const putShare = (path: string, id: string, body: object) =>
    call('PUT', `${path}/${id}/share`, body)
  const linkOf = async (path: string, id: string, body: object = { isActive: true }) =>
    (await putShare(path, id, body)).json().link as {
      slug: string
      isActive: boolean
      hidePersonal: boolean
    }

  describe('guessing and probing addresses', () => {
    it.each([
      ['empty-ish', '-'],
      ['too short', 'abc'],
      ['7 characters', 'abcdefg'],
      ['65 characters', 'a'.repeat(65)],
      ['dots', '..%2f..%2fetc%2fpasswd'],
      ['a dot', 'abcdefgh.ijk'],
      ['unicode', 'ééééééééééé'],
      ['SQL', "x'%20or%20'1'='1"],
      ['a percent sign', 'abcdefgh%25'],
      ['spaces', 'abcdefgh%20%20'],
      ['16 plausible characters', 'AbCdEfGhIjKlMnOp'],
    ])('answers 404 with the usual body for %s', async (_name, slug) => {
      const res = await publicGet(slug)
      expect(res.statusCode).toBe(404)
      expect(res.json()).toEqual({
        error: { code: 'not_found', message: 'Shared document not found' },
      })
    })

    it('answers an inactive, unknown, upper-case, truncated or extended address with the same body', async () => {
      const cv = await makeCv()
      const link = await linkOf('/cvs', cv.id)
      await putShare('/cvs', cv.id, { isActive: false })
      const probes = [
        link.slug,
        'Zz'.repeat(8),
        link.slug.toUpperCase(),
        link.slug.slice(0, 8),
        `${link.slug}x`,
        link.slug.split('').reverse().join(''),
      ]
      const bodies = new Set<string>()
      for (const slug of probes) {
        const res = await publicGet(slug)
        expect(res.statusCode, slug).toBe(404)
        bodies.add(res.payload)
      }
      expect(bodies.size).toBe(1)
    })

    it('does not answer for the id of a document, only for its random address', async () => {
      const cv = await makeCv()
      await linkOf('/cvs', cv.id)
      expect((await publicGet(cv.id)).statusCode).toBe(404)
      expect((await publicGet(cv.id.replace(/-/g, ''))).statusCode).toBe(404)
    })

    it('does not accept any HTTP method but GET on a public address', async () => {
      const cv = await makeCv()
      const link = await linkOf('/cvs', cv.id)
      for (const method of ['POST', 'PUT', 'PATCH', 'DELETE'] as const) {
        const res = await ctx.app.inject({ method, url: `/api/shared/${link.slug}`, payload: {} })
        expect(res.statusCode, method).toBe(404)
      }
      expect((await publicGet(link.slug)).statusCode).toBe(200)
    })

    it('gives every document its own address, and addresses look random', async () => {
      const slugs = new Set<string>()
      for (let i = 0; i < 12; i++) {
        const cv = await makeCv()
        slugs.add((await linkOf('/cvs', cv.id)).slug)
      }
      expect(slugs.size).toBe(12)
      for (const slug of slugs) expect(slug).toMatch(/^[A-Za-z0-9_-]{16}$/)
    })

    it('ignores an address chosen by the client (the slug is always generated)', async () => {
      const cv = await makeCv()
      const res = await putShare('/cvs', cv.id, {
        isActive: true,
        slug: 'my-chosen-address',
        id: unknownId(),
        cvId: unknownId(),
      })
      expect(res.statusCode).toBe(200)
      expect(res.json().link.slug).not.toBe('my-chosen-address')
      expect((await publicGet('my-chosen-address')).statusCode).toBe(404)
    })
  })

  describe('what a visitor receives', () => {
    it.each(KINDS)(
      'exposes only the type, title, document, flags and date of a $name',
      async (kind) => {
        const created = (await call('POST', kind.path, {})).json()
        const link = await linkOf(kind.path, created.id)
        const res = await publicGet(link.slug)
        expect(res.statusCode).toBe(200)
        expect(Object.keys(res.json()).sort()).toEqual([
          'document',
          'hidePersonal',
          'title',
          'type',
          'updatedAt',
        ])
        expect(res.json().type).toBe(kind.type)
        expect(res.payload).not.toContain(ctx.userId)
        expect(res.payload).not.toContain(created.id)
        expect(res.payload).not.toContain('user@example.com')
        expect(res.headers['set-cookie']).toBeUndefined()
        expect(res.headers['cache-control']).toBe('private, no-store')
      },
    )

    it('works for a visitor who is signed in as someone else, and for an invalid cookie', async () => {
      const cv = await makeCv()
      const link = await linkOf('/cvs', cv.id)
      const other = await ctx.signUp('visitor@example.com')
      expect((await call('GET', `/shared/${link.slug}`, undefined, other.cookie)).statusCode).toBe(
        200,
      )
      expect(
        (await call('GET', `/shared/${link.slug}`, undefined, 'cv_session=garbage')).statusCode,
      ).toBe(200)
    })

    it('shows changes at once, and the old content never from a cache', async () => {
      const cv = await makeCv()
      const link = await linkOf('/cvs', cv.id)
      for (let i = 1; i <= 3; i++) {
        const document = { ...cv.document, header: { ...cv.document.header, name: `Version ${i}` } }
        await call('PATCH', `/cvs/${cv.id}`, { revision: i, document })
        expect((await publicGet(link.slug)).json().document.header.name).toBe(`Version ${i}`)
      }
    })
  })

  describe('turning sharing on and off', () => {
    it.each(KINDS)(
      'toggling a $name 21 times keeps one address and ends in the last state',
      async (kind) => {
        const created = (await call('POST', kind.path, {})).json()
        const first = await linkOf(kind.path, created.id)
        for (let i = 0; i < 21; i++) {
          const on = i % 2 === 1
          const link = await linkOf(kind.path, created.id, { isActive: on })
          expect(link.slug).toBe(first.slug)
          expect((await publicGet(first.slug)).statusCode).toBe(on ? 200 : 404)
        }
        expect((await publicGet(first.slug)).statusCode).toBe(404) // 21st call (i = 20) switched it off
        expect(await ctx.database.db.select().from(shareLinks)).toHaveLength(1)
      },
    )

    it('creates a link that is off when only hidePersonal is sent first', async () => {
      const cv = await makeCv()
      const link = await linkOf('/cvs', cv.id, { hidePersonal: true })
      expect(link).toMatchObject({ isActive: false, hidePersonal: true })
      expect((await publicGet(link.slug)).statusCode).toBe(404)
    })

    it('five parallel first-time PUTs create one link with one address', async () => {
      const cv = await makeCv()
      const results = await inParallel(5, () => putShare('/cvs', cv.id, { isActive: true }))
      expect(results.map((r) => r.statusCode)).toEqual([200, 200, 200, 200, 200])
      expect(new Set(results.map((r) => r.json().link.slug)).size).toBe(1)
      expect(await ctx.database.db.select().from(shareLinks)).toHaveLength(1)
    })

    it('five parallel resets leave exactly one working address, the one that is stored', async () => {
      const cv = await makeCv()
      await linkOf('/cvs', cv.id)
      const results = await inParallel(5, () => call('POST', `/cvs/${cv.id}/share/reset`))
      const slugs = results.map((r) => r.json().link.slug as string)
      const working: string[] = []
      for (const slug of new Set(slugs))
        if ((await publicGet(slug)).statusCode === 200) working.push(slug)
      expect(working).toHaveLength(1)
      const stored = (await call('GET', `/cvs/${cv.id}/share`)).json().link.slug
      expect(stored).toBe(working[0])
    })

    it('a reset turns sharing on again and replaces the address every time', async () => {
      const cv = await makeCv()
      const first = await linkOf('/cvs', cv.id, { isActive: false })
      const reset = (await call('POST', `/cvs/${cv.id}/share/reset`)).json().link
      expect(reset.isActive).toBe(true)
      expect(reset.slug).not.toBe(first.slug)
      const again = (await call('POST', `/cvs/${cv.id}/share/reset`)).json().link
      expect(again.slug).not.toBe(reset.slug)
      expect((await publicGet(reset.slug)).statusCode).toBe(404)
      expect((await publicGet(again.slug)).statusCode).toBe(200)
    })

    it.each([
      [{ isActive: 'yes' }],
      [{ isActive: null }],
      [{ isActive: 1 }],
      [{ hidePersonal: 'true' }],
      [{ hidePersonal: null }],
      [{}],
      [{ slug: 'only-a-slug' }],
    ])('refuses the change %j with 400 and creates no link', async (body) => {
      const cv = await makeCv()
      expect((await putShare('/cvs', cv.id, body)).statusCode).toBe(400)
      expect((await call('GET', `/cvs/${cv.id}/share`)).json()).toEqual({ link: null })
    })

    it.each(KINDS)('needs a session to read, change or reset the link of a $name', async (kind) => {
      const created = (await call('POST', kind.path, {})).json()
      for (const [method, suffix] of [
        ['GET', ''],
        ['PUT', ''],
        ['POST', '/reset'],
      ] as const) {
        const res = await call(
          method,
          `${kind.path}/${created.id}/share${suffix}`,
          method === 'GET' ? undefined : { isActive: true },
          null,
        )
        expect(res.statusCode, `${method} ${suffix}`).toBe(401)
      }
    })

    it('does not let a user turn off, reset or read the link of another user', async () => {
      const cv = await makeCv()
      const link = await linkOf('/cvs', cv.id)
      const other = await ctx.signUp('other@example.com')
      for (const [method, url, body] of [
        ['GET', `/cvs/${cv.id}/share`, undefined],
        ['PUT', `/cvs/${cv.id}/share`, { isActive: false }],
        ['POST', `/cvs/${cv.id}/share/reset`, undefined],
      ] as const) {
        expect((await call(method, url, body, other.cookie)).statusCode, url).toBe(404)
      }
      expect((await publicGet(link.slug)).statusCode).toBe(200)
      expect((await call('GET', `/cvs/${cv.id}/share`)).json().link.slug).toBe(link.slug)
    })

    it('does not share a document through another kind of route', async () => {
      const cv = await makeCv()
      expect((await putShare('/cover-letters', cv.id, { isActive: true })).statusCode).toBe(404)
      expect((await putShare('/resignations', cv.id, { isActive: true })).statusCode).toBe(404)
      expect(await ctx.database.db.select().from(shareLinks)).toEqual([])
    })
  })

  describe('documents that disappear', () => {
    it.each(KINDS)('a deleted $name answers 404 on its old address', async (kind) => {
      const created = (await call('POST', kind.path, {})).json()
      const link = await linkOf(kind.path, created.id)
      await call('DELETE', `${kind.path}/${created.id}`)
      expect((await publicGet(link.slug)).statusCode).toBe(404)
      expect((await call('GET', `${kind.path}/${created.id}/share`)).statusCode).toBe(404)
    })

    it('answers 404 once the owner deleted the account, and leaves no link rows', async () => {
      const cv = await makeCv()
      const link = await linkOf('/cvs', cv.id)
      await ctx.database.db.delete(users).where(eq(users.id, ctx.userId))
      expect((await publicGet(link.slug)).statusCode).toBe(404)
      expect(await ctx.database.db.select().from(shareLinks)).toEqual([])
    })
  })

  describe('hiding personal details with odd data', () => {
    const shareHidden = async (document: object) => {
      const cv = await makeCv(document)
      expect(cv.id, 'the CV could be created').toBeTruthy()
      const link = await linkOf('/cvs', cv.id, { isActive: true, hidePersonal: true })
      const res = await publicGet(link.slug)
      expect(res.statusCode).toBe(200)
      return res
    }
    const withHeader = (
      header: object,
      sections?: (doc: ReturnType<typeof createEmptyCv>) => void,
    ) => {
      const doc = createEmptyCv()
      Object.assign(doc.header, header)
      sections?.(doc)
      return doc
    }

    it('keeps empty details empty instead of inventing stand-ins', async () => {
      const res = await shareHidden(createEmptyCv())
      expect(res.json().document.header).toMatchObject({
        name: '',
        email: '',
        phone: '',
        link: '',
        location: '',
      })
      expect(res.json().title).toBe('')
    })

    it('treats details made only of spaces as empty', async () => {
      const res = await shareHidden(withHeader({ name: '   ', email: ' \t ', phone: '\n' }))
      expect(res.json().document.header).toMatchObject({ name: '', email: '', phone: '' })
    })

    it('hides a name with regular-expression characters and quotes, also where the text repeats it', async () => {
      const name = "Zoë (.*+?^${}|[]\\) O'Brien"
      const doc = withHeader(
        { name, email: 'z+tag@example.com', phone: '+1 (555) 000-1111' },
        (d) => {
          const summary = d.sections.find((s) => s.type === 'summary')! as { text: string }
          summary.text = `I am ${name}, reachable at z+tag@example.com or +1 (555) 000-1111. Zoë here.`
        },
      )
      const res = await shareHidden(doc)
      expect(res.payload).not.toMatch(/Zoë|Brien|z\+tag|555/)
      expect(res.json().document.header.name).toBe(HIDDEN_PERSONAL.name)
    })

    // BUG (minor, privacy): the words of a name are split on spaces only, so for "Anna O'Brien" or
    // "Smith-Jones" the swap list holds "O'Brien" / "Smith-Jones" but not "Brien" / "Smith".
    // A CV whose summary says "Brien is my family name" shared with hidePersonal still shows
    // "Brien" to visitors. Expected: every part of the name is hidden.
    it.fails(
      'hides the parts of a name with an apostrophe or hyphen when the text mentions only a part',
      async () => {
        const doc = withHeader({ name: "Anna O'Brien-Smith" }, (d) => {
          ;(d.sections.find((s) => s.type === 'summary')! as { text: string }).text =
            'Brien is my family name.'
        })
        const res = await shareHidden(doc)
        expect(res.payload).not.toContain('Brien')
      },
    )

    it('hides the email when the text mentions it in another letter case', async () => {
      const doc = withHeader({ name: 'Ana Smith', email: 'Ana.Smith@Example.com' }, (d) => {
        ;(d.sections.find((s) => s.type === 'summary')! as { text: string }).text =
          'Mail ANA.SMITH@EXAMPLE.COM today'
      })
      const res = await shareHidden(doc)
      expect(res.payload.toLowerCase()).not.toContain('ana.smith')
    })

    it('does not damage longer words that contain a short name ("Ana" in "Analytics")', async () => {
      const doc = withHeader({ name: 'Ana Lee' }, (d) => {
        ;(d.sections.find((s) => s.type === 'summary')! as { text: string }).text =
          'Ana loves Analytics and Anatomy.'
      })
      const text = (await shareHidden(doc))
        .json()
        .document.sections.find((s: { type: string }) => s.type === 'summary').text
      expect(text).toContain('Analytics')
      expect(text).toContain('Anatomy')
      expect(text).not.toMatch(/\bAna\b/)
    })

    it.each([['X'], ['Li'], ['王'], ['🙂'], ['A B'], ['x'.repeat(150)]])(
      'hides the one-word or short name %j without breaking',
      async (name) => {
        const res = await shareHidden(withHeader({ name }))
        expect(res.json().document.header.name).toBe(HIDDEN_PERSONAL.name)
      },
    )

    it('removes the photo even when it is switched on, and never returns its address', async () => {
      const res = await shareHidden(
        withHeader({
          photoUrl: '/api/uploads/11111111-1111-4111-8111-111111111111',
          showPhoto: true,
        }),
      )
      expect(res.json().document.header).toMatchObject({ photoUrl: null, showPhoto: false })
      expect(res.payload).not.toContain('11111111-1111')
    })

    it('hides personal details of a big document without being slow', async () => {
      const doc = withHeader({ name: 'Maria Petrova' }, (d) => {
        const summary = d.sections.find((s) => s.type === 'summary')! as { text: string }
        d.sections = Array.from({ length: 200 }, (_, i) => ({
          ...summary,
          id: `s${i}`,
          text: 'Maria Petrova wrote this. '.repeat(190),
        })) as typeof d.sections
      })
      const started = Date.now()
      const res = await shareHidden(doc)
      expect(res.payload).not.toMatch(/Maria|Petrova/)
      expect(Date.now() - started).toBeLessThan(5000)
    })

    it('does not touch the structure of the document (ids, types and design stay)', async () => {
      const doc = withHeader({ name: 'Maria Petrova' })
      const res = await shareHidden(doc)
      expect(
        res.json().document.sections.map((s: { id: string; type: string }) => [s.id, s.type]),
      ).toEqual(doc.sections.map((s) => [s.id, s.type]))
      expect(res.json().document.design).toEqual(doc.design)
    })

    it('hides a cover letter with empty and odd recipient data', async () => {
      const letter = createCoverLetter()
      letter.header.name = 'Maria Petrova'
      const created = (
        await call('POST', '/cover-letters', {
          document: {
            ...letter,
            recipient: { name: '', title: '<b>Dr</b>', company: '  ', address: "'; --" },
          },
        })
      ).json()
      const link = await linkOf('/cover-letters', created.id, {
        isActive: true,
        hidePersonal: true,
      })
      const res = await publicGet(link.slug)
      expect(res.statusCode).toBe(200)
      expect(res.payload).not.toMatch(/Maria|Petrova/)
      expect(res.json().document.recipient).toMatchObject({
        name: '',
        company: '',
        address: HIDDEN_PERSONAL.address,
      })
    })

    it('hides a resignation letter whose employer fields are empty', async () => {
      const letter = createResignationLetter()
      letter.sender.name = 'Maria Petrova'
      letter.signature = 'Maria Petrova'
      const created = (await call('POST', '/resignations', { document: letter })).json()
      const link = await linkOf('/resignations', created.id, { isActive: true, hidePersonal: true })
      const res = await publicGet(link.slug)
      expect(res.json().document.employer).toMatchObject({
        company: '',
        contact: '',
        address: '',
        city: '',
      })
      expect(res.payload).not.toMatch(/Maria|Petrova/)
    })

    it('shows the real data again after hidePersonal is switched off, with the same address', async () => {
      const cv = await makeCv(withHeader({ name: 'Maria Petrova' }))
      const link = await linkOf('/cvs', cv.id, { isActive: true, hidePersonal: true })
      expect((await publicGet(link.slug)).payload).not.toContain('Maria')
      await putShare('/cvs', cv.id, { hidePersonal: false })
      expect((await publicGet(link.slug)).json().document.header.name).toBe('Maria Petrova')
    })
  })

  it('counts links per kind: one document, one row, whatever the number of requests', async () => {
    const cv = await makeCv()
    await inParallel(8, (i) =>
      i % 2
        ? call('POST', `/cvs/${cv.id}/share/reset`)
        : putShare('/cvs', cv.id, { isActive: i % 4 === 0 }),
    )
    const rows = await ctx.database.db.select().from(shareLinks)
    expect(rows).toHaveLength(1)
    expect(countBy(rows, (r) => r.cvId ?? '')).toEqual({ [cv.id]: 1 })
  })
})
