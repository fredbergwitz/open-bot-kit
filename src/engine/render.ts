// Writes a live bot's frame into the skeleton bot-still drew: direct
// attribute writes, and only what changed, so a settled bot writes nothing.
// Shading layers and clip paths are copies of each part's path, so a morph
// rebuilds each outline once and sets it on every copy.
import {
  BX,
  BY,
  EYE_L,
  FSCALE,
  FX,
  FY,
  LIMB,
  RY,
  SPIN,
  SPREAD,
  STRETCH,
  TURN,
  WOBBLE,
} from './contracts'
import { DEG, bodyPath, drawn, limbPath, root, smooth } from './geometry'
import type { Rig } from './rig'
import {
  ORDER,
  colors,
  cutLine,
  eyeShape,
  glossPath,
  ink,
  yawOf,
} from './still'

// A 2D affine matrix built up in place, written only when it changed.
const m = new Float64Array(6)

function reset() {
  m.set([1, 0, 0, 1, 0, 0])
}

/** Post-multiply by [a b c d e f], so calls read like an SVG transform list. */
function times(
  a: number,
  b: number,
  c: number,
  d: number,
  e: number,
  f: number,
) {
  const [ma, mb, mc, md, me, mf] = m
  m[0] = ma * a + mc * b
  m[1] = mb * a + md * b
  m[2] = ma * c + mc * d
  m[3] = mb * c + md * d
  m[4] = ma * e + mc * f + me
  m[5] = mb * e + md * f + mf
}

function translate(x: number, y: number) {
  times(1, 0, 0, 1, x, y)
}

function rotate(degrees: number, cx: number, cy: number) {
  const c = Math.cos(degrees * DEG)
  const s = Math.sin(degrees * DEG)
  times(c, s, -s, c, cx - c * cx + s * cy, cy - s * cx - c * cy)
}

function scale(sx: number, sy: number, cx: number, cy: number) {
  times(sx, 0, 0, sy, cx - sx * cx, cy - sy * cy)
}

function round(value: number, places: number) {
  return Math.round(value * places) / places
}

export function renderer(svg: SVGSVGElement, lens: boolean) {
  function all(selector: string) {
    return [...svg.querySelectorAll(selector)]
  }
  const figure = svg.querySelector('[data-figure]')!
  const groups = all('[data-p]')
  const contours = all('[data-c]')
  const paths = groups.map((_, i) => all(`[data-d="${i}"]`))
  const gloss = svg.querySelector('[data-gloss]')
  const face = svg.querySelector('[data-face]')!
  const eyes = all('[data-eye]')
  const lines = all('[data-e]')
  const cut = svg.querySelector('[data-cut]')!
  const cutUrl = `url(#${cut.parentElement!.id})`

  // What is on screen, so nothing is rebuilt or rewritten while settled.
  const body = new Float64Array(WOBBLE + 2).fill(NaN)
  const limbs = ORDER.map(() => new Float64Array(LIMB + 1).fill(NaN))
  const eye = [new Float64Array(4).fill(NaN), new Float64Array(4).fill(NaN)]
  const next = new Float64Array(4)
  const matrices = new Float64Array(8 * 6).fill(NaN)
  const color = new Float64Array(3).fill(NaN)
  let opacity = NaN
  let line: number | null = NaN
  const pivot = [0, 0]
  let wrote = false

  /** Copy `now` (and `extra`) into `last` and say whether it moved. */
  function changed(last: Float64Array, now: ArrayLike<number>, extra = 0) {
    let moved =
      last.length > now.length && !(Math.abs(last[now.length] - extra) < 1e-4)
    for (let i = 0; i < now.length && !moved; i++) {
      if (!(Math.abs(last[i] - now[i]) < 1e-3)) moved = true
    }
    if (!moved) return false
    last.set(now)
    if (last.length > now.length) last[now.length] = extra
    wrote = true
    return true
  }

  /** Write the matrix to `element` (and a white bot's contour `twin`) unless it already holds it. */
  function commit(element: Element, slot: number, twin?: Element) {
    let same = true
    for (let i = 0; i < 6; i++) {
      if (!(Math.abs(matrices[slot * 6 + i] - m[i]) < 1e-4)) same = false
    }
    if (same) return
    matrices.set(m, slot * 6)
    wrote = true
    const transform = `matrix(${round(m[0], 1e4)} ${round(m[1], 1e4)} ${round(m[2], 1e4)} ${round(m[3], 1e4)} ${round(m[4], 100)} ${round(m[5], 100)})`
    element.setAttribute('transform', transform)
    twin?.setAttribute('transform', transform)
  }

  /** Draws the frame; says whether anything on screen changed. */
  return function draw(o: Rig['out']) {
    wrote = false
    const p = o.pose
    const b = p.body
    const bx = b[BX]
    const by = b[BY]
    const x = (slot: number) => o.springs[slot * 2]

    if (
      !(Math.abs(color[0] - o.color[0]) < 1e-4) ||
      !(Math.abs(color[1] - o.color[1]) < 1e-4) ||
      !(Math.abs(color[2] - o.color[2]) < 1e-2)
    ) {
      color.set(o.color)
      const c = colors(o.color[0], o.color[1], o.color[2])
      svg.style.setProperty('--fill', c.fill)
      svg.style.setProperty('--dark', c.dark)
      svg.style.setProperty('--deep', c.deep)
      svg.style.setProperty('--hi', c.hi)
      svg.style.setProperty('--line', c.line)
      wrote = true
    }

    // Geometry, rebuilt only while something morphs.
    const phase = b[WOBBLE] ? o.phase : 0
    if (changed(body, b, phase)) {
      const d = bodyPath(b, phase)
      for (const path of paths[4]) path.setAttribute('d', d)
      gloss?.setAttribute('d', glossPath(b))
    }
    for (let k = 0; k < 4; k++) {
      const i = ORDER[k]
      const limb = p.limbs[i]
      const stretch = 1 + x(STRETCH + i)
      if (changed(limbs[k], limb, stretch)) {
        const d = drawn(limb) ? limbPath(limb, bx, by, stretch) : ''
        for (const path of paths[k]) path.setAttribute('d', d)
      }
      root(limb, bx, by, pivot)
      reset()
      rotate(x(TURN + i), pivot[0], pivot[1])
      commit(groups[k], 1 + k, contours[k])
    }

    // Whole figure: breath, sway, posture and the hop, about the floor.
    const floor = by + b[RY]
    reset()
    translate(0, -o.lift)
    rotate(o.tilt, 0, floor)
    scale(o.sx, o.sy, 0, floor)
    commit(figure, 0)

    // Face: two ink marks riding the body, larger at small sizes.
    const f = p.face
    const grow = f[FSCALE] * (1 + 0.3 * o.small)
    const bold = 1 + 0.5 * o.small
    const seen = smooth(0.9, 1.4, 6 * bold * grow * (o.size / 100))
    if (!(Math.abs(opacity - seen) < 0.004)) {
      opacity = seen
      face.setAttribute('opacity', String(round(seen, 1000)))
      wrote = true
    }
    const { slide, squeeze } = yawOf(f, b, x(SPIN))
    reset()
    translate(
      bx + f[FX] + o.gaze[0] * 1.2 + slide,
      by + f[FY] + o.gaze[1] * 1.2,
    )
    scale(grow * squeeze, grow, 0, 0)
    commit(face, 5)
    const cutAt = cutLine(f, o.small)
    if (cutAt !== line) {
      if (cutAt === null) face.removeAttribute('clip-path')
      else {
        if (line === null || Number.isNaN(line))
          face.setAttribute('clip-path', cutUrl)
        cut.setAttribute('y', String(cutAt))
      }
      line = cutAt
      wrote = true
    }

    for (let i = 0; i < 2; i++) {
      const side = i ? 1 : -1
      reset()
      translate(side * f[SPREAD], 0)
      scale(1, o.lids[i], 0, 0)
      commit(eyes[i], 6 + i)
      const at = EYE_L + i * 4
      next[0] = f[at] - side * o.gaze[0] * 2.5
      next[1] = f[at + 1] * (1 - 0.1 * o.small)
      next[2] = f[at + 2]
      next[3] = f[at + 3] * bold
      ink(next, (grow * (1 + 0.08 * o.small) * o.size) / 100)
      if (changed(eye[i], next)) {
        const width = round(next[3], 100)
        lines[i].setAttribute(
          'd',
          eyeShape(lens, next[0], next[1], next[2], width, side),
        )
        if (!lens) lines[i].setAttribute('stroke-width', String(width))
      }
    }
    return wrote
  }
}
