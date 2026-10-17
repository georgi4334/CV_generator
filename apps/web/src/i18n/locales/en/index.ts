import { account } from './account'
import { ai } from './ai'
import { auth } from './auth'
import { common } from './common'
import { dashboard } from './dashboard'
import { design } from './design'
import { documents } from './documents'
import { editor } from './editor'
import { errors } from './errors'
import { jobs } from './jobs'
import { labels } from './labels'
import { legal } from './legal'
import { letters } from './letters'
import { nav } from './nav'
import { newCv } from './newCv'
import { renderer } from './renderer'
import { share } from './share'
import { welcome } from './welcome'

/**
 * English, the source language. Every other language must have exactly the
 * same keys (TypeScript checks it through `Messages`).
 */
export const en = {
  common,
  labels,
  errors,
  nav,
  auth,
  account,
  legal,
  dashboard,
  documents,
  jobs,
  editor,
  design,
  share,
  renderer,
  newCv,
  letters,
  ai,
  welcome,
}
