// What expressions share: how far each lifts or droops the topper, and the
// keyframe curve their timed beats run on.
import { BY, CURL, DELTA, L, LENGTH, R, SPREAD, type Pose } from '../contracts'
import { mirror, smooth } from '../geometry'
import type { BotSpec } from '../spec'
import { contain } from './limbs'

/**
 * How far each expression lifts (+1: up and forward) or droops (-1: down and
 * back) whatever sits on top; today's expressions only droop. Topper kinds read it for the limbs they own;
 * Ears' pair takes it through lift() below. Horns ignore it.
 */
export const LIFT: Record<string, number> = {
  smug: -0.15,
  content: -0.3,
  sleepy: -0.75,
  sad: -1,
}

/** Droop Ears' ears for `id`: they swing out and back, a little shorter. */
export function lift(spec: BotSpec, out: Pose, id: string) {
  const amount = LIFT[id] ?? 0
  if (spec.top.kind !== 'pair' || !amount) return
  const right = mirror(out.limbs[R])
  for (const ear of [out.limbs[L], right]) {
    ear[DELTA] += 38 * amount
    ear[CURL] *= 1 - 0.3 * amount
    ear[LENGTH] *= 1 + 0.2 * amount
    contain(ear, out.body[BY])
  }
  mirror(right)
}

/** Eased value along [time, value] keys; holds the ends. */
export function key(t: number, keys: readonly (readonly [number, number])[]) {
  if (t <= keys[0][0]) return keys[0][1]
  for (let i = 1; i < keys.length; i++) {
    const [t1, v1] = keys[i]
    if (t <= t1) {
      const [t0, v0] = keys[i - 1]
      return v0 + (v1 - v0) * smooth(t0, t1, t)
    }
  }
  return keys[keys.length - 1][1]
}

/** Which way this bot cocks its head: -1 left, 1 right. */
export function side(spec: BotSpec) {
  return spec.traits.cock < 0 ? -1 : 1
}

/**
 * Lay eye `at` flat as an arc (bend < 0 is `^`, > 0 is `u`), shortened on a
 * narrow face so the pair never meets, even at 16 px where strokes grow 1.5.
 */
export function arc(
  face: Float64Array,
  at: number,
  half: number,
  bend: number,
  width: number,
) {
  const fits = Math.max(0.6, (face[SPREAD] - 0.75 * width - 0.5) / 0.9)
  const k = Math.min(1, fits / half)
  face[at] = 0
  face[at + 1] = half * k
  face[at + 2] = bend * k
  face[at + 3] = width
}
