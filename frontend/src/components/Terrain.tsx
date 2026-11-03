import { useId } from 'react'
import type { DeptInfo } from '../depts'

/** Each department's territory, drawn as an SVG texture in its own ink. */
export function Terrain({ kind, color, opacity = 0.35, className = '' }: {
  kind: DeptInfo['terrain']
  color: string
  opacity?: number
  className?: string
}) {
  const id = useId().replace(/:/g, '')
  return (
    <svg aria-hidden className={`absolute inset-0 w-full h-full pointer-events-none ${className}`} style={{ opacity }}>
      <defs>{PATTERNS[kind](id, color)}</defs>
      <rect width="100%" height="100%" fill={`url(#${id})`} />
    </svg>
  )
}

const PATTERNS: Record<DeptInfo['terrain'], (id: string, c: string) => React.ReactNode> = {
  // IT: a circuit grid with nodes and traces
  circuit: (id, c) => (
    <pattern id={id} width="48" height="48" patternUnits="userSpaceOnUse">
      <path d="M0 24h14l6-6h8M24 0v10l8 8v30M40 48V34l8-8" fill="none" stroke={c} strokeWidth="1" />
      <circle cx="28" cy="18" r="2.2" fill="none" stroke={c} />
      <circle cx="14" cy="24" r="1.6" fill={c} />
      <circle cx="40" cy="34" r="1.6" fill={c} />
    </pattern>
  ),
  // HR: topographic contour rings, soft and human
  contours: (id, c) => (
    <pattern id={id} width="160" height="160" patternUnits="userSpaceOnUse">
      {[14, 28, 42, 56, 70].map((r, i) => (
        <path key={r} fill="none" stroke={c} strokeWidth="1"
          d={`M${80 - r} 80c0-${r * 0.6} ${r * 0.45}-${r} ${r}-${r}s${r} ${r * 0.5} ${r} ${r * 0.95}-${r * 0.5} ${r * 1.05}-${r} ${r * 1.05}-${r}-${r * 0.4}-${r}-${r}`}
          transform={`rotate(${i * 9} 80 80)`} />
      ))}
    </pattern>
  ),
  // Consultants: a triangulation survey network
  survey: (id, c) => (
    <pattern id={id} width="90" height="78" patternUnits="userSpaceOnUse">
      <path d="M0 0L45 78L90 0ZM0 78L45 0L90 78M0 39h90" fill="none" stroke={c} strokeWidth="0.9" />
      <circle cx="45" cy="0" r="2" fill={c} /><circle cx="0" cy="78" r="2" fill={c} />
      <circle cx="90" cy="78" r="2" fill={c} /><circle cx="45" cy="78" r="2" fill="none" stroke={c} />
    </pattern>
  ),
  // Finance: ledger ruling with a margin line and tick marks
  ledger: (id, c) => (
    <pattern id={id} width="120" height="22" patternUnits="userSpaceOnUse">
      <path d="M0 21.5h120" stroke={c} strokeWidth="0.9" />
      <path d="M24 0v22" stroke={c} strokeWidth="1.4" />
      <path d="M70 17v4.5M94 17v4.5M118 17v4.5" stroke={c} strokeWidth="0.8" />
    </pattern>
  ),
}
