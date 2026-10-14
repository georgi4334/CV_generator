import { useEffect, useState } from 'react'
import { Navigate } from 'react-router'
import { toApiRequestError, type ApiRequestError } from '../../lib/api'
import { cvApi } from '../../lib/cvApi'
import { rememberCv } from '../../lib/cvQueries'
import { useQueryClient } from '@tanstack/react-query'
import type { CvRecord } from '@cv/shared'
import { LoadError, PageLoading } from './LoadStates'

// React may run effects twice in development; share one request per page visit.
let pending: Promise<CvRecord> | null = null

/** /cvs/new/edit: creates an empty CV on the server, then opens it. */
export function NewCvPage() {
  const queryClient = useQueryClient()
  const [created, setCreated] = useState<CvRecord | null>(null)
  const [error, setError] = useState<ApiRequestError | null>(null)
  const [attempt, setAttempt] = useState(0)

  useEffect(() => {
    let active = true
    pending ??= cvApi.create()
    pending.then(
      (record) => {
        rememberCv(queryClient, record)
        if (active) setCreated(record)
      },
      (e: unknown) => {
        if (active) setError(toApiRequestError(e))
      },
    )
    return () => {
      active = false
      // Next visit to /cvs/new creates another CV.
      setTimeout(() => (pending = null), 0)
    }
  }, [attempt, queryClient])

  if (created) return <Navigate to={`/cvs/${created.id}/edit`} replace />
  if (error) {
    return (
      <LoadError
        error={error}
        onRetry={() => {
          pending = null
          setError(null)
          setAttempt((n) => n + 1)
        }}
      />
    )
  }
  return <PageLoading label="Creating your CV…" />
}
