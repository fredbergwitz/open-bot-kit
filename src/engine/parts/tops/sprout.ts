// Sprout's seedling: a stem in the centre and a leaf rooted on its tip, swaying
// in a breeze that never repeats. Spec limb a is the stem, b the leaf (its
// delta leans from the stem's heading).
import {
  BASE,
  BULGE,
  BX,
  BY,
  C,
  DELTA,
  L,
  LENGTH,
  R,
  TIP,
  TURN,
  type TopKind,
} from '../../contracts'
import { mirror, rootAt, tip } from '../../geometry'
import { contain, rooted, tuck } from '../limbs'
import { LIFT } from '../moods'

export default {
  label: 'Sprout',
  knobs: ['Stem length', 'Leaf size', 'Perky / droopy'],
  limbs(spec, body, expression, tiny, out) {
    const { size, tips, droop } = spec.top
    const lift =
      expression === 'listening'
        ? 0.8
        : expression === 'happy'
          ? 0.4
          : (LIFT[expression] ?? 0)
    const stem = rooted(spec.top.a, spec, body)
    stem[LENGTH] *= size
    if (tiny) stem[BASE] = stem[TIP] = Math.max(stem[BASE], 2.8)
    contain(stem, body[BY], 40)
    const leaf = Float64Array.from(spec.top.b)
    const grow = 1 + 0.45 * tips + (tiny ? 0.3 : 0)
    leaf[LENGTH] *= grow
    leaf[BASE] *= grow
    leaf[TIP] *= grow
    leaf[BULGE] *= grow
    // The leaf hangs from its stem: droop and moods swing it about its root.
    leaf[DELTA] -=
      50 * Math.max(0, droop - lift) - 30 * Math.max(0, lift - droop)
    const end = tip(stem, body[BX], body[BY])
    rootAt(leaf, end.x, end.y, end.heading, body[BX], body[BY])
    out[C].set(stem)
    out[L].set(contain(leaf, body[BY]))
    out[R].set(mirror(tuck(Float64Array.from(stem))))
  },
  live(ctx) {
    if (ctx.reduced || ctx.tiny) return
    const t = ctx.clock
    // Two slow gusts and a faint flutter, as in Sprout's breeze.
    ctx.goal(
      TURN + L,
      7 * Math.sin((t * 2 * Math.PI) / 3.3) +
        3 * Math.sin((t * 2 * Math.PI) / 7.9 + 1.3) +
        1.2 * Math.sin((t * 2 * Math.PI) / 1.3) -
        // A voice nearby lifts the leaf, syllable by syllable.
        14 * ctx.speaking,
    )
  },
} satisfies TopKind
