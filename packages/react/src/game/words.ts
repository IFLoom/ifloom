import type { Game } from '@ifloom/engine'
import { useGame } from './context.tsx'

/**
 * The React UI's own words, in English. A game overrides any of them through
 * `game.strings` with a `ui.` in front — `{ 'ui.stats': 'You' }` — the same
 * table the engine's own lines come from. A plugin's React UI has words of its
 * own, reworded the same way.
 */
export const UI_STRINGS = {
  stats: 'Stats',
  statLevel: 'Level {level}',
  statProgress: '{label}: {percent}% of the way to level {next}',
  allSeen: 'Mark all seen',
  back: 'Back',
  dismiss: 'Dismiss',
  undo: 'Undo',
  redo: 'Redo',
  // the titles of the built-in sections and panels
  inventory: 'Carrying',
  saves: 'Saves',
  save: 'Save',
  saveNew: 'Save in a new slot',
  load: 'Load',
  remove: 'Delete',
  exportSave: 'Export',
  importSave: 'Import a save file',
  noSaves: 'No saves yet.',
  brokenSave: 'A save that can’t be read',
  missingPacks: 'This save was made with mods this game doesn’t have: {packs}.',
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
  modsHint: 'Mods add to the game or change it. Add one from a file, and turn it on or off here.',
  modsChanged: 'Changes to mods take effect when the game restarts.',
  close: 'Close',
  heldCount: '×{n}',
  newGame: 'New game',
  continue: 'Continue',
  newGamePlus: 'New Game+',
  settings: 'Settings',
  noSettings: 'There are no settings.',
  credits: 'Credits',
  titlePage: 'Title screen',
  replayVoice: 'Hear it again',
  zoom: 'Enlarge',
  closeViewer: 'Close',
  menu: 'Menu',
  openSidebar: 'Open the side panel',
  timeLeft: 'Time left',
  timerLeft: '{seconds}s',
  // dice
  diceNeeds: 'needs {against}',
  dicePassed: 'Passed',
  diceFailed: 'Failed',
  diceCriticalMax: 'Critical!',
  diceCriticalMin: 'Fumble',
  diceRolled: 'Rolled {dice}: {faces}, total {total}.',
  diceRolledPassed: 'Needed {against}: passed.',
  diceRolledFailed: 'Needed {against}: failed.',
  diceDismiss: 'Dismiss the roll',
  notices: 'Notices',
  noticesMore: '+{n} more',
  noticesFewer: 'Show fewer',
  unread: 'Unread',
} as const

export type UiStringKey = keyof typeof UI_STRINGS

/**
 * A table of words in English by key, as a plugin's React UI declares its own
 * (`{ buy: 'Buy' }`). A game rewords any of them the same way as the UI's,
 * with `ui.<key>` in its strings.
 */
export type Words = Readonly<Record<string, string>>

/** How a component says a word: by its key, with `{name}` filled from `vars`. */
export type Say<K extends string = UiStringKey> = (key: K, vars?: Record<string, string | number>) => string

/**
 * The UI's words for a key: the game's `ui.<key>`, else the English in
 * `words` (a plugin UI's own table), else the UI's own. `{name}` is filled
 * from `vars`. A key nothing has is said as it is.
 */
export function uiSay(game: Game, key: UiStringKey, vars?: Record<string, string | number>): string
export function uiSay<W extends Words>(game: Game, key: (keyof W & string) | UiStringKey, vars: Record<string, string | number> | undefined, words: W): string
export function uiSay(game: Game, key: string, vars: Record<string, string | number> = {}, words?: Words): string {
  const text = game.strings?.[`ui.${key}`] ?? words?.[key] ?? (UI_STRINGS as Words)[key] ?? key
  return text.replace(/\{(\w+)\}/g, (whole: string, name: string) => (name in vars ? String(vars[name]) : whole))
}

/**
 * `uiSay` for the game in context. Given a plugin UI's own `words`, it says
 * those keys too, and the UI's own.
 */
export function useWords(): Say
export function useWords<W extends Words>(words: W): Say<(keyof W & string) | UiStringKey>
export function useWords(words?: Words): Say<string> {
  const { runner } = useGame()
  return (key, vars) => uiSay(runner.game, key as UiStringKey, vars, words ?? {})
}
