// Part modules, found by folder. A module's id is its file name.
import type { Expression, Quirk, TopKind } from '../contracts'

function byName<T>(modules: Record<string, T>) {
  return Object.fromEntries(
    Object.entries(modules).map(([path, module]) => [
      path.slice(path.lastIndexOf('/') + 1, -3),
      module,
    ]),
  )
}

export const tops: Record<string, TopKind> = byName(
  import.meta.glob<TopKind>('./tops/*.ts', { eager: true, import: 'default' }),
)
export const expressions: Record<string, Expression> = byName(
  import.meta.glob<Expression>('./expressions/*.ts', {
    eager: true,
    import: 'default',
  }),
)
export const quirks: Record<string, Quirk> = byName(
  import.meta.glob<Quirk>('./quirks/*.ts', { eager: true, import: 'default' }),
)
