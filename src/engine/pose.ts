// Spec to pose: the rest pose and the targets of held expressions.
import {
  BODY,
  EYE_L,
  EYE_R,
  FACE,
  FIGURE,
  FSCALE,
  FX,
  FY,
  LIMB,
  LIMBS,
  RY,
  SPREAD,
  T,
  type Pose,
} from './contracts'
import { DEG, SHORT, THIN, collapse, drawn, fit, halfWidth } from './geometry'
import { expressions, tops } from './parts'
import type { BotSpec } from './spec'

// Eye slot offsets from EYE_L or EYE_R.
const HALF = 1
const WIDTH = 3

/** Numbers in one pose: body, the four limbs, face, figure. */
export const SIZE = BODY + LIMBS * LIMB + FACE + FIGURE

/** A pose whose parts are views on one buffer, so it blends as one vector. */
export function blank(): Pose {
  const all = new Float64Array(SIZE)
  const face = BODY + LIMBS * LIMB
  return {
    body: all.subarray(0, BODY),
    limbs: Array.from({ length: LIMBS }, (_, i) =>
      all.subarray(BODY + i * LIMB, BODY + (i + 1) * LIMB),
    ),
    face: all.subarray(face, face + FACE),
    figure: all.subarray(face + FACE),
  }
}

/** The whole pose as one vector. */
export function vector(p: Pose) {
  return new Float64Array(p.body.buffer)
}

/** The pose `spec` holds for `expression` ('idle' is rest). */
export function pose(
  spec: BotSpec,
  expression: string,
  tiny: boolean,
  out = blank(),
) {
  const b = spec.body
  // Weight widens much more than it lifts, and the floor stays put. A wide
  // body at full weight stops short of the box.
  const ry = b.ry * b.heft ** 0.4
  out.body.set([
    0,
    b.y + b.ry * (1 - b.heft ** 0.4),
    Math.min(b.rx * b.heft, 46),
    ry,
    b.square,
    b.egg,
    b.low,
    b.bend,
    b.point,
    b.lobes,
    b.depth,
    b.wobble,
  ])
  const e = spec.eyes
  out.face.set([
    e.x,
    e.y,
    b.heft ** 0.8,
    e.spread,
    e.angleL,
    e.half,
    e.bend,
    e.width,
    e.angleR,
    e.half,
    e.bend,
    e.width,
    e.lid,
    e.cut,
    0,
  ])
  out.figure.set([0, 0, 0, 1])
  tops[spec.top.kind].limbs(spec, out.body, expression, tiny, out.limbs)
  if (drawn(spec.tail)) out.limbs[T].set(fit(spec.tail, out.body))
  else collapse(out.limbs[T])
  const shape = expressions[expression]?.pose
  if (shape) shape(pose(spec, 'idle', tiny), spec, tiny, out)
  fitFace(out.body, out.face)
  return out
}

/**
 * Face-fit, Caret's rule for any body: the eyes keep their gap inside the
 * body's width at face height and under any narrowing where they peak, sit
 * inside its height, and never touch; on a face too small for all of that,
 * they shrink until it fits. Sized for 16 px, where a face draws 1.3 times
 * larger with strokes 1.5 times bolder and a touch shorter, and never under
 * the ink floor: the most room a face ever needs. A face that already fits is
 * untouched.
 */
function fitFace(body: Float64Array, face: Float64Array) {
  const s = face[FSCALE] * 1.3
  // Screen px per face unit at 16 px, for the ink floor (ink() in still.ts).
  const px = s * 1.08 * 0.16
  for (let tries = 0; tries < 6; tries++) {
    let reach = 0
    let tall = 0
    let rise = 0
    let wide = 0
    for (const at of [EYE_L, EYE_R]) {
      const width = Math.max(face[at + WIDTH] * 1.5, THIN / px)
      const half = Math.max(face[at + HALF] * 0.9, (SHORT / px - width) / 2)
      const up = Math.abs(Math.sin(face[at] * DEG)) * half
      wide = Math.max(wide, width / 2)
      // An upright arc (laughing's `> <`) bows sideways by its bend.
      const across =
        Math.abs(Math.cos(face[at] * DEG)) * half +
        Math.abs(Math.sin(face[at] * DEG) * face[at + 2])
      reach = Math.max(reach, across + wide)
      tall = Math.max(tall, up + wide)
      rise = Math.max(rise, up - face[at + 2])
    }
    const top = body[RY] - tall * s - 3
    face[FY] = Math.max(-top, Math.min(top, face[FY]))
    const x = Math.abs(face[FX])
    // Room at the face's line, and up where an eye peaks (a tall stroke, a
    // `^` arc), where the body may be narrower; the peak is mid-eye.
    const most = Math.min(
      (halfWidth(body, face[FY]) - x - 1) / s - reach,
      (halfWidth(body, face[FY] - (rise + wide) * s) - x) / s - wide,
    )
    if (most >= reach + 0.4 || tries === 5) {
      face[SPREAD] = Math.max(reach + 0.4, Math.min(most, face[SPREAD]))
      return
    }
    for (const at of [EYE_L, EYE_R]) {
      face[at + HALF] *= 0.85
      face[at + 2] *= 0.85
      face[at + WIDTH] *= 0.85
    }
  }
}
