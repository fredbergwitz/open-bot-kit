// A share code is a bot written as the fields it changed from a preset:
// 'b1.' then base64url bytes [preset, count, (gap, value)*]. An
// untouched starter is a handful of characters, and because FIELDS only ever
// grows, a code decodes to the same bot forever. Fields left unchanged never
// pass through the integer grid, so presets come back bit for bit.
import { quirks, tops } from './parts'
import { PRESETS, SEVEN } from './presets'
import { FIELDS, clamp, read, write, type BotSpec, type Field } from './spec'

/** The format and spec version: a v2 spec gets 'b2.' and a migration. */
const PREFIX = 'b1.'

/** The integer a field stores, or the value itself when it is not a number. */
function key(field: Field, value: unknown) {
  return field.kind === 'num'
    ? Math.round((value as number) * field.scale)
    : value
}

function same(field: Field, a: unknown, b: unknown) {
  return field.kind === 'list'
    ? (a as string[]).join('\n') === (b as string[]).join('\n')
    : key(field, a) === key(field, b)
}

function changes(spec: BotSpec, base: BotSpec) {
  return FIELDS.flatMap((field, i) =>
    same(field, read(spec, field.path), read(base, field.path)) ? [] : [i],
  )
}

function varint(out: number[], n: number) {
  while (n > 127) {
    out.push((n & 127) | 128)
    n = Math.floor(n / 128)
  }
  out.push(n)
}

function text(out: number[], value: string) {
  const bytes = new TextEncoder().encode(value)
  varint(out, bytes.length)
  out.push(...bytes)
}

export function encode(spec: BotSpec): string {
  // The bot's own starter is its base; any other bot diffs against the
  // nearest of the seven.
  const ids = SEVEN.includes(spec.from as never)
    ? [spec.from as (typeof SEVEN)[number]]
    : [...SEVEN]
  let best = { at: 0, changed: [] as number[] }
  for (const id of ids) {
    const changed = changes(spec, PRESETS[id])
    if (id === ids[0] || changed.length < best.changed.length)
      best = { at: SEVEN.indexOf(id), changed }
  }
  const out = [best.at]
  varint(out, best.changed.length)
  let last = -1
  for (const i of best.changed) {
    const field = FIELDS[i]
    const value = read(spec, field.path)
    varint(out, i - last - 1)
    last = i
    if (field.kind === 'num') {
      const k = key(field, value) as number
      varint(out, k < 0 ? -2 * k - 1 : 2 * k)
    } else if (field.kind === 'enum')
      varint(out, field.options.indexOf(value as string))
    else if (field.kind === 'flag') out.push(value ? 1 : 0)
    else if (field.kind === 'text') text(out, value as string)
    else {
      varint(out, (value as string[]).length)
      for (const item of value as string[]) text(out, item)
    }
  }
  let binary = ''
  for (const byte of out) binary += String.fromCharCode(byte)
  return (
    PREFIX +
    btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '')
  )
}

/** The bot a code describes, clamped into range, or null when the code is not one. */
export function decode(code: string): BotSpec | null {
  if (!code.startsWith(PREFIX) || !/^[\w-]*$/.test(code.slice(PREFIX.length)))
    return null
  try {
    const bytes = Uint8Array.from(
      atob(code.slice(PREFIX.length).replace(/-/g, '+').replace(/_/g, '/')),
      (c) => c.charCodeAt(0),
    )
    let p = 0
    const utf8 = new TextDecoder('utf-8', { fatal: true })
    function next() {
      let n = 0
      let scale = 1
      for (;;) {
        if (p >= bytes.length || scale > 2 ** 35) throw new Error('short')
        const b = bytes[p++]
        n += (b & 127) * scale
        if (b < 128) return n
        scale *= 128
      }
    }
    function string() {
      const length = next()
      if (p + length > bytes.length) throw new Error('short')
      p += length
      return utf8.decode(bytes.subarray(p - length, p))
    }
    const base = PRESETS[SEVEN[next()]]
    if (!base) return null
    const spec = structuredClone(base)
    let i = -1
    for (let n = next(); n > 0; n--) {
      i += next() + 1
      const field = FIELDS[i]
      if (!field) return null
      if (field.kind === 'num') {
        const z = next()
        write(spec, field.path, (z % 2 ? -(z + 1) / 2 : z / 2) / field.scale)
      } else if (field.kind === 'enum')
        write(spec, field.path, field.options[next()])
      else if (field.kind === 'flag') write(spec, field.path, next() === 1)
      else if (field.kind === 'text') write(spec, field.path, string())
      else write(spec, field.path, Array.from({ length: next() }, string))
    }
    if (p !== bytes.length) return null
    // Parts this build doesn't have: no top means no bot, a quirk just drops.
    if (!Object.hasOwn(tops, spec.top.kind)) return null
    spec.traits.quirks = spec.traits.quirks.filter((id) =>
      Object.hasOwn(quirks, id),
    )
    return clamp(spec)
  } catch {
    return null
  }
}

/**
 * Whether `spec` already wears every value in `patch`, compared on the code's
 * grid, so a tile stays selected after its bot went through a code.
 */
export function wears(spec: BotSpec, patch: object): boolean {
  return FIELDS.every((field) => {
    let at: unknown = patch
    for (const part of field.path.split('.'))
      at = at == null ? undefined : (at as Record<string, unknown>)[part]
    return at === undefined || same(field, read(spec, field.path), at)
  })
}
