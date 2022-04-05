import {Config, Entry, Schema, Tree, TypesOf, Workspace} from '@alinea/core'
import {
  Collection,
  Cursor,
  EV,
  Expr,
  OrderBy,
  SelectionInput,
  Store
} from '@alinea/store'
import {Drafts} from './Drafts'
import {previewStore} from './PreviewStore'

export class PageTree<P> {
  constructor(private pages: Pages<P>, private id: EV<string>) {}

  get root(): Pages<P> {
    return this.pages
  }

  siblings(): Multiple<P, P> {
    return new Multiple(this.pages, Tree.siblings(this.id))
  }

  children<Child extends P>(depth = 1): Multiple<P, Child> {
    return new Multiple(this.pages, Tree.children(this.id, depth))
  }

  parents<Parent extends P>(): Multiple<P, Parent> {
    return new Multiple(this.pages, Tree.parents(this.id))
  }

  nextSibling(): Single<P, P> {
    return new Single(this.pages, Tree.nextSibling(this.id))
  }

  prevSibling(): Single<P, P> {
    return new Single(this.pages, Tree.prevSibling(this.id))
  }
}

export type Page<P, T> = T extends {id: string} ? T & {tree: PageTree<P>} : T

abstract class Base<P, T> extends Promise<T> {
  protected result: Promise<T> | undefined

  constructor(protected pages: Pages<P>, protected cursor: Cursor<any>) {
    super(_ => _(undefined!))
  }

  protected abstract execute(): Promise<T>

  then: Promise<T>['then'] = (...args: Array<any>) => {
    this.result = this.result || this.execute()
    return this.result.then(...args)
  }

  catch: Promise<T>['catch'] = (...args: Array<any>) => {
    this.result = this.result || this.execute()
    return this.result.catch(...args)
  }
}

class Multiple<P, T> extends Base<P, Array<Page<P, T>>> {
  protected async execute() {
    const store = await this.pages.store
    return store.all(this.cursor, {debug: true}).map(page => {
      if (page && typeof page === 'object' && 'id' in page) {
        Object.defineProperty(page, 'tree', {
          value: new PageTree(this.pages, page.id),
          enumerable: false
        })
      }
      return page
    })
  }
  async count(): Promise<number> {
    const store = await this.pages.store
    return store.count(this.cursor)
  }
  leftJoin<T>(that: Collection<T>, on: Expr<boolean>) {
    return new Multiple<P, T>(this.pages, this.cursor.leftJoin(that, on))
  }
  innerJoin<T>(that: Collection<T>, on: Expr<boolean>) {
    return new Multiple<P, T>(this.pages, this.cursor.innerJoin(that, on))
  }
  take(limit: number | undefined) {
    return new Multiple<P, T>(this.pages, this.cursor.take(limit))
  }
  skip(offset: number | undefined) {
    return new Multiple<P, T>(this.pages, this.cursor.skip(offset))
  }
  where(where: EV<boolean> | ((collection: Cursor<T>) => EV<boolean>)) {
    return new Multiple<P, T>(this.pages, this.cursor.where(where as any))
  }
  select<
    X extends SelectionInput | ((collection: Cursor<T>) => SelectionInput)
  >(selection: X) {
    return new Multiple<P, Store.TypeOf<X>>(
      this.pages,
      this.cursor.select(selection as any)
    )
  }
  having(having: Expr<boolean>) {
    return new Multiple<P, T>(this.pages, this.cursor.having(having))
  }
  include<I extends SelectionInput>(selection: I) {
    return new Multiple<P, Omit<T, keyof Store.TypeOf<I>> & Store.TypeOf<I>>(
      this.pages,
      this.cursor.include(selection)
    )
  }
  orderBy(...orderBy: Array<OrderBy>) {
    return new Multiple<P, T>(this.pages, this.cursor.orderBy(...orderBy))
  }
  groupBy(...groupBy: Array<Expr<any>>) {
    return new Multiple<P, T>(this.pages, this.cursor.groupBy(...groupBy))
  }
  first() {
    return new Single<P, T>(this.pages, this.cursor.first() as any)
  }
  /*on<
  K extends TypesOf<T>,
  X extends SelectionInput | ((collection: Cursor<Extract<T, {type: K}>>) => SelectionInput)
  >(type: K, select: X) {
    return new Multiple
  }*/
}

class Single<P, T> extends Base<P, Page<P, T> | null> {
  protected async execute() {
    const store = await this.pages.store
    const page = store.first(this.cursor)
    if (!page) return null
    if (typeof page === 'object' && 'id' in page) {
      Object.defineProperty(page, 'tree', {
        value: new PageTree(this.pages, page.id),
        enumerable: false
      })
    }
    return page
  }
  leftJoin<T>(that: Collection<T>, on: Expr<boolean>) {
    return new Single<P, T>(this.pages, this.cursor.leftJoin(that, on))
  }
  innerJoin<T>(that: Collection<T>, on: Expr<boolean>) {
    return new Single<P, T>(this.pages, this.cursor.innerJoin(that, on))
  }
  skip(offset: number | undefined) {
    return new Single<P, T>(this.pages, this.cursor.skip(offset))
  }
  where(where: EV<boolean> | ((collection: Cursor<T>) => EV<boolean>)) {
    return new Single<P, T>(this.pages, this.cursor.where(where as any))
  }
  select<
    X extends SelectionInput | ((collection: Cursor<T>) => SelectionInput)
  >(selection: X) {
    return new Single<P, Store.TypeOf<X>>(
      this.pages,
      this.cursor.select(selection as any)
    )
  }
  having(having: Expr<boolean>) {
    return new Single<P, T>(this.pages, this.cursor.having(having))
  }
  include<I extends SelectionInput>(selection: I) {
    return new Single<P, Omit<T, keyof Store.TypeOf<I>> & Store.TypeOf<I>>(
      this.pages,
      this.cursor.include(selection)
    )
  }
  orderBy(...orderBy: Array<OrderBy>) {
    return new Single<P, T>(this.pages, this.cursor.orderBy(...orderBy))
  }
  groupBy(...groupBy: Array<Expr<any>>) {
    return new Single<P, T>(this.pages, this.cursor.groupBy(...groupBy))
  }
  children<C = T>(depth = 1) {
    if (depth > 1) throw 'todo depth > 1'
    return new Multiple<P, C>(
      this.pages,
      Entry.where(
        Entry.parent.isIn(
          this.cursor.select<Expr<string | undefined>>(Entry.id)
        )
      )
    )
  }
}

class PagesImpl<T> {
  schema: Schema<T>
  collection = new Collection<T>('Entry')
  store: Promise<Store>

  constructor(
    private config: Config,
    private workspace: Workspace<T>,
    private createCache: () => Promise<Store>
  ) {
    this.schema = workspace.schema
    this.store = createCache()
    const self = this
    return new Proxy(this, {
      get(target: any, key: string) {
        if (key in target) return target[key]
        const type = self.schema.type(key as TypesOf<T>)
        if (type) {
          const [workspaceKey] =
            Object.entries(self.config.workspaces).find(
              ([name, workspace]) => workspace === self.workspace
            ) || []
          if (workspaceKey)
            return self.whereType(
              self.schema.collection(workspaceKey, key as any)
            )
        }
        return undefined
      }
    })
  }

  whereUrl(url: EV<string>) {
    return new Single<T, T>(this as Pages<T>, Entry.where(Entry.url.is(url)))
  }

  whereId(id: EV<string>) {
    return new Single<T, T>(this as Pages<T>, Entry.where(Entry.id.is(id)))
  }

  whereType<C>(type: Collection<C>) {
    return new Multiple<T, C>(
      this as Pages<T>,
      type.cursor.where
        ? this.collection.where(Entry.type.is(new Expr(type.cursor.where)))
        : this.collection
    )
  }

  all(): Multiple<T, T> {
    return new Multiple(this as Pages<T>, this.collection)
  }

  findMany(
    where: Expr<boolean> | ((collection: Cursor<T>) => Expr<boolean>)
  ): Multiple<T, T> {
    return new Multiple(this as Pages<T>, this.collection.where(where))
  }

  findFirst(
    where: Expr<boolean> | ((collection: Cursor<T>) => Expr<boolean>)
  ): Single<T, T> {
    return new Single<T, T>(this as Pages<T>, this.collection.where(where))
  }

  preview(drafts: Drafts, id?: string): Pages<T> {
    return new Pages(this.config, this.workspace, async () => {
      const preview = previewStore(this.createCache, this.config, drafts)
      if (id) await preview.fetchUpdate(id)
      return preview.getStore()
    })
  }

  get root() {
    return this.findMany(Entry.parent.isNull())
  }
}

export interface PagesConstructor {
  new <T>(
    config: Config,
    workspace: Workspace<T>,
    createCache: () => Promise<Store>
  ): Pages<T>
}
export type Pages<T> = PagesImpl<T> & {
  [K in T extends {type: string} ? T['type'] : string]: Multiple<
    T,
    Extract<T, {type: K}>
  >
}
export const Pages = PagesImpl as PagesConstructor
