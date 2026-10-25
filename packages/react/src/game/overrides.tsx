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
import type { RoomActions, Title } from './layout.tsx'
import type { Game, Overlay, Section, Sidebar, Story, When } from './regions.tsx'
import type { Clock, StatList } from './sidebar.tsx'
import type { Beat, SceneStage } from './scene.tsx'
import type { InlineAction, Tip } from './inline.tsx'
import type { Hotspot, LayeredPicture } from './layered.tsx'
import type { Video } from './video.tsx'
import type { MediaViewer } from './viewer.tsx'
import type { ChoiceButton, ChoiceList, PriceTag } from './choices.tsx'
import type { Notice, Notices } from './notices.tsx'
import type { Picture } from './picture.tsx'
import type { Inventory } from './inventory.tsx'
import type { EntityTable } from './entities.tsx'
import type { InputField, InputFields } from './inputs.tsx'
import type { Backlog } from './backlog.tsx'
import type { SavesMenu } from './saves.tsx'
import type { GameMenu } from './menu.tsx'
import type { ModManager } from './mods.tsx'
import type { Icon } from './icon.tsx'
import type { CreditsPage, GatePage, LoadPage, SettingsPage, TitlePage } from './pages.tsx'
import type { MinigameCard } from './minigame.tsx'
import type { DiceOverlay, DiceRoll } from './dice.tsx'
import type { Countdown, Timers } from './timers.tsx'
import type { NoticeStrip } from './strip.tsx'
import type { KeyOptions } from './keys.tsx'
import type { PanelHost } from './panels.tsx'

/** Every `data-part` the React UI draws, which is also every key `classes` takes. */
export const PART_KEYS = [
  // The page
  'page',
  'sidebar',
  'story',
  'overlay',
  'title',
  'clock',
  // Sections, and the side column as a drawer on phones
  'section',
  'section-title',
  'section-toggle',
  'section-body',
  'section-badge',
  'top-bar',
  'top-bar-title',
  'drawer-button',
  'drawer',
  'drawer-overlay',
  // Stats
  'stats',
  'stat',
  'stat-label',
  'stat-value',
  'stat-level',
  'stat-progress',
  'stat-bar',
  'stat-pips',
  'stat-pip',
  // Scenes
  'scene-transition',
  'scene',
  'scene-header',
  'scene-portrait',
  'scene-title',
  'scene-image',
  'beats',
  'beat',
  'speaker-name',
  'reveal',
  'inline-mail',
  'mail-header',
  'mail-body',
  'inline-prop',
  'inline-mono',
  'voice-replay',
  'fold',
  'fold-summary',
  'fold-beats',
  // Inline actions, tooltips, inline pieces, bold and italics in the prose
  'inline-action',
  'tip',
  'tip-content',
  'inline-ui',
  'inline-modal',
  'bold',
  'italic',
  // Pictures, videos, layered pictures and the viewer
  'video',
  'picture',
  'picture-layer',
  'hotspot',
  'hotspot-warning',
  'viewer-open',
  'viewer',
  'viewer-close',
  // Choices and buttons
  'actions',
  'choices',
  'choice',
  'choice-key',
  'choice-label',
  'choice-warning',
  'choice-price',
  'choice-irreversible',
  'choice-reason',
  'button',
  'badge',
  // Notices
  'notices',
  'notices-more',
  'notice',
  'notice-image',
  'notice-title',
  'notice-text',
  'notice-dismiss',
  'notice-strip',
  'notice-strip-item',
  // Dice rolls
  'dice',
  'dice-label',
  'dice-faces',
  'dice-face',
  'dice-plus',
  'dice-total',
  'dice-outcome',
  'dice-critical',
  'dice-overlay',
  'dice-dismiss',
  // Timers
  'timers',
  'timer',
  'timer-label',
  'timer-bar',
  'timer-left',
  // Minigames
  'minigame',
  'minigame-title',
  'minigame-state',
  'minigame-timer',
  'minigame-inputs',
  'minigame-input',
  // The menu and its dialogs
  'menu',
  'menu-button',
  'dialog',
  'dialog-overlay',
  'dialog-title',
  'dialog-close',
  'saves',
  'saves-actions',
  'save-slot',
  'save-name',
  'save-details',
  'saves-message',
  'saves-blocked',
  'saves-empty',
  'file-button',
  'backlog',
  'backlog-entry',
  'backlog-title',
  'backlog-choice',
  'backlog-empty',
  'mods',
  'mod',
  'mod-name',
  'mod-version',
  'mod-state',
  'mod-text',
  'mod-problem',
  'mods-message',
  'mods-empty',
  'mods-restart',
  'mods-changed',
  // What you carry, and the entities' tables
  'inventory',
  'inventory-title',
  'thing',
  'thing-name',
  'thing-count',
  'thing-text',
  'entities',
  'entity-table',
  'entity-heading',
  'entity-columns',
  'entity-column',
  'entity-row',
  'entity-name',
  'entity-image',
  'entity-desc',
  'entity-value',
  'inputs',
  'input',
  'input-label',
  'input-field',
  'input-options',
  'input-submit',
  'input-error',
  // The pages around the game
  'title-page',
  'title-art',
  'title-name',
  'title-subtitle',
  'title-buttons',
  'title-button',
  'page-heading',
  'page-back',
  'settings-page',
  'settings',
  'setting',
  'setting-label',
  'setting-control',
  'setting-value',
  'settings-empty',
  'settings-message',
  'settings-mods',
  'mods-title',
  'mods-hint',
  'load-page',
  'credits-page',
  'credits',
  'credit',
  'credit-link',
  'gate-page',
  'gate-title',
  'gate-text',
  'gate-buttons',
  'gate-confirm',
  'gate-decline',
] as const

/**
 * The parts a plugin's React UI draws, by name, added by augmenting this
 * interface so `classes` and `usePart` take them typed:
 *
 *   declare module '@ifloom/react' {
 *     interface PartNames { shop: true; good: true }
 *   }
 */
// oxlint-disable-next-line typescript/no-empty-interface, typescript/no-empty-object-type -- filled by augmentation
export interface PartNames {}

/** A `data-part` name: one of `PART_KEYS`, or one a plugin's UI adds through `PartNames`. */
// oxlint-disable-next-line typescript/no-redundant-type-constituents -- `never` here until a plugin's UI augments PartNames
export type PartKey = (typeof PART_KEYS)[number] | Extract<keyof PartNames, string>

/**
 * Classes for a part. A string is merged over the built-in classes (yours win
 * where they clash); a function gets the built-in classes and returns the ones
 * to use, so `() => 'font-serif'` replaces them outright.
 */
export type Classes = Partial<Record<PartKey, string | ((defaults: string) => string)>>

/** A replacement for a built-in component. It gets the same props, and the built-in one as `Default`. */
export type Override<P> = ComponentType<P & { Default: ComponentType<P> }>

type PropsOf<T> = T extends ComponentType<infer P> ? P : never

/**
 * The built-in components a game can replace, by name, each with the props it
 * takes. A plugin's React UI adds its own by augmenting this interface:
 *
 *   declare module '@ifloom/react' {
 *     interface OverridableComponents { ShopCounter: Override<ShopCounterProps> }
 *   }
 */
export interface OverridableComponents {
  Game: Override<PropsOf<typeof Game>>
  Sidebar: Override<PropsOf<typeof Sidebar>>
  Story: Override<PropsOf<typeof Story>>
  Overlay: Override<PropsOf<typeof Overlay>>
  Section: Override<PropsOf<typeof Section>>
  When: Override<PropsOf<typeof When>>
  Title: Override<PropsOf<typeof Title>>
  Clock: Override<PropsOf<typeof Clock>>
  StatList: Override<PropsOf<typeof StatList>>
  RoomActions: Override<PropsOf<typeof RoomActions>>
  SceneStage: Override<PropsOf<typeof SceneStage>>
  Beat: Override<PropsOf<typeof Beat>>
  InlineAction: Override<PropsOf<typeof InlineAction>>
  Tip: Override<PropsOf<typeof Tip>>
  ChoiceList: Override<PropsOf<typeof ChoiceList>>
  ChoiceButton: Override<PropsOf<typeof ChoiceButton>>
  PriceTag: Override<PropsOf<typeof PriceTag>>
  Notices: Override<PropsOf<typeof Notices>>
  Notice: Override<PropsOf<typeof Notice>>
  NoticeStrip: Override<PropsOf<typeof NoticeStrip>>
  MinigameCard: Override<PropsOf<typeof MinigameCard>>
  DiceRoll: Override<PropsOf<typeof DiceRoll>>
  DiceOverlay: Override<PropsOf<typeof DiceOverlay>>
  Countdown: Override<PropsOf<typeof Countdown>>
  Timers: Override<PropsOf<typeof Timers>>
  GameMenu: Override<PropsOf<typeof GameMenu>>
  SavesMenu: Override<PropsOf<typeof SavesMenu>>
  Backlog: Override<PropsOf<typeof Backlog>>
  ModManager: Override<PropsOf<typeof ModManager>>
  Inventory: Override<PropsOf<typeof Inventory>>
  PanelHost: Override<PropsOf<typeof PanelHost>>
  EntityTable: Override<PropsOf<typeof EntityTable>>
  InputFields: Override<PropsOf<typeof InputFields>>
  InputField: Override<PropsOf<typeof InputField>>
  Picture: Override<PropsOf<typeof Picture>>
  Video: Override<PropsOf<typeof Video>>
  LayeredPicture: Override<PropsOf<typeof LayeredPicture>>
  Hotspot: Override<PropsOf<typeof Hotspot>>
  MediaViewer: Override<PropsOf<typeof MediaViewer>>
  Icon: Override<PropsOf<typeof Icon>>
  TitlePage: Override<PropsOf<typeof TitlePage>>
  SettingsPage: Override<PropsOf<typeof SettingsPage>>
  LoadPage: Override<PropsOf<typeof LoadPage>>
  CreditsPage: Override<PropsOf<typeof CreditsPage>>
  GatePage: Override<PropsOf<typeof GatePage>>
}

/** Replacements for any of the `OverridableComponents`, by name. */
export type Components = Partial<OverridableComponents>

/** What a game passes to make the UI its own. `GameProvider`, `GameShell` and `mountGame` all take these. */
export type UiOptions = {
  /** Replacements for built-in components, by name. */
  components?: Components
  /** Classes for parts, by `data-part` name. */
  classes?: Classes
  /** Drop every built-in class. The structure and the `data-part`s stay, for your own styles. */
  unstyled?: boolean
  /** Let the player click a picture or a video in the story to see it large. On if left out. */
  viewer?: boolean
  /**
   * Keyboard shortcuts: 1 to 9 for the choices or buttons on screen, Escape for
   * the menu, and any keys of the game's own in `map`. Off if left out. A
   * minigame's keys work either way.
   */
  keys?: boolean | KeyOptions
  /**
   * Play scene transitions and prose reveals (the `ui.transition` and
   * `ui.reveal` hints). On if left out. `false` shows every scene and every line at once.
   * A player whose system asks for reduced motion gets them at once either way.
   */
  motion?: boolean
}

const NONE = {}
const UiContext = createContext<Required<UiOptions>>({ components: NONE, classes: NONE, unstyled: false, viewer: true, keys: false, motion: true })

/** Gives the components below it a game's `components`, `classes`, `unstyled`, `viewer`, `keys` and `motion`. `GameProvider` uses it. */
export function UiProvider({ components = NONE, classes = NONE, unstyled = false, viewer, keys, motion, children }: UiOptions & { children: ReactNode }) {
  const parent = useContext(UiContext)
  // Nested providers add to the outer one, so a screen can restyle just its own corner.
  const value = {
    components: parent.components === NONE ? components : { ...parent.components, ...components },
    classes: parent.classes === NONE ? classes : { ...parent.classes, ...classes },
    unstyled: unstyled || parent.unstyled,
    viewer: viewer ?? parent.viewer,
    keys: keys ?? parent.keys,
    motion: motion ?? parent.motion,
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

/**
 * What a part is like, whatever drew it, carried as `data-kit` beside its own
 * `data-part`: a plugin's goods, jobs and achievements are all `card`s. The
 * presets style these and the theme's tokens, never a plugin's own parts, so
 * a plugin's UI looks right in each preset without a stylesheet of its own,
 * and a game's stylesheet can restyle every card at once.
 *
 * - `card`: an entry in a list, boxed: a vendor's good, a job, an achievement.
 * - `item`: an entry in a list, not boxed: a status.
 * - `title`: an entry's name. `heading`: a list's heading.
 * - `note`: a line about an entry, quieter than its title.
 * - `meter`: a bar of progress, with a `<span>` inside as wide as it's got.
 * - `commands`: buttons that do something, not choices the story offers.
 * - `opener`: a button that opens something over the page, such as a dialog.
 * - `form` and `input`: where the player types something, such as a code.
 * - `badge`: a small label on an entry. `thumb`: a small picture of it.
 * - `label`: a short word beside a value, such as a slot's name.
 *
 * An entry that can be done says how it stands in `data-state`: `"done"`, or
 * `"open"` while it isn't yet. One the player hasn't found yet carries `data-secret`.
 */
export const KIT_PARTS = ['card', 'item', 'title', 'heading', 'note', 'meter', 'commands', 'opener', 'form', 'input', 'badge', 'thumb', 'label'] as const

export type KitPart = (typeof KIT_PARTS)[number]

/** `usePart` for a part that's one of the kit's: its `data-part`, its `data-kit` and its classes. */
export function useKitPart(kit: KitPart, name: PartKey, defaults: string, extra?: string): { 'data-part': PartKey; 'data-kit': KitPart; className: string } {
  return { ...usePart(name, defaults, extra), 'data-kit': kit }
}

/** The `motion` option in effect: true unless the game turned transitions off. See `useMotion` for the player's setting too. */
export function useMotionOption(): boolean {
  return useContext(UiContext).motion
}

/** Whether the media viewer is on: `viewer` in the UI options. */
export function useViewerOn(): boolean {
  return useContext(UiContext).viewer
}

/** The `keys` option in effect: `false` when the game left it out. */
export function useKeysOption(): boolean | KeyOptions {
  return useContext(UiContext).keys
}

/** A built-in component that a game can replace by `name`. Used for every component the UI exports. */
export function overridable<P extends object>(name: keyof OverridableComponents, Default: ComponentType<P>): ComponentType<P> {
  function Overridable(props: P) {
    const Custom = useContext(UiContext).components[name] as Override<P> | undefined
    return Custom ? <Custom {...props} Default={Default} /> : <Default {...props} />
  }
  Overridable.displayName = name
  return Overridable
}
