import { describe, expect, it } from 'vitest'
import { paginateColumn } from './paginate'

const blocks = (...heights: number[]) => heights.map((height) => ({ height, gapBefore: 10 }))

describe('paginateColumn', () => {
  it('keeps everything on one page when it fits', () => {
    expect(paginateColumn(blocks(100, 100, 100), 400, 500)).toEqual([[0, 1, 2]])
  })

  it('counts the gap between blocks but not above the first one', () => {
    // 100 + (10 + 100) + (10 + 100) = 320
    expect(paginateColumn(blocks(100, 100, 100), 320, 500)).toEqual([[0, 1, 2]])
    expect(paginateColumn(blocks(100, 100, 100), 319, 500)).toEqual([[0, 1], [2]])
  })

  it('uses the smaller first-page capacity only on page one', () => {
    expect(paginateColumn(blocks(200, 200, 200, 200), 250, 500)).toEqual([[0], [1, 2], [3]])
  })

  it('gives an oversized block its own page instead of looping', () => {
    expect(paginateColumn(blocks(50, 900, 50), 500, 500)).toEqual([[0], [1], [2]])
  })

  it('returns one empty page for an empty column', () => {
    expect(paginateColumn([], 500, 500)).toEqual([[]])
  })
})
