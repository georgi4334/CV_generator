import type { CvHeader, PhotoShape } from '@cv/shared'
import type { TemplateDefinition } from './templates'

/** Corner rounding for each photo shape, shared by the page and the Design & Font preview. */
export const PHOTO_SHAPE_CLASS: Record<PhotoShape, string> = {
  circle: 'rounded-full',
  rounded: 'rounded-[18%]',
  square: 'rounded-none',
}

export interface PhotoPlacement {
  /** The header to draw with the template; without the photo when it goes elsewhere. */
  header: CvHeader
  /** The photo beside the whole header, on this side. */
  corner: 'left' | 'right' | null
  /** The photo at the top of the sidebar, next to the header. */
  inSidebar: boolean
}

/**
 * Where the photo goes on this template. "Next to the name" is the template's
 * own place. A top corner is the top of the sidebar when the sidebar is on
 * that side beside the header, and otherwise that side of the header.
 */
export function placePhoto(
  header: CvHeader,
  template: Pick<TemplateDefinition, 'columns' | 'sidebarSide' | 'headerPlacement'>,
): PhotoPlacement {
  const position = header.photoPosition ?? 'name'
  // A header in the sidebar has the photo above the name, whatever the position.
  if (
    !header.showPhoto ||
    !header.photoUrl ||
    position === 'name' ||
    template.headerPlacement === 'sidebar'
  ) {
    return { header, corner: null, inSidebar: false }
  }
  const side = position === 'top-left' ? 'left' : 'right'
  const inSidebar =
    template.columns === 2 && template.headerPlacement === 'main' && template.sidebarSide === side
  return { header: { ...header, showPhoto: false }, corner: inSidebar ? null : side, inSidebar }
}
