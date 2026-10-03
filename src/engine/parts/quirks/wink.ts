import type { Quirk } from '../../contracts'

export default {
  label: 'Wink',
  every: [14, 30],
  play(ctx) {
    ctx.play('wink')
  },
} satisfies Quirk
