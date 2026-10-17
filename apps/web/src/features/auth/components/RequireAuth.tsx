import { Navigate, Outlet, useLocation } from 'react-router'
import { toApiRequestError } from '@/shared/api/client'
import { useCurrentUser } from '@/features/auth/queries'
import { LoadError, PageLoading } from '@/shared/ui/LoadStates'

/**
 * Pages inside need a signed-in user. Visitors at the home address see the
 * welcome page; for any other page they are sent to /login and back afterwards.
 */
export function RequireAuth() {
  const user = useCurrentUser()
  const location = useLocation()

  if (user.isPending) return <PageLoading />
  if (user.isError) {
    return <LoadError error={toApiRequestError(user.error)} onRetry={() => void user.refetch()} />
  }
  if (!user.data) {
    const next = `${location.pathname}${location.search}`
    // Someone arriving at the front door is shown what the service is; any other page asks for a sign-in.
    if (next === '/') return <Navigate to="/welcome" replace />
    return <Navigate to={`/login?next=${encodeURIComponent(next)}`} replace />
  }
  return <Outlet />
}
