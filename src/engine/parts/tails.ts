// Tail tiles: one limb drawn behind the body, rooted below its edge.
// Angles are about the body centre, y down: 90 is straight below.
import type { Preset } from '../contracts'

export default [
  {
    id: 'none',
    label: 'None',
    patch: { tail: [0, 0, 0, 0, 0, 0, 0, 0, 0, 0] },
  },
  {
    id: 'speech',
    label: 'Speech',
    patch: { tail: [128, 4, -18, 13, 38, 0, 0.5, 8.5, 1.6, 0] },
  },
  {
    id: 'speech-right',
    label: 'Speech, right',
    patch: { tail: [52, 4, 18, 13, -38, 0, 0.5, 8.5, 1.6, 0] },
  },
  {
    id: 'curl',
    label: 'Curl',
    patch: { tail: [26, 4, -38, 30, -60, -80, 0.72, 3.4, 2.6, 0.3] },
  },
  {
    id: 'wisp',
    label: 'Wisp',
    patch: { tail: [38, 4, -40, 24, -95, 0, 0.6, 2.8, 0.4, 0.8] },
  },
  {
    id: 'pom',
    label: 'Pom',
    patch: { tail: [22, 3, 0, 0, 0, 0, 0.5, 6.5, 6.5, 0] },
  },
] satisfies Preset[]
