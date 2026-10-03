// Topper tiles: the seven's own ears first, then new ears on the same pair
// kind, then the other kinds. A pick resets the knobs to the topper's own.
import type { Preset } from '../contracts'
import { PRESETS, SEVEN } from '../presets'
import type { BotSpec, Limb } from '../spec'

const KNOBS = { size: 1, tips: 0, droop: 0, spread: 0 }

function top(kind: string, a: Limb, b: Limb = a): BotSpec['top'] {
  return { kind, a, b, ...KNOBS }
}

export default [
  ...SEVEN.map((id) => ({
    id,
    label: PRESETS[id].name,
    patch: { top: PRESETS[id].top },
  })),
  {
    id: 'fox',
    label: 'Fox',
    patch: { top: top('pair', [-112, 6, 2, 31, 0, 0, 0.5, 10, 1, 0]) },
  },
  {
    id: 'mouse',
    label: 'Mouse',
    patch: { top: top('pair', [-138, 4, -6, 13, 0, 0, 0.5, 11, 13, 1.5]) },
  },
  {
    id: 'bear',
    label: 'Bear',
    patch: { top: top('pair', [-124, 3, 0, 5, 0, 0, 0.5, 6.5, 7, 0]) },
  },
  {
    id: 'pup',
    label: 'Pup',
    patch: { top: top('pair', [-148, 6, -22, 22, -85, 0, 0.5, 7, 7.5, 1.5]) },
  },
  {
    id: 'horns',
    label: 'Horns',
    patch: { top: top('horns', [-108, 3, -4, 17, 52, 0, 0.5, 4.6, 0.5, 0.4]) },
  },
  {
    id: 'antenna',
    label: 'Antenna',
    patch: {
      top: top(
        'antenna',
        [-90, 1.5, 0, 14, -10, 0, 0.5, 1.5, 1.3, 0],
        [0, 0, 0, 0.6, 0, 0, 0.5, 3.8, 3.8, 0],
      ),
    },
  },
  {
    id: 'sprout',
    label: 'Sprout',
    patch: {
      top: top(
        'sprout',
        [-90, 1.5, 0, 13, 12, 0, 0.5, 2.3, 2, 0],
        [0, 0, -66, 19, 42, 0, 0.5, 0.9, 0.3, 3.6],
      ),
    },
  },
  { id: 'none', label: 'None', patch: { top: { kind: 'none' } } },
] satisfies Preset[]
