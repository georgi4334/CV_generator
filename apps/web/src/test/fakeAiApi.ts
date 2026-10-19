import type {
  AiKeyInput,
  AiModel,
  AiStatus,
  AssistInput,
  AssistResult,
  FixMistakesInput,
  FixMistakesResult,
  TailorInput,
  TailorResult,
} from '@cv/shared'
import type { AiApi } from '@/features/ai/api'

type Answer<I, R> = (input: I) => Omit<R, 'usage'> | Error

/** Stand-in for the AI endpoints: tests decide each answer and can read the requests. */
export function createFakeAiApi() {
  const state = {
    enabled: true,
    used: 0,
    limit: 30,
    ownKey: null as { hint: string; model: AiModel } | null,
    /** Make saveKey fail (e.g. with an ApiRequestError). */
    saveError: null as Error | null,
    requests: [] as unknown[],
    fix: (() => ({ suggestions: [] })) as Answer<FixMistakesInput, FixMistakesResult>,
    tailor: (() => ({ keywords: [], advice: [], rewrites: [] })) as Answer<
      TailorInput,
      TailorResult
    >,
    assist: (() => ({ texts: ['A written text.'] })) as Answer<AssistInput, AssistResult>,
  }
  const answer = <I, R>(fn: Answer<I, R>, input: I) => {
    state.requests.push(input)
    const result = fn(input)
    if (result instanceof Error) throw result
    state.used += 1
    return { ...result, usage: { used: state.used, limit: state.limit } } as R
  }
  const status = (): AiStatus => ({
    enabled: state.enabled || state.ownKey !== null,
    provider: state.ownKey ? 'Google Gemini' : state.enabled ? 'Test AI' : '',
    usage: state.ownKey ? { used: 0, limit: 0 } : { used: state.used, limit: state.limit },
    keySource: state.ownKey ? 'own' : state.enabled ? 'server' : 'none',
    keyHint: state.ownKey?.hint ?? '',
    model: state.ownKey?.model ?? 'gemini-flash-latest',
  })
  const api: AiApi = {
    async status(): Promise<AiStatus> {
      return status()
    },
    async saveKey(input: AiKeyInput): Promise<AiStatus> {
      state.requests.push(input)
      if (state.saveError) throw state.saveError
      state.ownKey = {
        hint: `…${input.apiKey.slice(-4)}`,
        model: input.model ?? 'gemini-flash-latest',
      }
      return status()
    },
    async removeKey(): Promise<AiStatus> {
      state.ownKey = null
      return status()
    },
    fixMistakes: async (input) => answer(state.fix, input),
    tailor: async (input) => answer(state.tailor, input),
    assist: async (input) => answer(state.assist, input),
  }
  return {
    api,
    state,
    reset() {
      Object.assign(state, {
        enabled: true,
        used: 0,
        ownKey: null,
        saveError: null,
        requests: [],
        fix: () => ({ suggestions: [] }),
        tailor: () => ({ keywords: [], advice: [], rewrites: [] }),
        assist: () => ({ texts: ['A written text.'] }),
      })
    },
  }
}
export type FakeAiApi = ReturnType<typeof createFakeAiApi>
