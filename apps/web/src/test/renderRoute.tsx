import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { render } from '@testing-library/react'
import { createMemoryRouter, RouterProvider } from 'react-router'
import type { User } from '@cv/shared'
import { authKeys } from '../lib/authKeys'
import { routes } from '../router'
import { TEST_USER } from './fakeAuthApi'

/**
 * Renders the real route tree at a given URL, signed in as TEST_USER unless
 * `user` says otherwise (the current user is known up front, so pages render at once).
 */
export function renderRoute(path: string, { user = TEST_USER }: { user?: User | null } = {}) {
  const router = createMemoryRouter(routes, { initialEntries: [path] })
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  queryClient.setQueryData(authKeys.me, user)
  render(
    <QueryClientProvider client={queryClient}>
      <RouterProvider router={router} />
    </QueryClientProvider>,
  )
  return router
}
