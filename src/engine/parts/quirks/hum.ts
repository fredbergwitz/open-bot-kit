import type { Quirk } from '../../contracts'

export default {
  label: 'Hum',
  every: [18, 34],
  play(ctx) {
    ctx.play('hum')
  },
} satisfies Quirk
