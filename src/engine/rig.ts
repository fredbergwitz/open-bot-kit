// A live bot's mind: Ears' life loop, generalised. Held expressions blend by
// per-part weight springs on their own delays (the ears lead), springs carry
// every beat, and modules act through Ctx. Plain TypeScript: the clock, the
// random source and dt come in from outside, so tests can trace it exactly.
import {
  BREATH,
  EYE_L,
  EYE_R,
  FSCALE,
  FX,
  FY,
  GAZE_X,
  GAZE_Y,
  L,
  LEAN,
  LENGTH,
  LIFT,
  LIMB,
  LID,
  LIMBS,
  R,
  SHUT,
  SPIN,
  SPREAD,
  SPRINGS,
  SQUASH,
  STRETCH,
  T,
  TALL,
  TILT,
  TURN,
  WIDE,
  BODY,
  FACE,
  type Ctx,
  type Cue,
  type Pose,
  type Rng,
} from './contracts'
import { halfWidth, small, smooth } from './geometry'
import { expressions, quirks, tops } from './parts'
import { SIZE, blank, pose, vector } from './pose'
import type { BotSpec } from './spec'

const TAU = Math.PI * 2
/** Parts that follow an expression change on their own clock. */
const [HEAD, LEFT, RIGHT, EYES] = [0, 1, 2, 3]
/** Ears' idle delays: the ears lead. Expressions without delays use them too. */
const IDLE: [number, number, number, number] = [0.03, 0, 0.05, 0]
/** Which part's clock each pose number follows. */
const OWNER = new Int8Array(SIZE)
const AT_FACE = BODY + LIMBS * LIMB
OWNER.fill(HEAD)
OWNER.fill(LEFT, BODY + L * LIMB, BODY + (L + 1) * LIMB)
OWNER.fill(RIGHT, BODY + R * LIMB, BODY + (R + 1) * LIMB)
OWNER.fill(EYES, AT_FACE, AT_FACE + FACE)
const PART = [LEFT, RIGHT, HEAD, HEAD] // by limb L, R, C, T

/** Eyelid opening over one blink: quick close, short hold, open past 1. */
function lid(t: number) {
  if (t < 0 || t > 0.42) return 1
  if (t < 0.07) return 1 - 0.92 * smooth(0, 0.07, t)
  if (t < 0.12) return 0.08
  if (t < 0.28) return 0.08 + smooth(0.12, 0.28, t)
  return 1.08 - 0.08 * smooth(0.28, 0.42, t)
}

/** Semi-implicit spring on [x, v] pairs, in 1/120 s substeps (Ears' own). */
export function settle(
  s: Float64Array,
  slot: number,
  goal: number,
  omega: number,
  zeta: number,
  dt: number,
) {
  const i = slot * 2
  for (let rest = dt; rest > 0; rest -= 1 / 120) {
    const h = Math.min(rest, 1 / 120)
    s[i + 1] +=
      (-omega * omega * (s[i] - goal) - 2 * zeta * omega * s[i + 1]) * h
    s[i] += s[i + 1] * h
  }
}

type Mood = {
  id: string
  /** [x, v] weight per part. */
  w: Float64Array
  target: Pose
  /** `target` as one vector; pose() writes into it in place. */
  all: Float64Array
}

export type Frame = {
  spec: BotSpec
  size: number
  expression: string
  reduced: boolean
  /** Life stops; what is moving comes to rest. */
  paused?: boolean
  cue?: Cue
}

export type Rig = ReturnType<typeof rig>

export function rig(start: Frame, rng: Rng) {
  let spec = start.spec
  let size = start.size
  let tiny = size < 24
  let reduced = start.reduced
  let speaking = 0
  const seed = rng() * 100
  let clock = seed

  const moods = new Map<string, Mood>()
  const flip = new Float64Array(4)
  const goalPart: string[] = []
  let mood = start.expression
  let moodSince = clock
  let shot: string | null = null
  let shotSince = 0
  let shotEnd = 0

  const springs = new Float64Array(SPRINGS * 2)
  const goals = new Float64Array(SPRINGS)
  const holds: { slot: number; value: number; until: number }[] = []
  /** Morph: the shown pose eases from the old spec's pose to the new one's. */
  const offset = new Float64Array((SIZE + 3) * 2)
  let morphing = false
  let morphFrom = 0

  let nextBlink = clock + 0.6 + rng() * 2.5
  let blinkAt = -10
  let nextGlance = clock + 1
  let nextTwitch = clock + 2.5 + rng() * 4
  let twitchSide = rng() < 0.5 ? 0 : 1
  const glance = [0, 0]
  const lookAt = [0, 0]
  let lookUntil = -Infinity
  const quirkAt = new Map<string, number>()

  /** What render draws this frame. */
  const shown = blank()
  const all = vector(shown)
  const blended = new Float64Array(SIZE)
  const scratch = new Float64Array(SIZE)
  const out = {
    pose: shown,
    /** OKLCH, morphing with the shape. */
    color: [spec.color.l, spec.color.c, spec.color.h],
    springs,
    size,
    small: small(size),
    tiny,
    /** Whole figure: lift above the floor, roll, scale. */
    lift: 0,
    tilt: 0,
    sx: 1,
    sy: 1,
    /** Gaze in Ears units, clamped to the room the face has. */
    gaze: [0, 0],
    lids: [1, 1],
    /** Liquid edge phase. */
    phase: 0,
  }
  let room = Infinity

  function random(mean: number) {
    return mean * (0.55 + 0.9 * rng())
  }

  function x(slot: number) {
    return springs[slot * 2]
  }

  const ctx: Ctx = {
    get spec() {
      return spec
    },
    rng,
    get clock() {
      return clock
    },
    get tiny() {
      return tiny
    },
    get reduced() {
      return reduced
    },
    get mood() {
      return mood
    },
    get speaking() {
      return speaking
    },
    kick(slot, velocity) {
      // Reduced motion: no kicks at all, so nothing jolts or hops.
      if (!reduced) springs[slot * 2 + 1] += velocity
    },
    goal(slot, value, hold) {
      goals[slot] += value
      if (hold) holds.push({ slot, value, until: clock + hold })
    },
    blink(delay = 0) {
      blinkAt = clock + delay
    },
    look(gx, gy, hold) {
      lookAt[0] = gx
      lookAt[1] = gy
      lookUntil = clock + hold
    },
    play(id) {
      const e = expressions[id]
      if (!e) return
      shot = id
      shotSince = clock
      shotEnd = clock + (e.duration ?? 1)
      ensure(id)
      delay(id)
      e.enter?.(ctx)
    },
  }

  function ensure(id: string) {
    let m = moods.get(id)
    if (!m) {
      const target = pose(spec, id, tiny)
      m = { id, w: new Float64Array(8), target, all: vector(target) }
      moods.set(id, m)
    }
    return m
  }

  /** Each part switches to `id` after its own delay. */
  function delay(id: string) {
    const d = expressions[id]?.delays ?? IDLE
    for (let part = 0; part < 4; part++)
      flip[part] = clock + d[part] / spec.traits.tempo
  }

  function enter(next: string) {
    mood = next
    moodSince = clock
    ensure(next)
    if (!shot) delay(next)
    expressions[next]?.enter?.(ctx)
  }

  /** Mix every mood's target by its part weights into `into`. */
  function blend(into: Float64Array) {
    into.fill(0)
    for (const m of moods.values()) {
      const from = m.all
      for (let i = 0; i < SIZE; i++) {
        const k = m.w[OWNER[i] * 2]
        if (Math.abs(k) < 1e-5) continue
        into[i] += k * from[i]
      }
    }
    // Limbs gather while they travel, so no in-between flails out of the box.
    for (let limb = 0; limb < LIMBS; limb++) {
      let top = 0
      for (const m of moods.values()) top = Math.max(top, m.w[PART[limb] * 2])
      into[BODY + limb * LIMB + LENGTH] *= 1 - 0.4 * Math.max(0, 1 - top)
    }
  }

  function rebuild(next: BotSpec, nextTiny: boolean) {
    const morph = moods.size > 0
    if (morph) blend(scratch)
    for (const m of moods.values()) pose(next, m.id, nextTiny, m.target)
    if (morph) {
      blend(blended)
      let big = 0
      for (let i = 0; i < SIZE; i++) {
        const d = scratch[i] - blended[i]
        offset[i * 2] += d
        if (i < AT_FACE) big = Math.max(big, Math.abs(d))
      }
      const dh = ((((spec.color.h - next.color.h) % 360) + 540) % 360) - 180
      offset[SIZE * 2] += spec.color.l - next.color.l
      offset[SIZE * 2 + 2] += spec.color.c - next.color.c
      offset[SIZE * 2 + 4] += dh
      morphing = true
      // A big change hides behind a blink: the lids close, then it morphs.
      if (big > 4 && clock - blinkAt > 0.42) {
        blinkAt = clock
        morphFrom = clock + 0.07
      }
    }
    spec = next
    tiny = nextTiny
    const rest = pose(spec, 'idle', tiny)
    // The room the face has to glance in before the eyes leave the body.
    const f = rest.face
    const grow = f[FSCALE] * (1 + 0.3 * small(size))
    const bold = 1 + 0.5 * small(size)
    room =
      (halfWidth(rest.body, f[FY]) -
        Math.abs(f[FX]) -
        (f[SPREAD] + (Math.max(f[EYE_L + 3], f[EYE_R + 3]) * bold) / 2) * grow -
        1) /
      1.2
  }

  rebuild(spec, tiny)
  const first = ensure(mood)
  for (let part = 0; part < 4; part++) {
    goalPart[part] = mood
    first.w[part * 2] = 1
  }
  expressions[mood]?.enter?.(ctx)

  function step(frame: Frame, ms: number) {
    const dt = ms / 1000
    clock += dt
    reduced = frame.reduced
    speaking = frame.cue?.speaking ?? 0
    const paused = frame.paused ?? false
    const lively = !reduced && !paused && !tiny
    if (frame.size !== size) {
      size = frame.size
      out.size = size
      out.small = small(size)
      rebuild(frame.spec, size < 24)
    } else if (frame.spec !== spec) rebuild(frame.spec, tiny)
    out.tiny = tiny
    const traits = spec.traits
    if (frame.expression !== mood) enter(frame.expression)
    if (frame.cue?.play) {
      ctx.play(frame.cue.play)
      frame.cue.play = null
    }
    if (frame.cue?.quirk) {
      quirks[frame.cue.quirk]?.play(ctx)
      frame.cue.quirk = null
    }
    if (shot && clock >= shotEnd) {
      shot = null
      delay(mood)
    }

    // Expression weights, each part on its own delay.
    const omega = reduced ? 24 : 14 * traits.tempo
    const now = shot ?? mood
    for (let part = 0; part < 4; part++) {
      if (clock >= flip[part]) goalPart[part] = now
      for (const m of moods.values()) {
        settle(m.w, part, m.id === goalPart[part] ? 1 : 0, omega, 1, dt)
      }
    }
    // A mood nothing heads to and whose weights are spent is dropped, so a
    // morph re-poses only what still shows.
    for (const [id, m] of moods)
      if (
        id !== mood &&
        id !== shot &&
        !goalPart.includes(id) &&
        m.w.every((v) => Math.abs(v) < 1e-5)
      )
        moods.delete(id)
    blend(blended)

    // Beats: modules kick springs and add goals.
    goals.fill(0)
    for (let i = holds.length - 1; i >= 0; i--) {
      if (clock < holds[i].until) goals[holds[i].slot] += holds[i].value
      else holds.splice(i, 1)
    }
    // Talking: a small lift of the whole bot on each of its own syllables.
    const saying = frame.cue?.saying ?? 0
    if (saying && !reduced && !paused) goals[SQUASH] += 0.06 * saying
    if (!paused) {
      expressions[mood]?.step?.(ctx, dt, clock - moodSince)
      if (shot) expressions[shot]?.step?.(ctx, dt, clock - shotSince)
      tops[spec.top.kind].live?.(ctx, dt)
    }
    if (mood === 'idle' && !shot && !paused) {
      for (const id of traits.quirks) {
        const quirk = quirks[id]
        if (!quirk) continue
        const [min, max] = quirk.every
        const at = quirkAt.get(id) ?? clock + min + rng() * (max - min)
        quirkAt.set(id, at)
        if (clock < at) continue
        quirkAt.set(id, clock + min + rng() * (max - min))
        quirk.play(ctx)
      }
    }

    // Lift is ballistic: it rises on a kick and lands with a squash.
    const lift = LIFT * 2
    if (springs[lift] > 0 || springs[lift + 1] > 0) {
      springs[lift + 1] -= 440 * dt
      springs[lift] = Math.max(0, springs[lift] + springs[lift + 1] * dt)
      if (springs[lift] === 0) {
        springs[lift + 1] = 0
        ctx.kick(SQUASH, -0.9 * traits.squash)
      }
    }

    // Gaze: its own glances, unless something holds it.
    if (clock >= nextGlance) {
      nextGlance = clock + random(traits.glance)
      const still = rng() < 0.4
      glance[0] = still ? 0 : (rng() * 2 - 1) * 2.4 * traits.look
      glance[1] = still ? 0 : (rng() * 2 - 1) * 1.3 * traits.look
    }
    let gx = glance[0]
    let gy = glance[1]
    const held = frame.cue?.look ?? (clock <= lookUntil ? lookAt : null)
    if (held) {
      gx = held[0] * 2.4 * traits.look
      gy = held[1] * 1.3 * traits.look
    }
    gx += goals[GAZE_X]
    gy += goals[GAZE_Y]
    settle(springs, GAZE_X, reduced || paused ? 0 : gx, 13, 1, dt)
    settle(springs, GAZE_Y, reduced || paused ? 0 : gy, 13, 1, dt)
    out.gaze[0] = Math.max(-room, Math.min(room, x(GAZE_X)))
    out.gaze[1] = x(GAZE_Y)

    // The rare ear twitch, only while idle.
    if (mood === 'idle' && !shot && !paused && clock >= nextTwitch) {
      nextTwitch = clock + random(traits.twitch * 2)
      ctx.kick(TURN + twitchSide, twitchSide ? 330 : -330)
      if (rng() < 0.65) twitchSide = 1 - twitchSide
    }

    // Breath and sway, only where they move whole pixels.
    const phase = (clock / traits.breathe) * TAU
    const breath = lively ? Math.sin(phase + 0.6 * Math.sin(phase)) : 0
    const sway = lively ? 1.1 * Math.sin(clock * 0.41 + seed) : 0
    const idle = moods.get('idle')?.w

    // Limbs: springy turns about the root carry the follow-through.
    for (let limb = 0; limb < LIMBS; limb++) {
      const part = PART[limb]
      let aim = goals[TURN + limb]
      if (limb === L || limb === R) {
        const side = limb
        const outward = side ? 1 : -1
        let rest = 0
        for (const m of moods.values()) rest += m.w[part * 2]
        // Each ear also drifts on its own slow beat, never in step with the other.
        const drift = lively
          ? 1.8 * Math.sin(clock * (0.53 + 0.11 * side) + seed * (side + 1)) +
            0.9 * Math.sin(clock * (0.29 + 0.07 * side) + seed * 3)
          : 0
        aim =
          rest *
            (2.2 * breath * outward +
              x(GAZE_X) * 1.4 +
              drift * (idle ? idle[part * 2] : 0)) +
          aim
      } else if (limb === T) {
        // A tail sways on the breath, a beat behind the body.
        aim += 6 * breath
      }
      settle(springs, TURN + limb, reduced ? 0 : aim, 16, 0.42, dt)
      settle(springs, STRETCH + limb, goals[STRETCH + limb], 18, 0.5, dt)
    }
    settle(springs, SQUASH, goals[SQUASH], 16, 0.42, dt)
    settle(springs, TILT, goals[TILT], 9, 0.45, dt)
    settle(springs, SPIN, goals[SPIN], 10, 0.7, dt)
    settle(springs, SHUT, goals[SHUT], 12, 1, dt)

    // The shown pose: the blend, plus whatever is left of a morph.
    all.set(blended)
    out.color[0] = spec.color.l
    out.color[1] = spec.color.c
    out.color[2] = spec.color.h
    if (morphing) {
      let moving = false
      const hold = clock < morphFrom
      for (let i = 0; i < SIZE + 3; i++) {
        if (!hold) settle(offset, i, 0, reduced ? 24 : 12, 1, dt)
        const d = offset[i * 2]
        if (Math.abs(d) > 1e-4 || Math.abs(offset[i * 2 + 1]) > 1e-3)
          moving = true
        if (i < SIZE) all[i] += d
        else out.color[i - SIZE] += d
      }
      if (!moving) {
        offset.fill(0)
        morphing = false
      }
    }

    // Whole figure: breath, sway, posture and the hop.
    const f = shown.figure
    out.lift = x(LIFT)
    out.tilt =
      sway * (idle ? idle[HEAD * 2] : 0) + f[LEAN] + traits.tilt + x(TILT)
    out.sy = 1 + 0.016 * breath * f[BREATH] + x(SQUASH) + f[TALL]
    out.sx = (1 - 0.008 * breath - 0.7 * x(SQUASH)) * (1 + f[WIDE])
    if (!reduced && !paused) out.phase += dt * 0.9

    // Blinks. Arcs never blink: each eye opens only as far as the moods it
    // holds are not arcs.
    if (clock >= nextBlink && !paused) {
      blinkAt = clock
      nextBlink = clock + Math.max(2.4, random(traits.blink))
      if (!reduced && rng() < traits.double) nextBlink = clock + 0.5
    }
    for (let i = 0; i < 2; i++) {
      let open = 1
      for (const m of moods.values())
        open -=
          m.w[EYES * 2] *
          smooth(1, 2.5, Math.abs(m.target.face[EYE_L + i * 4 + 2]))
      const t = clock - blinkAt - (i && traits.owl ? 0.11 : 0)
      const shut = Math.min(0.92, Math.max(0, x(SHUT)))
      out.lids[i] = shown.face[LID] * (1 - (1 - lid(t) * (1 - shut)) * open)
    }
    return out
  }

  return { ctx, step, out }
}
