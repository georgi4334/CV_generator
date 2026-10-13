/**
 * Subtle page backgrounds, drawn as small SVG tiles tinted with the accent
 * color. Kept light so text stays readable and printing stays cheap.
 */
export const BACKGROUNDS = [
  { id: 'none', label: 'Plain' },
  { id: 'dots', label: 'Dots' },
  { id: 'grid', label: 'Grid' },
  { id: 'diagonal', label: 'Diagonal lines' },
  { id: 'cross', label: 'Crosses' },
  { id: 'waves', label: 'Waves' },
  { id: 'hexagons', label: 'Hexagons' },
  { id: 'corner', label: 'Corner glow' },
] as const

export type BackgroundId = (typeof BACKGROUNDS)[number]['id']

function tile(size: number, body: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${body}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

/** CSS background-image for a background id, or undefined for a plain page. */
export function backgroundImage(id: string, accent: string): string | undefined {
  const c = accent
  switch (id) {
    case 'dots':
      return tile(18, `<circle cx="2" cy="2" r="1.2" fill="${c}" fill-opacity="0.18"/>`)
    case 'grid':
      return tile(24, `<path d="M24 0H0V24" fill="none" stroke="${c}" stroke-opacity="0.08"/>`)
    case 'diagonal':
      return tile(
        14,
        `<path d="M-2 16L16 -2M12 16L16 12" stroke="${c}" stroke-opacity="0.08" stroke-width="1"/>`,
      )
    case 'cross':
      return tile(
        28,
        `<path d="M14 10v8M10 14h8" stroke="${c}" stroke-opacity="0.14" stroke-width="1"/>`,
      )
    case 'waves':
      return tile(
        40,
        `<path d="M0 20q10-8 20 0t20 0" fill="none" stroke="${c}" stroke-opacity="0.09"/>`,
      )
    case 'hexagons':
      return tile(
        28,
        `<path d="M14 2l10 6v12l-10 6-10-6V8z" fill="none" stroke="${c}" stroke-opacity="0.08"/>`,
      )
    case 'corner':
      return `radial-gradient(circle at 100% 0%, ${c}22 0, transparent 35%), radial-gradient(circle at 0% 100%, ${c}14 0, transparent 30%)`
    default:
      return undefined
  }
}
