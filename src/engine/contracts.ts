// The shared surface between the engine, the part modules and the UI.
// Coordinates are Ears': a 100-unit box centred on 0, y down, degrees, -90 up.
import type { BotSpec, DeepPartial } from './spec'

export type Rng = () => number

// Body pose slots: Ears' superellipse, then extensions neutral at 0.
export const BX = 0
export const BY = 1
export const RX = 2
export const RY = 3
export const SQUARE = 4 // 2 is an ellipse, higher is squarer
export const EGG = 5 // + widens the bottom
export const LOW = 6 // extra squareness of the lower half
export const BEND = 7 // ends droop (+) or lift (-)
export const POINT = 8 // pinches the top into a tip
export const LOBES = 9 // lobe count
export const DEPTH = 10 // lobe depth
export const WOBBLE = 11 // liquid edge amplitude
export const BODY = 12

// Limb pose slots: Ears' ear spine. The spec stores INSET in slot 1; poses store RHO.
export const ALPHA = 0 // root angle around the body centre
export const RHO = 1 // root distance from the body centre
export const INSET = 1 // spec only: how far the root sits inside the body edge
export const DELTA = 2 // lean from the outward radial
export const LENGTH = 3
export const CURL = 4
export const FOLD = 5
export const AT = 6
export const BASE = 7 // half widths
export const TIP = 8
export const BULGE = 9
export const LIMB = 10

// The limb bank: every bot always has these four, so any topper morphs into any other.
export const L = 0
export const R = 1 // mirrored from the left-limb convention in poses
export const C = 2 // centre
export const T = 3 // tail, behind the body
export const LIMBS = 4

// Face pose slots, eyes in the left-eye convention.
export const FX = 0
export const FY = 1
export const FSCALE = 2
export const SPREAD = 3 // half the distance between the eyes
export const EYE_L = 4 // + angle, half length, bend, width
export const EYE_R = 8
export const LID = 12
export const CUT = 13 // flat upper lid, 0 to 1
export const YAW = 14 // face slides and foreshortens, -1 to 1
export const FACE = 15

// Figure pose slots: the whole figure's posture, blended with the head.
export const LEAN = 0 // roll about the floor, degrees
export const WIDE = 1 // horizontal scale - 1, about the floor
export const TALL = 2 // vertical scale - 1, about the floor
export const BREATH = 3 // how much the breath shows, 1 at rest
export const FIGURE = 4

export type Pose = {
  body: Float64Array
  /** L, R, C, T. */
  limbs: Float64Array[]
  face: Float64Array
  figure: Float64Array
}

// Spring slots a module may kick or aim. The rig owns stiffness and damping.
export const TURN = 0 // + limb: swing about the root, degrees, + clockwise
export const STRETCH = 4 // + limb: length factor - 1
export const SQUASH = 8 // vertical scale - 1 about the floor
export const LIFT = 9 // units above the floor; ballistic: kick it up (units/s), it lands with a squash
export const GAZE_X = 10 // Ears gaze units
export const GAZE_Y = 11
export const TILT = 12 // whole-figure roll about the floor, degrees
export const SPIN = 13 // face yaw, -1 to 1
export const SHUT = 14 // how far the lids close, 0 to 1, over any blink
export const SPRINGS = 15

/** What a running bot shows its modules. */
export type Ctx = {
  readonly spec: BotSpec
  readonly rng: Rng
  /** Seconds. */
  readonly clock: number
  readonly tiny: boolean
  readonly reduced: boolean
  /** Held expression id; 'idle' is the rest pose. */
  readonly mood: string
  /** Voice reaching this bot now, 0 to 1 (Cue.speaking). */
  readonly speaking: number
  kick(slot: number, velocity: number): void
  /**
   * Adds to this frame's goal for the slot; goals reset every frame. With
   * `hold`, it keeps adding for that many seconds, across mood changes.
   */
  goal(slot: number, value: number, hold?: number): void
  blink(delay?: number): void
  /** Look toward x, y in -1..1 of the glance range for `hold` seconds (at least this frame). */
  look(x: number, y: number, hold: number): void
  /** Starts a one-shot expression. */
  play(id: string): void
}

/** Default export of parts/tops/<id>.ts: places and animates limbs L, R and C. */
export type TopKind = {
  label: string
  /** Labels for top.size, top.tips and top.droop; null hides that knob. */
  knobs: [string | null, string | null, string | null]
  /**
   * Writes L, R and C in pose slots (RHO, R mirrored) for `expression`, with
   * 'idle' the rest pose. A kind shapes the expressions it knows and writes
   * rest for the others. `body` is the rest body pose, for limb-fit.
   */
  limbs(
    spec: BotSpec,
    body: Float64Array,
    expression: string,
    tiny: boolean,
    out: Float64Array[],
  ): void
  /** Per-frame limb life: drift, twitch, sway. */
  live?(ctx: Ctx, dt: number): void
}

/** Default export of parts/expressions/<id>.ts: a held mood or a one-shot. */
export type Expression = {
  label: string
  hold: boolean
  /** Seconds each part waits, [head, left, right, eyes], divided by tempo. */
  delays?: [number, number, number, number]
  /**
   * Target pose. `out` arrives holding rest with the top kind's limbs for this
   * expression; write absolute values.
   */
  pose?(rest: Pose, spec: BotSpec, tiny: boolean, out: Pose): void
  enter?(ctx: Ctx): void
  step?(ctx: Ctx, dt: number, since: number): void
  /** One-shots end after this many seconds and return to the held mood. */
  duration?: number
}

/** Default export of parts/quirks/<id>.ts: an idle habit every [min, max] seconds. */
export type Quirk = {
  label: string
  every: [number, number]
  play(ctx: Ctx): void
}

/** A tile: picking it lays `patch` over the current spec. */
export type Preset = { id: string; label: string; patch: DeepPartial<BotSpec> }

/** Director or creator to a live bot, read every frame, never reactive. */
export type Cue = {
  /** -1..1 of the glance range; overrides the bot's own glances while set. */
  look: [number, number] | null
  /** One-shot to start; the bot clears it when it starts. */
  play: string | null
  /** Quirk to show once, as when it is switched on; cleared like `play`. */
  quirk?: string | null
  /** Voice reaching this bot, 0 to 1, rippled per seat by the director. */
  speaking: number
  /** This bot's own voice, 0 to 1: it bobs on each syllable as it talks. */
  saying?: number
}

/** A bot in a group: its centre and size in px within the group box. */
export type Seat = { x: number; y: number; size: number; spec: BotSpec }

export type BotProps = {
  spec: BotSpec
  size: number
  /** Frames the drawing as a still would, at rest; the bot moves inside it. */
  crop?: 'face' | 'fit' | 'snug' | null
  /** Held expression id; 'idle' by default. */
  expression?: string
  reducedMotion: boolean
  paused?: boolean
  /** Steps at most 30 times a second, to leave the frame to something busier. */
  lazy?: boolean
  cue?: Cue
  /** Tests inject; Math.random by default. */
  rng?: Rng
}

export type StillProps = {
  spec: BotSpec
  size: number
  /** The tile's option, laid over `spec`. */
  patch?: DeepPartial<BotSpec>
  crop?: 'face' | 'top' | 'fit' | 'snug' | null
  /** Held expression id; 'idle' by default. */
  expression?: string
}
