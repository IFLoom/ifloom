/**
 * Settings: what the player can change from a settings screen, declared by the
 * game (ADR 0002). A `play` setting is in the state, saved with it and read by
 * the `{ setting }` condition; a `ui` setting lives only in the profile.
 */
import { stringOf } from '../strings.ts'
import type { Game } from '../game.ts'
import type { KvValue, Range } from '../types.ts'
import { byId, defineFeature, listWords } from './feature.ts'
import { asCount, bounded, inRange, wanted } from '../range.ts'

/**
 * A setting the game declares in `settings`, which the player changes on a settings page. A `play` setting is saved
 * with the state, and a `ui` setting is kept only in the profile.
 *
 * Its `type` sets the rest of its fields. A `toggle` has a true/false `default`. A `choice` has `options`, each a
 * `value` with its `label`, and one value as its `default`. A `range` has `min`, `max`, an optional `step` and a
 * number as its `default`.
 */
export type SettingDef = {
  /** The setting's id, which the `setting` condition and command name. */
  id: string
  /** The setting's label on the settings page. */
  label: string
  /** The setting's reach, `'play'` (in the state, read by conditions) or `'ui'` (for the UI only). `'play'` if left out. */
  affects?: 'play' | 'ui'
} & (
  | { type: 'toggle'; default: boolean }
  | { type: 'choice'; options: { value: string; label: string }[]; default: string }
  | { type: 'range'; min: number; max: number; step?: number; default: number }
)

/** A setting as the player sees it on a settings page, in `view.settings`. */
export type SettingView = {
  /** The setting's id. */
  id: string
  /** The setting's label. */
  label: string
  /** The setting's type, a `toggle` (on or off), a `choice` among `options`, or a `range` from `min` to `max`. */
  type: 'toggle' | 'choice' | 'range'
  /**
   * The setting's reach. The save keeps a `play` setting, which changes the game, and the profile keeps a `ui`
   * setting, which changes only how the game is shown.
   */
  affects: 'play' | 'ui'
  /** The options of a `choice` setting, each a value with its label. */
  options?: { value: string; label: string }[]
  /** The lowest value of a `range` setting. */
  min?: number
  /** The highest value of a `range` setting. */
  max?: number
  /** The step of a `range` setting. Left out when the setting gives none, which means 1. */
  step?: number
  /** The setting's default, its value until the player changes it. */
  default: KvValue
  /** The value of a `play` setting in this game. Null for a `ui` setting, which the UI reads from the profile. */
  value: KvValue | null
}

/** The settings feature's state, calls, content key, view and reference, as types. */
export type SettingsShape = {
  state: {
    /** The value of each `play` setting the game declares, by id. */
    settings: Record<string, KvValue>
  }
  conditions: {
    /**
     * A condition on a `play` setting, read as a kv key is. With nothing else it holds while the setting is truthy
     * (`{ setting: 'hints' }`).
     *
     * With `is`, it holds while the setting equals that value. With a range, it holds while the setting's number is in
     * it.
     */
    setting: { setting: string; is?: KvValue } & Range
  }
  commands: {
    /** A command that changes a `play` setting `to` a value. No lock or plugin guard stops it, as with a menu. */
    setting: { type: 'setting'; id: string; to: KvValue }
  }
  game: {
    /** The game's settings, which the player changes from a settings page. None if left out. */
    settings?: SettingDef[]
  }
  pack: {
    /** The pack's settings. A later pack's setting replaces an earlier one with the same id. */
    settings?: SettingDef[]
  }
  view: {
    /** Every setting the game declares, in order, for a settings page. */
    settings: SettingView[]
  }
  lists: 'setting'
  fill: 'settings'
  references: {
    /** A reference to a `play` setting, with the value it's compared with or given. */
    setting: { setting: string; is?: KvValue }
  }
}

/** The profile namespace the player's settings are kept under: `ui` settings, and the `play` settings a new game starts with. */
const SETTINGS_NAMESPACE = 'core:settings'

/** Returns the setting the game declares with this id. Undefined when there's none. */
export function settingOf(game: Game, id: string): SettingDef | undefined {
  return game.settings?.find((setting) => setting.id === id)
}

/** Returns a setting's reach, `'play'` for one kept in the state and `'ui'` for one kept only in the profile. `'play'` when `affects` is left out. */
export function settingAffects(setting: SettingDef): 'play' | 'ui' {
  return setting.affects ?? 'play'
}

/** Returns the fault with a value for this setting, as one word the caller turns into a sentence. Undefined when the value fits. */
export function settingFault(setting: SettingDef, value: unknown): 'toggle' | 'number' | 'range' | 'step' | 'option' | undefined {
  switch (setting.type) {
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
 * Returns a setting's value from the player's stored settings, the profile's `core:settings`. That's the stored value
 * if the setting still takes it, else the setting's default.
 *
 * Undefined for a setting the game doesn't declare.
 */
export function settingValue(game: Game, stored: Record<string, unknown> | undefined, id: string): KvValue | undefined {
  const setting = settingOf(game, id)
  if (!setting) return undefined
  const value = stored && Object.hasOwn(stored, id) ? stored[id] : undefined
  return value !== undefined && !settingFault(setting, value) ? (value as KvValue) : setting.default
}

/**
 * Returns the reason the player reads when this value can't be given to the setting. Undefined when it can.
 *
 * Through the `setting` command (`'command'`) only a `play` setting can be set, and `runner.setSetting` (`'runner'`)
 * sets either.
 */
export function settingRefusal(game: Game, id: string, value: unknown, through: 'command' | 'runner' = 'command'): string | undefined {
  const setting = settingOf(game, id)
  if (!setting) return stringOf(game, 'noSuchSetting')
  if (through === 'command' && settingAffects(setting) !== 'play') return stringOf(game, 'notAGameSetting')
  switch (settingFault(setting, value)) {
    case 'toggle':
      return stringOf(game, 'onOrOff')
    case 'option':
      return stringOf(game, 'notAnOption')
    case 'number':
      return stringOf(game, 'enterNumber')
    case 'range':
      return setting.type === 'range' ? stringOf(game, 'between', { min: setting.min, max: setting.max }) : undefined
    case 'step':
      return setting.type === 'range' ? stringOf(game, 'inSteps', { step: setting.step ?? 1 }) : undefined
    default:
      return undefined
  }
}

/**
 * Returns each `play` setting's value for a new game. That's the value given when the setting takes it, else its
 * default, and unknown ids and values that don't fit are dropped.
 */
export function startingSettings(game: Game, given: Record<string, unknown> = {}): Record<string, KvValue> {
  const out: Record<string, KvValue> = {}
  for (const setting of game.settings ?? []) {
    if (settingAffects(setting) !== 'play') continue
    const value = given[setting.id]
    out[setting.id] = value !== undefined && !settingFault(setting, value) ? (value as KvValue) : setting.default
  }
  return out
}

/** Returns the problems with a setting's declaration, in the loader's words. Empty when there are none. */
export function settingProblems(setting: SettingDef): string[] {
  const out: string[] = []
  if (setting.affects !== undefined && setting.affects !== 'play' && setting.affects !== 'ui') {
    out.push(`affects is "${String(setting.affects)}", not "play" or "ui"`)
  }
  if (setting.type === 'choice' && !setting.options?.length) out.push('a choice with no options')
  if (setting.type === 'range' && setting.min > setting.max) out.push('min is above max')
  if (setting.type === 'range' && setting.step !== undefined && !(setting.step > 0)) out.push('step must be above 0')
  if (!out.length) {
    const fault = settingFault(setting, setting.default)
    if (fault) out.push(`default ${JSON.stringify(setting.default)} ${faultText(setting, fault)}`)
  }
  return out
}

/** Returns the problems with a `{ setting }` condition, in the loader's words. Empty when there are none. */
export function settingConditionProblems(game: Game, id: string, is: KvValue | undefined): string[] {
  const setting = settingOf(game, id)
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
      return setting.type === 'range' ? `is not between ${setting.min} and ${setting.max}` : 'is out of range'
    case 'step':
      return setting.type === 'range' ? `is not in steps of ${setting.step}` : 'is not in steps'
  }
}

/** Every setting the game declares, as a settings screen draws it. */
function settingsView(settings: Record<string, KvValue> | undefined, game: Game): SettingView[] {
  return (game.settings ?? []).map((setting) => {
    const affects = settingAffects(setting)
    return {
      id: setting.id,
      label: setting.label,
      type: setting.type,
      affects,
      ...(setting.type === 'choice' ? { options: setting.options } : {}),
      ...(setting.type === 'range' ? { min: setting.min, max: setting.max, ...(setting.step !== undefined ? { step: setting.step } : {}) } : {}),
      default: setting.default,
      value: affects === 'play' ? (settings?.[setting.id] ?? setting.default) : null,
    }
  })
}

/** The settings feature, which keeps `play` settings in the state and `ui` settings in the profile. */
export const settings = defineFeature<SettingsShape>({
  name: 'settings',
  state: {
    settings: { start: (game, options) => startingSettings(game, options.settings), load: () => ({}) },
  },
  conditions: {
    setting: {
      holds: (state, condition) => {
        const value = state.settings?.[condition.setting]
        if (condition.is !== undefined) return value === condition.is
        if (bounded(condition)) return inRange(asCount(value), condition)
        return Boolean(value)
      },
      explain: (state, condition) => {
        const value = state.settings?.[condition.setting]
        const want = condition.is !== undefined ? `= ${JSON.stringify(condition.is)}` : bounded(condition) ? wanted(condition) : 'on'
        return `setting ${condition.setting} is ${value === undefined ? 'unset' : JSON.stringify(value)}; wants ${want}`
      },
      references: (condition) => [{ setting: condition.setting, is: condition.is }],
    },
  },
  commands: {
    setting: {
      whyNot: (_state, command, game) => settingRefusal(game, command.id, command.to),
      run: (state, command) => ({ ...state, settings: { ...state.settings, [command.id]: command.to } }),
      // A menu's business rather than the story's: no lock or plugin guard stops it.
      ignoresLocks: () => true,
      references: (command) => [{ setting: command.id, is: command.to }],
    },
  },
  // A later pack redeclares a setting by id; the same id twice in one list is a mistake.
  pack: {
    merge: (problem) => {
      const merged = new Map<string, { value: SettingDef; from: string }>()
      const add = (list: SettingDef[] | undefined, from: string) => {
        const here = new Set<string>()
        for (const setting of list ?? []) {
          if (here.has(setting.id)) problem(from, `setting ${setting.id}`, 'two settings share this id')
          here.add(setting.id)
          merged.set(setting.id, { value: setting, from })
        }
      }
      return {
        base: (game) => add(game.settings, 'base'),
        add: (pack, from) => add(pack.settings, from),
        finish: (game) => {
          game.settings = [...merged.values()].map((entry) => entry.value)
        },
        from: (_list, id) => (id === undefined ? undefined : merged.get(id)?.from),
      }
    },
  },
  content: { settings: { declares: byId('setting'), words: listWords('settings', 'setting', { label: true, options: [{ label: true }] }) } },
  lists: ['setting'],
  // A play setting the save lacks (one the game added since, or every one in an older save) takes its default.
  fill: {
    part: 'settings',
    unversioned: true,
    run: (state, game) => {
      const lacking = (game.settings ?? []).filter((setting) => settingAffects(setting) === 'play' && state.settings?.[setting.id] === undefined)
      if (!lacking.length && state.settings) return state
      return { ...state, settings: { ...state.settings, ...Object.fromEntries(lacking.map((setting) => [setting.id, setting.default])) } }
    },
  },
  check: (game, tools) => {
    tools.twice(
      'setting',
      'settings',
      (game.settings ?? []).map((entry) => entry.id),
    )
    for (const setting of game.settings ?? []) {
      for (const what of settingProblems(setting)) tools.problem({ list: 'setting', id: setting.id }, `setting ${setting.id}`, what)
    }
  },
  resolve: (game) => ({ setting: (ref) => settingConditionProblems(game, ref.setting, ref.is) }),
  view: (state, game) => ({ settings: settingsView(state.settings, game) }),
  runner: {
    // A play setting changed in a game is the player's choice for the next game too.
    afterCommand: (command, remember) => {
      if (command.type !== 'setting') return
      const { id, to } = command
      remember((profile) => profile.update<Record<string, KvValue>>(SETTINGS_NAMESPACE, (stored) => ({ ...stored, [id]: to })))
    },
    settings: {
      namespace: SETTINGS_NAMESPACE,
      values: (game, state, stored) => {
        const values: Record<string, KvValue> = {}
        for (const setting of game.settings ?? []) {
          values[setting.id] =
            settingAffects(setting) === 'play' ? (state.settings?.[setting.id] ?? setting.default) : (settingValue(game, stored, setting.id) ?? setting.default)
        }
        return values
      },
      fromStored: (game, stored) =>
        Object.fromEntries(
          (game.settings ?? []).filter((setting) => settingAffects(setting) === 'ui').map((setting) => [setting.id, settingValue(game, stored, setting.id)!]),
        ),
      change: (game, id, to, profile) => {
        const setting = settingOf(game, id)
        if (!setting) return { refused: stringOf(game, 'noSuchSetting') }
        if (settingAffects(setting) === 'play') return { command: { type: 'setting', id, to } }
        if (!profile) return { refused: stringOf(game, 'noProfile') }
        const refused = settingRefusal(game, id, to, 'runner')
        return refused ? { refused } : { stored: to }
      },
    },
  },
})
