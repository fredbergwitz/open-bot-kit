// No topper. The limbs fold away where they stood, so whatever was on top
// shrinks into the head instead of sliding across it.
import { C, L, R, type TopKind } from '../../contracts'
import { collapse, mirror } from '../../geometry'
import { rooted, tuck } from '../limbs'

export default {
  label: 'None',
  knobs: [null, null, null],
  limbs(spec, body, _expression, _tiny, out) {
    out[L].set(tuck(rooted(spec.top.a, spec, body)))
    out[R].set(mirror(tuck(rooted(spec.top.b, spec, body))))
    collapse(out[C])
  },
} satisfies TopKind
