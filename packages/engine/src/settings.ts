import { say } from './strings.ts'
import type { Game, SettingDef } from './game.ts'
import type { FlagValue } from './types.ts'

/** The setting with this id, if the game declares it. */
export function settingById(game: Game, id: string): SettingDef | undefined {
  return game.settings?.find((setting) => setting.id === id)
}

/** Whether a setting lives in the game state (`play`) or only in the profile (`ui`). */
export function settingAffects(setting: SettingDef): 'play' | 'ui' {
  return setting.affects ?? 'play'
}

/** What is wrong with a value for this setting, as a word the callers turn into a sentence. */
export function settingFault(setting: SettingDef, value: unknown): 'toggle' | 'number' | 'range' | 'step' | 'option' | undefined {
  switch (setting.kind) {
    case 'toggle':
      return typeof value === 'boolean' ? undefined : 'toggle'
    case 'choice':
      return setting.options.some((option) => option.value === value) ? undefined : 'option'
    case 'range': {
      if (typeof value !== 'number' || !Number.isFinite(value)) return 'number'
      if (value < setting.min || value > setting.max) return 'range'
      if (setting.step) {
        const steps = (value - setting.min) / setting.step
        if (Math.abs(steps - Math.round(steps)) > 1e-9) return 'step'
      }
      return undefined
    }
  }
}

/**
 * Why this value can't be given to this setting, as the player reads it;
 * undefined if it can. `affects` is the kind of setting the caller sets: the
 * `setting` command sets `play` ones, `runner.setUiSetting` sets `ui` ones.
 */
export function settingRefusal(game: Game, id: string, value: unknown, affects: 'play' | 'ui' = 'play'): string | undefined {
  const setting = settingById(game, id)
  if (!setting) return say(game, 'noSuchSetting')
  if (settingAffects(setting) !== affects) return say(game, affects === 'play' ? 'notAGameSetting' : 'notAUiSetting')
  switch (settingFault(setting, value)) {
    case 'toggle':
      return say(game, 'onOrOff')
    case 'option':
      return say(game, 'notAnOption')
    case 'number':
      return say(game, 'enterNumber')
    case 'range':
      return setting.kind === 'range' ? say(game, 'between', { min: setting.min, max: setting.max }) : undefined
    case 'step':
      return setting.kind === 'range' ? say(game, 'inSteps', { step: setting.step ?? 1 }) : undefined
    default:
      return undefined
  }
}

/**
 * Every `play` setting's value for a new game: the one given, if the setting
 * takes it, else its default. Unknown ids and values that don't fit are dropped.
 */
export function startingSettings(game: Game, given: Record<string, unknown> = {}): Record<string, FlagValue> {
  const out: Record<string, FlagValue> = {}
  for (const setting of game.settings ?? []) {
    if (settingAffects(setting) !== 'play') continue
    const value = given[setting.id]
    out[setting.id] = value !== undefined && !settingFault(setting, value) ? (value as FlagValue) : setting.default
  }
  return out
}

/** What is wrong with a setting's declaration, in the loader's words. */
export function settingProblems(setting: SettingDef): string[] {
  const out: string[] = []
  if (setting.affects !== undefined && setting.affects !== 'play' && setting.affects !== 'ui') {
    out.push(`affects is "${String(setting.affects)}", not "play" or "ui"`)
  }
  if (setting.kind === 'choice' && !setting.options?.length) out.push('a choice with no options')
  if (setting.kind === 'range' && setting.min > setting.max) out.push('min is above max')
  if (setting.kind === 'range' && setting.step !== undefined && !(setting.step > 0)) out.push('step must be above 0')
  if (!out.length) {
    const fault = settingFault(setting, setting.default)
    if (fault) out.push(`default ${JSON.stringify(setting.default)} ${faultText(setting, fault)}`)
  }
  return out
}

/** What is wrong with a `{ setting }` condition, in the loader's words. */
export function settingConditionProblems(game: Game, id: string, is: FlagValue | undefined): string[] {
  const setting = settingById(game, id)
  if (!setting) return [`unknown setting "${id}"`]
  if (settingAffects(setting) === 'ui') return [`setting "${id}" is a ui setting; conditions read only play settings`]
  const fault = is === undefined ? undefined : settingFault(setting, is)
  return fault ? [`${JSON.stringify(is)} for setting "${id}" ${faultText(setting, fault)}`] : []
}

function faultText(setting: SettingDef, fault: NonNullable<ReturnType<typeof settingFault>>): string {
  switch (fault) {
    case 'toggle':
      return 'is not true or false'
    case 'option':
      return 'is not one of the options'
    case 'number':
      return 'is not a number'
    case 'range':
      return setting.kind === 'range' ? `is not between ${setting.min} and ${setting.max}` : 'is out of range'
    case 'step':
      return setting.kind === 'range' ? `is not in steps of ${setting.step}` : 'is not in steps'
  }
}
