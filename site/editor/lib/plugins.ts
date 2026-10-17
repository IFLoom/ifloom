/**
 * The first-party plugins, made from the JSON options a project gives them.
 */
import type { Plugin } from '@ifloom/engine'
import { achievements } from '@ifloom/plugin-achievements'
import { calendar } from '@ifloom/plugin-calendar'
import { cast } from '@ifloom/plugin-cast'
import { debug } from '@ifloom/plugin-debug'
import { devices } from '@ifloom/plugin-devices'
import { feed } from '@ifloom/plugin-feed'
import { generators } from '@ifloom/plugin-generators'
import { jobs } from '@ifloom/plugin-jobs'
import { messages } from '@ifloom/plugin-messages'
import { places } from '@ifloom/plugin-places'
import { quests } from '@ifloom/plugin-quests'
import { shop } from '@ifloom/plugin-shop'
import { statuses } from '@ifloom/plugin-statuses'
import { wardrobe } from '@ifloom/plugin-wardrobe'
import { PLUGIN_IDS, type PluginId, type PreviewSettings } from './model.ts'

// Options come from JSON the author typed, so each factory takes whatever was parsed.
type Factory = (options: never) => Plugin<any>
const FACTORIES: Record<PluginId, Factory> = {
  calendar,
  places,
  cast,
  quests,
  statuses,
  achievements,
  shop,
  jobs,
  generators,
  wardrobe,
  messages,
  feed,
  devices,
  debug,
}

/** The plugins a project's preview has on, made, or the first one whose options don't parse or are refused. */
export function makePlugins(settings: PreviewSettings): { plugins: Plugin<any>[] } | { error: string } {
  const plugins: Plugin<any>[] = []
  for (const id of PLUGIN_IDS) {
    const setting = settings.plugins[id]
    if (!setting?.on) continue
    let options: unknown
    try {
      options = setting.options.trim() ? JSON.parse(setting.options) : undefined
    } catch (error) {
      return { error: `The ${id} plugin's options aren't JSON: ${(error as Error).message}` }
    }
    try {
      plugins.push(FACTORIES[id](options as never))
    } catch (error) {
      return { error: `The ${id} plugin refused its options: ${(error as Error).message}` }
    }
  }
  return { plugins }
}
