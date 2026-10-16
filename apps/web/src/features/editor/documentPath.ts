/**
 * Paths address a text value inside a CvDocument, using ids for sections and
 * items so they stay valid when things move:
 *   header.name
 *   sections.<sectionId>.text
 *   sections.<sectionId>.items.<itemId>.title
 *   sections.<sectionId>.items.<itemId>.bullets.<index>
 */
export function setAtPath(root: unknown, path: string, value: unknown): boolean {
  const segments = path.split('.')
  let node: unknown = root

  for (let i = 0; i < segments.length - 1; i++) {
    node = step(node, segments[i]!)
    if (node === undefined) return false
  }

  const last = segments[segments.length - 1]!
  if (Array.isArray(node)) {
    const index = Number(last)
    if (!Number.isInteger(index) || index < 0 || index >= node.length) return false
    node[index] = value
    return true
  }
  if (node !== null && typeof node === 'object' && last in node) {
    ;(node as Record<string, unknown>)[last] = value
    return true
  }
  return false
}

function step(node: unknown, segment: string): unknown {
  if (Array.isArray(node)) {
    const byId = node.find(
      (entry) => entry !== null && typeof entry === 'object' && entry.id === segment,
    )
    if (byId !== undefined) return byId
    const index = Number(segment)
    return Number.isInteger(index) ? node[index] : undefined
  }
  if (node !== null && typeof node === 'object') return (node as Record<string, unknown>)[segment]
  return undefined
}

/** The value at a path (see setAtPath), or undefined when the path does not exist. */
export function getAtPath(root: unknown, path: string): unknown {
  let node: unknown = root
  for (const segment of path.split('.')) {
    node = step(node, segment)
    if (node === undefined) return undefined
  }
  return node
}
