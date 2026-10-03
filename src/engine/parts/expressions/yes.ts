// Nodding yes: three deep nods, the face dipping low with the eyes half
// closing at the bottom of each, the body bobbing; the ears follow a beat late.
import {
  GAZE_Y,
  L,
  R,
  SHUT,
  SQUASH,
  TURN,
  type Expression,
} from '../../contracts'
import { key } from '../moods'

/** Down, then back up a little past rest. */
const NOD = [
  [0, 0],
  [0.25, 1],
  [0.5, -0.4],
  [0.7, 0],
] as const
const NODS = 3

export default {
  label: 'Yes',
  hold: false,
  duration: 2.2,
  // Reduced motion: a blink says it without moving.
  enter(ctx) {
    if (ctx.reduced) ctx.blink()
  },
  step(ctx, dt, since) {
    if (ctx.reduced) return
    const { tempo, squash } = ctx.spec.traits
    const t = since * Math.sqrt(tempo)
    const v = t < 0.7 * NODS ? key(t % 0.7, NOD) : 0
    ctx.goal(GAZE_Y, 3.5 * v)
    ctx.goal(SQUASH, -0.12 * v * squash)
    ctx.goal(SHUT, 0.4 * Math.max(0, v))
    const bottom =
      ((since - dt) * Math.sqrt(tempo)) % 0.7 < 0.27 && t % 0.7 >= 0.27
    if (bottom && t < 0.7 * NODS) {
      ctx.kick(TURN + L, -90)
      ctx.kick(TURN + R, 90)
    }
  },
} satisfies Expression
