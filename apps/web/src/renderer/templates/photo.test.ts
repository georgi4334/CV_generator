import { createEmptyCv, type CvHeader } from '@cv/shared'
import { describe, expect, it } from 'vitest'
import { placePhoto } from './photo'
import { getTemplate } from './templates'

const withPhoto = (photoPosition: CvHeader['photoPosition']): CvHeader => ({
  ...createEmptyCv().header,
  photoUrl: '/api/images/me.jpg',
  showPhoto: true,
  photoPosition,
})

describe('placePhoto', () => {
  it('leaves the photo next to the name where the template puts it', () => {
    const placed = placePhoto(withPhoto('name'), getTemplate('creative'))
    expect(placed).toMatchObject({ corner: null, inSidebar: false })
    expect(placed.header.showPhoto).toBe(true)
  })

  it('puts a corner photo at the top of a sidebar on that side', () => {
    // Creative: sidebar on the left, header in the main column.
    const left = placePhoto(withPhoto('top-left'), getTemplate('creative'))
    expect(left).toMatchObject({ corner: null, inSidebar: true })
    expect(left.header.showPhoto).toBe(false)
    // Top right on Creative: beside the header instead.
    expect(placePhoto(withPhoto('top-right'), getTemplate('creative'))).toMatchObject({
      corner: 'right',
      inSidebar: false,
    })
  })

  it('puts a corner photo beside a full-width header', () => {
    expect(placePhoto(withPhoto('top-left'), getTemplate('single-column'))).toMatchObject({
      corner: 'left',
      inSidebar: false,
    })
  })

  it('does nothing without a shown photo', () => {
    const header = { ...withPhoto('top-left'), showPhoto: false }
    expect(placePhoto(header, getTemplate('creative'))).toMatchObject({
      corner: null,
      inSidebar: false,
    })
  })
})
