// A stalk in the centre with a ball on a short hinge at its tip. Spec limb a
// is the stalk, b the ball (its delta leans from the stalk's heading). The
// ball's hinge is limb L, so the rig's ear life gives it a springy bob.
import {
  BASE,
  BX,
  BY,
  C,
  CURL,
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
  label: 'Antenna',
  knobs: ['Stalk length', 'Ball size', 'Straight / bent'],
  limbs(spec, body, expression, tiny, out) {
    const { size, tips, droop } = spec.top
    const lift =
      expression === 'listening'
        ? 1
        : expression === 'happy'
          ? 0.3
          : (LIFT[expression] ?? 0)
    const stalk = rooted(spec.top.a, spec, body)
    stalk[LENGTH] *= size
    stalk[CURL] += 40 * droop
    // Up straightens it toward vertical; down bends it over.
    if (lift > 0) {
      stalk[CURL] *= 1 - lift
      stalk[DELTA] *= 1 - lift
    } else stalk[CURL] += 55 * lift
    // A whole pixel of stalk at 16 px, or it vanishes.
    if (tiny) stalk[BASE] = stalk[TIP] = Math.max(stalk[BASE], 2.4)
    contain(stalk, body[BY], 42)
    const ball = Float64Array.from(spec.top.b)
    const grow = 1 + 0.5 * tips + (tiny ? 0.4 : 0)
    ball[BASE] *= grow
    ball[TIP] *= grow
    const end = tip(stalk, body[BX], body[BY])
    rootAt(ball, end.x, end.y, end.heading, body[BX], body[BY])
    out[C].set(stalk)
    out[L].set(ball)
    out[R].set(mirror(tuck(Float64Array.from(stalk))))
  },
  live(ctx) {
    if (ctx.reduced || ctx.tiny) return
    // The ball bobs on its own, and jumps to each syllable of a voice nearby.
    ctx.goal(
      TURN + L,
      7 * Math.sin(ctx.clock * 1.7) +
        3 * Math.sin(ctx.clock * 2.9) +
        16 * ctx.speaking,
    )
  },
} satisfies TopKind
