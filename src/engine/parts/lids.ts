// Lid tiles: how open the eyes rest. `lid` squashes the stroke; `cut` flattens
// its top like a heavy upper lid.
import type { Preset } from '../contracts'

export default [
  { id: 'open', label: 'Open', patch: { eyes: { lid: 1, cut: 0 } } },
  { id: 'soft', label: 'Soft', patch: { eyes: { lid: 0.92, cut: 0 } } },
  { id: 'calm', label: 'Calm', patch: { eyes: { lid: 0.82, cut: 0 } } },
  { id: 'sleepy', label: 'Sleepy', patch: { eyes: { lid: 1, cut: 0.35 } } },
  { id: 'heavy', label: 'Heavy', patch: { eyes: { lid: 0.92, cut: 0.55 } } },
] satisfies Preset[]
