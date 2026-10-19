import type {
  AiKeyInput,
  AiStatus,
  AiUsage,
  AssistInput,
  FixMistakesInput,
  TailorInput,
} from '@cv/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { aiApi } from './api'

export const aiKeys = { status: ['ai', 'status'] as const }

export function useAiStatus() {
  return useQuery({ queryKey: aiKeys.status, queryFn: aiApi.status, staleTime: 60_000 })
}

/** Saves the person's own Gemini key (the server checks it with Google first). */
export function useSaveAiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: AiKeyInput) => aiApi.saveKey(input),
    onSuccess: (status) => queryClient.setQueryData(aiKeys.status, status),
  })
}

export function useRemoveAiKey() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: () => aiApi.removeKey(),
    onSuccess: (status) => queryClient.setQueryData(aiKeys.status, status),
  })
}

/** Keeps "N requests left today" up to date after each request. */
function useRememberUsage() {
  const queryClient = useQueryClient()
  return ({ usage }: { usage: AiUsage }) =>
    queryClient.setQueryData<AiStatus>(aiKeys.status, (status) =>
      status ? { ...status, usage } : status,
    )
}

export function useFixMistakes() {
  const onSuccess = useRememberUsage()
  return useMutation({
    mutationFn: (input: FixMistakesInput) => aiApi.fixMistakes(input),
    onSuccess,
  })
}

export function useTailor() {
  const onSuccess = useRememberUsage()
  return useMutation({ mutationFn: (input: TailorInput) => aiApi.tailor(input), onSuccess })
}

export function useAssist() {
  const onSuccess = useRememberUsage()
  return useMutation({ mutationFn: (input: AssistInput) => aiApi.assist(input), onSuccess })
}
