import {
  AssistInputSchema,
  FixMistakesInputSchema,
  PLAN_LIMITS,
  TailorInputSchema,
  type AiField,
  type AiSuggestion,
  type AiUsage,
  type AssistResult,
  type FixMistakesResult,
  type Keyword,
  type TailorResult,
} from '@cv/shared'
import { and, eq, sql } from 'drizzle-orm'
import type { FastifyInstance, FastifyRequest } from 'fastify'
import { AiError, generateJson, type AiProvider } from '../ai/provider'
import {
  assistRequest,
  AssistOutputSchema,
  fixMistakesRequest,
  FixOutputSchema,
  numberFields,
  tailorRequest,
  TailorOutputSchema,
} from '../ai/prompts'
import type { Database } from '../db/client'
import { aiUsage } from '../db/schema'
import { HttpError } from '../lib/errors'
import { createRateLimiter } from '../lib/rateLimit'

export interface AiRouteOptions {
  database: Database
  /** null: AI is not configured on this server. */
  provider: AiProvider | null
  /** Requests per minute for the whole API, to stay inside the provider's free quota. */
  maxPerMinute: number
}

const today = () => new Date().toISOString().slice(0, 10)
const clip = (text: string, max: number) => text.trim().slice(0, max)

/** Fix Mistakes, Check & Tailor and the AI Assistant. All need a signed-in user. */
export async function aiRoutes(app: FastifyInstance, opts: AiRouteOptions) {
  const { db } = opts.database
  const { provider } = opts
  const perMinute = createRateLimiter({ max: opts.maxPerMinute, windowMs: 60_000 })

  const limitFor = (request: FastifyRequest) => PLAN_LIMITS[request.user.plan].aiRequestsPerDay

  async function usage(request: FastifyRequest): Promise<AiUsage> {
    const [row] = await db
      .select({ count: aiUsage.count })
      .from(aiUsage)
      .where(and(eq(aiUsage.userId, request.user.id), eq(aiUsage.day, today())))
    return { used: row?.count ?? 0, limit: limitFor(request) }
  }

  /** Counts one request against today's limit; refunded if the AI fails. */
  async function run<T>(request: FastifyRequest, call: (ai: AiProvider) => Promise<T>) {
    if (!provider) {
      throw new HttpError(
        503,
        'ai_unavailable',
        'AI features are not set up on this server (GEMINI_API_KEY is missing).',
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
      if (error instanceof AiError) {
        request.log.warn({ err: error }, 'AI request failed')
        if (error.kind === 'busy') {
          throw new HttpError(429, 'ai_busy', 'The AI is busy right now. Try again in a minute.')
        }
        if (error.kind === 'blocked') {
          throw new HttpError(422, 'ai_blocked', 'The AI refused to answer this request.')
        }
        throw new HttpError(502, 'ai_failed', 'The AI could not answer. Please try again.')
      }
      throw error
    }
  }

  app.get('/ai/status', async (request) => ({
    enabled: provider !== null,
    provider: provider?.label ?? '',
    usage: await usage(request),
  }))

  app.post('/ai/fix-mistakes', async (request): Promise<FixMistakesResult> => {
    const input = FixMistakesInputSchema.parse(request.body)
    if (input.fields.length === 0) {
      return { suggestions: [], usage: await usage(request) }
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
