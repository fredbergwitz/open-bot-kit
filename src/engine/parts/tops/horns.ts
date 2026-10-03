// Two stiff horns: they never perk or flop, so every expression wears the
// same pair. Spec limbs a and b are the left and right horn.
import {
  BASE,
  BULGE,
  C,
  CURL,
  DELTA,
  L,
  LENGTH,
  R,
  TIP,
  type TopKind,
} from '../../contracts'
import { collapse, mirror } from '../../geometry'
import type { BotSpec, Limb } from '../../spec'
import { contain, rooted } from '../limbs'

function horn(limb: Limb, spec: BotSpec, body: Float64Array) {
  const out = rooted(limb, spec, body)
  const { size, tips, droop } = spec.top
  const grow = Math.sqrt(size)
  out[LENGTH] *= size
  out[BASE] *= grow
  out[TIP] *= grow
  out[BULGE] *= grow
  // Curl: straight spikes to tight inward hooks.
  out[CURL] *= 1 + tips
  // Up and in, or out to the sides like a ram's.
  out[DELTA] -= 30 * droop
  return contain(out, body[1])
}

export default {
  label: 'Horns',
  knobs: ['Horn size', 'Straight / curled', 'Up / out'],
  limbs(spec, body, _expression, _tiny, out) {
    out[L].set(horn(spec.top.a, spec, body))
    out[R].set(mirror(horn(spec.top.b, spec, body)))
    collapse(out[C])
  },
} satisfies TopKind
