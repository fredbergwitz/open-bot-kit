// Looks right at you for a moment, and blinks.
import type { Quirk } from '../../contracts'

export default {
  label: 'Peek at you',
  every: [10, 22],
  play(ctx) {
    ctx.look(0, 0.15, 1.4)
    ctx.blink(0.5)
  },
} satisfies Quirk
