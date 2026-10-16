import type { z } from 'zod'

export type AiTask = 'fix' | 'tailor' | 'assist'

export interface AiRequest {
  task: AiTask
  system: string
  prompt: string
  temperature: number
  /** The structured request, for providers that do not read prompts (the mock). */
  input: unknown
}

/**
 * A text-generation service. It returns the model's answer, which must be a
 * JSON object; callers validate it. Swap the implementation to change provider.
 */
export interface AiProvider {
  /** Shown to users: where their text is sent. */
  label: string
  complete: (request: AiRequest) => Promise<string>
}

export type AiErrorKind = 'busy' | 'blocked' | 'failed'

export class AiError extends Error {
  constructor(
    readonly kind: AiErrorKind,
    message: string,
  ) {
    super(message)
    this.name = 'AiError'
  }
}

/** Models sometimes wrap JSON in a Markdown fence; take the object inside. */
export function extractJson(text: string): unknown {
  const fenced = /```(?:json)?\s*([\s\S]*?)```/.exec(text)
  const body = (fenced ? fenced[1]! : text).trim()
  const start = body.indexOf('{')
  const end = body.lastIndexOf('}')
  if (start < 0 || end < start) throw new SyntaxError('No JSON object in the answer')
  return JSON.parse(body.slice(start, end + 1))
}

/** Asks the provider and validates the answer; one retry when the answer is malformed. */
export async function generateJson<T>(
  provider: AiProvider,
  request: AiRequest,
  schema: z.ZodType<T>,
): Promise<T> {
  let prompt = request.prompt
  for (let attempt = 0; attempt < 2; attempt++) {
    const answer = await provider.complete({ ...request, prompt })
    try {
      const parsed = schema.safeParse(extractJson(answer))
      if (parsed.success) return parsed.data
    } catch {
      // Not JSON: retry below.
    }
    prompt = `${request.prompt}\n\nYour previous answer was not valid. Answer with only the JSON object in the requested format.`
  }
  throw new AiError('failed', 'The AI gave an answer in the wrong format')
}
