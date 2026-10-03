// Outlines from pose vectors. Every pose is a short list of numbers, never a
// point list, so any pose blends into any other by mixing numbers and the
// outlines are rebuilt from the mix. Ears' limb and eye are reused unchanged;
// the body adds slots that are neutral at 0 and leave Ears' arithmetic
// untouched (x * 1, y + 0), so the seven reproduce bit for bit.
import {
  ALPHA,
  BODY,
  AT,
  BASE,
  BEND,
  BULGE,
  BX,
  BY,
  CURL,
  DELTA,
  DEPTH,
  EGG,
  FOLD,
  LENGTH,
  LOBES,
  LOW,
  POINT,
  RHO,
  RX,
  RY,
  SQUARE,
  TIP,
  WOBBLE,
} from './contracts'

export const DEG = Math.PI / 180

const SPINE = 24
const CAP = 16
const RAW = 2 * (SPINE + 1) + 2 * CAP
const LIMB_POINTS = 72
const BODY_POINTS = 48

const STRIDE = 6 // x, y, heading, half width, width slope, turn
const spine = new Float64Array((SPINE + 1) * STRIDE)
const raw = new Float64Array(RAW * 2)
const lengths = new Float64Array(RAW + 1)
const ring = new Float64Array(LIMB_POINTS * 2)
const hull = new Float64Array(BODY_POINTS * 2)

export function smooth(from: number, to: number, value: number) {
  const t = Math.min(1, Math.max(0, (value - from) / (to - from)))
  return t * t * (3 - 2 * t)
}

/** The thinnest eye stroke on screen, px: the least Ears' own faces draw. */
export const THIN = 1.25
/** The shortest eye mark on screen, px, end to end. */
export const SHORT = 2.2

/** 1 at 16 px, 0 from 160 px up: faces grow as the box shrinks. */
export function small(size: number) {
  return Math.min(
    1,
    Math.max(0, (Math.log2(160) - Math.log2(size)) / Math.log2(10)),
  )
}

/** Mirror a left limb into the right one, in place. */
export function mirror(limb: Float64Array) {
  limb[ALPHA] = -180 - limb[ALPHA]
  limb[DELTA] = -limb[DELTA]
  limb[CURL] = -limb[CURL]
  limb[FOLD] = -limb[FOLD]
  return limb
}

/** A limb folded away into the body centre: no length, no width. */
export function collapse(limb: Float64Array) {
  limb.fill(0)
  limb[AT] = 0.5
  return limb
}

/** Zero-width limbs are not drawn. */
export function drawn(limb: ArrayLike<number>) {
  return limb[BASE] > 0 || limb[TIP] > 0
}

/** Where the limb's root sits, for pivots. */
export function root(
  limb: Float64Array,
  bx: number,
  by: number,
  out: number[],
) {
  out[0] = bx + Math.cos(limb[ALPHA] * DEG) * limb[RHO]
  out[1] = by + Math.sin(limb[ALPHA] * DEG) * limb[RHO]
}

/** The body outline as 48 points at fixed parameter angles. */
export function outline(b: ArrayLike<number>, phase = 0, out = hull) {
  for (let i = 0; i < BODY_POINTS; i++) {
    const a = (i / BODY_POINTS) * Math.PI * 2
    const c = Math.cos(a)
    const s = Math.sin(a)
    const e = 2 / (s > 0 ? b[SQUARE] + b[LOW] : b[SQUARE])
    const y0 = b[RY] * Math.sign(s) * Math.abs(s) ** e
    let x =
      b[RX] * Math.sign(c) * Math.abs(c) ** e * (1 + (b[EGG] * y0) / b[RY])
    let y = y0
    if (b[BEND]) y += b[BEND] * ((x / b[RX]) ** 2 - 0.35) * b[RY]
    if (b[POINT] && y0 < 0) {
      const t = -y0 / b[RY]
      // Not quite to zero: a drop keeps a soft tip, never a needle.
      x *= 1 - 0.94 * b[POINT] * t ** 1.6
      y *= 1 + 0.32 * b[POINT] * t ** 3
    }
    if (b[DEPTH] || b[WOBBLE]) {
      const k =
        1 +
        b[DEPTH] * Math.cos(b[LOBES] * (a + Math.PI / 2)) +
        b[WOBBLE] *
          (0.6 * Math.sin(3 * a + 1.3 * phase) +
            0.4 * Math.sin(5 * a - 0.9 * phase))
      x *= k
      y *= k
    }
    out[i * 2] = b[BX] + x
    out[i * 2 + 1] = b[BY] + y
  }
  return out
}

export function bodyPath(b: ArrayLike<number>, phase = 0) {
  return curve(outline(b, phase), BODY_POINTS)
}

const held = new Float64Array(BODY_POINTS * 2)
const heldFor = new Float64Array(BODY).fill(NaN)

/** The still outline of `b`, kept while the same body is asked about again. */
function shape(b: ArrayLike<number>) {
  let same = true
  for (let i = 0; i < BODY; i++) if (heldFor[i] !== b[i]) same = false
  if (!same) {
    for (let i = 0; i < BODY; i++) heldFor[i] = b[i]
    outline(b, 0, held)
  }
  return held
}

/** Distance from the body centre to its edge along `alpha` degrees. */
export function edge(b: ArrayLike<number>, alpha: number) {
  const p = shape(b)
  const want = alpha * DEG
  // The outline is star-shaped about the centre: walk it and interpolate.
  for (let i = 0; i < BODY_POINTS; i++) {
    const j = (i + 1) % BODY_POINTS
    const a0 = Math.atan2(p[i * 2 + 1] - b[BY], p[i * 2] - b[BX])
    const a1 = Math.atan2(p[j * 2 + 1] - b[BY], p[j * 2] - b[BX])
    let d = a1 - a0
    if (d < -Math.PI) d += 2 * Math.PI
    let w = want - a0
    while (w < 0) w += 2 * Math.PI
    while (w >= 2 * Math.PI) w -= 2 * Math.PI
    if (w <= d) {
      const t = w / d
      return (
        Math.hypot(p[i * 2] - b[BX], p[i * 2 + 1] - b[BY]) * (1 - t) +
        Math.hypot(p[j * 2] - b[BX], p[j * 2 + 1] - b[BY]) * t
      )
    }
  }
  return b[RX]
}

/** Half width at height `y` from the centre: the room a face has. */
export function halfWidth(b: ArrayLike<number>, y: number) {
  const p = shape(b)
  let best = Infinity
  let w = 0
  for (let i = 0; i < BODY_POINTS; i++) {
    if (p[i * 2] < b[BX]) continue
    const d = Math.abs(p[i * 2 + 1] - b[BY] - y)
    if (d < best) {
      best = d
      w = p[i * 2] - b[BX]
    }
  }
  return w
}

/** Limb-fit: a spec limb (inset in slot 1) as a pose limb rooted on the body edge. */
export function fit(limb: ArrayLike<number>, body: ArrayLike<number>) {
  const out = Float64Array.from(limb)
  out[RHO] = edge(body, out[ALPHA]) - limb[RHO]
  return out
}

/** A limb's tip point and heading, so a child limb can root on it (stem, then leaf). */
export function tip(l: ArrayLike<number>, bx: number, by: number) {
  const start = l[ALPHA] * DEG
  const heading = start + l[DELTA] * DEG
  const curl = l[CURL] * DEG
  let x = bx + Math.cos(start) * l[RHO]
  let y = by + Math.sin(start) * l[RHO]
  for (let i = 0; i < 24; i++) {
    const theta = heading + curl * ((i + 0.5) / 24)
    x += (Math.cos(theta) * l[LENGTH]) / 24
    y += (Math.sin(theta) * l[LENGTH]) / 24
  }
  return { x, y, heading: (heading + curl) / DEG }
}

/** Express a child limb rooted at (x, y) heading `h` in polar limb slots, in place. */
export function rootAt(
  child: Float64Array,
  x: number,
  y: number,
  h: number,
  bx: number,
  by: number,
) {
  const heading = h + child[DELTA]
  child[ALPHA] = Math.atan2(y - by, x - bx) / DEG
  child[RHO] = Math.hypot(x - bx, y - by)
  child[DELTA] = heading - child[ALPHA]
  return child
}

/** Outline of one limb as SVG path data. `stretch` scales its length. */
export function limbPath(
  limb: Float64Array,
  bx: number,
  by: number,
  stretch: number,
) {
  const start = limb[ALPHA] * DEG
  const heading = start + limb[DELTA] * DEG
  const curl = limb[CURL] * DEG
  const at = limb[AT]
  const length = limb[LENGTH] * stretch
  // A stub too short for its width cannot fold without tearing itself open.
  const fold =
    limb[FOLD] * DEG * smooth(0.8, 1.8, length / (limb[BASE] + limb[TIP]))
  const step = length / SPINE
  let x = bx + Math.cos(start) * limb[RHO]
  let y = by + Math.sin(start) * limb[RHO]
  for (let i = 0; i <= SPINE; i++) {
    const u = i / SPINE
    const o = i * STRIDE
    spine[o] = x
    spine[o + 1] = y
    spine[o + 2] = heading + curl * u + fold * smooth(at - 0.25, at + 0.25, u)
    spine[o + 3] = Math.max(
      0.3,
      limb[BASE] +
        (limb[TIP] - limb[BASE]) * u +
        limb[BULGE] * Math.sin(Math.PI * u),
    )
    // Width change per unit of spine: the edges lean by it, so they meet the
    // round ends tangentially instead of leaving a knob on a pointed tip.
    const slope =
      (limb[TIP] - limb[BASE] + limb[BULGE] * Math.PI * Math.cos(Math.PI * u)) /
      Math.max(length, 1e-3)
    spine[o + 4] = Math.max(-0.9, Math.min(0.9, slope))
    const mid = u + 0.5 / SPINE
    const theta =
      heading + curl * mid + fold * smooth(at - 0.25, at + 0.25, mid)
    x += Math.cos(theta) * step
    y += Math.sin(theta) * step
  }
  // Turn per unit of spine, so the inside of a tight fold never loops over itself.
  for (let i = 0; i <= SPINE; i++) {
    const a = Math.max(0, i - 1)
    const b = Math.min(SPINE, i + 1)
    spine[i * STRIDE + 5] =
      (spine[b * STRIDE + 2] - spine[a * STRIDE + 2]) / (b - a)
  }
  let n = 0
  function push(px: number, py: number) {
    raw[n++] = px
    raw[n++] = py
  }
  /** One side of the spine: 1 is the left of the heading, -1 the right. */
  function side(i: number, sign: number) {
    const o = i * STRIDE
    const theta = spine[o + 2]
    const slope = spine[o + 4]
    const turn = spine[o + 5] * sign
    let half = spine[o + 3]
    if (step > 0.01 && turn * half > step) half = step / turn
    const along = -slope * half
    const across = Math.sqrt(1 - slope * slope) * half * sign
    push(
      spine[o] + Math.cos(theta) * along - Math.sin(theta) * across,
      spine[o + 1] + Math.sin(theta) * along + Math.cos(theta) * across,
    )
  }
  /** The round end at the tip (sign 1) or the base (sign -1). */
  function cap(i: number, sign: number) {
    const o = i * STRIDE
    const lean = Math.atan2(Math.sqrt(1 - spine[o + 4] ** 2), -spine[o + 4])
    const from = spine[o + 2] + (sign > 0 ? lean : -lean)
    const span = sign > 0 ? 2 * lean : 2 * Math.PI - 2 * lean
    for (let c = 1; c <= CAP; c++) {
      const a = from - (span * c) / (CAP + 1)
      push(
        spine[o] + Math.cos(a) * spine[o + 3],
        spine[o + 1] + Math.sin(a) * spine[o + 3],
      )
    }
  }
  for (let i = 0; i <= SPINE; i++) side(i, 1)
  cap(SPINE, 1)
  for (let i = SPINE; i >= 0; i--) side(i, -1)
  cap(0, -1)
  return curve(resample(n / 2), LIMB_POINTS)
}

/** Even spacing along the outline, so short or degenerate sides never kink. */
function resample(count: number) {
  lengths[0] = 0
  for (let i = 1; i <= count; i++) {
    const a = (i - 1) * 2
    const b = (i % count) * 2
    lengths[i] =
      lengths[i - 1] + Math.hypot(raw[b] - raw[a], raw[b + 1] - raw[a + 1])
  }
  const total = lengths[count]
  let j = 0
  for (let i = 0; i < LIMB_POINTS; i++) {
    const d = (i / LIMB_POINTS) * total
    while (j < count - 1 && lengths[j + 1] < d) j++
    const t = (d - lengths[j]) / (lengths[j + 1] - lengths[j] || 1)
    const a = j * 2
    const b = ((j + 1) % count) * 2
    ring[i * 2] = raw[a] + (raw[b] - raw[a]) * t
    ring[i * 2 + 1] = raw[a + 1] + (raw[b + 1] - raw[a + 1]) * t
  }
  return ring
}

/**
 * One eye: a stroked circular arc from (-half, 0) to (half, 0) whose middle
 * sits at (0, bend), so a pill (bend 0) bends into a round happy arc.
 */
export function eyePath(
  angle: number,
  half: number,
  bend: number,
  side: number,
) {
  const a = angle * DEG
  const c = Math.cos(a)
  const s = Math.sin(a)
  // A dot is an arc too short to see: its round caps draw it.
  half = Math.max(half, 0.01)
  // Cubic handles for a circular arc: they leave each end at half the sweep.
  const lean = 2 * Math.atan2(bend, half)
  const reach = ((2 / 3) * (half * half + bend * bend)) / half
  const hx = -half + reach * Math.cos(lean)
  const hy = reach * Math.sin(lean)
  function x(lx: number, ly: number) {
    return r(side * (lx * c - ly * s))
  }
  function y(lx: number, ly: number) {
    return r(lx * s + ly * c)
  }
  return `M${x(-half, 0)} ${y(-half, 0)}C${x(hx, hy)} ${y(hx, hy)} ${x(-hx, hy)} ${y(-hx, hy)} ${x(half, 0)} ${y(half, 0)}`
}

/**
 * A filled lens eye (Bubble's) over the same numbers as `eyePath`: as long as
 * the stroked arc and as thick as its stroke, an oval when straight and a
 * crescent as it bends.
 */
export function lensPath(
  angle: number,
  half: number,
  bend: number,
  width: number,
  side: number,
) {
  const a = angle * DEG
  const c = Math.cos(a)
  const s = Math.sin(a)
  const w = half + width / 2
  const top = width / 2 - bend
  const bottom = width / 2 + bend
  const k = 0.5523
  function p(lx: number, ly: number) {
    return `${r(side * (lx * c - ly * s))} ${r(lx * s + ly * c)}`
  }
  return (
    `M${p(-w, 0)}C${p(-w, -k * top)} ${p(-k * w, -top)} ${p(0, -top)}` +
    `C${p(k * w, -top)} ${p(w, -k * top)} ${p(w, 0)}` +
    `C${p(w, k * bottom)} ${p(k * w, bottom)} ${p(0, bottom)}` +
    `C${p(-k * w, bottom)} ${p(-w, k * bottom)} ${p(-w, 0)}Z`
  )
}

/** Closed Catmull-Rom curve through interleaved points, as SVG path data. */
function curve(p: Float64Array, count: number) {
  let d = `M${r(p[0])} ${r(p[1])}`
  for (let i = 0; i < count; i++) {
    const a = ((i + count - 1) % count) * 2
    const b = i * 2
    const c = ((i + 1) % count) * 2
    const e = ((i + 2) % count) * 2
    d += `C${r(p[b] + (p[c] - p[a]) / 6)} ${r(p[b + 1] + (p[c + 1] - p[a + 1]) / 6)} ${r(p[c] - (p[e] - p[b]) / 6)} ${r(p[c + 1] - (p[e + 1] - p[b + 1]) / 6)} ${r(p[c])} ${r(p[c + 1])}`
  }
  return d + 'Z'
}

export function r(value: number) {
  return Math.round(value * 100) / 100
}
