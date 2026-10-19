import {
  AiStatusSchema,
  AssistResultSchema,
  FixMistakesResultSchema,
  TailorResultSchema,
  type AiKeyInput,
  type AssistInput,
  type FixMistakesInput,
  type TailorInput,
} from '@cv/shared'
import { api } from '@/shared/api/client'

/** The AI endpoints; the AI itself runs on the server, so no key reaches the browser. */
export const aiApi = {
  async status() {
    const { data } = await api.get('/ai/status')
    return AiStatusSchema.parse(data)
  },
  async saveKey(input: AiKeyInput) {
    const { data } = await api.put('/ai/key', input, { timeout: 30_000 })
    return AiStatusSchema.parse(data)
  },
  async removeKey() {
    const { data } = await api.delete('/ai/key')
    return AiStatusSchema.parse(data)
  },
  async fixMistakes(input: FixMistakesInput) {
    const { data } = await api.post('/ai/fix-mistakes', input, { timeout: 90_000 })
    return FixMistakesResultSchema.parse(data)
  },
  async tailor(input: TailorInput) {
    const { data } = await api.post('/ai/tailor', input, { timeout: 90_000 })
    return TailorResultSchema.parse(data)
  },
  async assist(input: AssistInput) {
    const { data } = await api.post('/ai/assist', input, { timeout: 90_000 })
    return AssistResultSchema.parse(data)
  },
}

export type AiApi = typeof aiApi
