import {
  AssistInputSchema,
  FixMistakesInputSchema,
  PLAN_LIMITS,
  TailorInputSchema,
  AiKeyInputSchema,
  DEFAULT_AI_MODEL,
  type AiField,
  type AiSuggestion,
  type AiModel,
  type AiStatus,
  type AiUsage,
  type AssistResult,
  type FixMistakesResult,
  type Keyword,
  type TailorResult,
} from '@cv/shared'
import { and, eq, sql } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { AiError, generateJson, type AiProvider } from './provider'
import {
  assistRequest,
  AssistOutputSchema,
  fixMistakesRequest,
  FixOutputSchema,
  numberFields,
  tailorRequest,
  TailorOutputSchema,
} from './prompts'
import type { Database } from '../../db/client'
import { aiUsage, users } from '../../db/schema/index'
import { HttpError } from '../../infra/errors'
import { createRateLimiter } from '../../infra/rateLimit'
import type { SecretBox } from '../../infra/secrets'

export interface AiRouteOptions {
  database: Database
  /** null: AI is not configured on this server. */
  provider: AiProvider | null
  /** Requests per minute for the whole API, to stay inside the provider's free quota. */
  maxPerMinute: number
  /** Encrypts the API keys people save. */
  secrets: SecretBox
  /**
   * How to use a person's own Gemini key. null (the mock AI): keys are saved without a check and
   * the server's provider answers everyone.
   */
  userKeys: {
    createProvider: (apiKey: string, model: AiModel) => AiProvider
    validate: (apiKey: string) => Promise<void>
  } | null
}

interface OwnKey {
  apiKey: string
  model: AiModel
  hint: string
}

const today = () => new Date().toISOString().slice(0, 10)
const clip = (text: string, max: number) => text.trim().slice(0, max)

/** Fix Mistakes, Check & Tailor and the AI Assistant. All need a signed-in user. */
export async function aiRoutes(app: FastifyInstance, opts: AiRouteOptions) {
  const { db } = opts.database
  const { provider } = opts
  const perMinute = createRateLimiter({ max: opts.maxPerMinute, windowMs: 60_000 })
  // Saving a key calls Google to check it: keep that from being used as a free proxy.
  const perKey = createRateLimiter({ max: 10, windowMs: 10 * 60_000 })

  const limitFor = (request: FastifyRequest) => PLAN_LIMITS[request.user.plan].aiRequestsPerDay

  async function usage(request: FastifyRequest): Promise<AiUsage> {
    const [row] = await db
      .select({ count: aiUsage.count })
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, request.user.id), eq(aiUsage.day, today())))
    return { used: row?.count ?? 0, limit: limitFor(request) }
  }

  /** The person's saved key, when there is one this server can read and use. */
  async function ownKey(request: FastifyRequest): Promise<OwnKey | null> {
    const [row] = await db
      .select({ sealed: users.aiKeyEncrypted, hint: users.aiKeyHint, model: users.aiModel })
      .from(users)
      .where(eq(users.id, request.user.id))
    if (!row?.sealed) return null
    const apiKey = opts.secrets.decrypt(row.sealed)
    return apiKey ? { apiKey, model: row.model, hint: row.hint ?? '' } : null
  }

  async function status(request: FastifyRequest): Promise<AiStatus> {
    const own = await ownKey(request)
    const model = own?.model ?? DEFAULT_AI_MODEL
    if (own) {
      // Google's own limits apply to a person's key, so the app counts nothing.
      return {
        enabled: true,
        provider: 'Google Gemini',
        usage: { used: 0, limit: 0 },
        keySource: 'own',
        keyHint: own.hint,
        model,
      }
    }
    return {
      enabled: provider !== null,
      provider: provider?.label ?? '',
      usage: await usage(request),
      keySource: provider ? 'server' : 'none',
      keyHint: '',
      model,
    }
  }

  const failure = (request: FastifyRequest, error: AiError) => {
    request.log.warn({ err: error }, 'AI request failed')
    if (error.kind === 'key') {
      return new HttpError(
        422,
        'ai_key_rejected',
        'Google did not accept your Gemini API key. Check it in your account.',
      )
    }
    if (error.kind === 'busy') {
      return new HttpError(429, 'ai_busy', 'The AI is busy right now. Try again in a minute.')
    }
    if (error.kind === 'blocked') {
      return new HttpError(422, 'ai_blocked', 'The AI refused to answer this request.')
    }
    return new HttpError(502, 'ai_failed', 'The AI could not answer. Please try again.')
  }

  /** Counts one request against today's limit; refunded if the AI fails. */
  async function run<T>(request: FastifyRequest, call: (ai: AiProvider) => Promise<T>) {
    const own = opts.userKeys ? await ownKey(request) : null
    if (own && opts.userKeys) {
      try {
        const result = await call(opts.userKeys.createProvider(own.apiKey, own.model))
        return { result, usage: { used: 0, limit: 0 } }
      } catch (error) {
        if (error instanceof AiError) throw failure(request, error)
        throw error
      }
    }
    if (!provider) {
      throw new HttpError(
        503,
        'ai_unavailable',
        'AI features are not set up on this server. Add your own Gemini API key in your account.',
      )
    }
    if (!perMinute.hit('all')) {
      throw new HttpError(429, 'ai_busy', 'The AI is busy right now. Try again in a minute.')
    }
    const limit = limitFor(request)
    const day = today()
    const [counted] = await db
      .insert(aiUsage)
      .values({ userId: request.user.id, day, count: 1 })
      .onConflictDoUpdate({
        target: [aiUsage.userId, aiUsage.day],
        set: { count: sql`${aiUsage.count} + 1` },
        setWhere: sql`${aiUsage.count} < ${limit}`,
      })
      .returning({ count: aiUsage.count })
    if (!counted) {
      throw new HttpError(
        429,
        'ai_limit',
        `You have used all ${limit} AI requests for today. The limit resets at midnight (UTC).`,
      )
    }
    try {
      const result = await call(provider)
      return { result, usage: { used: counted.count, limit } }
    } catch (error) {
      await db
        .update(aiUsage)
        .set({ count: sql`greatest(${aiUsage.count} - 1, 0)` })
        .where(and(eq(aiUsage.userId, request.user.id), eq(aiUsage.day, day)))
      if (error instanceof AiError) throw failure(request, error)
      throw error
    }
  }

  app.get('/ai/status', async (request) => status(request))

  /** Saves (or replaces) the person's own Gemini key, after Google confirms it works. */
  app.put('/ai/key', async (request): Promise<AiStatus> => {
    if (!perKey.hit(request.user.id)) {
      throw new HttpError(429, 'rate_limited', 'Too many attempts. Try again in a few minutes.')
    }
    const input = AiKeyInputSchema.parse(request.body)
    if (opts.userKeys) {
      try {
        await opts.userKeys.validate(input.apiKey)
      } catch (error) {
        if (!(error instanceof AiError)) throw error
        if (error.kind === 'key') {
          throw new HttpError(
            400,
            'invalid_ai_key',
            'Google did not accept this key. Check that you copied all of it.',
          )
        }
        request.log.warn({ err: error }, 'Could not check a Gemini key')
        throw new HttpError(502, 'ai_failed', 'Could not reach Google to check the key. Try again.')
      }
    }
    await db
      .update(users)
      .set({
        aiKeyEncrypted: opts.secrets.encrypt(input.apiKey),
        aiKeyHint: `…${input.apiKey.slice(-4)}`,
        aiModel: input.model,
      })
      .where(eq(users.id, request.user.id))
    return status(request)
  })

  app.delete('/ai/key', async (request): Promise<AiStatus> => {
    await db
      .update(users)
      .set({ aiKeyEncrypted: null, aiKeyHint: null, aiModel: DEFAULT_AI_MODEL })
      .where(eq(users.id, request.user.id))
    return status(request)
  })

  app.post('/ai/fix-mistakes', async (request): Promise<FixMistakesResult> => {
    const input = FixMistakesInputSchema.parse(request.body)
    if (input.fields.length === 0) {
      return { suggestions: [], usage: (await status(request)).usage }
    }
    const { byId, listing } = numberFields(input.fields)
    const { result, usage: used } = await run(request, (ai) =>
      generateJson(ai, fixMistakesRequest(input, listing), FixOutputSchema),
    )
    const seen = new Set<string>()
    const suggestions: AiSuggestion[] = []
    for (const s of result.suggestions) {
      const field = byId.get(s.id)
      // Keep only suggestions that can be applied to the text as it is.
      if (!field || !s.original || s.original === s.replacement) continue
      if (!field.text.includes(s.original)) continue
      const key = `${field.path}\n${s.original}`
      if (seen.has(key)) continue
      seen.add(key)
      suggestions.push({
        path: field.path,
        label: field.label,
        original: s.original,
        replacement: s.replacement,
        reason: clip(s.reason, 200),
      })
      if (suggestions.length >= 60) break
    }
    return { suggestions, usage: used }
  })

  app.post('/ai/tailor', async (request): Promise<TailorResult> => {
    const input = TailorInputSchema.parse(request.body)
    const { byId, listing } = numberFields(input.fields)
    const { result, usage: used } = await run(request, (ai) =>
      generateJson(ai, tailorRequest(input, listing), TailorOutputSchema),
    )
    const terms = new Set<string>()
    const keywords: Keyword[] = []
    for (const k of result.keywords) {
      const term = clip(k.term, 60)
      if (!term || terms.has(term.toLowerCase())) continue
      terms.add(term.toLowerCase())
      keywords.push({ term, importance: k.importance })
      if (keywords.length >= 25) break
    }
    const rewrites: AiSuggestion[] = []
    for (const r of result.rewrites) {
      const field = byId.get(r.id)
      const replacement = clip(r.replacement, 4000)
      if (!field || !replacement || replacement === field.text.trim()) continue
      if (rewrites.some((w) => w.path === field.path)) continue
      rewrites.push({
        path: field.path,
        label: field.label,
        original: field.text,
        replacement,
        reason: clip(r.reason, 300),
      })
      if (rewrites.length >= 10) break
    }
    return {
      keywords,
      advice: result.advice
        .map((a) => clip(a, 500))
        .filter(Boolean)
        .slice(0, 6),
      rewrites,
      usage: used,
    }
  })

  app.post('/ai/assist', async (request): Promise<AssistResult> => {
    const input = AssistInputSchema.parse(request.body)
    let target: AiField[] = []
    if (input.task !== 'letter') {
      const path = input.targetPath
      if (!path) throw new HttpError(400, 'invalid_target', 'Choose what to write')
      target =
        input.task === 'summary'
          ? input.fields.filter((f) => f.path === path)
          : input.fields.filter((f) => f.path.startsWith(`${path}.`))
      if (input.task === 'bullets' && target.length === 0) {
        throw new HttpError(400, 'invalid_target', 'Give the entry a title first')
      }
    }
    const { listing } = numberFields(input.fields)
    const { result, usage: used } = await run(request, (ai) =>
      generateJson(ai, assistRequest(input, listing, target), AssistOutputSchema),
    )
    const max = { summary: 1, bullets: 8, letter: 6 }[input.task]
    const texts = result.texts
      .map((t) => clip(t.replace(/^\s*[-•*]\s*/, ''), input.task === 'bullets' ? 400 : 1500))
      .filter(Boolean)
      .slice(0, max)
    if (texts.length === 0) {
      throw new HttpError(502, 'ai_failed', 'The AI could not answer. Please try again.')
    }
    return { texts, usage: used }
  })
}
