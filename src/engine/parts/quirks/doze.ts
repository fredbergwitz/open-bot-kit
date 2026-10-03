import type { Quirk } from '../../contracts'

export default {
  label: 'Doze',
  every: [22, 44],
  play(ctx) {
    ctx.play('doze')
  },
} satisfies Quirk
