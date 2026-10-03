// Eye style tiles: the stroke's shape only. Placement and lids stay yours, so
// trying styles never moves your bot's face. Angle 90 is an upright stroke.
import type { Preset } from '../contracts'
import type { BotSpec } from '../spec'

type Style = Pick<
  BotSpec['eyes'],
  'shape' | 'angleL' | 'angleR' | 'half' | 'bend' | 'width'
>

function eyes(
  angleL: number,
  angleR: number,
  half: number,
  width: number,
  bend = 0,
): { eyes: Style } {
  return { eyes: { shape: 'arc', angleL, angleR, half, bend, width } }
}

export default [
  { id: 'strokes', label: 'Strokes', patch: eyes(98, 84, 3.4, 6) },
  { id: 'slants', label: 'Slants', patch: eyes(106, 80, 3.4, 6) },
  { id: 'tall', label: 'Tall', patch: eyes(100, 76, 3.8, 4.8) },
  { id: 'beans', label: 'Beans', patch: eyes(98, 84, 2.6, 7) },
  { id: 'dashes', label: 'Dashes', patch: eyes(8, 4, 1.8, 7.2) },
  { id: 'pills', label: 'Pills', patch: eyes(90, 90, 2.4, 6.6) },
  { id: 'ovals', label: 'Ovals', patch: eyes(90, 90, 1.2, 8.4) },
  { id: 'dots', label: 'Dots', patch: eyes(90, 90, 0.05, 7.4) },
  { id: 'big', label: 'Big', patch: eyes(93, 87, 4.4, 7.4) },
  { id: 'slits', label: 'Slits', patch: eyes(0, 0, 3.4, 2.8) },
  { id: 'smiles', label: 'Smiles', patch: eyes(0, 0, 3.8, 3.6, -1.8) },
  { id: 'moons', label: 'Moons', patch: eyes(0, 0, 3.6, 3.6, 1.6) },
] satisfies Preset[]
