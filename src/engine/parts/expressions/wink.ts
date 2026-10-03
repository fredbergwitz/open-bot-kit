// One eye closes into an arc while the head tips toward it and that ear
// flicks. The wink is on the bot's head-cock side.
import {
  EYE_L,
  EYE_R,
  L,
  R,
  TILT,
  TURN,
  type Expression,
} from '../../contracts'
import { arc, key, side } from '../moods'

export default {
  label: 'Wink',
  hold: false,
  duration: 1,
  delays: [0.04, 0.06, 0.06, 0],
  pose(rest, spec, tiny, out) {
    const at = side(spec) > 0 ? EYE_R : EYE_L
    arc(
      out.face,
      at,
      4.2,
      tiny ? -3.6 : -2.6,
      Math.max(3.6, rest.face[at + 3] * 0.75),
    )
  },
  enter(ctx) {
    const s = side(ctx.spec)
    ctx.kick(TURN + (s > 0 ? R : L), 260 * s)
  },
  step(ctx, _dt, since) {
    if (ctx.reduced) return
    const lean = key(since, [
      [0, 0],
      [0.15, 1],
      [0.7, 1],
      [1, 0],
    ])
    ctx.goal(TILT, 6 * lean * side(ctx.spec))
  },
} satisfies Expression
