import { AiError, type AiProvider } from './provider'

interface GeminiOptions {
  apiKey: string
  /** e.g. "gemini-flash-latest" (always the current Flash model) or a fixed version. */
  model: string
  timeoutMs?: number
  fetch?: typeof fetch
  baseUrl?: string
}

interface GeminiResponse {
  candidates?: {
    content?: { parts?: { text?: string; thought?: boolean }[] }
    finishReason?: string
  }[]
  promptFeedback?: { blockReason?: string }
  error?: { message?: string; status?: string }
}

/** Google Gemini through its REST API (generateContent), answering in JSON. */
export function createGeminiProvider(options: GeminiOptions): AiProvider {
  const {
    apiKey,
    model,
    timeoutMs = 45_000,
    fetch: doFetch = fetch,
    baseUrl = 'https://generativelanguage.googleapis.com/v1beta',
  } = options

  return {
    label: 'Google Gemini',
    async complete({ system, prompt, temperature }) {
      let response: Response
      try {
        response = await doFetch(`${baseUrl}/models/${encodeURIComponent(model)}:generateContent`, {
          method: 'POST',
          headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
          body: JSON.stringify({
            systemInstruction: { parts: [{ text: system }] },
            contents: [{ role: 'user', parts: [{ text: prompt }] }],
            generationConfig: { temperature, responseMimeType: 'application/json' },
          }),
          signal: AbortSignal.timeout(timeoutMs),
        })
      } catch (error) {
        throw new AiError('failed', `Could not reach Gemini: ${(error as Error).message}`)
      }

      const body = (await response.json().catch(() => ({}))) as GeminiResponse
      if (
        response.status === 401 ||
        response.status === 403 ||
        (response.status === 400 && /API key/i.test(body.error?.message ?? ''))
      ) {
        throw new AiError('key', 'Google did not accept the API key')
      }
      if (response.status === 429) {
        throw new AiError('busy', body.error?.message ?? 'Gemini quota reached')
      }
      if (!response.ok) {
        throw new AiError(
          'failed',
          `Gemini answered ${response.status}: ${body.error?.message ?? 'no details'}`,
        )
      }
      if (body.promptFeedback?.blockReason) {
        throw new AiError(
          'blocked',
          `Gemini refused the request (${body.promptFeedback.blockReason})`,
        )
      }
      const candidate = body.candidates?.[0]
      const text = (candidate?.content?.parts ?? [])
        .filter((part) => !part.thought)
        .map((part) => part.text ?? '')
        .join('')
      if (!text) {
        const reason = candidate?.finishReason ?? 'empty answer'
        throw new AiError(
          reason === 'SAFETY' ? 'blocked' : 'failed',
          `Gemini gave no text (${reason})`,
        )
      }
      return text
    },
  }
}

/**
 * Checks a key with a free call that lists one model (it uses no generation quota).
 * Resolves when Google accepts the key; throws AiError('key') when it does not.
 */
export async function validateGeminiKey(
  apiKey: string,
  options: { fetch?: typeof fetch; baseUrl?: string; timeoutMs?: number } = {},
): Promise<void> {
  const {
    fetch: doFetch = fetch,
    baseUrl = 'https://generativelanguage.googleapis.com/v1beta',
    timeoutMs = 15_000,
  } = options
  let response: Response
  try {
    response = await doFetch(`${baseUrl}/models?pageSize=1`, {
      headers: { 'x-goog-api-key': apiKey },
      signal: AbortSignal.timeout(timeoutMs),
    })
  } catch (error) {
    throw new AiError('failed', `Could not reach Gemini: ${(error as Error).message}`)
  }
  if (response.status === 400 || response.status === 401 || response.status === 403) {
    throw new AiError('key', 'Google did not accept this key')
  }
  if (!response.ok) throw new AiError('failed', `Gemini answered ${response.status}`)
}
