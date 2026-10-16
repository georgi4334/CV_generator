import { HealthResponseSchema } from '@cv/shared'
import { useQuery } from '@tanstack/react-query'
import { api } from './client'

export function useHealth() {
  return useQuery({
    queryKey: ['health'],
    queryFn: async () => {
      const { data } = await api.get('/health')
      return HealthResponseSchema.parse(data)
    },
  })
}
