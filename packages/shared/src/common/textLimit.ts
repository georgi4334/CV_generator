/**
 * The longest single text of a document (a summary, a bullet, a paragraph):
 * far more than anyone writes, short enough to keep a document readable and
 * its save small. Enforced when saving and while typing, not when reading, so
 * a document saved before the limit still opens.
 */
export const TEXT_MAX = 5000

/** True when no text anywhere in the value (arrays and objects are searched) is longer than `max`. */
export function withinTextLimit(value: unknown, max = TEXT_MAX): boolean {
  if (typeof value === 'string') return value.length <= max
  if (Array.isArray(value)) return value.every((item) => withinTextLimit(item, max))
  if (value && typeof value === 'object')
    return Object.values(value).every((item) => withinTextLimit(item, max))
  return true
}
