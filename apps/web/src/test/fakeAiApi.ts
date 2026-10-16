import type {
  AiStatus,
  AssistInput,
  AssistResult,
  FixMistakesInput,
  FixMistakesResult,
  TailorInput,
  TailorResult,
} from '@cv/shared'
import type { AiApi } from '../lib/aiApi'

type Answer<I, R> = (input: I) => Omit<R, 'usage'> | Error

/** Stand-in for the AI endpoints: tests decide each answer and can read the requests. */
export function createFakeAiApi() {
  const state = {
    enabled: true,
    used: 0,
    limit: 30,
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
  const api: AiApi = {
    async status(): Promise<AiStatus> {
      return {
        enabled: state.enabled,
        provider: state.enabled ? 'Test AI' : '',
        usage: { used: state.used, limit: state.limit },
      }
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
        requests: [],
        fix: () => ({ suggestions: [] }),
        tailor: () => ({ keywords: [], advice: [], rewrites: [] }),
        assist: () => ({ texts: ['A written text.'] }),
      })
    },
  }
}
export type FakeAiApi = ReturnType<typeof createFakeAiApi>
