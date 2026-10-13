export interface MeasuredBlock {
  height: number
  /** Space above the block when it does not start a page. */
  gapBefore: number
}

/**
 * Distributes blocks of one column over pages, in order. Returns block indices
 * per page. A block that is taller than a whole page gets a page of its own.
 */
export function paginateColumn(
  blocks: MeasuredBlock[],
  firstPageCapacity: number,
  pageCapacity: number,
): number[][] {
  const pages: number[][] = [[]]
  let used = 0
  let capacity = firstPageCapacity

  blocks.forEach((block, index) => {
    const current = pages[pages.length - 1]!
    const needed = current.length === 0 ? block.height : block.gapBefore + block.height
    if (current.length > 0 && used + needed > capacity) {
      pages.push([index])
      used = block.height
      capacity = pageCapacity
    } else {
      current.push(index)
      used += needed
    }
  })

  return pages
}
