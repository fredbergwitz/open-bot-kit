// Bounds: whatever a person can make stays drawable. Over the seven, seeded
// shuffles and every slider at both ends, in every expression a still can
// hold: the outline stays inside the 100-unit box, the eyes stay on the body
// and never touch each other.
import { describe, expect, it } from 'vitest'
import { SHORT, THIN } from '../src/engine/geometry'
import { expressions } from '../src/engine/parts'
import { PRESETS, SEVEN } from '../src/engine/presets'
import { shuffle } from '../src/engine/shuffle'
import { apply, clamp, write, type BotSpec } from '../src/engine/spec'
import { still } from '../src/engine/still'

/** The creator's sliders and their ends. */
const SLIDERS: [string, number, number][] = [
  ['body.rx', 18, 36],
  ['body.ry', 18, 34],
  ['body.square', 1.8, 5],
  ['body.heft', 0.7, 1.4],
  ['body.wobble', 0, 0.06],
  ['top.size', 0.7, 1.4],
  ['top.tips', -1, 1],
  ['top.droop', -1, 1],
  ['top.spread', -12, 12],
  ['eyes.half', 0.05, 6],
  ['eyes.width', 2, 10],
  ['eyes.spread', 3, 16],
  ['eyes.y', -10, 10],
]

function seeded(seed: number) {
  return function () {
    seed = (seed + 0x6d2b79f5) | 0
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

/** On-curve points of a path built from M and C commands. */
function points(d: string) {
  const n = d.match(/-?\d+(\.\d+)?(e-?\d+)?/g)!.map(Number)
  const out: [number, number][] = [[n[0], n[1]]]
  for (let i = 2; i + 5 < n.length + 1; i += 6) out.push([n[i + 4], n[i + 5]])
  return out
}

/** Points along a cubic path, every 1/8 of each segment. */
function samples(d: string) {
  const n = d.match(/-?\d+(\.\d+)?(e-?\d+)?/g)!.map(Number)
  const out: [number, number][] = []
  for (let i = 2; i + 5 < n.length + 1; i += 6) {
    const [x0, y0] = [n[i - 2], n[i - 1]]
    for (let k = 0; k <= 8; k++) {
      const t = k / 8
      const u = 1 - t
      const a = u * u * u
      const b = 3 * u * u * t
      const c = 3 * u * t * t
      const e = t * t * t
      out.push([
        a * x0 + b * n[i] + c * n[i + 2] + e * n[i + 4],
        a * y0 + b * n[i + 1] + c * n[i + 3] + e * n[i + 5],
      ])
    }
  }
  return out
}

/** Distance from p to the segment a-b. */
function gap(p: [number, number], a: [number, number], b: [number, number]) {
  const dx = b[0] - a[0]
  const dy = b[1] - a[1]
  const t = Math.max(
    0,
    Math.min(
      1,
      ((p[0] - a[0]) * dx + (p[1] - a[1]) * dy) / (dx * dx + dy * dy || 1),
    ),
  )
  return Math.hypot(p[0] - a[0] - t * dx, p[1] - a[1] - t * dy)
}

/** Inside the ring, or outside it by no more than `slack`. */
function inside(p: [number, number], ring: [number, number][], slack: number) {
  let hit = false
  let near = Infinity
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if (
      yi > p[1] !== yj > p[1] &&
      p[0] < ((xj - xi) * (p[1] - yi)) / (yj - yi) + xi
    )
      hit = !hit
    near = Math.min(near, gap(p, ring[i], ring[j]))
  }
  return hit || near <= slack
}

/** Each eye's stroked outline in body coordinates, as point rings. */
function eyes(s: ReturnType<typeof still>) {
  return s.eyes.map((eye) => {
    const rx = (eye.width / 2) * s.face.scale
    const ry = rx * eye.lid
    const out: [number, number][] = []
    for (const [ex, ey] of samples(eye.d)) {
      const cx = s.face.x + (eye.x + ex) * s.face.scale
      const cy = s.face.y + ey * eye.lid * s.face.scale
      for (let a = 0; a < 8; a++)
        out.push([
          cx + rx * Math.cos((a * Math.PI) / 4),
          cy + ry * Math.sin((a * Math.PI) / 4),
        ])
    }
    return out
  })
}

/** What is wrong with `spec` drawn at `size` in `expression`, if anything. */
function problems(spec: BotSpec, size: number, expression: string) {
  const s = still(spec, size, expression)
  const found: string[] = []
  // Ears' happy ears splay without refitting: gallery Ears swings Imp's
  // largest ears 2.2 units past the box, and the seven must match it. Paths
  // round to 0.01.
  const room = expression === 'happy' ? 52.5 : 50.05
  for (const d of [s.body, ...s.limbs].filter(Boolean))
    for (const [x, y] of points(d))
      if (!(Math.abs(x) <= room && Math.abs(y) <= room)) {
        found.push(`outline leaves the box at ${x.toFixed(1)}, ${y.toFixed(1)}`)
        break
      }
  const body = points(s.body)
  const [left, right] = eyes(s)
  // Half a device pixel past the outline cannot be seen.
  const slack = 50 / size
  if (![...left, ...right].every((p) => inside(p, body, slack)))
    found.push('an eye leaves the body')
  if (Math.max(...left.map(([x]) => x)) >= Math.min(...right.map(([x]) => x)))
    found.push('the eyes touch')
  return found
}

const MOODS = ['idle', ...Object.keys(expressions)]

function check(cases: [string, BotSpec][]) {
  const failures: string[] = []
  for (const [label, spec] of cases)
    for (const size of [16, 160])
      for (const mood of MOODS)
        for (const problem of problems(spec, size, mood))
          failures.push(`${label} ${size}px ${mood}: ${problem}`)
  return failures
}

// About 5 s per case list alone; the full suite runs files side by side.
describe('bot bounds', { timeout: 30_000 }, () => {
  it('the seven stay in bounds in every expression', () => {
    expect(check(SEVEN.map((id) => [id, PRESETS[id]]))).toEqual([])
  })

  it('seeded shuffles stay in bounds', () => {
    const rng = seeded(7)
    const cases: [string, BotSpec][] = []
    for (let i = 0; i < 200; i++) {
      const from = PRESETS[SEVEN[Math.floor(rng() * SEVEN.length)]]
      cases.push([`shuffle ${i}`, shuffle(rng, from)])
    }
    expect(check(cases)).toEqual([])
  })

  it('every slider end stays in bounds', () => {
    const cases: [string, BotSpec][] = []
    for (const id of SEVEN)
      for (const [path, min, max] of SLIDERS)
        for (const value of [min, max]) {
          const spec = apply(PRESETS[id], {})
          write(spec, path, value)
          cases.push([`${id} ${path}=${value}`, clamp(spec)])
        }
    expect(check(cases)).toEqual([])
  })

  it('the body sliders at their ends together stay in bounds', () => {
    const cases: [string, BotSpec][] = []
    for (const id of SEVEN)
      for (const rx of [18, 36])
        for (const ry of [18, 34])
          for (const heft of [0.7, 1.4]) {
            const spec = apply(PRESETS[id], { body: { rx, ry, heft } })
            cases.push([`${id} rx=${rx} ry=${ry} heft=${heft}`, spec])
          }
    expect(check(cases)).toEqual([])
  })

  it('the thinnest, shortest eyes still read at chat sizes', () => {
    const cases: [string, BotSpec][] = SEVEN.map((id) => {
      const spec = apply(PRESETS[id], { eyes: { half: 0, width: 2 } })
      return [`${id} thin short eyes`, clamp(spec)]
    })
    expect(check(cases)).toEqual([])
    for (const [, spec] of cases)
      for (const size of [16, 24, 32]) {
        const s = still(spec, size)
        const px = (s.face.scale * s.scale * size) / 100
        for (const eye of s.eyes) {
          const ends = points(eye.d)
          const chord = Math.hypot(
            ends[0][0] - ends.at(-1)![0],
            ends[0][1] - ends.at(-1)![1],
          )
          expect(eye.width * px).toBeGreaterThan(THIN - 0.01)
          expect((chord + eye.width) * px).toBeGreaterThan(SHORT - 0.01)
        }
      }
  })
})
