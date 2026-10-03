// Eyes squeezed shut while the whole bot stretches up, then sinks back.
import {
  EYE_L,
  EYE_R,
  L,
  R,
  SQUASH,
  STRETCH,
  type Expression,
} from '../../contracts'
import { arc, key } from '../moods'

export default {
  label: 'Yawn',
  hold: false,
  duration: 2.4,
  delays: [0.1, 0.05, 0.1, 0],
  pose(rest, _spec, tiny, out) {
    for (const at of [EYE_L, EYE_R])
      arc(
        out.face,
        at,
        3.8,
        tiny ? -3.4 : -2.4,
        Math.max(3.4, rest.face[at + 3] * 0.6),
      )
  },
  step(ctx, _dt, since) {
    if (ctx.reduced) return
    const up = key(since, [
      [0, 0],
      [1, 1],
      [1.6, 1],
      [2.2, 0],
    ])
    ctx.goal(SQUASH, 0.09 * up * ctx.spec.traits.squash)
    ctx.goal(STRETCH + L, 0.14 * up)
    ctx.goal(STRETCH + R, 0.14 * up)
  },
} satisfies Expression
