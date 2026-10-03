// Personality tiles: how a bot moves. The seven's own rhythms come first,
// named for how they feel, then new temperaments with their quirks.
import type { Preset } from '../contracts'
import { PRESETS, type PresetId } from '../presets'
import type { BotSpec } from '../spec'

type Traits = BotSpec['traits']

const SEVEN: [PresetId, string][] = [
  ['kit', 'Bright'],
  ['hare', 'Eager'],
  ['lop', 'Mellow'],
  ['bun', 'Steady'],
  ['nib', 'Keen'],
  ['tuft', 'Dreamy'],
  ['imp', 'Zippy'],
]

function traits(t: Omit<Traits, 'owl'> & { owl?: boolean }): {
  traits: Traits
} {
  return { traits: { ...t, owl: t.owl ?? false } }
}

export default [
  ...SEVEN.map(([id, label]) => ({
    id,
    label,
    patch: { traits: PRESETS[id].traits },
  })),
  {
    id: 'sleepy',
    label: 'Sleepy',
    patch: traits({
      tempo: 0.62,
      blink: 7.5,
      glance: 6,
      twitch: 24,
      breathe: 6.4,
      cock: -6,
      perk: 0.3,
      double: 0.05,
      look: 0.6,
      hop: 0.5,
      squash: 0.8,
      tilt: -2,
      quirks: ['doze', 'yawn'],
    }),
  },
  {
    id: 'shy',
    label: 'Shy',
    patch: traits({
      tempo: 0.9,
      blink: 4.6,
      glance: 2.2,
      twitch: 18,
      breathe: 4.6,
      cock: 6,
      perk: 0.3,
      double: 0.22,
      look: 0.55,
      hop: 0.6,
      squash: 0.7,
      tilt: 0,
      quirks: ['peek'],
    }),
  },
  {
    id: 'bouncy',
    label: 'Bouncy',
    patch: traits({
      tempo: 1.35,
      blink: 3.4,
      glance: 2,
      twitch: 6,
      breathe: 3.2,
      cock: -9,
      perk: 0.7,
      double: 0.15,
      look: 1.4,
      hop: 1.5,
      squash: 1.4,
      tilt: 0,
      quirks: ['hop'],
    }),
  },
  {
    id: 'cheery',
    label: 'Cheery',
    patch: traits({
      tempo: 1.1,
      blink: 4,
      glance: 3,
      twitch: 12,
      breathe: 4,
      cock: 8,
      perk: 0.5,
      double: 0.12,
      look: 1,
      hop: 1.1,
      squash: 1.1,
      tilt: 0,
      quirks: ['hum', 'wink'],
    }),
  },
  {
    id: 'proud',
    label: 'Proud',
    patch: traits({
      tempo: 0.85,
      blink: 6,
      glance: 4.5,
      twitch: 20,
      breathe: 5,
      cock: 5,
      perk: 0.25,
      double: 0.04,
      look: 0.7,
      hop: 0.7,
      squash: 0.8,
      tilt: 3,
      quirks: ['wink'],
    }),
  },
  {
    id: 'wonder',
    label: 'Wondering',
    patch: traits({
      tempo: 0.8,
      blink: 5.5,
      glance: 3.8,
      twitch: 16,
      breathe: 5,
      cock: -10,
      perk: 0.55,
      double: 0.1,
      look: 1.6,
      hop: 0.8,
      squash: 1,
      tilt: 0,
      owl: true,
      quirks: ['look-up'],
    }),
  },
] satisfies Preset[]
