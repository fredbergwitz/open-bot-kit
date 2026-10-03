// Humming a tune: smiling eyes, a slow rock from side to side, ears swaying.
import {
  EYE_L,
  EYE_R,
  L,
  R,
  TILT,
  TURN,
  type Expression,
} from '../../contracts'
import { arc } from '../moods'

export default {
  label: 'Hum',
  hold: false,
  duration: 3.2,
  pose(rest, _spec, _tiny, out) {
    for (const at of [EYE_L, EYE_R])
      arc(
        out.face,
        at,
        Math.max(3, rest.face[at + 1]),
        -1.2,
        Math.min(5, rest.face[at + 3]),
      )
  },
  step(ctx, _dt, since) {
    if (ctx.reduced) return
    const rock =
      Math.sin(since * Math.PI * 2 * 0.75) *
      Math.min(1, since / 0.4, (3.2 - since) / 0.6)
    ctx.goal(TILT, 4 * rock)
    ctx.goal(TURN + L, 9 * rock)
    ctx.goal(TURN + R, 9 * rock)
  },
} satisfies Expression
