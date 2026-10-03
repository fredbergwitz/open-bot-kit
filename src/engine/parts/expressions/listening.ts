// Ears' listening: the eyes grow and lift, the ears perk (the top kind's
// part), and the whole figure leans in and cocks its head. Then the ears catch
// the beats of a voice, in phrases and pauses, and swivel now and then.
import {
  CUT,
  FSCALE,
  GAZE_X,
  L,
  LEAN,
  R,
  SQUASH,
  STRETCH,
  TALL,
  TURN,
  WIDE,
  type Ctx,
  type Expression,
} from '../../contracts'

/** Per bot: perk, next syllable, phrase end, next swivel left and right, last voice. */
const ears = new WeakMap<Ctx, Float64Array>()

function random(ctx: Ctx, mean: number) {
  return mean * (0.55 + 0.9 * ctx.rng())
}

export default {
  label: 'Listening',
  hold: true,
  delays: [0.03, 0, 0.06, 0],
  pose(rest, spec, tiny, out) {
    out.face.set([0, -2.5, 1, 9.4, 92, 1.9, 0, 8.4, 88, 1.9, 0, 8.4, 1.04])
    out.face[FSCALE] = rest.face[FSCALE]
    // Heavy lids lift as it pays attention.
    out.face[CUT] = rest.face[CUT] * 0.4
    // At 16 px the cock is steeper, so it moves whole pixels.
    out.figure[LEAN] = spec.traits.cock * (tiny ? 1.6 : 1)
    out.figure[WIDE] = 0.02
    out.figure[TALL] = 0.03
    // Without Ears' ears to perk, the whole bot leans in further and bobs on
    // the syllables instead (step).
    if (spec.top.kind !== 'pair') {
      out.figure[WIDE] = 0.05
      out.figure[TALL] = 0.07
    }
  },
  enter(ctx) {
    const at = new Float64Array(6).fill(Infinity)
    ears.set(ctx, at)
    if (ctx.reduced) return
    const now = ctx.clock
    at[0] = now + 0.08
    at[3] = now + random(ctx, 1.6)
    at[4] = now + random(ctx, 2.4)
    at[1] = now + 0.9
    at[2] = at[1] + 1 + ctx.rng() * 1.6
  },
  step(ctx) {
    const at = ears.get(ctx)!
    const now = ctx.clock
    const eared = ctx.spec.top.kind === 'pair'
    // Eyes on you: no wandering glances while listening.
    ctx.look(0, 0, 0)
    if (now >= at[0]) {
      at[0] = Infinity
      ctx.kick(STRETCH + L, 1.3)
      ctx.kick(STRETCH + R, 1.1)
      ctx.kick(TURN + L, 70)
      ctx.kick(TURN + R, -70)
    }
    // A real voice (a speaker in the group) drives the ears: each syllable's
    // onset kicks them, and the bot stops imagining its own phrases.
    const voice = ctx.speaking
    if (voice > 0) {
      const rise = voice - (at[5] < Infinity ? at[5] : 0)
      if (rise > 0.12 && !ctx.tiny) {
        ctx.kick(STRETCH + L, 1.6 * rise)
        ctx.kick(STRETCH + R, 1.25 * rise)
        if (!eared) ctx.kick(SQUASH, 0.9 * rise)
      }
      at[1] = now + 0.9
    }
    at[5] = voice
    if (now >= at[1]) {
      if (now < at[2]) {
        const loud = 0.5 + 0.5 * ctx.rng()
        if (!ctx.tiny) {
          ctx.kick(STRETCH + L, 1.2 * loud)
          ctx.kick(STRETCH + R, 0.95 * loud)
          if (!eared) ctx.kick(SQUASH, 0.7 * loud)
        }
        at[1] = now + 0.17 + ctx.rng() * 0.25
      } else {
        at[1] = now + 1 + ctx.rng() * 1.8
        at[2] = at[1] + 0.8 + ctx.rng() * 2
      }
    }
    for (let side = 0; side < 2; side++) {
      if (now < at[3 + side]) continue
      const out = side ? 1 : -1
      ctx.goal(GAZE_X, 1.6 * out, 0.28)
      ctx.goal(TURN + side, 13 * out, 0.28)
      at[3 + side] = now + random(ctx, 2.6)
    }
  },
} satisfies Expression
