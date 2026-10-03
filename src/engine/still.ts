// A bot held still, as plain attribute values: thumbnails, strips and export
// draw this once per spec change and never subscribe to the ticker. The live
// bot starts from the same values and the same helpers draw its frames.
import {
  BX,
  BY,
  C,
  CUT,
  EYE_L,
  FSCALE,
  FX,
  FY,
  L,
  LID,
  R,
  RX,
  SPREAD,
  T,
  YAW,
} from './contracts'
import {
  DEG,
  SHORT,
  THIN,
  bodyPath,
  drawn,
  edge,
  eyePath,
  lensPath,
  limbPath,
  r,
  small,
  smooth,
} from './geometry'
import { pose } from './pose'
import type { BotSpec, Shade } from './spec'

export const INK = '#1b1b1b'
/** Light eyes: warm paper, not pure white. */
export const PAPER = '#f6f3ec'
/** Toward the upper-left light: a shading band is the part shifted by this. */
export const LIGHT = [-1, -1.15]
/** Limbs in drawing order, all behind the body. */
export const ORDER = [T, C, L, R]

/** A bot this light is white: it would vanish on a white page, so it is outlined. */
export const WHITE = 0.9

export function isWhite(color: { l: number }) {
  return color.l >= WHITE
}

export type Colors = {
  fill: string
  dark: string
  deep: string
  hi: string
  /** A white bot's outline: about 3.4:1 on a white page. */
  line: string
}

/** The part colour and its shading tones, in OKLCH. */
export function colors(l: number, c: number, h: number): Colors {
  return {
    fill: `oklch(${l} ${c} ${h})`,
    dark: `oklch(${r4(l - 0.09)} ${r4(c * 1.02)} ${r4(h + 4)})`,
    deep: `oklch(${r4(l - 0.17)} ${r4(c * 0.95)} ${r4(h + 8)})`,
    hi: `oklch(${r4(l + 0.08)} ${r4(c)} ${r4(h)})`,
    line: `oklch(0.62 0.02 ${r4(h)})`,
  }
}

/**
 * A white bot's outline width in viewBox units, or null when it needs none:
 * at least one screen pixel shows past the figure at any size.
 */
export function contourAt(color: { l: number }, size: number) {
  return isWhite(color) ? Math.max(1.6, r4(200 / size)) : null
}

function r4(value: number) {
  return Math.round(value * 10000) / 10000
}

/** Shading needs pixels: below 24 px everything draws flat. */
export function shadeAt(shade: Shade, size: number): Shade {
  return size < 24 ? 'flat' : shade
}

/** Two white ticks on the body's upper-right shoulder, wherever that is. */
export function glossPath(b: ArrayLike<number>) {
  const a = -50 * DEG
  const reach = edge(b, -50) - 7
  const x = b[BX] + Math.cos(a) * reach
  const y = b[BY] + Math.sin(a) * reach
  return `M${r(x - 3)} ${r(y + 2)}l2.2 -4.6M${r(x + 2)} ${r(y + 5)}l2.2 -4.6`
}

/**
 * The soft light, in each part's own box: every part, ears and horns too, is
 * lit at its own upper left, so tips far above the body never fall into the
 * dark rim.
 */
export const SOFT = { cx: 0.35, cy: 0.28, r: 0.85 }

/** Where a flat upper lid cuts both eyes (face units), or null for none. */
export function cutLine(f: ArrayLike<number>, s: number) {
  if (f[CUT] < 0.005) return null
  let h = 0
  for (let i = 0; i < 2; i++) {
    const at = EYE_L + i * 4
    h = Math.max(
      h,
      Math.abs(Math.sin(f[at] * DEG)) * f[at + 1] * (1 - 0.1 * s) +
        (f[at + 3] * (1 + 0.5 * s)) / 2,
    )
  }
  return r(-h * (1 - f[CUT]))
}

/** One eye's path: a stroked arc, or a filled lens of the same numbers. */
export function eyeShape(
  lens: boolean,
  angle: number,
  half: number,
  bend: number,
  width: number,
  side: number,
) {
  return lens
    ? lensPath(angle, half, bend, width, side)
    : eyePath(angle, half, bend, side)
}

/**
 * Ink fits the size: whatever the sliders say, an eye in `e` ([angle, half,
 * bend, width], face units) never draws thinner than THIN or shorter than
 * SHORT. `px` is screen px per face unit.
 */
export function ink(e: Float64Array | number[], px: number) {
  e[3] = Math.max(e[3], THIN / px)
  e[1] = Math.max(e[1], (SHORT / px - e[3]) / 2)
}

/** How a turned face slides across the body and narrows. */
export function yawOf(f: ArrayLike<number>, b: ArrayLike<number>, spin = 0) {
  const yaw = Math.max(-1, Math.min(1, f[YAW] + spin))
  return { slide: 0.42 * b[RX] * yaw, squeeze: 1 - 0.35 * yaw * yaw }
}

export type Eye = { x: number; lid: number; d: string; width: number }

export type Still = {
  viewBox: string
  /** Outer scale: bots fill a little more of a small box. */
  scale: number
  shade: Shade
  colors: Colors
  /** Tail, centre, left, right, all behind the body; '' where not drawn. */
  limbs: string[]
  body: string
  gloss: string
  /** Outline width behind the figure, for a white bot; null otherwise. */
  contour: number | null
  lens: boolean
  /** The eyes' colour. */
  ink: string
  face: {
    x: number
    y: number
    scale: number
    /** Horizontal narrowing of a turned face. */
    squeeze: number
    opacity: number
    cut: number | null
  }
  eyes: [Eye, Eye]
}

/** 'snug' frames the figure at its own width, standing on the frame's floor. */
export type Crop = 'face' | 'top' | 'fit' | 'snug' | null

/** The narrowest side a fitted bot gets, so most share one scale and only wide ones shrink. */
const FIT = 72

/**
 * A frame round the figure: every point of its paths, control points too, so
 * nothing drawn falls outside. Never under FIT units tall; square and centred,
 * or snug: only as wide as the figure, its lowest point on the floor.
 */
function fit(paths: string[], scale: number, snug: boolean) {
  let [x0, y0, x1, y1] = [Infinity, Infinity, -Infinity, -Infinity]
  for (const d of paths) {
    const n = d.match(/-?\d+(\.\d+)?(e-?\d+)?/g) ?? []
    for (let i = 0; i + 1 < n.length; i += 2) {
      x0 = Math.min(x0, +n[i])
      x1 = Math.max(x1, +n[i])
      y0 = Math.min(y0, +n[i + 1])
      y1 = Math.max(y1, +n[i + 1])
    }
  }
  if (snug) {
    const h = Math.max(y1 - y0, FIT) * 1.04 * scale
    const w = (x1 - x0) * 1.04 * scale
    const x = ((x0 + x1) / 2) * scale - w / 2
    return `${x} ${y1 * scale + 0.02 * h - h} ${w} ${h}`
  }
  const side = Math.max(x1 - x0, y1 - y0, FIT) * 1.04 * scale
  const x = ((x0 + x1) / 2) * scale - side / 2
  const y = ((y0 + y1) / 2) * scale - side / 2
  return `${x} ${y} ${side} ${side}`
}

export function still(
  spec: BotSpec,
  size: number,
  expression = 'idle',
  crop: Crop = null,
): Still {
  const p = pose(spec, expression, size < 24)
  const bx = p.body[BX]
  const by = p.body[BY]
  const f = p.face
  const s = small(size)
  const grow = f[FSCALE] * (1 + 0.3 * s)
  const bold = 1 + 0.5 * s
  const lens = spec.eyes.shape === 'lens'
  const { slide, squeeze } = yawOf(f, p.body)
  const face = {
    x: bx + f[FX] + slide,
    y: by + f[FY],
    scale: grow,
    squeeze,
    opacity: smooth(0.9, 1.4, 6 * bold * grow * (size / 100)),
    cut: cutLine(f, s),
  }
  const scale = 1 + 0.08 * s
  const eyes = [0, 1].map(function (i): Eye {
    const side = i ? 1 : -1
    const at = EYE_L + i * 4
    const e = [f[at], f[at + 1] * (1 - 0.1 * s), f[at + 2], f[at + 3] * bold]
    ink(e, (grow * scale * size) / 100)
    const width = Math.round(e[3] * 100) / 100
    return {
      x: side * f[SPREAD],
      lid: f[LID],
      d: eyeShape(lens, e[0], e[1], e[2], width, side),
      width,
    }
  }) as [Eye, Eye]
  const limbs = ORDER.map((i) =>
    drawn(p.limbs[i]) ? limbPath(p.limbs[i], bx, by, 1) : '',
  )
  const body = bodyPath(p.body)
  let viewBox = '-50 -50 100 100'
  if (crop === 'fit' || crop === 'snug')
    viewBox = fit([...limbs, body], scale, crop === 'snug')
  else if (crop === 'face') {
    const half = (f[SPREAD] + 8) * grow * scale
    viewBox = `${face.x * scale - half} ${face.y * scale - half} ${2 * half} ${2 * half}`
  } else if (crop === 'top') viewBox = '-35 -50 70 70'
  return {
    viewBox,
    scale,
    shade: shadeAt(spec.shade, size),
    colors: colors(spec.color.l, spec.color.c, spec.color.h),
    limbs,
    body,
    gloss: spec.shade === 'gloss' ? glossPath(p.body) : '',
    // A face crop sits on the bot's own colour: nothing to outline.
    contour: crop === 'face' ? null : contourAt(spec.color, size),
    lens,
    ink: spec.eyes.ink === 'light' ? PAPER : INK,
    face,
    eyes,
  }
}
