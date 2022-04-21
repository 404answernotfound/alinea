import {Section, Type, UnionToIntersection} from '@alinea/core'
import {Lazy} from '@alinea/core/util/Lazy'

/** Internal representation of tabs */
export class TabsSection<T> extends Section<T> {
  constructor(public types: Array<Type>) {
    super(
      Object.fromEntries(
        types
          .map(type => Lazy.get(type.fields))
          .flatMap(fields => Object.entries(fields))
      )
    )
  }
}

/** Create tabs configuration */
export function createTabs<T extends Array<Type>>(
  ...types: T
): Section<UnionToIntersection<Type.Of<T[number]>>> {
  return new TabsSection(types)
}
