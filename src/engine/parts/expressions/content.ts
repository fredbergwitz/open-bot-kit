// Held: soft, smiling half-lids, relaxed ears, a slow sway.
import { EYE_L, EYE_R, LID, TILT, type Expression } from '../../contracts'
import { arc, lift } from '../moods'

export default {
  label: 'Content',
  hold: true,
  delays: [0.06, 0.04, 0.1, 0.02],
  pose(rest, spec, _tiny, out) {
    const f = out.face
    for (const at of [EYE_L, EYE_R])
      arc(
        f,
        at,
        Math.max(3, rest.face[at + 1]),
        -1.1,
        Math.min(5, rest.face[at + 3]),
      )
    f[LID] = rest.face[LID] * 0.9
    lift(spec, out, 'content')
  },
  step(ctx, _dt, since) {
    if (!ctx.reduced)
      ctx.goal(TILT, 1.6 * Math.sin((since * Math.PI * 2) / 4.4))
  },
} satisfies Expression
