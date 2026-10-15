/**
 * How a game makes the React UI its own, below the theme variables:
 *
 * - `components` replaces any built-in component by name, everywhere it's used.
 * - `classes` changes the Tailwind classes on any part, by its `data-part` name.
 * - `unstyled` drops every built-in class, leaving the structure and the hooks.
 *
 * Every element the UI draws carries a `data-part`, so plain CSS can reach it too.
 */
import { createContext, useContext, type ComponentType, type ReactNode } from 'react'
import { cn } from '../lib/utils.ts'
import type { Actions, Sidebar, Title } from './layout.tsx'
import type { Clock, LocationPanel, PeoplePanel, StatList } from './sidebar.tsx'
import type { Beat, SceneStage } from './scene.tsx'
import type { ChoiceButton, ChoiceList, PriceTag } from './choices.tsx'
import type { Notice, Notices } from './notices.tsx'
import type { QuestLog } from './quests.tsx'
import type { AppSection, DeviceButtons, DeviceDialog, DeviceScreen } from './device.tsx'
import type { FeedSection, MessagesSection } from './sections.tsx'
import type { DebugPanel } from './debug.tsx'
import type { Picture } from './picture.tsx'
import type { WardrobePanel } from './wardrobe.tsx'
import type { Inventory } from './inventory.tsx'
import type { EntityTable } from './entities.tsx'
import type { InputField, InputFields } from './inputs.tsx'
import type { Backlog } from './backlog.tsx'
import type { SavesMenu } from './saves.tsx'
import type { GameMenu } from './menu.tsx'
import type { ModManager } from './mods.tsx'
import type { Frame } from './shell.tsx'
import type { Icon } from './icon.tsx'
import type { CreditsScreen, GateScreen, LoadScreen, SettingsScreen, TitleScreen } from './screens.tsx'

/** Every `data-part` the React UI draws, which is also every key `classes` takes. */
export const PART_KEYS = [
  // The page
  'page', 'sidebar', 'stage', 'overlay',
  'title', 'clock',
  // Stats
  'stats', 'stat', 'stat-label', 'stat-value',
  // Where you are, and who's there
  'location', 'location-name', 'location-text', 'exits', 'exit',
  'people', 'people-title', 'person', 'person-portrait', 'person-name', 'person-role', 'person-actions',
  // Scenes
  'scene', 'scene-header', 'scene-portrait', 'scene-title', 'stage-image', 'beats',
  'beat', 'mail-header', 'mail-body',
  // Choices and buttons
  'actions', 'choices', 'choice', 'choice-label', 'choice-warning', 'choice-price', 'choice-irreversible', 'choice-reason',
  'button', 'badge',
  // Notices
  'notices', 'notice', 'notice-image', 'notice-title', 'notice-text', 'notice-dismiss',
  // The menu and its dialogs
  'menu', 'menu-button', 'dialog', 'dialog-overlay', 'dialog-title', 'dialog-close',
  'saves', 'saves-actions', 'save-slot', 'save-name', 'save-details', 'saves-message', 'saves-empty', 'file-button',
  'backlog', 'backlog-entry', 'backlog-title', 'backlog-choice', 'backlog-empty',
  'mods', 'mod', 'mod-name', 'mod-version', 'mod-state', 'mod-text', 'mod-problem', 'mods-message', 'mods-empty',
  // Plugins' panels
  'quests', 'quests-title', 'quest', 'quest-title', 'quest-stage', 'quest-summary', 'quest-hint', 'quests-done', 'quest-done',
  'inventory', 'inventory-title', 'item', 'item-name', 'item-count', 'item-text',
  'wardrobe', 'wardrobe-title', 'wardrobe-slot', 'wardrobe-slot-name', 'wardrobe-worn',
  'entities', 'entity-table', 'entity-heading', 'entity-columns', 'entity-column', 'entity-row', 'entity-name', 'entity-value',
  'inputs', 'input', 'input-label', 'input-field', 'input-options', 'input-submit', 'input-error',
  // Devices, apps, messages and feeds
  'devices', 'device-button', 'device-badge', 'device-screen', 'app', 'app-header', 'app-title', 'app-back',
  'app-launcher', 'app-button', 'app-icon', 'app-badge', 'app-prose', 'app-entries', 'app-entry', 'app-entry-image', 'app-entry-title', 'app-entry-text',
  'channel', 'thread', 'thread-title', 'thread-portrait', 'message', 'bubble',
  'feed', 'post', 'post-author', 'post-portrait', 'post-image', 'post-text', 'post-meta', 'post-comment', 'post-comment-name',
  // The debug panel
  'debug', 'debug-header', 'debug-title', 'debug-seed', 'debug-form', 'debug-label', 'debug-field', 'debug-error',
  'debug-section', 'debug-heading', 'debug-list', 'debug-state', 'debug-log',
  // The screens around the game
  'title-screen', 'title-art', 'title-name', 'title-subtitle', 'title-buttons', 'title-button',
  'screen-heading', 'screen-back',
  'settings-screen', 'settings', 'setting', 'setting-label', 'setting-control', 'setting-value', 'settings-empty',
  'load-screen', 'credits-screen', 'credits', 'credit', 'credit-link',
  'gate-screen', 'gate-title', 'gate-text', 'gate-buttons', 'gate-confirm', 'gate-decline',
] as const

export type PartKey = (typeof PART_KEYS)[number]

/**
 * Classes for a part. A string is merged over the built-in classes (yours win
 * where they clash); a function gets the built-in classes and returns the ones
 * to use, so `() => 'font-serif'` replaces them outright.
 */
export type Classes = Partial<Record<PartKey, string | ((defaults: string) => string)>>

/** A replacement for a built-in component. It gets the same props, and the built-in one as `Default`. */
export type Override<P> = ComponentType<P & { Default: ComponentType<P> }>

type PropsOf<T> = T extends ComponentType<infer P> ? P : never

/** The built-in components a game can replace, by name. */
export type Components = Partial<{
  Frame: Override<PropsOf<typeof Frame>>
  Sidebar: Override<PropsOf<typeof Sidebar>>
  Title: Override<PropsOf<typeof Title>>
  Clock: Override<PropsOf<typeof Clock>>
  StatList: Override<PropsOf<typeof StatList>>
  LocationPanel: Override<PropsOf<typeof LocationPanel>>
  PeoplePanel: Override<PropsOf<typeof PeoplePanel>>
  Actions: Override<PropsOf<typeof Actions>>
  SceneStage: Override<PropsOf<typeof SceneStage>>
  Beat: Override<PropsOf<typeof Beat>>
  ChoiceList: Override<PropsOf<typeof ChoiceList>>
  ChoiceButton: Override<PropsOf<typeof ChoiceButton>>
  PriceTag: Override<PropsOf<typeof PriceTag>>
  Notices: Override<PropsOf<typeof Notices>>
  Notice: Override<PropsOf<typeof Notice>>
  GameMenu: Override<PropsOf<typeof GameMenu>>
  SavesMenu: Override<PropsOf<typeof SavesMenu>>
  Backlog: Override<PropsOf<typeof Backlog>>
  ModManager: Override<PropsOf<typeof ModManager>>
  QuestLog: Override<PropsOf<typeof QuestLog>>
  Inventory: Override<PropsOf<typeof Inventory>>
  WardrobePanel: Override<PropsOf<typeof WardrobePanel>>
  EntityTable: Override<PropsOf<typeof EntityTable>>
  InputFields: Override<PropsOf<typeof InputFields>>
  InputField: Override<PropsOf<typeof InputField>>
  DeviceButtons: Override<PropsOf<typeof DeviceButtons>>
  DeviceDialog: Override<PropsOf<typeof DeviceDialog>>
  DeviceScreen: Override<PropsOf<typeof DeviceScreen>>
  AppSection: Override<PropsOf<typeof AppSection>>
  MessagesSection: Override<PropsOf<typeof MessagesSection>>
  FeedSection: Override<PropsOf<typeof FeedSection>>
  DebugPanel: Override<PropsOf<typeof DebugPanel>>
  Picture: Override<PropsOf<typeof Picture>>
  Icon: Override<PropsOf<typeof Icon>>
  TitleScreen: Override<PropsOf<typeof TitleScreen>>
  SettingsScreen: Override<PropsOf<typeof SettingsScreen>>
  LoadScreen: Override<PropsOf<typeof LoadScreen>>
  CreditsScreen: Override<PropsOf<typeof CreditsScreen>>
  GateScreen: Override<PropsOf<typeof GateScreen>>
}>

/** What a game passes to make the UI its own. `GameProvider`, `GameShell` and `mountGame` all take these. */
export type UiOptions = {
  /** Replacements for built-in components, by name. */
  components?: Components
  /** Classes for parts, by `data-part` name. */
  classes?: Classes
  /** Drop every built-in class. The structure and the `data-part`s stay, for your own styles. */
  unstyled?: boolean
}

const NONE = {}
const UiContext = createContext<Required<UiOptions>>({ components: NONE, classes: NONE, unstyled: false })

/** Gives the components below it a game's `components`, `classes` and `unstyled`. `GameProvider` uses it. */
export function UiProvider({ components = NONE, classes = NONE, unstyled = false, children }: UiOptions & { children: ReactNode }) {
  const parent = useContext(UiContext)
  // Nested providers add to the outer one, so a screen can restyle just its own corner.
  const value = {
    components: parent.components === NONE ? components : { ...parent.components, ...components },
    classes: parent.classes === NONE ? classes : { ...parent.classes, ...classes },
    unstyled: unstyled || parent.unstyled,
  }
  return <UiContext.Provider value={value}>{children}</UiContext.Provider>
}

/**
 * The attributes for one part: its `data-part` and its classes. `defaults` are
 * the built-in classes; `extra` is a `className` a caller passed, added last.
 */
export function usePart(name: PartKey, defaults: string, extra?: string): { 'data-part': PartKey; className: string } {
  const { classes, unstyled } = useContext(UiContext)
  const base = unstyled ? '' : defaults
  const custom = classes[name]
  const className = typeof custom === 'function' ? cn(custom(base), extra) : cn(base, custom, extra)
  return { 'data-part': name, className }
}

/** A built-in component that a game can replace by `name`. Used for every component the UI exports. */
export function overridable<P extends object>(name: keyof Components, Default: ComponentType<P>): ComponentType<P> {
  function Overridable(props: P) {
    const Custom = useContext(UiContext).components[name] as Override<P> | undefined
    return Custom ? <Custom {...props} Default={Default} /> : <Default {...props} />
  }
  Overridable.displayName = name
  return Overridable
}
