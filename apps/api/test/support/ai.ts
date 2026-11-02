import { AiError, type AiProvider, type AiRequest } from '../../src/modules/ai/provider'

/** A provider that answers with whatever the test queues, and records the requests. */
export function scripted() {
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

/** A provider that always gives the same answer (or error), however often it is asked. */
export function constant(answer: unknown | Error, delayMs = 0) {
  const requests: AiRequest[] = []
  const provider: AiProvider = {
    label: 'Constant AI',
    async complete(request) {
      requests.push(request)
      if (delayMs) await new Promise((resolve) => setTimeout(resolve, delayMs))
      if (answer instanceof Error) throw answer
      return typeof answer === 'string' ? answer : JSON.stringify(answer)
    },
  }
  return { provider, requests }
}

export { AiError }
