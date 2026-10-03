// A group's mind: Trio's glance-and-look-back, generalised to 2 to 5 bots.
// Bots glance at each other and sometimes look back; everyone turns to watch
// whoever fidgets; a speaker comes and goes, and its voice reaches each
// listener a beat later the further away it sits, so their ears catch the
// syllables in a ripple. Now and then the listeners nod along, one after the
// other. It only writes cues; each bot stays itself. Never busy: at most one
// group beat at a time, and long quiet stretches.
import type { Cue, Rng, Seat } from './contracts'

/** Seconds the voice takes to travel one bot's width. */
const RIPPLE = 0.06
/** One syllable: a quick rise and a slower fall. */
function pulse(t: number) {
  if (t < 0) return 0
  if (t < 0.04) return t / 0.04
  return Math.exp(-(t - 0.04) / 0.12)
}

type Mind = {
  /** When this bot next picks where to look. */
  glanceAt: number
  /** When its current look ends and its own glances take over. */
  lookUntil: number
  /** A bot it was asked to look back at, or -1. */
  back: number
}

export type Director = ReturnType<typeof director>

export function director(start: Seat[], rng: Rng) {
  let seats = start
  let clock = 0
  const cues: Cue[] = []
  const minds: Mind[] = []
  /** Beats to play later: [time, seat, expression]. */
  let queue: [number, number, string][] = []
  let fidgetAt = 4 + rng() * 4
  let speaker = -1
  let turnEnd = 2 + rng() * 3
  let nodded = false
  /** The speaker's syllables: [time, loudness], the last second or so. */
  const syllables: [number, number][] = []
  let syllableAt = Infinity
  let phraseEnd = 0

  /** New seats; with `notice`, everyone blinks, staggered, as if they noticed. */
  function seat(next: Seat[], notice = false) {
    seats = next
    while (cues.length < seats.length) {
      cues.push({ look: null, play: null, speaking: 0, saying: 0 })
      minds.push({ glanceAt: clock + 0.6 + rng() * 2, lookUntil: 0, back: -1 })
    }
    cues.length = minds.length = seats.length
    if (speaker >= seats.length) speaker = -1
    queue = queue.filter(([, i]) => i < seats.length)
    if (notice)
      for (let i = 0; i < seats.length; i++)
        queue.push([clock + 0.3 + 0.05 * i, i, 'blink'])
  }

  /** Point bot i's eyes at bot j, as Trio does. */
  function lookAt(i: number, j: number, hold: number) {
    const dx = seats[j].x - seats[i].x
    const dy = seats[j].y - seats[i].y
    const length = Math.hypot(dx, dy) || 1
    cues[i].look = [(dx / length) * 0.85, (dy / length) * 0.6 - 0.05]
    minds[i].lookUntil = clock + hold
  }

  /** Someone other than i, the user's bot (seat 0) a little more often. */
  function other(i: number) {
    if (i !== 0 && rng() < 0.3) return 0
    const j = Math.floor(rng() * (seats.length - 1))
    return j >= i ? j + 1 : j
  }

  function glance(i: number, reduced: boolean) {
    const me = minds[i]
    const traits = seats[i].spec.traits
    me.glanceAt = clock + traits.glance * (0.5 + rng()) * (reduced ? 1.6 : 1)
    if (me.back >= 0) {
      lookAt(i, me.back, 0.9 + rng() * 0.8)
      me.back = -1
      return
    }
    const roll = rng()
    // A listener mostly watches the speaker; the speaker looks round at them.
    if (speaker >= 0 && i !== speaker && roll < 0.65)
      lookAt(i, speaker, 1.2 + rng())
    else if (roll < 0.55) {
      const j = other(i)
      lookAt(i, j, 1 + rng() * 1.2)
      // Sometimes the other one looks back.
      if (rng() < 0.35 && j !== speaker) {
        minds[j].back = i
        minds[j].glanceAt = Math.min(minds[j].glanceAt, clock + 0.25)
      }
    } else if (roll < 0.72) {
      // At you, for a moment.
      cues[i].look = [0, 0.05]
      me.lookUntil = clock + 0.8 + rng() * 0.8
    } else me.lookUntil = clock
  }

  function talk(reduced: boolean) {
    if (clock >= turnEnd) {
      // A new speaker, or a quiet spell; never the same voice twice running.
      const quiet = speaker >= 0 && rng() < 0.35
      speaker = quiet
        ? -1
        : (speaker + 1 + Math.floor(rng() * (seats.length - 1))) % seats.length
      turnEnd = clock + (quiet ? 3 + rng() * 3 : 6 + rng() * 4)
      syllableAt = clock + 0.5
      phraseEnd = syllableAt + 1 + rng() * 1.6
      nodded = false
    }
    if (speaker >= 0 && clock >= syllableAt) {
      if (clock < phraseEnd) {
        syllables.push([clock, 0.5 + 0.5 * rng()])
        syllableAt = clock + 0.17 + rng() * 0.25
      } else {
        // Between phrases, sometimes the listeners nod along, one by one.
        if (!nodded && !reduced && rng() < 0.4) {
          nodded = true
          const order = seats
            .map((_, i) => i)
            .filter((i) => i !== speaker)
            .sort(
              (a, b) =>
                Math.abs(seats[a].x - seats[speaker].x) -
                Math.abs(seats[b].x - seats[speaker].x),
            )
          order.forEach((i, n) =>
            queue.push([clock + 0.15 + 0.12 * n, i, 'nod']),
          )
        }
        syllableAt = clock + 0.9 + rng() * 1.4
        phraseEnd = syllableAt + 0.8 + rng() * 2
      }
    }
    while (syllables.length && clock - syllables[0][0] >= 1.5) syllables.shift()
    for (let i = 0; i < seats.length; i++) {
      let voice = 0
      if (speaker >= 0) {
        // The nearer a listener sits, the sooner it hears; the speaker hears itself at once.
        const far =
          Math.abs(seats[i].x - seats[speaker].x) / seats[speaker].size
        const heard = clock - RIPPLE * far
        for (const [t, loud] of syllables) voice += loud * pulse(heard - t)
      }
      cues[i].speaking = i === speaker ? 0 : Math.min(1, voice)
      cues[i].saying = i === speaker ? Math.min(1, voice) : 0
    }
  }

  function fidget(reduced: boolean) {
    if (reduced || clock < fidgetAt || seats.length < 2) return
    fidgetAt = clock + 9 + rng() * 7
    // The bounciest fidget most: hop and tempo pick who.
    const bounce = seats.map((s) => s.spec.traits.hop * s.spec.traits.tempo)
    let roll = rng() * bounce.reduce((a, b) => a + b, 0)
    let who = 0
    while (who < seats.length - 1 && (roll -= bounce[who]) > 0) who++
    cues[who].play = 'hop'
    // The others turn to watch.
    for (let j = 0; j < seats.length; j++) {
      if (j === who) continue
      lookAt(j, who, 1.3 + rng())
      minds[j].glanceAt = minds[j].lookUntil
    }
  }

  /** Everyone else turns to look at bot i, as when it changes; once a second at most. */
  let watched = -Infinity
  function watch(i: number) {
    if (clock - watched < 1 || seats.length < 2) return
    watched = clock
    for (let j = 0; j < seats.length; j++) {
      if (j === i) continue
      lookAt(j, i, 1.1 + 0.6 * rng())
      minds[j].glanceAt = minds[j].lookUntil
    }
  }

  /**
   * Bot i talks for `seconds`: the others turn to it, their ears catch its
   * syllables in a ripple, and when it stops they nod along, nearest first.
   */
  function speak(i: number, seconds: number) {
    speaker = i
    // The turn ends before another phrase could start.
    turnEnd = clock + seconds + 0.8
    syllableAt = clock + 0.25
    phraseEnd = clock + seconds
    nodded = true
    for (let j = 0; j < seats.length; j++) {
      if (j === i) continue
      lookAt(j, i, seconds + 0.8)
      minds[j].glanceAt = minds[j].lookUntil
      const far = Math.abs(seats[j].x - seats[i].x) / seats[i].size
      queue.push([phraseEnd + 0.2 + 0.25 * far, j, 'nod'])
    }
  }

  seat(start, true)

  return {
    cues,
    seat,
    watch,
    speak,
    step(dt: number, reduced: boolean) {
      clock += dt
      for (let i = 0; i < seats.length; i++) {
        if (clock >= minds[i].lookUntil) cues[i].look = null
        if (clock >= minds[i].glanceAt) glance(i, reduced)
      }
      talk(reduced)
      fidget(reduced)
      for (let k = 0; k < queue.length;) {
        const [at, i, id] = queue[k]
        if (clock < at) k++
        else {
          cues[i].play = id
          queue.splice(k, 1)
        }
      }
    },
  }
}
