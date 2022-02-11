import {
  createConfig,
  createId,
  Entry,
  schema as createSchema,
  type,
  workspace
} from '@alinea/core'
import {text} from '@alinea/input.text'
import {SqlJs} from 'helder.store/sqlite/drivers/SqlJs.js'
import {SqliteStore} from 'helder.store/sqlite/SqliteStore.js'
import {Volume} from 'memfs'
import initSqlJs from 'sql.js-fts5'
import {test} from 'uvu'
import {Cache} from '../src'
import {FileData} from '../src/data/FileData'
import {FS} from '../src/FS'
import {JsonLoader} from '../src/loader/JsonLoader'

function entry(entry: Entry.Raw) {
  return JSON.stringify(entry)
}

const config = createConfig({
  workspaces: {
    main: workspace('Main', {
      contentDir: 'content',
      schema: createSchema({
        Type: type('Type', {title: text('Title')}, {isContainer: true}),
        Sub: type('Sub', {
          title: text('Title')
        })
      }),
      roots: {data: {contains: ['Type']}}
    })
  }
})

const fs: FS = Volume.fromNestedJSON({
  content: {
    data: {
      '/index.json': entry({
        id: 'root',
        type: 'Type',
        title: 'Test title'
      }),
      sub: {
        '/index.json': entry({
          id: 'sub',
          type: 'Type',
          title: 'Sub title'
        }),
        '/entry.json': entry({
          id: 'sub-entry',
          type: 'Sub',
          title: 'Sub entry title'
        })
      }
    }
  },
  files: {
    '/file01.txt': 'content01',
    '/file02.txt': 'content02',
    '/sub': {
      '/file03.txt': 'content01'
    }
  }
}).promises as any

const data = new FileData({config, fs, loader: JsonLoader})

test('create', async () => {
  const sqlJs = await initSqlJs()
  const store = new SqliteStore(new SqlJs(new sqlJs.Database()), createId)
  await Cache.create(store, data)
  console.log('ok')
})

test.run()