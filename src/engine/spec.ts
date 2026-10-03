// A bot is its spec: named numbers and a few words, versioned. Shuffle, tiles
// and share codes all produce specs; the engine turns a spec into poses.

/** Ears' ear spine with the root distance replaced by an inset below the body edge. */
export type Limb = [
  alpha: number,
  inset: number,
  delta: number,
  length: number,
  curl: number,
  fold: number,
  at: number,
  base: number,
  tip: number,
  bulge: number,
]

export const SHADES = ['flat', 'toon', 'deep', 'gloss', 'soft'] as const
export type Shade = (typeof SHADES)[number]

export const EYE_SHAPES = ['arc', 'lens'] as const
/** The eyes' colour: near-black, or near-white for dark bots. */
export const INKS = ['dark', 'light'] as const

export type BotSpec = {
  v: 1
  /** Preset this bot branched from; the share code's diff base. */
  from: string
  name: string
  role: string
  /** OKLCH. */
  color: { h: number; c: number; l: number }
  shade: Shade
  /** Ears' superellipse, then extensions that are neutral at 0 (heft at 1). */
  body: {
    y: number
    rx: number
    ry: number
    square: number
    egg: number
    low: number
    bend: number
    point: number
    lobes: number
    depth: number
    wobble: number
    heft: number
  }
  /** `kind` names a module in parts/tops; `a` and `b` are its limbs, both in the left-limb convention. */
  top: {
    kind: string
    a: Limb
    b: Limb
    size: number
    tips: number
    droop: number
    spread: number
  }
  /** Drawn behind the body; zero widths mean no tail. */
  tail: Limb
  eyes: {
    shape: (typeof EYE_SHAPES)[number]
    x: number
    y: number
    spread: number
    angleL: number
    angleR: number
    half: number
    bend: number
    width: number
    lid: number
    cut: number
    ink: (typeof INKS)[number]
  }
  traits: {
    tempo: number
    blink: number
    glance: number
    twitch: number
    breathe: number
    cock: number
    perk: number
    double: number
    look: number
    hop: number
    squash: number
    tilt: number
    owl: boolean
    /** Ids of modules in parts/quirks. */
    quirks: string[]
  }
}

/** Tuples and lists are replaced whole. */
export type DeepPartial<T> = {
  [K in keyof T]?: T[K] extends readonly unknown[]
    ? T[K]
    : T[K] extends object
      ? DeepPartial<T[K]>
      : T[K]
}

/**
 * One field of the share code. A number is stored as the integer
 * round(value * scale) and read back as k / scale.
 */
export type Field =
  | { path: string; kind: 'num'; scale: number; min: number; max: number }
  | { path: string; kind: 'enum'; options: readonly string[] }
  | { path: string; kind: 'text'; max: number }
  | { path: string; kind: 'flag' }
  | { path: string; kind: 'list'; max: number }

function num(path: string, scale: number, min: number, max: number): Field {
  return { path, kind: 'num', scale, min, max }
}

function limb(path: string): Field[] {
  return [
    num(`${path}.0`, 10, -360, 360),
    num(`${path}.1`, 100, -20, 30),
    num(`${path}.2`, 10, -180, 180),
    num(`${path}.3`, 10, 0, 60),
    num(`${path}.4`, 10, -180, 180),
    num(`${path}.5`, 10, -180, 180),
    num(`${path}.6`, 100, 0, 1),
    num(`${path}.7`, 100, 0, 20),
    num(`${path}.8`, 100, 0, 20),
    num(`${path}.9`, 100, -5, 10),
  ]
}

/**
 * Append-only. Never remove, reorder, rename or re-scale a field, and never
 * narrow a range: old share codes decode through this table forever.
 */
export const FIELDS: readonly Field[] = [
  { path: 'from', kind: 'text', max: 24 },
  { path: 'name', kind: 'text', max: 24 },
  { path: 'role', kind: 'text', max: 40 },
  num('color.h', 10, 0, 360),
  num('color.c', 1000, 0, 0.3),
  num('color.l', 1000, 0.58, 0.96),
  { path: 'shade', kind: 'enum', options: SHADES },
  num('body.y', 10, -20, 30),
  num('body.rx', 10, 12, 40),
  num('body.ry', 10, 12, 40),
  num('body.square', 100, 1.5, 6),
  num('body.egg', 100, -0.3, 0.3),
  num('body.low', 100, 0, 4),
  num('body.bend', 100, -0.5, 0.5),
  num('body.point', 100, 0, 1),
  num('body.lobes', 1, 0, 8),
  num('body.depth', 100, 0, 0.3),
  num('body.wobble', 1000, 0, 0.1),
  num('body.heft', 100, 0.6, 1.5),
  { path: 'top.kind', kind: 'text', max: 24 },
  ...limb('top.a'),
  ...limb('top.b'),
  num('top.size', 100, 0.5, 1.6),
  num('top.tips', 100, -1, 1),
  num('top.droop', 100, -1, 1),
  num('top.spread', 10, -20, 20),
  ...limb('tail'),
  { path: 'eyes.shape', kind: 'enum', options: EYE_SHAPES },
  num('eyes.x', 10, -10, 10),
  num('eyes.y', 10, -12, 12),
  num('eyes.spread', 10, 2, 18),
  num('eyes.angleL', 10, -180, 180),
  num('eyes.angleR', 10, -180, 180),
  num('eyes.half', 100, 0, 8),
  num('eyes.bend', 100, -6, 6),
  num('eyes.width', 100, 1, 12),
  num('eyes.lid', 100, 0.3, 1.2),
  num('eyes.cut', 100, 0, 1),
  num('traits.tempo', 100, 0.5, 1.6),
  num('traits.blink', 10, 1.5, 10),
  num('traits.glance', 10, 1, 8),
  num('traits.twitch', 10, 3, 30),
  num('traits.breathe', 10, 2, 8),
  num('traits.cock', 10, -15, 15),
  num('traits.perk', 100, 0, 1),
  num('traits.double', 100, 0, 0.6),
  num('traits.look', 100, 0, 2),
  num('traits.hop', 100, 0, 2),
  num('traits.squash', 100, 0, 2),
  num('traits.tilt', 10, -10, 10),
  { path: 'traits.owl', kind: 'flag' },
  { path: 'traits.quirks', kind: 'list', max: 2 },
  { path: 'eyes.ink', kind: 'enum', options: INKS },
]

/** The value at a dotted path ('top.a.3'). */
export function read(spec: BotSpec, path: string): unknown {
  let at: unknown = spec
  for (const key of path.split('.')) at = (at as Record<string, unknown>)[key]
  return at
}

/** Sets the value at a dotted path in place: write into a copy, never a preset. */
export function write(spec: BotSpec, path: string, value: unknown) {
  const keys = path.split('.')
  let at = spec as unknown as Record<string, unknown>
  for (const key of keys.slice(0, -1)) at = at[key] as Record<string, unknown>
  at[keys[keys.length - 1]] = value
}

/** A new spec with `patch` laid over `spec`. */
export function apply(spec: BotSpec, patch: DeepPartial<BotSpec>): BotSpec {
  return merge(spec, patch) as BotSpec
}

function merge(base: unknown, patch: unknown): unknown {
  if (patch === undefined) return structuredClone(base)
  if (Array.isArray(patch) || typeof patch !== 'object' || patch === null)
    return structuredClone(patch)
  const out: Record<string, unknown> = {}
  for (const key of Object.keys(base as object))
    out[key] = merge(
      (base as Record<string, unknown>)[key],
      (patch as Record<string, unknown>)[key],
    )
  return out
}

/**
 * A copy with every field inside its range: numbers clamped, unknown enum
 * values replaced by the first option, text and lists cut to length. Values
 * in range are returned untouched, so presets pass through bit for bit.
 */
export function clamp(spec: BotSpec): BotSpec {
  const out = structuredClone(spec)
  for (const field of FIELDS) {
    const value = read(out, field.path)
    if (field.kind === 'num')
      write(
        out,
        field.path,
        Math.min(field.max, Math.max(field.min, value as number)),
      )
    else if (field.kind === 'enum' && !field.options.includes(value as string))
      write(out, field.path, field.options[0])
    else if (field.kind === 'text')
      write(
        out,
        field.path,
        [...(value as string)].slice(0, field.max).join(''),
      )
    else if (field.kind === 'flag') write(out, field.path, value === true)
    else if (field.kind === 'list')
      write(out, field.path, (value as string[]).slice(0, field.max))
  }
  return out
}
