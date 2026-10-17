import { create } from 'zustand'

/**
 * The document that was just opened, so the dashboard or documents list can
 * name its thumbnail when the user comes back: the closing animation then
 * shrinks the page into that thumbnail, like an app closing into its icon.
 */
export const useDocTransition = create<{ openedId: string | null }>(() => ({ openedId: null }))
