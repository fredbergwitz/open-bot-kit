// Held: the side-eye. Half-lidded eyes slide to one side while the chin
// lifts and the body leans back the other way, with a small toss of the head
// as it starts.
import {
  CUT,
  EYE_L,
  EYE_R,
  FY,
  GAZE_X,
  GAZE_Y,
  LEAN,
  LID,
  TALL,
  TILT,
  type Expression,
} from '../../contracts'
import { lift, side } from '../moods'

export default {
  label: 'Smug',
  hold: true,
  delays: [0.06, 0.03, 0.08, 0],
  pose(rest, spec, _tiny, out) {
    const f = out.face
    for (const at of [EYE_L, EYE_R]) f[at + 1] *= 0.9
    f[CUT] = Math.max(rest.face[CUT], 0.55)
    f[LID] = rest.face[LID] * 0.95
    f[FY] -= 2
    lift(spec, out, 'smug')
    out.figure[LEAN] = -6 * side(spec)
    out.figure[TALL] = 0.03
  },
  enter(ctx) {
    ctx.kick(TILT, -70 * side(ctx.spec))
  },
  step(ctx) {
    ctx.look(0, 0, 0)
    ctx.goal(GAZE_X, 2.6 * side(ctx.spec))
    ctx.goal(GAZE_Y, -0.3)
  },
} satisfies Expression
