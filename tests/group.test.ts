import { describe, expect, it } from 'vitest'
import { PRESETS } from '../src/engine/presets'
import { companions, resemble, shuffle } from '../src/engine/shuffle'
import { apply } from '../src/engine/spec'

function rng(seed: number) {
  return () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
}

describe('companions resemble yours', () => {
  const mine = apply(PRESETS.bun, {
    shade: 'flat',
    color: { h: 200, c: 0.06, l: 0.62 },
  })

  it('wear your shading and chroma at their own hue', () => {
    for (const other of companions(rng(7), mine, 4)) {
      const seen = resemble(other, mine)
      expect(seen.shade).toBe('flat')
      expect(seen.color.c).toBe(0.06)
      expect(seen.color.h).toBe(other.color.h)
    }
  })

  it('keep their own colours beside a white bot', () => {
    const white = apply(mine, { color: { l: 0.95, c: 0.012 } })
    const [other] = companions(rng(3), white, 1)
    expect(resemble(other, white).color).toEqual(other.color)
  })

  it('come back smooth under deep shading', () => {
    const lumpy = apply(PRESETS.kit, { body: { depth: 0.2, wobble: 0.05 } })
    const seen = resemble(lumpy, apply(mine, { shade: 'deep' }))
    expect(seen.shade).toBe('deep')
    expect(seen.body.depth).toBe(0)
    expect(seen.body.wobble).toBe(0)
  })
})

describe('shuffle', () => {
  it('keeps your shading and eye colour, and keeps deep shading smooth', () => {
    let seed = 7
    const rng = () => ((seed = (seed * 16807) % 2147483647) - 1) / 2147483646
    const deep = apply(PRESETS.kit, { shade: 'deep', eyes: { ink: 'light' } })
    for (let i = 0; i < 200; i++) {
      const next = shuffle(rng, deep)
      expect(next.shade).toBe('deep')
      expect(next.eyes.ink).toBe('light')
      expect(next.body.depth || next.body.wobble).toBeFalsy()
    }
  })
})
