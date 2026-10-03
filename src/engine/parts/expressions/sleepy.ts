// Held: nodding off. The lids sink until the eyes close as the head droops,
// it hangs there a moment, then catches itself and the lids open halfway
// again. Reduced motion keeps the lids and drops the head.
import {
  BREATH,
  CUT,
  FY,
  GAZE_Y,
  LID,
  LIFT,
  SHUT,
  SQUASH,
  TALL,
  TILT,
  type Expression,
} from '../../contracts'
import { key, lift, side } from '../moods'

const CYCLE = 4.5
const DROOP = [
  [0, 0],
  [2.3, 1],
  [3.1, 1],
  [3.25, 0],
] as const

export default {
  label: 'Sleepy',
  hold: true,
  delays: [0.1, 0.06, 0.14, 0],
  pose(rest, spec, _tiny, out) {
    const f = out.face
    f[CUT] = Math.max(rest.face[CUT], 0.4)
    f[LID] = rest.face[LID] * 0.85
    f[FY] += 1.5
    lift(spec, out, 'sleepy')
    out.figure[BREATH] = 1.6
    out.figure[TALL] = -0.03
  },
  step(ctx, dt, since) {
    const t = since % CYCLE
    const dip = key(t, DROOP)
    ctx.goal(SHUT, 0.25 + 0.7 * dip)
    if (ctx.reduced) return
    ctx.goal(GAZE_Y, 1.4 * dip)
    ctx.goal(SQUASH, -0.05 * dip)
    ctx.goal(TILT, 7 * dip * side(ctx.spec))
    // Catching itself: a small start as the head comes up.
    if (t - dt < 3.1 && t >= 3.1) ctx.kick(LIFT, 18)
  },
} satisfies Expression
