import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'
import { initI18n } from '@/i18n'
import { preloadPages } from '@/shared/lib/lazyPage'

afterEach(() => cleanup())

// Pages are split into chunks in the app; load them up front so tests render at once.
beforeAll(() => preloadPages())

// Tests read English text.
await initI18n('en')
