// The public bot API: any name is a bot, the same one forever. A share code
// is the bot it describes; any other name seeds a shuffle of one of the seven.
// Apps store names we never see again, so everything here is frozen: the hash,
// the generator, the moods. tests/lib/bots-api.test.ts pins names to codes; if
// shuffle or its parts change those, keep a frozen copy here for v1.
import { decode, encode } from './engine/code'
import type { Rng } from './engine/contracts'
import { PRESETS, SEVEN } from './engine/presets'
import { shuffle } from './engine/shuffle'
import type { BotSpec } from './engine/spec'

/** Held expressions a still can show; idle is the rest. Append-only. */
export const MOODS = [
  'idle',
  'listening',
  'happy',
  'sleepy',
  'content',
  'smug',
  'sad',
] as const

export const SIZES = { min: 16, max: 1024, default: 256 }

/** FNV-1a over the name's UTF-8, then mulberry32. */
function seeded(name: string): Rng {
  let a = 2166136261
  for (const byte of new TextEncoder().encode(name))
    a = Math.imul(a ^ byte, 16777619)
  return function () {
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function botFor(name: string): BotSpec {
  const shared = decode(name)
  if (shared) return shared
  const rng = seeded(name)
  // A shuffle keeps its starter's name, which isn't this bot's. Through the
  // code and back, the bot is exactly its share code.
  return decode(
    encode({
      ...shuffle(rng, PRESETS[SEVEN[Math.floor(rng() * SEVEN.length)]]),
      name: '',
      role: '',
    }),
  )!
}
