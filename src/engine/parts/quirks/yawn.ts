import type { Quirk } from '../../contracts'

export default {
  label: 'Yawn',
  every: [26, 50],
  play(ctx) {
    ctx.play('yawn')
  },
} satisfies Quirk
