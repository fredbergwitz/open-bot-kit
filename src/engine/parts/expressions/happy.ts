// Ears' done face, `^ ^`: arcs that never blink; the ears relax (the top
// kind's part). It crouches for a beat, then pops: a hop, the ears flung out.
import {
  BREATH,
  CUT,
  EYE_L,
  EYE_R,
  FSCALE,
  FX,
  FY,
  L,
  LIFT,
  R,
  SPREAD,
  SQUASH,
  STRETCH,
  TURN,
  type Ctx,
  type Expression,
} from '../../contracts'

/** Per bot: when the pop comes. */
const pops = new WeakMap<Ctx, number>()

export default {
  label: 'Happy',
  hold: true,
  delays: [0, 0.02, 0.08, 0.06],
  pose(rest, spec, tiny, out) {
    const face = out.face
    face.set([0, -1, 1, 9.2, 0, 4.8, -3, 4.6, 0, 4.8, -3, 4.6, 1])
    face[FX] = spec.eyes.x * 0.5
    face[FY] = spec.eyes.y - 1
    face[FSCALE] = rest.face[FSCALE]
    // A lid would cut the arcs flat.
    face[CUT] = 0
    if (tiny) {
      // Thinner, rounder and further apart, so `^ ^` never merges into a bar.
      face[SPREAD] = 10.5
      face[EYE_L + 2] = face[EYE_R + 2] = -4.5
      face[EYE_L + 3] = face[EYE_R + 3] = 3.8
    }
    out.figure[BREATH] = 0.6
  },
  enter(ctx) {
    pops.set(
      ctx,
      ctx.reduced ? Infinity : ctx.clock + 0.1 / ctx.spec.traits.tempo,
    )
  },
  step(ctx) {
    const at = pops.get(ctx)!
    if (ctx.clock >= at) {
      pops.set(ctx, Infinity)
      const { hop, squash } = ctx.spec.traits
      ctx.kick(SQUASH, 1.6 * squash)
      ctx.kick(LIFT, 62 * hop)
      ctx.kick(TURN + L, 240)
      ctx.kick(TURN + R, -240)
      ctx.kick(STRETCH + L, 1.5)
      ctx.kick(STRETCH + R, 1.5)
    } else if (at < Infinity) {
      // The crouch before the pop: ears flatten out, the body sinks.
      ctx.goal(TURN + L, -24)
      ctx.goal(TURN + R, 24)
      ctx.goal(STRETCH + L, -0.1)
      ctx.goal(STRETCH + R, -0.1)
      ctx.goal(SQUASH, -0.07)
    }
  },
} satisfies Expression
