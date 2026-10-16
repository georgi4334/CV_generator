import { createExampleCv, cvFields, PLAN_LIMITS, type AiField } from '@cv/shared'
import { sql } from 'drizzle-orm'
import { afterEach, describe, expect, it } from 'vitest'
import { createMockProvider } from '../src/ai/mock'
import { AiError, type AiProvider, type AiRequest } from '../src/ai/provider'
import { buildApp } from '../src/app'
import { createLocalStorage } from '../src/lib/storage'
import { dbAvailable, useTestApp } from './context'

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

  const appWith = async (provider: AiProvider | null, maxPerMinute = 100) => {
    const app = await buildApp({
      corsOrigin: 'http://localhost:5173',
      database: ctx.database,
      storage: createLocalStorage('/tmp/unused'),
      ai: { provider, maxPerMinute },
    })
    apps.push(app)
    return (method: 'GET' | 'POST', url: string, payload?: object) =>
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
