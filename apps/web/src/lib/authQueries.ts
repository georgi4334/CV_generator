import type { LoginInput, RegisterInput } from '@cv/shared'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { flushSave } from '../features/editor/editorSession'
import { flushLetterSave } from '../features/letter/letterSession'
import { authApi } from './authApi'
import { authKeys } from './authKeys'
import { resetClientState } from './sessionState'

/** The signed-in user; `data` is null when nobody is signed in. */
export function useCurrentUser() {
  return useQuery({
    queryKey: authKeys.me,
    queryFn: authApi.me,
    staleTime: 5 * 60_000,
    retry: (count, error) => count < 2 && (error as { retryable?: boolean }).retryable === true,
  })
}

export function useLogin() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: LoginInput) => authApi.login(input),
    onSuccess: (user) => resetClientState(queryClient, user),
  })
}

export function useRegister() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (input: RegisterInput) => authApi.register(input),
    onSuccess: (user) => resetClientState(queryClient, user),
  })
}

export function useLogout() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async () => {
      // Pending edits are saved while the session still exists.
      await Promise.all([flushSave(), flushLetterSave()])
      await authApi.logout()
    },
    onSettled: () => resetClientState(queryClient, null),
  })
}

export function useUpdateProfile() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: (name: string) => authApi.updateProfile(name),
    onSuccess: (user) => queryClient.setQueryData(authKeys.me, user),
  })
}
