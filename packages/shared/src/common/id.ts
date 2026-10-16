/** Random id for documents, sections and items. Works in browsers and Node 22+. */
export function createId(): string {
  return (globalThis as unknown as { crypto: { randomUUID(): string } }).crypto.randomUUID()
}
