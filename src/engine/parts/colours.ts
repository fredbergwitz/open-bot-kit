// Colour swatches in three rows of six: warm, cool, then berries and earths.
// Lightness is set per hue inside the readable band (L .60 to .70): yellows
// and limes sit high so they never turn mustard, blues and violets low so
// they stay deep. Every swatch keeps at least 2.6:1 on a white page, 4.3:1 on
// a dark one, and 4.1:1 under the ink eyes. The seven's own colours are exact.
// A white bot (L ≥ .9, from the hue slider's first stop) is outlined instead.
import type { Preset } from '../contracts'

function colour(
  id: string,
  label: string,
  h: number,
  c: number,
  l: number,
): Preset {
  return { id, label, patch: { color: { h, c, l } } }
}

export default [
  colour('rose', 'Rose', 10, 0.15, 0.66),
  colour('coral', 'Coral', 25, 0.17, 0.66),
  colour('tangerine', 'Tangerine', 45, 0.19, 0.64),
  colour('amber', 'Amber', 68, 0.15, 0.69),
  colour('honey', 'Honey', 95, 0.135, 0.7),
  colour('lime', 'Lime', 125, 0.16, 0.68),

  colour('leaf', 'Leaf', 140, 0.14, 0.62),
  colour('mint', 'Mint', 165, 0.12, 0.65),
  colour('teal', 'Teal', 188, 0.12, 0.62),
  colour('sky', 'Sky', 228, 0.12, 0.66),
  colour('blue', 'Blue', 252, 0.17, 0.6),
  colour('violet', 'Violet', 295, 0.19, 0.6),

  colour('orchid', 'Orchid', 320, 0.18, 0.62),
  colour('pink', 'Pink', 352, 0.2, 0.62),
  colour('biscuit', 'Biscuit', 62, 0.11, 0.62),
  colour('clay', 'Clay', 38, 0.09, 0.6),
  colour('sage', 'Sage', 150, 0.06, 0.64),
  colour('slate', 'Slate', 250, 0.04, 0.62),
] satisfies Preset[]
