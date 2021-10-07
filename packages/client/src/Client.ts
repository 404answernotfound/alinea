import {Api, Content, Entry, Hub, Outcome, Schema} from '@alinea/core'
import fetch from 'isomorphic-fetch'

export class ClientContent implements Content {
  constructor(protected client: Client) {}

  get(id: string): Promise<Entry | null> {
    return this.client.fetch(Api.nav.content.get(id))
  }

  entryWithDraft(id: string): Promise<Entry.WithDraft | null> {
    return this.client.fetch(Api.nav.content.entryWithDraft(id))
  }

  put(path: string, entry: Entry): Promise<Outcome<void>> {
    return Promise.reject()
    //return this.client.fetch(Api.nav.content.get(path))
  }

  putDraft(id: string, doc: string): Promise<Outcome<void>> {
    return this.client.fetch(Api.nav.content.entryWithDraft(id), {
      method: 'PUT',
      body: JSON.stringify({doc}),
      headers: {'content-type': 'application/json'}
    })
  }

  list(parent?: string): Promise<Array<Entry.WithChildrenCount>> {
    return this.client.fetch(Api.nav.content.list(parent))
  }
}

export class Client implements Hub {
  constructor(
    public schema: Schema,
    protected url: string,
    protected applyAuth: (
      request?: RequestInit
    ) => RequestInit | undefined = v => v,
    protected unauthorized: () => void = () => {}
  ) {}

  async fetch(endpoint: string, init?: RequestInit) {
    const response = await fetch(this.url + endpoint, this.applyAuth(init))
    if (response.status === 401) this.unauthorized()
    return await response.json()
  }

  content = new ClientContent(this)
}