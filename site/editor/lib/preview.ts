/**
 * What the editor and its preview frame say to each other with `postMessage`.
 * The frame says it's ready; the editor sends the project whenever it changes.
 */
import type { Project } from './model.ts'

export const PREVIEW_READY = 'ifloom-preview-ready'

export type PreviewMessage = {
  type: 'ifloom-preview'
  project: Project
  /** Start the game again instead of carrying on from where the reader is. */
  restart: boolean
  /** The docs are dark, so the React UI's own look should be too. Presets keep their own colours. */
  dark: boolean
}
