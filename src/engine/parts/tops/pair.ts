// Ears' two ears: spec limb `a` is the left ear and `b` the right, both in the
// left-ear convention. own(), fit(), perk() and relax() are Ears' own.
import {
  ALPHA,
  BASE,
  BULGE,
  BY,
  C,
  CURL,
  DELTA,
  FOLD,
  L,
  LENGTH,
  R,
  RHO,
  STRETCH,
  TIP,
  type TopKind,
} from '../../contracts'
import { DEG, collapse, fit as root, mirror, smooth } from '../../geometry'
import type { BotSpec, Limb } from '../../spec'

type Knobs = { size: number; tips: number; droop: number }

/** How far an ear's outline reaches from the box centre (folds ignored, so never short). */
function reach(ear: Float64Array, by: number) {
  let x = Math.cos(ear[ALPHA] * DEG) * ear[RHO]
  let y = by + Math.sin(ear[ALPHA] * DEG) * ear[RHO]
  let far = 0
  for (let i = 1; i <= 16; i++) {
    const turn = (ear[ALPHA] + ear[DELTA] + (ear[CURL] * (i - 0.5)) / 16) * DEG
    x += (Math.cos(turn) * ear[LENGTH]) / 16
    y += (Math.sin(turn) * ear[LENGTH]) / 16
    const half =
      ear[BASE] +
      ((ear[TIP] - ear[BASE]) * i) / 16 +
      ear[BULGE] * Math.sin((Math.PI * i) / 16)
    far = Math.max(far, Math.hypot(x, y) + half)
  }
  return far
}

/** Ears never reach past this, so no knob setting spills into a neighbour. */
const ROOM = 50

/** The ear with the knobs applied. */
function own(out: Float64Array, knobs: Knobs, by: number) {
  const grow = Math.sqrt(knobs.size)
  out[LENGTH] *= knobs.size
  out[BASE] *= grow
  out[TIP] *= grow
  out[BULGE] *= grow
  if (knobs.tips > 0) {
    // A point needs some length, or a short round ear turns into a flat cap.
    out[LENGTH] += knobs.tips * Math.max(0, 16 - out[LENGTH])
    out[TIP] += (1.2 - out[TIP]) * knobs.tips
  } else {
    // Rounder and fuller, but a tapered ear keeps its taper: a round cat ear
    // stays a cat ear instead of turning into a rabbit's.
    const blunt = smooth(0.4, 0.9, out[TIP] / out[BASE])
    out[TIP] += (Math.max(out[TIP], out[BASE] * 0.6) - out[TIP]) * -knobs.tips
    out[BULGE] -= 1.2 * knobs.tips * blunt
  }
  if (knobs.droop > 0) {
    // Long ears flop over at the fold until the tip hangs; short ones splay,
    // since a short ear folded over is just a flat cap.
    const give = smooth(14, 28, out[LENGTH]) * knobs.droop
    out[DELTA] -= 22 * knobs.droop - 12 * give
    const tip = out[ALPHA] + out[DELTA] + out[CURL] + out[FOLD]
    out[FOLD] += Math.min(0, -225 - tip) * give
  } else {
    out[DELTA] -= 14 * knobs.droop
    out[CURL] *= 1 + 0.7 * knobs.droop
    out[FOLD] *= 1 + 0.6 * knobs.droop
  }
  // Past this an ear curls under the body and the silhouette is lost.
  out[CURL] = Math.max(-125, Math.min(125, out[CURL]))
  // A hanging ear stops at straight down: hooked back in, it reads as a horn.
  out[CURL] += Math.max(0, -270 - out[ALPHA] - out[DELTA] - out[CURL])
  fit(out, by)
  return out
}

/** Shorten an ear until its outline fits the room. */
function fit(ear: Float64Array, by: number) {
  const base = Math.hypot(
    Math.cos(ear[ALPHA] * DEG) * ear[RHO],
    by + Math.sin(ear[ALPHA] * DEG) * ear[RHO],
  )
  for (let i = 0; i < 3; i++) {
    const far = reach(ear, by)
    if (far <= ROOM) return
    ear[LENGTH] *= Math.max(0.5, (ROOM - base) / (far - base))
  }
}

/** Ears up, straight and a little wider, cupped toward you. */
function perk(
  ear: Float64Array,
  amount: number,
  tiny: boolean,
  by: number,
  out: Float64Array,
) {
  out.set(ear)
  const heading = ear[ALPHA] + ear[DELTA]
  // Roots climb the head a little, so a turned ear never shows its base.
  out[ALPHA] += (-100 - ear[ALPHA]) * 0.25 * amount
  out[DELTA] = heading + (-98 - heading) * amount - out[ALPHA]
  out[RHO] -= 2
  // At 16 px the ears stand clearly taller: a whole-pixel cue.
  out[LENGTH] = tiny
    ? Math.min(ear[LENGTH] * 1.3, 40)
    : Math.min(ear[LENGTH] * 1.15, 34)
  out[CURL] *= 0.25
  out[FOLD] *= 0.12
  out[BASE] *= 1.08
  out[TIP] *= 1.1
  fit(out, by)
}

/** Content: upright ears splay, hanging ones loosen and swing out. */
function relax(ear: Float64Array, tiny: boolean, out: Float64Array) {
  out.set(ear)
  out[DELTA] += Math.abs(ear[CURL]) > 60 ? 10 : tiny ? -28 : -16
  out[LENGTH] *= 0.96
}

function ear(limb: Limb, spec: BotSpec, body: Float64Array) {
  const spread = limb.slice() as Limb
  spread[ALPHA] -= spec.top.spread
  return own(root(spread, body), spec.top, body[BY])
}

export default {
  label: 'Ears',
  knobs: ['Ear size', 'Round / pointed', 'Perky / droopy'],
  limbs(spec, body, expression, tiny, out) {
    const by = body[BY]
    const left = ear(spec.top.a, spec, body)
    const right = ear(spec.top.b, spec, body)
    if (expression === 'listening') {
      // Below 24 px every ear perks fully: listening needs its silhouette there.
      const amount = tiny ? 1 : spec.traits.perk
      perk(left, amount, tiny, by, out[L])
      perk(right, amount, tiny, by, out[R])
    } else if (expression === 'happy') {
      relax(left, tiny, out[L])
      relax(right, tiny, out[R])
    } else {
      out[L].set(left)
      out[R].set(right)
    }
    mirror(out[R])
    collapse(out[C])
  },
  live(ctx) {
    // A voice nearby (a speaker in the group): the ears catch each syllable.
    if (!ctx.speaking || ctx.reduced || ctx.tiny) return
    ctx.goal(STRETCH + L, 0.14 * ctx.speaking)
    ctx.goal(STRETCH + R, 0.11 * ctx.speaking)
  },
} satisfies TopKind
