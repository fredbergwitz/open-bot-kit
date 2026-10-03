// Seats a group by silhouette: each bot stands as close to its neighbours as
// its own outline allows. Bodies never touch; an ear or a tail may tuck behind
// a neighbour a little, never across it. Any topper or tail, now or later,
// stays readable in the group without hand-tuned places.
import {
  ALPHA,
  BASE,
  BULGE,
  CURL,
  DELTA,
  LENGTH,
  RHO,
  TIP,
  type Seat,
} from './contracts'
import { DEG, drawn, outline, small } from './geometry'
import { pose } from './pose'
import type { BotSpec } from './spec'

/**
 * Left to right, each seat as [whose, scale, lift]: yours (0) in front, the
 * others smaller and higher, as if further back. A pair, a huddle of three,
 * then a low arc whose ends stand furthest back.
 */
const ROWS: [number, number, number][][] = [
  [[0, 1, 0]],
  [
    [1, 0.88, 0.04],
    [0, 1, 0],
  ],
  [
    [1, 0.8, 0.14],
    [0, 1, 0],
    [2, 0.78, 0.15],
  ],
  [
    [2, 0.74, 0.19],
    [0, 1, 0],
    [1, 0.86, 0.07],
    [3, 0.72, 0.2],
  ],
  [
    [3, 0.66, 0.27],
    [1, 0.8, 0.12],
    [0, 1, 0],
    [2, 0.78, 0.13],
    [4, 0.64, 0.28],
  ],
]
/** Air between two bodies, in units of your bot's size. */
const AIR = 0.05
/** How far an ear or tail may tuck behind a neighbour, in units of your bot's size. */
const TUCK = 0.07

type Reach = { body: number; left: number; right: number }
const reaches = new WeakMap<BotSpec, Reach>()

/** How far the body, and the whole figure with its limbs, reach either side of centre (box units). */
function reach(spec: BotSpec): Reach {
  let r = reaches.get(spec)
  if (r) return r
  const p = pose(spec, 'idle', false)
  const hull = outline(p.body)
  let body = 0
  for (let i = 0; i < hull.length; i += 2)
    body = Math.max(body, Math.abs(hull[i]))
  let left = -body
  let right = body
  for (const limb of p.limbs) {
    if (!drawn(limb)) continue
    // Walk the spine, widened by its half width, as limbPath draws it.
    let x = Math.cos(limb[ALPHA] * DEG) * limb[RHO]
    left = Math.min(left, x - limb[BASE])
    right = Math.max(right, x + limb[BASE])
    for (let i = 1; i <= 16; i++) {
      const turn =
        (limb[ALPHA] + limb[DELTA] + (limb[CURL] * (i - 0.5)) / 16) * DEG
      x += (Math.cos(turn) * limb[LENGTH]) / 16
      const half =
        limb[BASE] +
        ((limb[TIP] - limb[BASE]) * i) / 16 +
        Math.max(0, limb[BULGE]) * Math.sin((Math.PI * i) / 16)
      left = Math.min(left, x - half)
      right = Math.max(right, x + half)
    }
  }
  r = { body, left: -left, right }
  reaches.set(spec, r)
  return r
}

/** Seats for `specs` (yours first) with your bot `unit` px tall, and the box they need. */
export function arrange(specs: BotSpec[], unit: number) {
  const row = ROWS[specs.length - 1]
  const height = Math.round(unit * 1.2)
  const placed = row.map(([who, k, lift]) => {
    const size = Math.round(unit * k)
    // Box units to px, with the outer scale small bots draw at.
    const px = (size * (1 + 0.08 * small(size))) / 100
    const r = reach(specs[who])
    return {
      who,
      lift,
      size,
      body: r.body * px,
      left: r.left * px,
      right: r.right * px,
      x: 0,
    }
  })
  for (let i = 1; i < placed.length; i++) {
    const a = placed[i - 1]
    const b = placed[i]
    b.x =
      a.x +
      Math.max(a.body + b.body + AIR * unit, a.right + b.left - TUCK * unit)
  }
  const pad = 0.05 * unit
  const start = Math.min(...placed.map((p) => p.x - p.left)) - pad
  const width = Math.round(
    Math.max(...placed.map((p) => p.x + p.right)) + pad - start,
  )
  const seats: Seat[] = []
  const lifts: number[] = []
  for (const p of placed) {
    const spec = specs[p.who]
    // Everyone's floor on one line, the ones further back a little higher.
    const floor = ((spec.body.y + spec.body.ry) / 100) * p.size
    seats[p.who] = {
      x: p.x - start,
      y: height * 0.92 - p.lift * unit - floor,
      size: p.size,
      spec,
    }
    lifts[p.who] = p.lift
  }
  /** Back to front, yours drawn last. */
  const order = seats
    .map((_, i) => i)
    .sort((a, b) => lifts[b] - lifts[a] || b - a)
  return { seats, order, width, height }
}
