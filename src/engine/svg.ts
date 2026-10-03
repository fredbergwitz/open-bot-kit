// A bot as a standalone SVG file: Copy SVG, favicons, social cards, the public
// /bot API. The same still and shading as bot-still, with sRGB hex colours so
// any renderer reads it (resvg, Figma and mail clients skip OKLCH), and the
// share code in <metadata>, so the file is also the save.
import { LIGHT, SOFT, still } from './still'
import type { BotSpec } from './spec'

function escape(text: string) {
  return text.replace(
    /[<>&"]/g,
    (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;' })[c]!,
  )
}

/** An OKLCH colour as sRGB hex, clipped into gamut. */
export function hex(l: number, c: number, h: number) {
  const a = c * Math.cos((h * Math.PI) / 180)
  const b = c * Math.sin((h * Math.PI) / 180)
  const L = (l + 0.3963377774 * a + 0.2158037573 * b) ** 3
  const M = (l - 0.1055613458 * a - 0.0638541728 * b) ** 3
  const S = (l - 0.0894841775 * a - 1.291485548 * b) ** 3
  return (
    '#' +
    [
      4.0767416621 * L - 3.3077115913 * M + 0.2309699292 * S,
      -1.2684380046 * L + 2.6097574011 * M - 0.3413193965 * S,
      -0.0041960863 * L - 0.7034186147 * M + 1.707614701 * S,
    ]
      .map((x) => {
        const v = x > 0.0031308 ? 1.055 * x ** (1 / 2.4) - 0.055 : 12.92 * x
        const byte = Math.round(Math.max(0, Math.min(1, v)) * 255)
        return byte.toString(16).padStart(2, '0')
      })
      .join('')
  )
}

export function toSvg(
  spec: BotSpec,
  size = 256,
  code?: string,
  expression = 'idle',
) {
  const s = still(spec, size, expression)
  const c = s.colors
  const bands: [string, number][] =
    s.shade === 'deep'
      ? [
          [c.dark, 3.2],
          [c.fill, 8],
        ]
      : s.shade === 'toon' || s.shade === 'gloss'
        ? [[c.fill, 7]]
        : []
  const base =
    s.shade === 'deep'
      ? c.deep
      : s.shade === 'soft'
        ? 'url(#soft)'
        : bands.length
          ? c.dark
          : c.fill
  const parts = [...s.limbs, s.body].filter(Boolean)
  const contour = s.contour
    ? `<g fill="${c.line}" stroke="${c.line}" stroke-width="${s.contour}" stroke-linejoin="round">${parts.map((d) => `<path d="${d}"/>`).join('')}</g>`
    : ''
  let defs = ''
  if (bands.length)
    defs += parts
      .map((d, i) => `<clipPath id="c${i}"><path d="${d}"/></clipPath>`)
      .join('')
  if (s.shade === 'soft')
    defs += `<radialGradient id="soft" cx="${SOFT.cx}" cy="${SOFT.cy}" r="${SOFT.r}"><stop offset="0" stop-color="${c.hi}"/><stop offset="1" stop-color="${c.deep}"/></radialGradient>`
  if (s.face.cut !== null)
    defs += `<clipPath id="cut"><rect x="-40" y="${s.face.cut}" width="80" height="80"/></clipPath>`
  const figure = parts
    .map(
      (d, i) =>
        `<path d="${d}" fill="${base}"/>` +
        bands
          .map(
            ([fill, k]) =>
              `<g clip-path="url(#c${i})"><path d="${d}" fill="${fill}" transform="translate(${LIGHT[0] * k} ${LIGHT[1] * k})"/></g>`,
          )
          .join(''),
    )
    .join('')
  const gloss =
    s.shade === 'gloss'
      ? `<path d="${s.gloss}" fill="none" stroke="#fff" stroke-opacity="0.9" stroke-width="2.6" stroke-linecap="round"/>`
      : ''
  const ink = s.lens
    ? `fill="${s.ink}"`
    : `fill="none" stroke="${s.ink}" stroke-linecap="round"`
  const eyes = s.eyes
    .map(
      (e) =>
        `<g transform="translate(${e.x} 0) scale(1 ${e.lid})"><path d="${e.d}"${s.lens ? '' : ` stroke-width="${e.width}"`}/></g>`,
    )
    .join('')
  const f = s.face
  const face = `<g transform="translate(${f.x} ${f.y}) scale(${f.scale * f.squeeze} ${f.scale})" ${ink} opacity="${f.opacity}"${f.cut === null ? '' : ' clip-path="url(#cut)"'}>${eyes}</g>`
  const title = spec.name ? `<title>${escape(spec.name)}</title>` : ''
  const metadata = code ? `<metadata>${escape(code)}</metadata>` : ''
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${s.viewBox}" width="${size}" height="${size}">` +
    title +
    metadata +
    (defs ? `<defs>${defs}</defs>` : '') +
    `<g transform="scale(${s.scale})">${contour}${figure}${gloss}${face}</g></svg>`
  ).replace(/oklch\(([\d.]+) ([\d.]+) ([\d.-]+)\)/g, (_, l, c, h) =>
    hex(+l, +c, +h),
  )
}
