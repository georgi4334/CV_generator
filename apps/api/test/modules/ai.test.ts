import { createExampleCv, cvFields, PLAN_LIMITS, type AiField } from '@cv/shared'
import { sql } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { createMockProvider } from '../../src/modules/ai/mock'
import { AiError, type AiProvider, type AiRequest } from '../../src/modules/ai/provider'
import { buildApp } from '../../src/app'
import { createLocalStorage } from '../../src/infra/storage/index'
import { dbAvailable, useTestApp } from '../support/context'

/** A provider that answers with whatever the test queues, and records the requests. */
function scripted() {
  const answers: (string | Error)[] = []
  const requests: AiRequest[] = []
  const provider: AiProvider = {
    label: 'Test AI',
    async complete(request) {
      requests.push(request)
      const next = answers.shift()
      if (next === undefined) throw new Error('no answer queued')
      if (next instanceof Error) throw next
      return next
    },
  }
  return {
    provider,
    requests,
    answer: (value: unknown) =>
      answers.push(typeof value === 'string' ? value : JSON.stringify(value)),
    fail: (e: Error) => answers.push(e),
  }
}

const POSTING =
  'We are hiring a frontend engineer with strong React and TypeScript skills, experience with Kubernetes and a focus on accessibility.'

describe.skipIf(!dbAvailable)('AI API', () => {
  const ctx = useTestApp()
  const apps: Awaited<ReturnType<typeof buildApp>>[] = []
  afterEach(async () => {
    await Promise.all(apps.splice(0).map((a) => a.close()))
  })

  const appWith = async (
    provider: AiProvider | null,
    maxPerMinute = 100,
    userKeys: NonNullable<Parameters<typeof buildApp>[0]['ai']>['userKeys'] = null,
  ) => {
    const app = await buildApp({
      corsOrigin: 'http://localhost:5173',
      database: ctx.database,
      storage: createLocalStorage('/tmp/unused'),
      ai: { provider, maxPerMinute, userKeys },
    })
    apps.push(app)
    return (method: 'GET' | 'POST' | 'PUT' | 'DELETE', url: string, payload?: object) =>
      app.inject({ method, url: `/api/ai${url}`, payload, headers: { cookie: ctx.cookie } })
  }

  const fields: AiField[] = [
    { path: 'header.headline', label: 'Headline', text: 'Frontend developper' },
    { path: 'sections.s1.text', label: 'Summary', text: 'I build fast web apps with React.' },
    {
      path: 'sections.s2.items.i1.bullets.0',
      label: 'Experience › Dev at Acme › bullet 1',
      text: 'Built teh design system',
    },
  ]

  it('reports when AI is not set up', async () => {
    const call = await appWith(null)
    expect((await call('GET', '/status')).json()).toEqual({
      enabled: false,
      provider: '',
      usage: { used: 0, limit: PLAN_LIMITS.free.aiRequestsPerDay },
      keySource: 'none',
      keyHint: '',
      model: 'gemini-flash-latest',
    })
    const res = await call('POST', '/fix-mistakes', { language: 'en-US', fields })
    expect(res.statusCode).toBe(503)
    expect(res.json().error.code).toBe('ai_unavailable')
  })

  it('needs a signed-in user', async () => {
    const app = await buildApp({
      corsOrigin: 'http://localhost:5173',
      database: ctx.database,
      storage: createLocalStorage('/tmp/unused'),
      ai: { provider: scripted().provider },
    })
    apps.push(app)
    expect((await app.inject({ method: 'GET', url: '/api/ai/status' })).statusCode).toBe(401)
  })

  describe('fix mistakes', () => {
    it('returns suggestions that apply to the text, mapped to editor paths', async () => {
      const ai = scripted()
      const call = await appWith(ai.provider)
      ai.answer({
        suggestions: [
          { id: 'f1', original: 'developper', replacement: 'developer', reason: 'Spelling' },
          { id: 'f3', original: 'teh', replacement: 'the', reason: 'Spelling' },
          { id: 'f3', original: 'teh', replacement: 'the', reason: 'Duplicate' },
          { id: 'f2', original: 'not in the text', replacement: 'x', reason: 'Made up' },
          { id: 'f9', original: 'React', replacement: 'Vue', reason: 'Unknown field' },
          { id: 'f2', original: 'React', replacement: 'React', reason: 'No change' },
        ],
      })
      const res = await call('POST', '/fix-mistakes', { language: 'en-US', fields })
      expect(res.statusCode).toBe(200)
      expect(res.json()).toEqual({
        suggestions: [
          {
            path: 'header.headline',
            label: 'Headline',
            original: 'developper',
            replacement: 'developer',
            reason: 'Spelling',
          },
          {
            path: 'sections.s2.items.i1.bullets.0',
            label: 'Experience › Dev at Acme › bullet 1',
            original: 'teh',
            replacement: 'the',
            reason: 'Spelling',
          },
        ],
        usage: { used: 1, limit: 30 },
      })
      // The model sees short ids, the CV language and the text, not the editor paths.
      const request = ai.requests[0]!
      expect(request.prompt).toContain('"id":"f1"')
      expect(request.prompt).not.toContain('sections.s1')
      expect(request.system).toContain('American spelling')
    })

    it('retries once when the answer is not JSON, then gives up and refunds the request', async () => {
      const ai = scripted()
      const call = await appWith(ai.provider)
      ai.answer('Sure! Here are the fixes: …')
      ai.answer('```json\n{"suggestions": []}\n```')
      const ok = await call('POST', '/fix-mistakes', { language: 'en-GB', fields })
      expect(ok.json()).toEqual({ suggestions: [], usage: { used: 1, limit: 30 } })
      expect(ai.requests[1]!.prompt).toContain('previous answer was not valid')

      ai.answer('nope')
      ai.answer('still nope')
      const bad = await call('POST', '/fix-mistakes', { language: 'en-GB', fields })
      expect(bad.statusCode).toBe(502)
      expect(bad.json().error.code).toBe('ai_failed')
      expect((await call('GET', '/status')).json().usage.used).toBe(1)
    })

    it('does not spend a request on an empty document', async () => {
      const ai = scripted()
      const call = await appWith(ai.provider)
      const res = await call('POST', '/fix-mistakes', { language: 'en-US', fields: [] })
      expect(res.json().suggestions).toEqual([])
      expect(ai.requests).toHaveLength(0)
    })

    it('maps provider errors to clear codes', async () => {
      const ai = scripted()
      const call = await appWith(ai.provider)
      ai.fail(new AiError('busy', 'quota'))
      expect(
        (await call('POST', '/fix-mistakes', { language: 'en-US', fields })).json().error.code,
      ).toBe('ai_busy')
      ai.fail(new AiError('blocked', 'safety'))
      expect((await call('POST', '/fix-mistakes', { language: 'en-US', fields })).statusCode).toBe(
        422,
      )
      expect((await call('GET', '/status')).json().usage.used).toBe(0)
    })
  })

  describe('limits', () => {
    it('stops at the daily limit of the plan', async () => {
      const ai = scripted()
      const call = await appWith(ai.provider)
      await ctx.database.db.execute(
        sql`insert into ai_usage (user_id, day, count) values (${ctx.userId}, ${new Date().toISOString().slice(0, 10)}, 29)`,
      )
      ai.answer({ suggestions: [] })
      expect(
        (await call('POST', '/fix-mistakes', { language: 'en-US', fields })).json().usage,
      ).toEqual({ used: 30, limit: 30 })
      const over = await call('POST', '/fix-mistakes', { language: 'en-US', fields })
      expect(over.statusCode).toBe(429)
      expect(over.json().error.code).toBe('ai_limit')
      expect(ai.requests).toHaveLength(1)
    })

    it('limits requests per minute for the whole server', async () => {
      const ai = scripted()
      const call = await appWith(ai.provider, 1)
      ai.answer({ suggestions: [] })
      expect((await call('POST', '/fix-mistakes', { language: 'en-US', fields })).statusCode).toBe(
        200,
      )
      const busy = await call('POST', '/fix-mistakes', { language: 'en-US', fields })
      expect(busy.statusCode).toBe(429)
      expect(busy.json().error.code).toBe('ai_busy')
    })

    it('refuses oversized input before calling the AI', async () => {
      const ai = scripted()
      const call = await appWith(ai.provider)
      const huge = Array.from({ length: 10 }, (_, i) => ({
        path: `p${i}`,
        label: '',
        text: 'x'.repeat(4000),
      }))
      expect(
        (await call('POST', '/fix-mistakes', { language: 'en-US', fields: huge })).statusCode,
      ).toBe(400)
      expect(ai.requests).toHaveLength(0)
    })
  })

  describe('check & tailor', () => {
    it('returns keywords, advice and whole-field rewrites', async () => {
      const ai = scripted()
      const call = await appWith(ai.provider)
      ai.answer({
        keywords: [
          { term: 'React', importance: 'high' },
          { term: 'react', importance: 'medium' },
          { term: 'Kubernetes', importance: 'high' },
          { term: 'accessibility', importance: 'whatever' },
        ],
        advice: ['Mention accessibility work.'],
        rewrites: [
          {
            id: 'f2',
            replacement: 'I build fast, accessible web apps with React and TypeScript.',
            reason: 'Adds accessibility',
          },
          { id: 'f2', replacement: 'Second rewrite of the same field', reason: 'dup' },
          { id: 'f1', replacement: 'Frontend developper', reason: 'unchanged' },
        ],
      })
      const res = await call('POST', '/tailor', {
        language: 'en-US',
        fields,
        jobDescription: POSTING,
      })
      expect(res.statusCode).toBe(200)
      const body = res.json()
      expect(body.keywords).toEqual([
        { term: 'React', importance: 'high' },
        { term: 'Kubernetes', importance: 'high' },
        { term: 'accessibility', importance: 'medium' },
      ])
      expect(body.rewrites).toEqual([
        {
          path: 'sections.s1.text',
          label: 'Summary',
          original: 'I build fast web apps with React.',
          replacement: 'I build fast, accessible web apps with React and TypeScript.',
          reason: 'Adds accessibility',
        },
      ])
      expect(ai.requests[0]!.prompt).toContain(POSTING)
      expect(ai.requests[0]!.system).toContain('never add skills')
    })

    it('needs a real posting', async () => {
      const call = await appWith(scripted().provider)
      expect(
        (await call('POST', '/tailor', { language: 'en-US', fields, jobDescription: 'short' }))
          .statusCode,
      ).toBe(400)
    })
  })

  describe('assistant', () => {
    it('writes a summary, bullets and letter paragraphs', async () => {
      const ai = scripted()
      const call = await appWith(ai.provider)
      ai.answer({ texts: ['A focused frontend developer.', 'extra'] })
      const summary = await call('POST', '/assist', {
        task: 'summary',
        language: 'en-US',
        fields,
        targetPath: 'sections.s1.text',
      })
      expect(summary.json().texts).toEqual(['A focused frontend developer.'])
      expect(ai.requests[0]!.prompt).toContain('Improve the CV')

      ai.answer({ texts: ['- Built the design system', '• Led two releases', ''] })
      const bullets = await call('POST', '/assist', {
        task: 'bullets',
        language: 'en-US',
        fields,
        targetPath: 'sections.s2.items.i1',
        instruction: 'Emphasise leadership',
      })
      expect(bullets.json().texts).toEqual(['Built the design system', 'Led two releases'])
      expect(ai.requests[1]!.prompt).toContain('Emphasise leadership')

      ai.answer({ texts: ['Opening.', 'Middle.', 'Closing.'] })
      const letter = await call('POST', '/assist', {
        task: 'letter',
        language: 'bg',
        fields,
        company: 'Acme',
        position: 'Engineer',
      })
      expect(letter.json().texts).toHaveLength(3)
      expect(ai.requests[2]!.system).toContain('Bulgarian')
      expect(letter.json().usage.used).toBe(3)
    })

    it('needs a target for summary and bullets', async () => {
      const call = await appWith(scripted().provider)
      expect(
        (await call('POST', '/assist', { task: 'summary', language: 'en-US', fields })).statusCode,
      ).toBe(400)
      const res = await call('POST', '/assist', {
        task: 'bullets',
        language: 'en-US',
        fields,
        targetPath: 'sections.x.items.y',
      })
      expect(res.json().error.code).toBe('invalid_target')
    })
  })

  describe("a person's own Gemini key", () => {
    const KEY = 'AIzaSyA1b2C3d4E5f6G7h8I9j0K1l2M3n4O5p6Q'
    const keyed = (provider: AiProvider | null = null) => {
      const used: { apiKey: string; model: string }[] = []
      const checked: string[] = []
      const own = scripted()
      return {
        used,
        checked,
        own,
        userKeys: {
          createProvider: (apiKey: string, model: string) => {
            used.push({ apiKey, model })
            return own.provider
          },
          validate: async (apiKey: string) => {
            checked.push(apiKey)
            if (apiKey.includes('BAD')) throw new AiError('key', 'no')
          },
        },
        provider,
      }
    }

    it('is checked, saved without ever being returned, and shown as a hint', async () => {
      const k = keyed()
      const call = await appWith(null, 100, k.userKeys as never)
      const saved = await call('PUT', '/key', { apiKey: KEY, model: 'gemini-flash-lite-latest' })
      expect(saved.statusCode).toBe(200)
      expect(saved.json()).toMatchObject({
        enabled: true,
        keySource: 'own',
        keyHint: `…${KEY.slice(-4)}`,
        model: 'gemini-flash-lite-latest',
        usage: { used: 0, limit: 0 },
      })
      expect(JSON.stringify(saved.json())).not.toContain(KEY)
      expect(k.checked).toEqual([KEY])

      // At rest it is encrypted.
      const rows = await ctx.database.db.execute(sql`select ai_key_encrypted from users`)
      const stored = String(rows[0]!.ai_key_encrypted)
      expect(stored).toMatch(/^v1\./)
      expect(stored).not.toContain(KEY)
    })

    it('answers requests instead of the server key, and is not counted against the daily limit', async () => {
      const server = scripted()
      const k = keyed(server.provider)
      const call = await appWith(server.provider, 100, k.userKeys as never)
      await call('PUT', '/key', { apiKey: KEY })
      k.own.answer({ suggestions: [] })
      const res = await call('POST', '/fix-mistakes', { language: 'en-US', fields })
      expect(res.statusCode).toBe(200)
      expect(res.json().usage).toEqual({ used: 0, limit: 0 })
      expect(k.used).toEqual([{ apiKey: KEY, model: 'gemini-flash-latest' }])
      expect(server.requests).toHaveLength(0)
    })

    it('turns AI on even when the server has no key, and removing it turns it off again', async () => {
      const k = keyed()
      const call = await appWith(null, 100, k.userKeys as never)
      await call('PUT', '/key', { apiKey: KEY })
      expect((await call('GET', '/status')).json().enabled).toBe(true)
      const removed = await call('DELETE', '/key')
      expect(removed.json()).toMatchObject({ enabled: false, keySource: 'none', keyHint: '' })
    })

    it('is refused when Google does not accept it, and nothing is saved', async () => {
      const k = keyed()
      const call = await appWith(null, 100, k.userKeys as never)
      const res = await call('PUT', '/key', { apiKey: 'BAD-key-BAD-key-BAD-key-1234' })
      expect(res.statusCode).toBe(400)
      expect(res.json().error.code).toBe('invalid_ai_key')
      expect((await call('GET', '/status')).json().keySource).toBe('none')
    })

    it('must look like a key and a known model', async () => {
      const call = await appWith(null, 100, keyed().userKeys as never)
      expect((await call('PUT', '/key', { apiKey: 'short' })).statusCode).toBe(400)
      expect((await call('PUT', '/key', { apiKey: `${KEY} !` })).statusCode).toBe(400)
      expect((await call('PUT', '/key', { apiKey: KEY, model: 'gpt-5' })).statusCode).toBe(400)
    })

    it('says so when Google later rejects the saved key', async () => {
      const k = keyed()
      const call = await appWith(null, 100, k.userKeys as never)
      await call('PUT', '/key', { apiKey: KEY })
      k.own.fail(new AiError('key', 'revoked'))
      const res = await call('POST', '/fix-mistakes', { language: 'en-US', fields })
      expect(res.statusCode).toBe(422)
      expect(res.json().error.code).toBe('ai_key_rejected')
    })

    it('belongs to one person only', async () => {
      const k = keyed()
      const call = await appWith(null, 100, k.userKeys as never)
      await call('PUT', '/key', { apiKey: KEY })
      const other = await ctx.signUp('other@example.com')
      const app = apps.at(-1)!
      const status = await app.inject({
        method: 'GET',
        url: '/api/ai/status',
        headers: { cookie: other.cookie },
      })
      expect(status.json().keySource).toBe('none')
    })
  })

  it('the mock provider works end to end on an example CV', async () => {
    const call = await appWith(createMockProvider())
    const cv = createExampleCv('software-developer')
    const all = cvFields(cv)
    const withTypo = [...all, { path: 'x', label: 'X', text: 'Led teh team' }]
    const fix = (
      await call('POST', '/fix-mistakes', { language: 'en-US', fields: withTypo })
    ).json()
    expect(fix.suggestions).toContainEqual(
      expect.objectContaining({ path: 'x', original: 'teh', replacement: 'the' }),
    )
    const tailor = (
      await call('POST', '/tailor', { language: 'en-US', fields: all, jobDescription: POSTING })
    ).json()
    expect(tailor.keywords.map((k: { term: string }) => k.term)).toContain('Kubernetes')
    const summary = all.find((f) => f.label === 'Summary')!
    const assist = await call('POST', '/assist', {
      task: 'summary',
      language: 'en-US',
      fields: all,
      targetPath: summary.path,
    })
    expect(assist.statusCode).toBe(200)
  })
})
