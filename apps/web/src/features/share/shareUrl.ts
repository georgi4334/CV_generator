import { sharePath } from '@cv/shared'

/** The address people open, on this app's own domain. */
export const shareUrl = (slug: string) => new URL(sharePath(slug), window.location.origin).href
