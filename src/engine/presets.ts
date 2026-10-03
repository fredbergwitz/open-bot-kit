// The seven Ears characters as specs, every number from sets/ears/family.ts.
// Immutable: a share code is a diff against one of these, so changing a
// preset changes every bot branched from it. A new look gets a new id.
//
// Ear roots are stored as insets below the body edge, computed once from each
// member's own body (edge(body, alpha) - rho) and kept at full precision, so
// limb-fit lands exactly on Ears' radius.
import type { BotSpec, Limb } from './spec'

export const SEVEN = [
  'kit',
  'hare',
  'lop',
  'bun',
  'nib',
  'tuft',
  'imp',
] as const
export type PresetId = (typeof SEVEN)[number]

const NONE: Limb = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0]

type Member = {
  name: string
  color: [h: number, c: number, l: number]
  body: [y: number, rx: number, ry: number, square: number, egg: number]
  ear: Limb
  /** Right-ear fold, in the left-ear convention. */
  fold?: number
  eyes: [
    x: number,
    y: number,
    spread: number,
    angleL: number,
    angleR: number,
    half: number,
    width: number,
    lid: number,
  ]
  traits: [
    tempo: number,
    blink: number,
    glance: number,
    twitch: number,
    breathe: number,
    cock: number,
    perk: number,
  ]
  owl?: boolean
}

function spec(id: PresetId, m: Member): BotSpec {
  const [h, c, l] = m.color
  const [y, rx, ry, square, egg] = m.body
  const [x, fy, spread, angleL, angleR, half, width, lid] = m.eyes
  const [tempo, blink, glance, twitch, breathe, cock, perk] = m.traits
  const b = [...m.ear] as Limb
  if (m.fold !== undefined) b[5] = m.fold
  return {
    v: 1,
    from: id,
    name: m.name,
    role: '',
    color: { h, c, l },
    shade: 'flat',
    body: {
      y,
      rx,
      ry,
      square,
      egg,
      low: 0,
      bend: 0,
      point: 0,
      lobes: 0,
      depth: 0,
      wobble: 0,
      heft: 1,
    },
    top: {
      kind: 'pair',
      a: [...m.ear],
      b,
      size: 1,
      tips: 0,
      droop: 0,
      spread: 0,
    },
    tail: [...NONE],
    eyes: {
      shape: 'arc',
      x,
      y: fy,
      spread,
      angleL,
      angleR,
      half,
      bend: 0,
      width,
      lid,
      cut: 0,
      ink: 'dark',
    },
    traits: {
      tempo,
      blink,
      glance,
      twitch,
      breathe,
      cock,
      perk,
      // Ears doubles 12% of blinks; the rest are neutral multipliers.
      double: 0.12,
      look: 1,
      hop: 1,
      squash: 1,
      tilt: 0,
      owl: m.owl ?? false,
      quirks: [],
    },
  }
}

export const PRESETS: Record<PresetId, BotSpec> = {
  kit: spec('kit', {
    name: 'Kit',
    color: [45, 0.19, 0.64],
    body: [8, 28, 26, 2.3, 0.05],
    ear: [-122, 8.194629645801832, 8, 27, 4, 0, 0.5, 11.5, 1.6, 0.6],
    eyes: [2, -2, 8.5, 106, 80, 3.4, 6, 1],
    traits: [1.15, 4, 2.6, 9, 3.8, -8, 0.5],
  }),
  hare: spec('hare', {
    name: 'Hare',
    color: [295, 0.19, 0.6],
    body: [16, 26, 24, 2.2, 0.06],
    ear: [-108, 7.362346836552142, 0, 34, -6, 0, 0.5, 6.6, 6.4, 2.6],
    eyes: [1.5, -1, 8.5, 98, 84, 3.4, 6, 1],
    traits: [1.1, 3.8, 3, 7, 3.6, 8, 0.4],
  }),
  lop: spec('lop', {
    name: 'Lop',
    color: [62, 0.11, 0.62],
    body: [4, 25, 27, 2.1, 0.08],
    ear: [-135, 7.583778760010038, -28, 38, -110, 0, 0.5, 7.5, 8.5, 2.2],
    eyes: [0, 4, 8.5, 8, 4, 1.8, 7.2, 0.82],
    traits: [0.8, 6, 4.5, 16, 5.2, 7, 0.62],
  }),
  bun: spec('bun', {
    name: 'Bun',
    color: [252, 0.17, 0.6],
    body: [10, 28, 26, 2.2, 0.04],
    ear: [-128, 6.181756023651381, 0, 12, 0, 0, 0.5, 9, 11.5, 1.2],
    eyes: [1, 0, 8.5, 98, 84, 3.4, 6, 1],
    traits: [1, 4.5, 3.5, 14, 4.4, -7, 0.4],
  }),
  nib: spec('nib', {
    name: 'Nib',
    color: [188, 0.12, 0.62],
    body: [10, 27, 26, 2.2, 0.06],
    ear: [-114, 8.437771042610002, 2, 28, -6, 0, 0.55, 8.4, 4.6, 1.6],
    fold: -105,
    eyes: [-1.5, -1, 8.5, 98, 84, 3.4, 6, 1],
    traits: [1.05, 3.6, 2.8, 8, 4, 9, 0.5],
  }),
  tuft: spec('tuft', {
    name: 'Tuft',
    color: [140, 0.14, 0.62],
    body: [10, 28, 26, 3.4, 0],
    ear: [-135, 1.0168434152541934, 10, 15, 20, 0, 0.5, 7.5, 1.3, 0],
    eyes: [0, 1, 10, 98, 84, 2.6, 7, 0.92],
    traits: [0.85, 7, 5, 20, 5, -10, 0.45],
    owl: true,
  }),
  imp: spec('imp', {
    name: 'Imp',
    color: [352, 0.2, 0.62],
    body: [8, 27, 26, 2.2, 0.06],
    ear: [-168, 4.831250087053487, 22, 26, 14, 0, 0.5, 9, 1.4, 0.8],
    eyes: [1, -1, 8.5, 100, 76, 3.8, 4.8, 1],
    traits: [1.2, 3.2, 2.2, 6, 3.6, 8, 0.32],
  }),
}

/** Where a missing or broken code lands. */
export const DEFAULT = PRESETS.kit
