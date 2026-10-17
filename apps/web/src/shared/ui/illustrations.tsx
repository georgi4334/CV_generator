/*
 * Decorative illustrations for the not-found and error pages. Drawn with the
 * illustration and glass tokens, so they follow the light and dark theme; the
 * floating parts stand still for people who prefer reduced motion.
 */

const float = 'animate-float motion-reduce:animate-none'

/** A four-pointed sparkle centred on (x, y). */
function Sparkle({
  x,
  y,
  size,
  className,
}: {
  x: number
  y: number
  size: number
  className?: string
}) {
  const s = size / 2
  const k = size / 8
  return (
    <path
      d={`M${x} ${y - s}C${x + k} ${y - k} ${x + k} ${y - k} ${x + s} ${y}C${x + k} ${y + k} ${x + k} ${y + k} ${x} ${y + s}C${x - k} ${y + k} ${x - k} ${y + k} ${x - s} ${y}C${x - k} ${y - k} ${x - k} ${y - k} ${x} ${y - s}Z`}
      className={className}
    />
  )
}

function Gradient({ id }: { id: string }) {
  return (
    <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
      <stop offset="0" style={{ stopColor: 'var(--color-illus-1)' }} />
      <stop offset="1" style={{ stopColor: 'var(--color-illus-2)' }} />
    </linearGradient>
  )
}

/** "4 🔍 4": a magnifying glass searching a page, as the zero of 404. */
export function LostPageIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 360 200" aria-hidden className={className}>
      <defs>
        <Gradient id="lost-gradient" />
      </defs>
      <ellipse cx="180" cy="186" rx="110" ry="8" className="fill-glass-edge" />
      <text
        x="20"
        y="160"
        fontSize="150"
        fontWeight="800"
        fill="url(#lost-gradient)"
        style={{ fontFamily: 'inherit' }}
      >
        4
      </text>
      <text
        x="250"
        y="160"
        fontSize="150"
        fontWeight="800"
        fill="url(#lost-gradient)"
        style={{ fontFamily: 'inherit' }}
      >
        4
      </text>
      <g className={float}>
        {/* The page being searched for. */}
        <g transform="rotate(-8 175 100)">
          <rect
            x="140"
            y="48"
            width="70"
            height="92"
            rx="8"
            className="fill-surface stroke-glass-border"
            strokeWidth="2"
          />
          <rect x="152" y="62" width="34" height="6" rx="3" className="fill-illus-1 opacity-70" />
          {[78, 90, 102, 114].map((y) => (
            <rect
              key={y}
              x="152"
              y={y}
              width={y === 114 ? 28 : 46}
              height="4"
              rx="2"
              className="fill-skeleton"
            />
          ))}
        </g>
        {/* The magnifying glass. */}
        <circle cx="186" cy="104" r="40" className="fill-glass" />
        <circle
          cx="186"
          cy="104"
          r="40"
          fill="none"
          stroke="url(#lost-gradient)"
          strokeWidth="10"
        />
        <path
          d="M214 134l26 26"
          stroke="url(#lost-gradient)"
          strokeWidth="14"
          strokeLinecap="round"
        />
        <text
          x="186"
          y="118"
          textAnchor="middle"
          fontSize="40"
          fontWeight="700"
          className="fill-illus-3"
          style={{ fontFamily: 'inherit' }}
        >
          ?
        </text>
      </g>
      <Sparkle x={128} y={34} size={16} className="fill-illus-3" />
      <Sparkle x={246} y={30} size={12} className="fill-illus-1" />
      <Sparkle x={300} y={178} size={10} className="fill-illus-2" />
      <circle cx="96" cy="182" r="4" className="fill-illus-2 opacity-60" />
      <circle cx="268" cy="58" r="3" className="fill-illus-3 opacity-70" />
    </svg>
  )
}

/** A page torn in two, with a spark where it broke. */
export function BrokenPageIllustration({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 240 200" aria-hidden className={className}>
      <defs>
        <Gradient id="broken-gradient" />
      </defs>
      <ellipse cx="120" cy="186" rx="80" ry="7" className="fill-glass-edge" />
      <g className={float}>
        <g transform="rotate(-7 90 110)">
          <path
            d="M62 46h52l-8 30 12 24-14 22 10 38H62a8 8 0 0 1-8-8V54a8 8 0 0 1 8-8z"
            className="fill-surface stroke-glass-border"
            strokeWidth="2"
          />
          <rect x="68" y="62" width="30" height="6" rx="3" className="fill-illus-1 opacity-70" />
          {[80, 92, 104].map((y) => (
            <rect key={y} x="68" y={y} width="34" height="4" rx="2" className="fill-skeleton" />
          ))}
        </g>
        <g transform="translate(14 4) rotate(8 150 110)">
          <path
            d="M128 46h50a8 8 0 0 1 8 8v98a8 8 0 0 1-8 8h-48l-10-38 14-22-12-24z"
            className="fill-surface stroke-glass-border"
            strokeWidth="2"
          />
          {[80, 92, 104, 116].map((y) => (
            <rect
              key={y}
              x="140"
              y={y}
              width={y === 116 ? 22 : 36}
              height="4"
              rx="2"
              className="fill-skeleton"
            />
          ))}
        </g>
      </g>
      {/* The spark. */}
      <path
        d="M126 18l-14 30h12l-8 26 24-34h-13l9-22z"
        fill="url(#broken-gradient)"
        className={float}
      />
      <Sparkle x={52} y={30} size={14} className="fill-illus-3" />
      <Sparkle x={200} y={36} size={12} className="fill-illus-2" />
      <Sparkle x={214} y={168} size={10} className="fill-illus-1" />
      <circle cx="34" cy="150" r="4" className="fill-illus-2 opacity-60" />
    </svg>
  )
}
