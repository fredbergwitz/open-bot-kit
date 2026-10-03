// Body tiles, in rail order. Each sets the whole silhouette except weight, so
// a pick never inherits a lobe or a point from the last shape. Floors sit near
// Ears' (y + ry ≈ 34), so mixed shapes stand on one line in a group.
import type { Preset } from '../contracts'
import { PRESETS } from '../presets'
import type { BotSpec } from '../spec'

type Body = Omit<BotSpec['body'], 'heft'>

const FLAT = { low: 0, bend: 0, point: 0, lobes: 0, depth: 0, wobble: 0 }

function body(
  y: number,
  rx: number,
  ry: number,
  square: number,
  more: Partial<Body> = {},
): Body {
  return { y, rx, ry, square, egg: 0, ...FLAT, ...more }
}

function round(id: 'kit' | 'tuft'): Body {
  const { heft: _, ...rest } = PRESETS[id].body
  return rest
}

export default [
  { id: 'round', label: 'Round', patch: { body: round('kit') } },
  { id: 'boxy', label: 'Boxy', patch: { body: round('tuft') } },
  {
    id: 'pebble',
    label: 'Pebble',
    patch: { body: body(10, 29.5, 24, 2.2, { egg: 0.04, low: 0.3 }) },
  },
  {
    id: 'bean',
    label: 'Bean',
    patch: { body: body(12, 31, 22, 2, { bend: -0.15 }) },
  },
  {
    id: 'egg',
    label: 'Egg',
    patch: { body: body(6, 23, 28.5, 2, { egg: 0.2 }) },
  },
  {
    id: 'gumdrop',
    label: 'Gumdrop',
    patch: { body: body(8, 26.5, 26, 2, { egg: 0.24, low: 0.8 }) },
  },
  {
    id: 'marshmallow',
    label: 'Marshmallow',
    patch: { body: body(7, 24.5, 27.5, 3) },
  },
  {
    id: 'mochi',
    label: 'Mochi',
    patch: { body: body(13, 32, 21, 2.2, { egg: 0.1, low: 0.8 }) },
  },
  { id: 'bead', label: 'Bead', patch: { body: body(10, 25, 25, 2) } },
  { id: 'pill', label: 'Pill', patch: { body: body(16, 32, 18, 2.6) } },
  { id: 'capsule', label: 'Capsule', patch: { body: body(4, 19, 31, 2.6) } },
  {
    id: 'drop',
    label: 'Drop',
    patch: { body: body(9, 24, 25, 2, { egg: 0.08, point: 1 }) },
  },
  {
    id: 'seed',
    label: 'Seed',
    patch: { body: body(7, 22, 27, 2, { egg: 0.18, point: 0.55 }) },
  },
  {
    id: 'peak',
    label: 'Peak',
    patch: { body: body(10, 30, 24, 2.2, { egg: 0.3, low: 1.6, point: 0.75 }) },
  },
  {
    id: 'cloud',
    label: 'Cloud',
    patch: { body: body(9, 29, 24, 2.2, { lobes: 6, depth: 0.07 }) },
  },
  {
    id: 'gem',
    label: 'Gem',
    patch: { body: body(9, 27, 26, 2, { lobes: 6, depth: 0.045 }) },
  },
  {
    id: 'blob',
    label: 'Blob',
    patch: { body: body(10, 27, 25, 2.1, { egg: 0.06, wobble: 0.05 }) },
  },
  {
    id: 'bubble',
    label: 'Bubble',
    patch: {
      body: body(4, 33, 24, 4.5),
      tail: [128, 4, -18, 13, 38, 0, 0.5, 8.5, 1.6, 0],
    },
  },
] satisfies Preset[]
