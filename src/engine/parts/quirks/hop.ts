import type { Quirk } from '../../contracts'

export default {
  label: 'Hop',
  every: [9, 20],
  play(ctx) {
    ctx.play('hop')
  },
} satisfies Quirk
