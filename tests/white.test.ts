// A white bot: the hue slider's first stop. Its code reads back white, and it
// draws an outline that no coloured bot gets.
import { describe, expect, it } from 'vitest'
import { decode, encode } from '../src/engine/code'
import { PRESETS } from '../src/engine/presets'
import { apply } from '../src/engine/spec'
import { still } from '../src/engine/still'
import { toSvg } from '../src/engine/svg'

const white = apply(PRESETS.bun, { color: { l: 0.95, c: 0.012 } })

describe('a white bot', () => {
  it('round-trips through its share code', () => {
    expect(decode(encode(white))).toEqual(white)
  })

  it('is outlined, and a coloured bot is not', () => {
    expect(still(white, 48).contour).toBeGreaterThan(0)
    expect(still(white, 16).contour).toBe(12.5)
    expect(still(PRESETS.bun, 48).contour).toBeNull()
    expect(toSvg(white)).toContain('stroke-linejoin="round"')
    expect(toSvg(PRESETS.bun)).not.toContain('stroke-linejoin')
  })
})
