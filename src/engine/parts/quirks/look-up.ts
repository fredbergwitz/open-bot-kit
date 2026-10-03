// Glances up at whatever grows on its head, as Sprout checks its leaf.
import type { Quirk } from '../../contracts'
import { side } from '../moods'

export default {
  label: 'Look up',
  every: [9, 18],
  play(ctx) {
    ctx.look(0.2 * side(ctx.spec), -1, 1.6)
  },
} satisfies Quirk
