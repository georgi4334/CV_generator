import { screen, within } from '@testing-library/react'

/** The CV page in the editor or preview. */
export const page = () => within(screen.getByRole('document', { name: 'CV' }))
/** Autosave waits a moment before saving. */
export const SAVE_TIMEOUT = { timeout: 4000 }
