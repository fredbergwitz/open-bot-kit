// A small happy hop: the quirk, and the director's fidget.
import { LIFT, type Expression } from '../../contracts'

export default {
  label: 'Hop',
  hold: false,
  duration: 0.7,
  enter(ctx) {
    ctx.kick(LIFT, 46 * ctx.spec.traits.hop)
  },
} satisfies Expression
