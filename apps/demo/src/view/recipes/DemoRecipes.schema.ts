import {Schema, type} from '@alinea/core'
import {path} from '@alinea/input.path'
import {text} from '@alinea/input.text'

export const DemoRecipesSchema = type('Recipes', {
  title: text('Title', {width: 0.5, multiline: true}),
  path: path('Path', {width: 0.5})
}).configure({isContainer: true, contains: ['Recipe']})

export type DemoRecipesSchema = Schema.TypeOf<typeof DemoRecipesSchema>
