import type { Game } from '@ifloom/engine'
import { useGame } from './context.tsx'

/**
 * The React UI's own words, in English. A game overrides any of them through
 * `game.strings` with a `ui.` in front — `{ 'ui.quests': 'Journal' }` — the same
 * table the engine's own lines come from.
 */
export const UI_STRINGS = {
  quests: 'Quests',
  questNew: 'New',
  questStage: '{stage} of {stages}',
  track: 'Track',
  untrack: 'Untrack',
  allSeen: 'Mark all seen',
  allRead: 'Mark all read',
  back: 'Back',
  dismiss: 'Dismiss',
  likes: '♥ {n}',
  debug: 'Debug',
  seed: 'seed {seed}',
  undo: 'Undo',
  redo: 'Redo',
  set: 'Set',
  debugSet: 'Set',
  debugWhy: 'Why not',
  debugState: 'State',
  debugLog: 'Log',
  locksOn: 'Locks on',
  greyedOut: 'Greyed out',
  noneOn: 'None.',
  nothingGreyed: 'Nothing.',
  closeScene: 'Close the scene',
  // debug
  debugStat: 'Stat',
  debugVariable: 'Variable',
  debugItem: 'Item',
  debugStatOf: 'Stat of',
  debugGo: 'Go',
  debugScene: 'Scene',
  debugTime: 'Time',
  debugTurn: 'Turn',
  wardrobe: 'Wearing',
  inventory: 'Carrying',
  takeOff: 'Take off',
  wear: 'Wear',
  nothingOn: 'Nothing',
  saves: 'Saves',
  save: 'Save',
  saveNew: 'Save in a new slot',
  load: 'Load',
  remove: 'Delete',
  exportSave: 'Export',
  importSave: 'Import a save file',
  noSaves: 'No saves yet.',
  missingPacks: 'This save was made with packs this game doesn’t have: {packs}.',
  missingPlugins: 'This save was made with plugins this game doesn’t have: {plugins}.',
  backlog: 'Backlog',
  backlogEmpty: 'Nothing yet.',
  chose: 'You chose: {label}',
  enter: 'Enter',
  mods: 'Mods',
  addMod: 'Add a mod file',
  noMods: 'No mods added.',
  modOn: 'On',
  modOff: 'Off',
  applyMods: 'Restart with these mods',
  close: 'Close',
  priceSeparator: ' · ',
  itemCount: '×{n}',
  wearItem: 'Wear {item}',
  mailHeader: '{key}: {value}',
} as const

export type UiStringKey = keyof typeof UI_STRINGS

/** The UI's words for a key: the game's `ui.<key>`, else the English. `{name}` is filled from `vars`. */
export function uiSay(game: Game, key: UiStringKey, vars: Record<string, string | number> = {}): string {
  const text = game.strings?.[`ui.${key}`] ?? UI_STRINGS[key]
  return text.replace(/\{(\w+)\}/g, (whole: string, name: string) => (name in vars ? String(vars[name]) : whole))
}

/** `uiSay` for the game in context. */
export function useWords(): (key: UiStringKey, vars?: Record<string, string | number>) => string {
  const { runner } = useGame()
  return (key, vars) => uiSay(runner.game, key, vars)
}
