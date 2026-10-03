// Squeezed `> <` eyes, shaking with quick little bounces that run out of
// breath: happy's `^ ^` is a smile, this is a laugh.
import {
  EYE_L,
  EYE_R,
  LIFT,
  SQUASH,
  TILT,
  type Expression,
} from '../../contracts'

export default {
  label: 'Laughing',
  hold: false,
  duration: 1.9,
  delays: [0, 0.02, 0.06, 0.03],
  pose(rest, _spec, tiny, out) {
    const f = out.face
    for (const at of [EYE_L, EYE_R]) {
      // Upright and bent toward the middle: `>` on the left, `<` on the right.
      f[at] = 90
      f[at + 1] = 4.4
      f[at + 2] = tiny ? 3.4 : 3
      f[at + 3] = Math.max(3.6, rest.face[at + 3] * 0.75)
    }
  },
  step(ctx, dt, since) {
    if (ctx.reduced) return
    const fade = Math.max(0, 1 - since / 1.7)
    const beat = 1 / 3.4
    if (
      since < 1.4 &&
      Math.floor(since / beat) !== Math.floor((since - dt) / beat)
    )
      ctx.kick(LIFT, 26 * fade * ctx.spec.traits.hop)
    ctx.goal(
      SQUASH,
      -0.07 * fade * Math.abs(Math.sin((since * Math.PI) / beat)),
    )
    ctx.goal(TILT, 5 * fade * Math.sin((since * Math.PI * 2) / (2 * beat)))
  },
} satisfies Expression
