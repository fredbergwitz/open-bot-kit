// Just a blink, so a director or a touch can ask for one.
import type { Expression } from '../../contracts'

export default {
  label: 'Blink',
  hold: false,
  duration: 0.3,
  enter(ctx) {
    ctx.blink()
  },
} satisfies Expression
