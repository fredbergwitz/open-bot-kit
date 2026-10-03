// One small "mm-hm" nod: what a listener gives a speaker.
import { GAZE_Y, SQUASH, type Expression } from '../../contracts'
import { key } from '../moods'

export default {
  label: 'Nod',
  hold: false,
  duration: 0.6,
  step(ctx, _dt, since) {
    const v = key(since, [
      [0, 0],
      [0.14, 1],
      [0.36, 0],
    ])
    ctx.goal(GAZE_Y, 1.4 * v)
    if (!ctx.reduced) ctx.goal(SQUASH, -0.05 * v * ctx.spec.traits.squash)
  },
} satisfies Expression
