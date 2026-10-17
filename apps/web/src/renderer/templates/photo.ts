import type { PhotoShape } from '@cv/shared'

/** Corner rounding for each photo shape, shared by the page and the Design & Font preview. */
export const PHOTO_SHAPE_CLASS: Record<PhotoShape, string> = {
  circle: 'rounded-full',
  rounded: 'rounded-[18%]',
  square: 'rounded-none',
}
