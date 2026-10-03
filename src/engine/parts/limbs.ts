// Small limb moves the topper kinds and expressions share.
import { ALPHA, BASE, BULGE, CURL, DELTA, LENGTH, RHO, TIP } from '../contracts'
import { DEG, fit } from '../geometry'
import type { BotSpec, Limb } from '../spec'

/** A spec limb rooted on the body edge, spread applied (left convention). */
export function rooted(limb: Limb, spec: BotSpec, body: Float64Array) {
  const spread = limb.slice() as Limb
  spread[ALPHA] -= spec.top.spread
  return fit(spread, body)
}

/** Fold a limb away where it stands: no length, no width, same root. */
export function tuck(limb: Float64Array) {
  limb[LENGTH] = 0
  limb[BASE] = 0
  limb[TIP] = 0
  limb[BULGE] = 0
  return limb
}

/** Furthest any outline point reaches from the box centre. */
export function reach(limb: Float64Array, by: number) {
  let x = Math.cos(limb[ALPHA] * DEG) * limb[RHO]
  let y = by + Math.sin(limb[ALPHA] * DEG) * limb[RHO]
  let far = Math.hypot(x, y) + limb[BASE]
  for (let i = 1; i <= 16; i++) {
    const turn =
      (limb[ALPHA] + limb[DELTA] + (limb[CURL] * (i - 0.5)) / 16) * DEG
    x += (Math.cos(turn) * limb[LENGTH]) / 16
    y += (Math.sin(turn) * limb[LENGTH]) / 16
    const half =
      limb[BASE] +
      ((limb[TIP] - limb[BASE]) * i) / 16 +
      Math.max(0, limb[BULGE]) * Math.sin((Math.PI * i) / 16)
    far = Math.max(far, Math.hypot(x, y) + half)
  }
  return far
}

/** Shorten a limb until it stays inside the 100-unit box. */
export function contain(limb: Float64Array, by: number, room = 49) {
  for (let i = 0; i < 4; i++) {
    const far = reach(limb, by)
    if (far <= room) return limb
    limb[LENGTH] *= Math.max(0.4, 1 - (far - room) / Math.max(limb[LENGTH], 1))
  }
  return limb
}
