import type { FakeAuthApi } from './fakeAuthApi'
import type { FakeCvApi } from './fakeCvApi'

/** The fake APIs used by the route-level tests, created by the mocks in appHarness.ts. */
export const fake = { current: null as unknown as FakeCvApi }
export const auth = { current: null as unknown as FakeAuthApi }
