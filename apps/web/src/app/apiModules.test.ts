// The real API modules (not the fakes), talking to a fake transport.
import { createEmptyCv, createExampleCv } from '@cv/shared'
import { AxiosError, type AxiosAdapter, type InternalAxiosRequestConfig } from 'axios'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { aiApi } from '@/features/ai/api'
import { authApi } from '@/features/auth/api'
import { coverLetterApi } from '@/features/cover-letters/api'
import { cvApi } from '@/features/cv-editor/api'
import { jobsApi } from '@/features/jobs/api'
import { resignationApi } from '@/features/resignation/api'
import { setLanguage } from '@/i18n'
import { TEST_USER } from '@/test/fakeAuthApi'
import { api, ApiRequestError } from '@/shared/api/client'
import { errorMessage } from '@/shared/api/errorMessage'

type Reply = { status?: number; data?: unknown }
const sent: InternalAxiosRequestConfig[] = []

function serve(reply: Reply | ((config: InternalAxiosRequestConfig) => Reply)) {
  const adapter: AxiosAdapter = async (config) => {
    sent.push(config)
    const { status = 200, data = {} } = typeof reply === 'function' ? reply(config) : reply
    const response = { status, data, statusText: '', headers: {}, config }
    if (status < 400) return response
    throw new AxiosError('failed', AxiosError.ERR_BAD_RESPONSE, config, null, response)
  }
  api.defaults.adapter = adapter
}

const original = api.defaults.adapter
beforeEach(() => {
  sent.length = 0
})
afterEach(async () => {
  api.defaults.adapter = original
  await setLanguage('en', { remember: false })
})

const last = () => sent.at(-1)!
const THE_ID = '00000000-0000-4000-8000-000000000001'

describe('what the web app sends', () => {
  it('encodes a share slug so it cannot change the path', async () => {
    serve({ status: 404, data: { error: { code: 'not_found', message: 'x' } } })
    await cvApi.getShared('../../auth/me?x=1#y').catch(() => {})
    expect(last().url).toBe('/shared/..%2F..%2Fauth%2Fme%3Fx%3D1%23y')
  })

  it('updates with PATCH and the revision it is based on', async () => {
    serve({ status: 500, data: 'oops' })
    const document = createEmptyCv()
    await cvApi.update(THE_ID, { revision: 7, document }).catch(() => {})
    expect(last()).toMatchObject({ method: 'patch', url: `/cvs/${THE_ID}` })
    expect(JSON.parse(last().data as string)).toMatchObject({ revision: 7 })
  })

  it('uploads an image as multipart form data under the field "file"', async () => {
    serve({ status: 400, data: { error: { code: 'no_file', message: 'x' } } })
    await cvApi.uploadImage(new Blob(['x'], { type: 'image/png' }), 'me.png').catch(() => {})
    const form = last().data as FormData
    expect(form).toBeInstanceOf(FormData)
    expect((form.get('file') as File).name).toBe('me.png')
  })

  it('gives the AI calls more time than the default 15 seconds', async () => {
    serve({ status: 500, data: '' })
    await aiApi.saveKey({ apiKey: 'k'.repeat(30), model: 'gemini-flash-latest' }).catch(() => {})
    expect(last().timeout).toBe(30_000)
    await aiApi.fixMistakes({ fields: [], language: 'en-US' } as never).catch(() => {})
    expect(last().timeout).toBe(90_000)
    await jobsApi.list().catch(() => {})
    expect(last().timeout).toBe(15_000)
  })

  it('registers with the interface language of the moment', async () => {
    serve({ status: 500, data: '' })
    await setLanguage('de', { remember: false })
    await authApi.register({ email: 'a@b.cd', password: 'x'.repeat(12), name: 'A' }).catch(() => {})
    expect(JSON.parse(last().data as string)).toMatchObject({ locale: 'de' })
  })

  it('sends cookies with every request', () => {
    expect(api.defaults.withCredentials).toBe(true)
  })
})

describe('what comes back', () => {
  it('me() is null for 401 but an error for other failures', async () => {
    serve({ status: 401, data: { error: { code: 'unauthorized', message: 'no' } } })
    await expect(authApi.me()).resolves.toBeNull()
    serve({ status: 500, data: { error: { code: 'internal_error', message: 'boom' } } })
    await expect(authApi.me()).rejects.toMatchObject({ status: 500 })
  })

  it('me() reads the user', async () => {
    serve({ data: { user: TEST_USER } })
    await expect(authApi.me()).resolves.toEqual(TEST_USER)
  })

  it.each([
    ['an empty object', {}],
    ['null', null],
    ['an array', []],
    ['a user without email', { user: { ...TEST_USER, email: undefined } }],
    ['a user with an unknown plan', { user: { ...TEST_USER, plan: 'galaxy' } }],
  ])('me() refuses %s from the server instead of trusting it', async (_, data) => {
    serve({ data })
    await expect(authApi.me()).rejects.toBeDefined()
  })

  it.each([
    ['list', () => cvApi.list()],
    ['get', () => cvApi.get(THE_ID)],
    ['create', () => cvApi.create()],
    ['getShare', () => cvApi.getShare(THE_ID)],
    ['letters list', () => coverLetterApi.list()],
    ['letter get', () => coverLetterApi.get(THE_ID)],
    ['resignations list', () => resignationApi.list()],
    ['resignation get', () => resignationApi.get(THE_ID)],
    ['jobs list', () => jobsApi.list()],
    ['ai status', () => aiApi.status()],
  ])('%s: an HTML page with status 200 (a broken proxy) is an error, not data', async (_, call) => {
    serve({ data: '<!doctype html><html><body>Welcome to the SPA</body></html>' })
    await expect(call()).rejects.toBeDefined()
  })

  it('a list of documents with one broken entry is refused as a whole', async () => {
    serve({ data: [{ id: 'x' }] })
    await expect(cvApi.list()).rejects.toBeDefined()
  })

  it('a CV whose document is from the future (unknown template) is refused, not half-rendered', async () => {
    const document = createExampleCv('designer') as unknown as { design: { templateId: string } }
    document.design.templateId = 'hologram'
    serve({
      data: {
        id: THE_ID,
        type: 'cv',
        title: 'x',
        professionId: null,
        jobId: null,
        revision: 1,
        document,
        createdAt: '2026-10-01T10:00:00.000Z',
        updatedAt: '2026-10-01T10:00:00.000Z',
      },
    })
    await expect(cvApi.get(THE_ID)).rejects.toBeDefined()
  })

  it('an empty list is fine', async () => {
    serve({ data: [] })
    await expect(cvApi.list()).resolves.toEqual([])
    await expect(jobsApi.list()).resolves.toEqual([])
  })

  it('delete calls do not need a body', async () => {
    serve({ status: 204, data: '' })
    await expect(cvApi.remove(THE_ID)).resolves.toBeUndefined()
    await expect(jobsApi.remove(THE_ID)).resolves.toBeUndefined()
    await expect(authApi.logout()).resolves.toBeUndefined()
  })

  it('keeps the API error (code and details) for failed calls', async () => {
    serve({
      status: 409,
      data: { error: { code: 'conflict', message: 'changed', details: { revision: 9 } } },
    })
    const error = await cvApi.update(THE_ID, { revision: 1, title: 'x' }).catch((e: unknown) => e)
    expect(error).toBeInstanceOf(ApiRequestError)
    expect(error).toMatchObject({ status: 409, code: 'conflict', details: { revision: 9 } })
  })

  // BUG: when the server answers 200 with a body that does not match the schema (a deploy with an
  // older/newer API, or an HTML page from a proxy), the Zod error escapes `api.ts` as a plain
  // ZodError. `toApiRequestError` turns it into "unknown_error" whose message is the raw Zod
  // JSON dump, and errorMessage() shows that dump to the user as the error text (page-level
  // "Could not load" screens, toasts and form errors alike).
  // Repro: serve 200 with "<html>…" for GET /cvs, then errorMessage(<error of cvApi.list()>)
  // -> '[\n  {\n    "expected": "array", …'. Expected: a short readable text such as the generic
  // "Something went wrong" message.
  it.fails('shows a readable message (not a JSON dump) for a malformed 200 response', async () => {
    serve({ data: '<html>proxy page</html>' })
    const error = await cvApi.list().catch((e: unknown) => e)
    const message = errorMessage(error)
    expect(message).not.toMatch(/^\s*[[{]/)
    expect(message).not.toContain('"code"')
  })
})

describe('the errors users read', () => {
  // BUG (translation gap): `http_error` (the server or a proxy answered with a non-API body, e.g.
  // a 502/504 page) and `unknown_error` have no entry in locales/*/errors.ts, so in the German and
  // Bulgarian interface the English text "The server answered with status 502" is shown.
  // Repro: setLanguage('de'); errorMessage(new ApiRequestError(502, 'http_error', 'The server answered with status 502')).
  it.fails('translates the generic "server answered with status" error', async () => {
    await setLanguage('de', { remember: false })
    const message = errorMessage(
      new ApiRequestError(502, 'http_error', 'The server answered with status 502'),
    )
    expect(message).not.toMatch(/The server answered/)
  })

  it('the rate limit code of the API has a translation in every language', async () => {
    for (const language of ['en', 'bg', 'de'] as const) {
      await setLanguage(language, { remember: false })
      const message = errorMessage(new ApiRequestError(429, 'too_many_requests', 'raw english'))
      expect(message, language).not.toBe('raw english')
    }
  })

  it('every error code in the English catalog is also translated to Bulgarian and German', async () => {
    const codes = Object.keys((await import('@/i18n/locales/en')).en.errors)
    for (const language of ['bg', 'de'] as const) {
      await setLanguage(language, { remember: false })
      for (const code of codes) {
        const english = (await import('@/i18n/locales/en')).en.errors[code as 'conflict']
        expect(errorMessage(new ApiRequestError(400, code, 'raw')), `${language} ${code}`).not.toBe(
          english,
        )
      }
    }
  })
})

afterEach(() => vi.restoreAllMocks())
