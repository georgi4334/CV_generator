import { describe, expect, it } from 'vitest'
import { paginateColumn } from './paginate'

const blocks = (...heights: number[]) => heights.map((height) => ({ height, gapBefore: 10 }))
const flat = (pages: number[][]) => pages.flat()

describe('paginateColumn edge cases', () => {
  it('puts every block on its own page when the page capacity is zero, without looping', () => {
    expect(paginateColumn(blocks(10, 10, 10), 0, 0)).toEqual([[0], [1], [2]])
  })

  it('does the same for a negative capacity (a header taller than the page)', () => {
    expect(paginateColumn(blocks(10, 10), -300, -300)).toEqual([[0], [1]])
  })

  it('treats a first page with no room like a smaller first page', () => {
    expect(paginateColumn(blocks(100, 100), 0, 500)).toEqual([[0], [1]])
  })

  it('keeps zero-height blocks on the page where they appear', () => {
    expect(paginateColumn(blocks(0, 0, 0), 100, 100)).toEqual([[0, 1, 2]])
  })

  it('keeps empty blocks without a gap from creating pages', () => {
    const many = Array.from({ length: 1000 }, () => ({ height: 0, gapBefore: 0 }))
    expect(paginateColumn(many, 10, 10)).toHaveLength(1)
  })

  it('a block that is exactly as tall as the page fits without starting a new one', () => {
    expect(paginateColumn(blocks(500), 500, 500)).toEqual([[0]])
    expect(paginateColumn(blocks(250, 240), 500, 500)).toEqual([[0, 1]])
    expect(paginateColumn(blocks(250, 241), 500, 500)).toEqual([[0], [1]])
  })

  it('one pixel over the capacity moves the block to the next page', () => {
    expect(paginateColumn(blocks(100, 391), 500, 500)).toEqual([[0], [1]])
    expect(paginateColumn(blocks(100, 390), 500, 500)).toEqual([[0, 1]])
  })

  it('does not hang or crash on NaN and Infinity measurements', () => {
    const pages = paginateColumn(
      [
        { height: NaN, gapBefore: 10 },
        { height: Infinity, gapBefore: 10 },
        { height: 10, gapBefore: NaN },
        { height: 10, gapBefore: 10 },
      ],
      100,
      100,
    )
    expect(flat(pages).sort()).toEqual([0, 1, 2, 3])
  })

  it('handles 20 000 blocks quickly and keeps every block exactly once, in order', () => {
    const many = blocks(...Array.from({ length: 20_000 }, (_, i) => 20 + (i % 7)))
    const started = performance.now()
    const pages = paginateColumn(many, 800, 1000)
    expect(performance.now() - started).toBeLessThan(1000)
    expect(flat(pages)).toEqual(Array.from({ length: 20_000 }, (_, i) => i))
    expect(pages.every((page) => page.length > 0)).toBe(true)
  })

  it('never exceeds the page capacity unless a block is oversized on its own', () => {
    const heights = Array.from({ length: 300 }, (_, i) => 30 + ((i * 37) % 90))
    const list = blocks(...heights)
    const capacity = 700
    const pages = paginateColumn(list, capacity, capacity)
    for (const page of pages) {
      const used = page.reduce((sum, index, position) => {
        const block = list[index]!
        return sum + block.height + (position === 0 ? 0 : block.gapBefore)
      }, 0)
      expect(used).toBeLessThanOrEqual(capacity)
    }
  })

  it('splits an enormous block onto its own page and carries on after it', () => {
    expect(paginateColumn(blocks(10, 1e9, 10, 10), 500, 500)).toEqual([[0], [1], [2, 3]])
  })

  it('returns a single empty page for an empty column even with no capacity', () => {
    expect(paginateColumn([], 0, 0)).toEqual([[]])
  })

  it('a fractional height from a zoomed browser still paginates', () => {
    expect(paginateColumn(blocks(100.4, 100.4, 100.4), 321.2, 500)).toEqual([[0, 1], [2]])
  })
})
