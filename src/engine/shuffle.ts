// Shuffle: a new bot from curated parts with small jitter, so nearly every
// result is one someone could have designed. Locked categories stay as they
// are. Shuffles are generated, never stored: the spec is the bot.
import { BY, L, R, T, type Preset, type Rng } from './contracts'
import { halfWidth } from './geometry'
import bodies from './parts/bodies'
import { reach } from './parts/limbs'
import colours from './parts/colours'
import eyes from './parts/eyes'
import lids from './parts/lids'
import personalities from './parts/personalities'
import tails from './parts/tails'
import toppers from './parts/toppers'
import { PRESETS, SEVEN } from './presets'
import { pose } from './pose'
import { apply, clamp, type BotSpec } from './spec'
import { isWhite } from './still'

export const LOCKS = ['colour', 'shape', 'top', 'eyes', 'personality'] as const
export type Lock = (typeof LOCKS)[number]

const QUIRKS = ['wink', 'peek', 'hop', 'hum', 'yawn', 'doze', 'look-up']

function pick<T>(rng: Rng, list: readonly T[]) {
  return list[Math.floor(rng() * list.length)]
}

/** One of `list` by weight. */
function weighted<T>(rng: Rng, list: readonly (readonly [T, number])[]) {
  let roll = rng() * list.reduce((sum, [, w]) => sum + w, 0)
  for (const [item, w] of list) if ((roll -= w) < 0) return item
  return list[list.length - 1][0]
}

function between(rng: Rng, from: number, to: number) {
  return from + (to - from) * rng()
}

/** Jitter by up to `share` of the value either way. */
function nudge(rng: Rng, value: number, share: number) {
  return value * (1 + share * (2 * rng() - 1))
}

function byId(list: Preset[], id: string) {
  return list.find((p) => p.id === id)!
}

/** Lightness for any hue, eased between the vivid swatches either side of it. */
export function lightness(h: number) {
  const vivid = colours
    .slice(0, 12)
    .map((p) => p.patch.color!)
    .sort((x, y) => x.h! - y.h!)
  for (let i = 0; i < vivid.length; i++) {
    const from = vivid[i]
    const to = vivid[(i + 1) % vivid.length]
    const span = (to.h! - from.h! + 360) % 360
    const at = (h - from.h! + 360) % 360
    if (at <= span) return from.l! + ((to.l! - from.l!) * at) / span
  }
  return 0.64
}

function colour(rng: Rng, spec: BotSpec): BotSpec {
  const color =
    rng() < 0.7
      ? pick(rng, colours).patch.color!
      : (() => {
          const h = Math.round(rng() * 360)
          return { h, c: between(rng, 0.11, 0.18), l: lightness(h) }
        })()
  // Shading is yours to turn on, like light eyes: a shuffle never changes it.
  return apply(spec, { color })
}

function shape(rng: Rng, spec: BotSpec): BotSpec {
  const preset = weighted(rng, [
    ...bodies.map(
      (b) => [b, b.id === 'round' ? 4 : b.id === 'blob' ? 0.5 : 1] as const,
    ),
  ])
  const b = { ...spec.body, ...preset.patch.body }
  b.rx = nudge(rng, b.rx, 0.06)
  b.ry = nudge(rng, b.ry, 0.06)
  b.heft = rng() < 0.75 ? 1 : between(rng, 0.85, 1.2)
  let next = apply(spec, { body: b })
  if (preset.patch.tail) next = apply(next, { tail: preset.patch.tail })
  else if (rng() < 0.15) next = apply(next, pick(rng, tails.slice(3)).patch)
  else next = apply(next, byId(tails, 'none').patch)
  // A tail that would leave the box on a wide body is left off.
  const rest = pose(next, 'idle', false)
  if (reach(rest.limbs[T], rest.body[BY]) > 49)
    next = apply(next, byId(tails, 'none').patch)
  return next
}

function top(rng: Rng, spec: BotSpec): BotSpec {
  // A pointed head pokes up between tall ears: give it something small on top.
  const pointed = spec.body.point > 0.3
  const preset = weighted(rng, [
    ...toppers.map((t) => {
      const ears = t.patch.top?.kind === 'pair'
      const tall = ears && (t.patch.top as BotSpec['top']).a[3] > 18
      return [t, pointed && tall ? 0.15 : ears ? 1.4 : 1] as const
    }),
  ])
  const next = apply(spec, preset.patch)
  const t = next.top
  t.size = between(rng, 0.85, 1.2)
  // A tall body with tall ears runs out of room: keep the pair in proportion.
  if (next.body.ry > 28 && t.a[3] > 26) t.size *= 0.85
  if (rng() < 0.35) t.tips = between(rng, -0.6, 0.6)
  if (rng() < 0.3) t.droop = between(rng, -0.5, 0.5)
  if (rng() < 0.3) t.spread = between(rng, -6, 6)
  // Happy ears splay outward: keep them inside the box when they do.
  for (let i = 0; i < 6; i++) {
    const happy = pose(next, 'happy', false)
    const far = Math.max(
      ...[happy.limbs[L], happy.limbs[R]].map((l) => reach(l, happy.body[BY])),
    )
    if (far <= 50) break
    t.size *= 0.92
  }
  return next
}

/** Eye styles that read as shut: a shuffle wears them rarely, and never sleepy. */
const SHUT = ['dashes', 'slits', 'smiles', 'moons']

function face(rng: Rng, spec: BotSpec): BotSpec {
  const style = weighted(
    rng,
    eyes.map((e) => {
      const often = ['strokes', 'slants', 'tall', 'beans'].includes(e.id)
      return [e, often ? 2 : SHUT.includes(e.id) ? 0.4 : 1] as const
    }),
  )
  const lid = SHUT.includes(style.id)
    ? byId(lids, 'open')
    : weighted(rng, [
        [byId(lids, 'open'), 6],
        [byId(lids, 'soft'), 2],
        [byId(lids, 'calm'), 1],
        [byId(lids, 'sleepy'), 1],
      ])
  const next = apply(apply(spec, style.patch), lid.patch)
  const e = next.eyes
  e.x = between(rng, -1.5, 2)
  e.y = between(rng, -2.5, 3)
  // Eyes in proportion to the face, never crowding its edge, and never so
  // close that two flat strokes read as one bar. Sized for 16 px, where a
  // face grows by 1.3 and its strokes by 1.5 (Ears' small-size rule).
  const room = halfWidth(pose(next, 'idle', false).body, e.y) - Math.abs(e.x)
  const k = Math.min(1, room / 26)
  e.half *= k
  e.width *= k
  const cos = Math.abs(Math.cos((e.angleL * Math.PI) / 180))
  let half = cos * e.half * 0.9 + 0.75 * e.width
  for (let i = 0; i < 6 && half + 0.8 > room / 1.3 - half - 2; i++) {
    e.half *= 0.88
    e.width *= 0.88
    half = cos * e.half * 0.9 + 0.75 * e.width
  }
  e.spread = Math.max(
    half + 0.8,
    Math.min(nudge(rng, 8.5 * (room / 27), 0.12), room / 1.3 - half - 2),
  )
  return next
}

function personality(rng: Rng, spec: BotSpec): BotSpec {
  const next = apply(spec, pick(rng, personalities).patch)
  const t = next.traits
  for (const key of [
    'tempo',
    'blink',
    'glance',
    'twitch',
    'breathe',
    'perk',
    'look',
  ] as const)
    t[key] = nudge(rng, t[key], 0.12)
  if (rng() < 0.5) t.cock = -t.cock
  if (rng() < 0.3) t.quirks = [pick(rng, QUIRKS)]
  return next
}

const MAKE: Record<Lock, (rng: Rng, spec: BotSpec) => BotSpec> = {
  colour,
  shape,
  top,
  eyes: face,
  personality,
}

/** A fresh bot: every unlocked category redrawn; name, role and shading kept. */
export function shuffle(
  rng: Rng,
  current: BotSpec,
  locks: readonly Lock[] = [],
) {
  let next = current
  for (const lock of LOCKS)
    if (!locks.includes(lock)) next = MAKE[lock](rng, next)
  // Lumpy outlines break deep and soft shading into blotches, so under those
  // a shuffled shape is drawn again until it is smooth.
  if (
    !locks.includes('shape') &&
    (next.shade === 'deep' || next.shade === 'soft')
  )
    for (
      let tries = 0;
      tries < 12 && (next.body.depth || next.body.wobble);
      tries++
    )
      next = shape(rng, next)
  return clamp(next)
}

/**
 * `count` companions for a group: each starts from one of the seven and is
 * shuffled whole, then made to differ from yours and from each other: hues
 * 40 degrees apart, and no two wearing the same topper or the same shape.
 */
export function companions(rng: Rng, mine: BotSpec, count: number) {
  const out: BotSpec[] = []
  const seen = [mine]
  for (let i = 0; i < count; i++) {
    let next = shuffle(rng, PRESETS[pick(rng, SEVEN)])
    for (let tries = 0; tries < 12; tries++) {
      if (seen.some((s) => apart(s.color.h, next.color.h) < 40))
        next = colour(rng, next)
      else if (seen.some((s) => looks(s.top) === looks(next.top)))
        next = top(rng, next)
      else if (seen.some((s) => looks(s.body) === looks(next.body)))
        next = shape(rng, next)
      else break
    }
    seen.push(next)
    out.push(next)
  }
  return out
}

/**
 * A companion in your style: your shading, and your tone and lightness at its
 * own hue. Beside a white bot companions keep their own colours.
 */
export function resemble(other: BotSpec, mine: BotSpec): BotSpec {
  // Tone and lightness follow too; pass only `shade` below to match shading alone.
  const color = isWhite(mine.color)
    ? other.color
    : {
        h: other.color.h,
        c: mine.color.c,
        l: Math.min(
          0.7,
          Math.max(
            0.58,
            lightness(other.color.h) + mine.color.l - lightness(mine.color.h),
          ),
        ),
      }
  const next = apply(other, { shade: mine.shade, color })
  // Lumps break deep and soft bands: keep your shading, smooth their outline.
  return (next.body.depth || next.body.wobble) &&
    (next.shade === 'deep' || next.shade === 'soft')
    ? apply(next, { body: { depth: 0, wobble: 0 } })
    : next
}

/** A part's character, ignoring jitter: kinds, angles, lengths, extensions. */
function looks(part: BotSpec['top'] | BotSpec['body']) {
  if ('kind' in part)
    return `${part.kind} ${Math.round(part.a[0] / 10)} ${Math.round(part.a[3] / 6)}`
  return [
    part.square > 3,
    part.egg > 0.15,
    part.low,
    part.bend,
    part.point,
    part.lobes,
    part.wobble > 0,
    part.rx > part.ry * 1.2,
    part.ry > part.rx * 1.2,
  ].join()
}

function apart(a: number, b: number) {
  const d = Math.abs(a - b) % 360
  return Math.min(d, 360 - d)
}
