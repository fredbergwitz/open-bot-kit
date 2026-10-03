// Nodding off: the lids sink and the head drops, then it jolts awake.
import {
  CUT,
  FY,
  GAZE_Y,
  LID,
  LIFT,
  SQUASH,
  TILT,
  type Expression,
} from '../../contracts'
import { key, side } from '../moods'

export default {
  label: 'Doze',
  hold: false,
  duration: 2.6,
  delays: [0.3, 0.2, 0.4, 0],
  pose(rest, _spec, _tiny, out) {
    out.face[CUT] = 0.75
    out.face[LID] = rest.face[LID] * 0.7
    out.face[FY] += 1.5
  },
  step(ctx, dt, since) {
    if (since - dt < 2.55 && since >= 2.55) {
      ctx.blink(0.05)
      ctx.kick(LIFT, 24)
    }
    if (ctx.reduced) return
    const dip = key(since, [
      [0, 0],
      [2.3, 1],
      [2.55, 1],
      [2.6, 0],
    ])
    ctx.goal(GAZE_Y, 1.2 * dip)
    ctx.goal(SQUASH, -0.05 * dip)
    ctx.goal(TILT, 4 * dip * side(ctx.spec))
  },
} satisfies Expression
