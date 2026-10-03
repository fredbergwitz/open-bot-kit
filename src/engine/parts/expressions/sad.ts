// Held: slumped. The body sags low and wide, the face hangs at the bottom of
// it with small downcast eyes, the ears hang, and now and then it sighs.
import {
  BREATH,
  EYE_L,
  EYE_R,
  FY,
  GAZE_Y,
  LID,
  SQUASH,
  TALL,
  TILT,
  WIDE,
  type Expression,
} from '../../contracts'
import { key, lift, side } from '../moods'

export default {
  label: 'Sad',
  hold: true,
  delays: [0.12, 0.08, 0.16, 0.04],
  pose(rest, spec, _tiny, out) {
    const f = out.face
    f[FY] += 4
    f[EYE_L + 1] *= 0.75
    f[EYE_R + 1] *= 0.75
    f[LID] = rest.face[LID] * 0.85
    lift(spec, out, 'sad')
    out.figure[TALL] = -0.1
    out.figure[WIDE] = 0.05
    out.figure[BREATH] = 0.7
  },
  step(ctx, _dt, since) {
    ctx.look(0, 0, 0)
    ctx.goal(GAZE_Y, 1.6)
    if (ctx.reduced) return
    ctx.goal(TILT, 3 * side(ctx.spec))
    const sigh = key(since % 5.5, [
      [3, 0],
      [3.8, 1],
      [4.8, 0],
    ])
    ctx.goal(SQUASH, -0.05 * sigh)
  },
} satisfies Expression
