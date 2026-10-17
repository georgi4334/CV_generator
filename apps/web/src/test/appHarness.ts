/**
 * Shared setup for the route-level tests (`*.test.tsx` that render the real
 * app with `renderRoute`): fake API modules, a signed-in user and fresh
 * stores before every test. Import it FIRST in a test file (`import '@/test/appHarness'`),
 * so its mocks are in place before the app's modules load. The fakes are in
 * `fakeHolders.ts`, helpers in `appHelpers.ts`.
 */
import { beforeEach, vi } from 'vitest'
import { useCvEditor } from '@/features/cv-editor/state/cvEditorStore'
import { useSaveState } from '@/features/cv-editor/state/editorSession'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { auth, fake } from './fakeHolders'

vi.mock('@/features/cv-editor/api', async () => {
  const { createFakeCvApi } = await import('./fakeCvApi')
  const { fake } = await import('./fakeHolders')
  fake.current ??= createFakeCvApi()
  return { cvApi: fake.current.api }
})

vi.mock('@/features/cover-letters/api', async () => {
  const { createFakeCvApi } = await import('./fakeCvApi')
  const { fake } = await import('./fakeHolders')
  fake.current ??= createFakeCvApi()
  return { coverLetterApi: fake.current.coverLetterApi }
})

vi.mock('@/features/jobs/api', async () => {
  const { createFakeCvApi } = await import('./fakeCvApi')
  const { fake } = await import('./fakeHolders')
  fake.current ??= createFakeCvApi()
  return { jobsApi: fake.current.jobsApi }
})

vi.mock('@/features/auth/api', async () => {
  const { createFakeAuthApi } = await import('./fakeAuthApi')
  const { auth } = await import('./fakeHolders')
  auth.current ??= createFakeAuthApi()
  return { authApi: auth.current.api }
})

vi.mock('@/shared/api/useHealth', () => ({
  useHealth: () => ({
    isLoading: false,
    isError: false,
    data: { status: 'ok', database: 'up', email: 'service', timestamp: '2026-10-13T10:00:00Z' },
  }),
}))

beforeEach(() => {
  fake.current.reset()
  auth.current.reset()
  useEditorUi.setState({ activePanel: null, notice: null, previewVersionId: null })
  useCvEditor.setState({ docId: null, cv: null, past: [], future: [] })
  useSaveState.setState({ status: 'saved', lastSavedAt: null, error: null })
})
