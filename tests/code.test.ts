// Share codes are a promise: a code written today decodes to the same bot
// forever, and anything that is not a code decodes to null.
import { describe, expect, it } from 'vitest'
import { decode, encode, wears } from '../src/engine/code'
import { PRESETS, SEVEN } from '../src/engine/presets'
import { FIELDS, apply } from '../src/engine/spec'

function raw(...bytes: number[]) {
  return (
    'b1.' +
    btoa(String.fromCharCode(...bytes))
      .replace(/\+/g, '-')
      .replace(/\//g, '_')
      .replace(/=+$/, '')
  )
}

const MOSS = apply(PRESETS.hare, {
  name: 'Moss',
  role: 'Gardener',
  color: { h: 210 },
  shade: 'toon',
  top: { size: 1.25 },
  traits: { owl: true, quirks: ['wink'] },
})

describe('share codes', () => {
  it('freezes the field table: paths are unique', () => {
    const paths = FIELDS.map((field) => field.path)
    expect(new Set(paths).size).toBe(paths.length)
  })

  it('writes each of the seven as a frozen code and reads it back bit for bit', () => {
    expect(SEVEN.map((id) => encode(PRESETS[id]))).toEqual([
      'b1.AAA',
      'b1.AQA',
      'b1.AgA',
      'b1.AwA',
      'b1.BAA',
      'b1.BQA',
      'b1.BgA',
    ])
    for (const id of SEVEN)
      expect(decode(encode(PRESETS[id]))).toEqual(PRESETS[id])
  })

  it('reads a frozen code for a tweaked bot', () => {
    const code = 'b1.AQcBBE1vc3MACEdhcmRlbmVyAOggAgEh-gEkAQABBHdpbms'
    expect(encode(MOSS)).toBe(code)
    expect(decode(code)).toEqual(MOSS)
  })

  it('keeps light eyes through a link', () => {
    const light = apply(MOSS, { eyes: { ink: 'light' } })
    expect(decode(encode(light))).toEqual(light)
  })

  it('stores a changed number on the grid and keeps unchanged ones exact', () => {
    const spec = apply(PRESETS.nib, {
      top: { a: [-110.04, ...PRESETS.nib.top.a.slice(1)] as never },
    })
    const back = decode(encode(spec))!
    expect(back.top.a[0]).toBe(-110)
    expect(back.top.a[1]).toBe(PRESETS.nib.top.a[1])
    expect(back.top.b).toEqual(PRESETS.nib.top.b)
  })

  it('diffs a bot from elsewhere against the nearest starter', () => {
    const spec = apply(PRESETS.tuft, { from: 'shuffle', color: { h: 20 } })
    expect(decode(encode(spec))).toEqual(spec)
    expect(encode(spec).length).toBeLessThan(24)
  })

  it('clamps values a code holds out of range', () => {
    // Kit, one change: color.l (field 5) = 0.99.
    expect(decode(raw(0, 1, 5, 0xbc, 0x0f))?.color.l).toBe(0.96)
  })

  it.each([
    ['empty', ''],
    ['no prefix', 'AAA'],
    ['another version', 'b2.AAA'],
    ['not base64url', 'b1.A+A/'],
    ['a dangling character', 'b1.AAAAA'],
    ['truncated', 'b1.AQcBBE1vc3MACEdhcmRl'],
    ['unknown preset', raw(7, 0)],
    ['unknown field', raw(0, 1, 200, 0)],
    ['trailing bytes', raw(0, 0, 0)],
    ['invalid UTF-8 name', raw(0, 1, 1, 2, 0xc3, 0x28)],
    ['a runaway number', raw(0, 1, 3, 255, 255, 255, 255, 255, 255, 1)],
    ['an unknown top', raw(0, 1, 19, 3, 0x7a, 0x7a, 0x7a)],
    [
      'a top named after an Object property',
      raw(0, 1, 19, 11, ...[...'constructor'].map((c) => c.charCodeAt(0))),
    ],
  ])('reads %s as no bot', (_, code) => {
    expect(decode(code)).toBeNull()
  })

  it('drops quirks this build does not have', () => {
    const code = encode(
      apply(PRESETS.kit, { traits: { quirks: ['toString', 'wink'] } }),
    )
    expect(decode(code)?.traits.quirks).toEqual(['wink'])
  })

  it('sees a tile as worn after a round trip', () => {
    const patch = { top: PRESETS.hare.top }
    const spec = decode(encode(apply(PRESETS.kit, patch)))!
    expect(wears(spec, patch)).toBe(true)
    expect(wears(PRESETS.kit, patch)).toBe(false)
  })
})
