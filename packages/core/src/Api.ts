export namespace Api {
  function stripSlash(path?: string): string {
    return path?.startsWith('/') ? path.substring(1) : path || ''
  }
  export const nav = {
    content: {
      get(id: string) {
        return `/content/${stripSlash(id)}`
      },
      entryWithDraft(id: string) {
        return `/content.draft/${stripSlash(id)}`
      },
      list(parent?: string) {
        if (!parent) return '/content.list'
        return `/content.list/${stripSlash(parent)}`
      }
    }
  }
}