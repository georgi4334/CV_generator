import { cleanup } from '@testing-library/react'
import { afterEach, beforeAll } from 'vitest'
import { preloadPages } from '../lib/lazyPage'

afterEach(() => cleanup())

// Pages are split into chunks in the app; load them up front so tests render at once.
beforeAll(() => preloadPages())
