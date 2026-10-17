/**
 * Settings: what the player can change from a settings screen, declared by the
 * game (ADR 0002). A `play` setting is in the state, saved with it and read by
 * the `{ setting }` condition; a `ui` setting lives only in the profile.
 */
import { say } from '../strings.ts'
import type { Game } from '../game.ts'
import type { KvValue, Range } from '../types.ts'
import { bounded, counted, defineFeature, inRange, wanted } from './feature.ts'

/**
 * Something the player can change from a settings screen, declared by the
 * game. A `play` setting (the default) is part of the game state and saved
 * with it; a `ui` setting never enters the state and lives in the profile.
 */
export type SettingDef = {
  id: string
  /** What the settings screen calls it. */
  label: string
  /** `'play'` if left out: in the state, readable by conditions. `'ui'`: for the UI only. */
  affects?: 'play' | 'ui'
} & (
  | { kind: 'toggle'; default: boolean }
  | { kind: 'choice'; options: { value: string; label: string }[]; default: string }
  | { kind: 'range'; min: number; max: number; step?: number; default: number }
)

/** A setting as a settings screen draws it. */
export type SettingView = {
  id: string
  label: string
  kind: 'toggle' | 'choice' | 'range'
  affects: 'play' | 'ui'
  /** A choice's options. */
  options?: { value: string; label: string }[]
  /** A range's bounds and step. */
  min?: number
  max?: number
  step?: number
  default: KvValue
  /** A play setting's value in this game. Null for a ui setting, which the UI reads from the profile. */
  value: KvValue | null
}

/** What the settings feature adds, as types. */
export type SettingsShape = {
  state: {
    /** The value of each `play` setting the game declares, by id. */
    settings: Record<string, KvValue>
  }
  conditions: {
    /**
     * A `play` setting, read as a kv key is: bare, whether it is truthy
     * (`{ setting: 'hints' }`); with `is`, whether it equals that; with a range,
     * whether its number is in it.
     */
    setting: { setting: string; is?: KvValue } & Range
  }
  commands: {
    /** Change a `play` setting. Ignores locks, like a menu would. */
    setting: { type: 'setting'; id: string; to: KvValue }
  }
  game: {
    /** What the player can change from a settings screen. None if left out. */
    settings?: SettingDef[]
  }
  pack: {
    /** What the player can change from a settings screen. A later pack can redeclare one by id. */
    settings?: SettingDef[]
  }
  view: {
    /** Every setting the game declares, in order, for a settings screen. */
    settings: SettingView[]
  }
  lists: 'setting'
  fill: 'settings'
}

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
 * A setting's current value from the player's stored settings (the profile's
 * `core:settings`): the stored value if the setting can still take it, else the
 * setting's default. Undefined for a setting the game doesn't declare.
 */
export function settingValue(game: Game, stored: Record<string, unknown> | undefined, id: string): KvValue | undefined {
  const setting = settingById(game, id)
  if (!setting) return undefined
  const value = stored && Object.hasOwn(stored, id) ? stored[id] : undefined
  return value !== undefined && !settingFault(setting, value) ? (value as KvValue) : setting.default
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
export function startingSettings(game: Game, given: Record<string, unknown> = {}): Record<string, KvValue> {
  const out: Record<string, KvValue> = {}
  for (const setting of game.settings ?? []) {
    if (settingAffects(setting) !== 'play') continue
    const value = given[setting.id]
    out[setting.id] = value !== undefined && !settingFault(setting, value) ? (value as KvValue) : setting.default
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
export function settingConditionProblems(game: Game, id: string, is: KvValue | undefined): string[] {
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

/** Every setting the game declares, as a settings screen draws it. */
function settingsView(settings: Record<string, KvValue> | undefined, game: Game): SettingView[] {
  return (game.settings ?? []).map((setting) => {
    const affects = settingAffects(setting)
    return {
      id: setting.id,
      label: setting.label,
      kind: setting.kind,
      affects,
      ...(setting.kind === 'choice' ? { options: setting.options } : {}),
      ...(setting.kind === 'range' ? { min: setting.min, max: setting.max, ...(setting.step !== undefined ? { step: setting.step } : {}) } : {}),
      default: setting.default,
      value: affects === 'play' ? (settings?.[setting.id] ?? setting.default) : null,
    }
  })
}

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
        if (bounded(condition)) return inRange(counted(value), condition)
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
  lists: ['setting'],
  // A play setting the save lacks (one the game added since, or every one in an older save) takes its default.
  fill: {
    kind: 'settings',
    unversioned: true,
    run: (state, game) => {
      const lacking = (game.settings ?? []).filter((setting) => settingAffects(setting) === 'play' && state.settings?.[setting.id] === undefined)
      if (!lacking.length && state.settings) return state
      return { ...state, settings: { ...state.settings, ...Object.fromEntries(lacking.map((setting) => [setting.id, setting.default])) } }
    },
  },
  check: (game, tools) => {
    tools.twice('setting', 'settings', (game.settings ?? []).map((entry) => entry.id))
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
      remember((profile) => profile.update<Record<string, KvValue>>('core:settings', (stored) => ({ ...stored, [id]: to })))
    },
    newGame: async (start, profile) => ({ ...start, settings: start.settings ?? (await profile?.get<Record<string, unknown>>('core:settings')) }),
  },
})
