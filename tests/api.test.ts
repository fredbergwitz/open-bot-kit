import { describe, expect, test } from 'vitest'
import { MOODS, botFor } from '../src/api'
import { encode } from '../src/engine/code'
import { PRESETS } from '../src/engine/presets'
import { hex, toSvg } from '../src/engine/svg'

// Apps store these names; their bots may never change. If this fails after a
// shuffle or parts change, freeze the old generator in src/api.ts.
const PINNED: Record<string, string> = {
  '42': 'b1.AhwBAAHsDgCOAgD4CgGgAQCQBAD2AwDMAwAKBs4BAARub25lFOoBAUQMGAACALgBANAPAPALAPgFAcAHAtQBAEYAKgByAEwAoAEAQgG8AQ',
  alice:
    'b1.BigBAAGQDQCwAgDwCgGMAQDgAwC8BADYBAAACP8TANQJAAAA8AEAAAP8EQDwAQD_EwDUCQAAAPABAAAD_BEA8AEAxgEAJA0CADYAmgEAyBAAwAwA8gQB0ggCxAEASAAyAKgBAFYAswEAbAG0AQ',
  user_1:
    'b1.ACwBAAG4FwB4A8QEAPQDCo8XALAJALcDALgDAKMNAvgKANwLAKwCAI8XALAJALcDALgDAKMNAvgKANwLAKwCALwBAD0NBAAPALgBAIgOAIgOAPABAZANALgBAYQBAKABAG4A_gMAfAB4ADoACgB8AGQAoAEAJwEBBGRvemU',
  'Ünïcødé 🤖':
    'b1.BTEBAAH4BQC0AQCwCQFQALgFAO4DAIQHB74BAccVAKAGAHcAhAIAAAKYEQCoFACsAgDHFQCgBgB3AIQCAAACmBEAqBQArAIA2AEDgBQAoAYA5wIAhAIA-AUBZACkDQDAAgIUACsAxgECqAUBsAkAyAEB6gEAPAAoAGwARACgAQA8AcwBAwA',
}


describe('botFor', () => {
  test('a name is the same bot forever', () => {
    for (const [name, code] of Object.entries(PINNED))
      expect(encode(botFor(name))).toBe(code)
  })

  test('a share code is the bot it describes', () => {
    expect(botFor('b1.AAA')).toEqual(PRESETS.kit)
    expect(botFor(PINNED.alice)).toEqual(botFor('alice'))
  })

  test('names spread across many different bots', () => {
    const codes = new Set(
      Array.from({ length: 200 }, (_, i) => encode(botFor(`user_${i}`))),
    )
    expect(codes.size).toBe(200)
  })
})

describe('hex', () => {
  test('converts OKLCH to sRGB and clips out-of-gamut colours', () => {
    expect(hex(1, 0, 0)).toBe('#ffffff')
    expect(hex(0, 0, 0)).toBe('#000000')
    expect(hex(0.628, 0.2577, 29.23)).toBe('#ff0000')
    expect(hex(0.7, 0.4, 150)).toMatch(/^#[0-9a-f]{6}$/)
  })

  test('the SVG carries no OKLCH, so non-browser renderers read it', () => {
    for (const mood of MOODS)
      expect(toSvg(botFor('alice'), 256, undefined, mood)).not.toContain(
        'oklch',
      )
  })
})
