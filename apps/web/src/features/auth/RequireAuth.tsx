import { Navigate, Outlet, useLocation } from 'react-router'
import { toApiRequestError } from '../../lib/api'
import { useCurrentUser } from '../../lib/authQueries'
import { LoadError, PageLoading } from '../editor/LoadStates'

/** Pages inside need a signed-in user; everyone else is sent to /login and back afterwards. */
export function RequireAuth() {
  const user = useCurrentUser()
  const location = useLocation()

  if (user.isPending) return <PageLoading />
  if (user.isError) {
    return <LoadError error={toApiRequestError(user.error)} onRetry={() => void user.refetch()} />
  }
  if (!user.data) {
    const next = `${location.pathname}${location.search}`
    const search = next === '/' ? '' : `?next=${encodeURIComponent(next)}`
    return <Navigate to={`/login${search}`} replace />
  }
  return <Outlet />
}
