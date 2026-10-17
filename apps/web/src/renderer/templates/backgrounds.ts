import type { CSSProperties } from 'react'

/**
 * Page backgrounds tinted with the accent colour, kept light so text stays
 * readable and printing stays cheap. The first ones are small repeating SVG
 * tiles; the "artwork" ones are drawn once over the whole page (contour lines,
 * a honeycomb in a corner, a halftone wave…).
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
  { id: 'honeycomb', label: 'Honeycomb' },
  { id: 'topography', label: 'Contour lines' },
  { id: 'triangles', label: 'Triangles' },
  { id: 'flow', label: 'Flowing lines' },
  { id: 'geometric', label: 'Geometric' },
  { id: 'halftone', label: 'Halftone wave' },
  { id: 'chevrons', label: 'Chevrons' },
  { id: 'ribbons', label: 'Ribbons' },
  { id: 'horizon', label: 'Dot horizon' },
  { id: 'stripes', label: 'Chevron stripes' },
  { id: 'rings', label: 'Rings' },
] as const

export type BackgroundId = (typeof BACKGROUNDS)[number]['id']

function tile(size: number, body: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}">${body}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

/** Artwork is drawn on an A4-shaped canvas in millimetres and scaled to cover the page. */
const W = 210
const H = 297

function artwork(body: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="${W}" height="${H}" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice">${body}</svg>`
  return `url("data:image/svg+xml,${encodeURIComponent(svg)}")`
}

/** Rounds coordinates so the SVG stays short. */
const n = (value: number) => Math.round(value * 10) / 10

/** A small seeded random generator, so artwork looks the same every time. */
function random(seed: number) {
  let a = seed
  return () => {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/**
 * How artwork is painted: lines and fills in the accent colour. `strength`
 * makes them bolder for the small previews in Design & Font.
 */
interface Paint {
  line: (opacity: number, width?: number) => string
  fill: (opacity: number) => string
}

function paint(c: string, strength: number): Paint {
  const o = (opacity: number) => n(Math.min(1, opacity * strength) * 100) / 100
  return {
    line: (opacity, width = 0.4) =>
      `fill="none" stroke="${c}" stroke-opacity="${o(opacity)}" stroke-width="${width < 1 ? n(width * Math.sqrt(strength) * 10) / 10 : width}"`,
    fill: (opacity) => `fill="${c}" fill-opacity="${o(opacity)}"`,
  }
}

/** Pointy hexagons around the top-right corner, fading away from it. */
function honeycomb(p: Paint) {
  const r = 9
  const dx = Math.sqrt(3) * r
  const dy = 1.5 * r
  const reach = 120
  const cells: string[] = []
  for (let row = -1; row < 12; row++) {
    for (let col = 0; col < 16; col++) {
      const cx = col * dx + (row % 2 ? dx / 2 : 0)
      const cy = row * dy
      const fade = 1 - Math.hypot(W - cx, cy) / reach
      if (fade <= 0) continue
      const points = Array.from({ length: 6 }, (_, i) => {
        const angle = (Math.PI / 3) * i + Math.PI / 6
        return `${n(cx + (r - 1) * Math.cos(angle))},${n(cy + (r - 1) * Math.sin(angle))}`
      }).join(' ')
      cells.push(`<polygon points="${points}" ${p.line(0.28 * fade, 0.5)}/>`)
    }
  }
  return cells.join('')
}

/** Contour lines like a map: wobbly rings around two points. */
function topography(p: Paint) {
  const ring = (cx: number, cy: number, radius: number, k: number) => {
    const points = Array.from({ length: 73 }, (_, i) => {
      const t = (i / 72) * Math.PI * 2
      const wobble = 1 + 0.13 * Math.sin(3 * t + k * 0.45) + 0.07 * Math.sin(5 * t - k * 0.3)
      return `${n(cx + radius * wobble * Math.cos(t))},${n(cy + radius * wobble * Math.sin(t))}`
    })
    return `<polyline points="${points.join(' ')}" ${p.line(0.16)}/>`
  }
  const lines: string[] = []
  for (let k = 1; k <= 16; k++) lines.push(ring(185, 30, k * 9, k))
  for (let k = 1; k <= 9; k++) lines.push(ring(15, 285, k * 8, k + 7))
  return lines.join('')
}

/** A triangle lattice that fades out from the top-right corner. */
function triangles(p: Paint) {
  const side = 20
  const h = (side * Math.sqrt(3)) / 2
  const lines: string[] = []
  for (let y = 0; y <= H; y += h) lines.push(`M0 ${n(y)}H${W}`)
  const slope = Math.tan(Math.PI / 3)
  for (let x = -H; x <= W + H; x += side) {
    lines.push(`M${n(x)} 0L${n(x + H / slope)} ${H}`)
    lines.push(`M${n(x)} 0L${n(x - H / slope)} ${H}`)
  }
  return `<defs><radialGradient id="f" cx="1" cy="0" r="0.75"><stop offset="0" stop-color="#fff"/><stop offset="1" stop-color="#000"/></radialGradient><mask id="m"><rect width="${W}" height="${H}" fill="url(#f)"/></mask></defs><path d="${lines.join('')}" ${p.line(0.22)} mask="url(#m)"/>`
}

/** Many thin lines sweeping across the lower half of the page. */
function flow(p: Paint) {
  const lines: string[] = []
  for (let i = 0; i < 30; i++) {
    lines.push(
      `<path d="M-10 ${n(150 + i * 4.5)}C60 ${n(110 + i * 6)} 130 ${n(270 + i * 1.5)} 220 ${n(190 + i * 4)}" ${p.line(0.14)}/>`,
    )
  }
  return lines.join('')
}

/** Large outlined squares turned at different angles, and a few long lines. */
function geometric(p: Paint) {
  const square = (x: number, y: number, size: number, angle: number) =>
    `<rect x="${x - size / 2}" y="${y - size / 2}" width="${size}" height="${size}" transform="rotate(${angle} ${x} ${y})" ${p.line(0.18, 0.5)}/>`
  return [
    square(190, 25, 70, 18),
    square(175, 45, 46, 38),
    square(20, 270, 64, -14),
    square(40, 285, 36, 22),
    `<path d="M120 0L210 120M0 200L90 297M150 297L210 230" ${p.line(0.14)}/>`,
  ].join('')
}

/** Dots that grow along a wave near the bottom of the page. */
function halftone(p: Paint) {
  const dots: string[] = []
  const step = 5
  for (let x = step / 2; x < W; x += step) {
    const wave = 250 + 22 * Math.sin(x / 32)
    for (let y = 190; y < H; y += step) {
      const size = 1 - Math.abs(y - wave) / 48
      if (size <= 0.1) continue
      dots.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(1.25 * size)}"/>`)
    }
  }
  return `<g ${p.fill(0.13)}>${dots.join('')}</g>`
}

/** Small chevrons scattered over the page, pointing in different directions. */
function chevrons(p: Paint) {
  const next = random(7)
  const marks: string[] = []
  for (let i = 0; i < 34; i++) {
    const x = n(next() * W)
    const y = n(next() * H)
    const angle = Math.floor(next() * 4) * 90
    marks.push(`<path d="M-4 -2L0 2L4 -2" transform="translate(${x} ${y}) rotate(${angle})"/>`)
  }
  return `<g ${p.line(0.22, 0.6)} stroke-linecap="round" stroke-linejoin="round">${marks.join('')}</g>`
}

/** Parallel wavy lines across the top of the page. */
function ribbons(p: Paint) {
  const lines: string[] = []
  for (let i = 0; i < 22; i++) {
    const y = 8 + i * 3.6
    lines.push(
      `<path d="M-5 ${n(y)}C60 ${n(y - 30)} 130 ${n(y + 45)} 215 ${n(y + 5)}" ${p.line(0.15)}/>`,
    )
  }
  return lines.join('')
}

/** Rows of dots in perspective, shrinking towards a horizon. */
function horizon(p: Paint) {
  const dots: string[] = []
  for (let row = 0; row < 16; row++) {
    const t = row / 15
    const y = H - 6 - 85 * Math.pow(t, 0.8)
    const gap = 7 - 4.5 * t
    const r = 1.3 - 0.95 * t
    for (let x = (row % 2) * (gap / 2); x < W; x += gap) {
      dots.push(`<circle cx="${n(x)}" cy="${n(y)}" r="${n(r)}"/>`)
    }
  }
  return `<g ${p.fill(0.18)}>${dots.join('')}</g>`
}

/** Wide nested chevrons rising from the bottom-right corner. */
function stripes(p: Paint) {
  const bands: string[] = []
  for (let i = 0; i < 9; i++) {
    const top = 205 + i * 13
    bands.push(`M110 ${top + 60}L175 ${top}L240 ${top + 60}`)
  }
  return `<path d="${bands.join('')}" ${p.line(0.07, 5)}/>`
}

/** Concentric circles from two opposite corners. */
function rings(p: Paint) {
  const circles: string[] = []
  for (let r = 30; r <= 230; r += 12) circles.push(`<circle cx="235" cy="320" r="${r}"/>`)
  for (let r = 18; r <= 110; r += 12) circles.push(`<circle cx="-20" cy="-20" r="${r}"/>`)
  return `<g ${p.line(0.14)}>${circles.join('')}</g>`
}

const ARTWORK: Record<string, (paint: Paint) => string> = {
  honeycomb,
  topography,
  triangles,
  flow,
  geometric,
  halftone,
  chevrons,
  ribbons,
  horizon,
  stripes,
  rings,
}

/** CSS background-image for a background id, or undefined for a plain page. */
export function backgroundImage(id: string, accent: string, strength = 1): string | undefined {
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
    default: {
      const draw = ARTWORK[id]
      return draw ? artwork(draw(paint(c, strength))) : undefined
    }
  }
}

/** How much bolder artwork is drawn in the small previews, so it shows at that size. */
const PREVIEW_STRENGTH = 4

const cache = new Map<string, CSSProperties>()

/**
 * The page's background as CSS: tiles repeat, artwork covers the whole page
 * once. `preview` draws artwork bolder and shows all of it, for the picker.
 */
export function backgroundStyle(id: string, accent: string, preview = false): CSSProperties {
  const key = `${id}|${accent}|${preview}`
  const cached = cache.get(key)
  if (cached) return cached
  const isArtwork = id in ARTWORK
  const image = backgroundImage(id, accent, preview ? PREVIEW_STRENGTH : 1)
  const style: CSSProperties =
    image && isArtwork
      ? {
          backgroundImage: image,
          backgroundSize: preview ? '100% 100%' : 'cover',
          backgroundPosition: 'center',
          backgroundRepeat: 'no-repeat',
        }
      : { backgroundImage: image }
  cache.set(key, style)
  return style
}
