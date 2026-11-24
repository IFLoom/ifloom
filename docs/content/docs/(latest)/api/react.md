---
title: "@ifloom/react"
description: "Every export of @ifloom/react, the React UI: its signature and its fields."
---
Generated from the source of `@ifloom/react` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Components: [`DefaultLayout`](#defaultlayout), [`GameProvider`](#gameprovider), [`GameShell`](#gameshell), [`InlineImage`](#inlineimage), [`InlineMail`](#inlinemail), [`InlineModal`](#inlinemodal), [`InlineMono`](#inlinemono), [`InlineProp`](#inlineprop), [`InlineTrigger`](#inlinetrigger), [`KeepPicturesOn`](#keeppictureson), [`Plugins`](#plugins), [`StatGauge`](#statgauge), [`UiProvider`](#uiprovider), [`WithPages`](#withpages)
- Functions: [`assetUrl`](#asseturl), [`checkUiHints`](#checkuihints), [`mountGame`](#mountgame), [`TextSize`](#textsize), [`useAudio`](#useaudio), [`useBacklog`](#usebacklog), [`useClock`](#useclock), [`useGame`](#usegame), [`useHolds`](#useholds), [`useMinigame`](#useminigame), [`useMods`](#usemods), [`useMotion`](#usemotion), [`usePage`](#usepage), [`usePart`](#usepart), [`usePicturesShown`](#usepicturesshown), [`usePluginUis`](#usepluginuis), [`useProfile`](#useprofile), [`useReducedMotion`](#usereducedmotion), [`useSaves`](#usesaves), [`useScene`](#usescene), [`useSetting`](#usesetting), [`useTimer`](#usetimer), [`useTimers`](#usetimers), [`useWords`](#usewords)
- Constants: [`Backlog`](#backlog), [`Beat`](#beat), [`BeatGroup`](#beatgroup), [`ChangeItem`](#changeitem), [`Changes`](#changes), [`ChoiceButton`](#choicebutton), [`ChoiceList`](#choicelist), [`Clock`](#clock), [`Countdown`](#countdown), [`CreditsPage`](#creditspage), [`DiceOverlay`](#diceoverlay), [`DiceRoll`](#diceroll), [`EntityTable`](#entitytable), [`Fold`](#fold), [`Game`](#game), [`GameMenu`](#gamemenu), [`GatePage`](#gatepage), [`Hotspot`](#hotspot), [`InlineAction`](#inlineaction), [`InputField`](#inputfield), [`InputFields`](#inputfields), [`Inventory`](#inventory), [`LayeredPicture`](#layeredpicture), [`LoadPage`](#loadpage), [`MediaViewer`](#mediaviewer), [`MinigameCard`](#minigamecard), [`ModManager`](#modmanager), [`Notice`](#notice), [`Notices`](#notices), [`NoticeStrip`](#noticestrip), [`Overlay`](#overlay), [`PanelHost`](#panelhost), [`Picture`](#picture), [`PriceTag`](#pricetag), [`RoomActions`](#roomactions), [`SavesMenu`](#savesmenu), [`Scene`](#scene), [`SceneHeader`](#sceneheader), [`Section`](#section), [`SettingsPage`](#settingspage), [`Sidebar`](#sidebar), [`StatList`](#statlist), [`Story`](#story), [`TEXT_SIZES`](#text_sizes), [`Timers`](#timers), [`Tip`](#tip), [`Title`](#title), [`TitlePage`](#titlepage), [`TRANSITIONS`](#transitions), [`Video`](#video), [`When`](#when)
- Types: [`BehaviourOptions`](#behaviouroptions), [`CheckUiOptions`](#checkuioptions), [`Classes`](#classes), [`ClockState`](#clockstate), [`Components`](#components), [`CountdownProps`](#countdownprops), [`Credit`](#credit), [`DiceRollProps`](#dicerollprops), [`GameContextValue`](#gamecontextvalue), [`GameProps`](#gameprops), [`GameProviderProps`](#gameproviderprops), [`GameShellProps`](#gameshellprops), [`GateOptions`](#gateoptions), [`InlineComponent`](#inlinecomponent), [`InlineComponents`](#inlinecomponents), [`InlineProps`](#inlineprops), [`InventoryProps`](#inventoryprops), [`KeyOptions`](#keyoptions), [`MediaViewerProps`](#mediaviewerprops), [`MinigameControls`](#minigamecontrols), [`ModsOption`](#modsoption), [`ModsState`](#modsstate), [`MountOptions`](#mountoptions), [`OverridableComponents`](#overridablecomponents), [`Page`](#page), [`PageDef`](#pagedef), [`PagesOptions`](#pagesoptions), [`PageState`](#pagestate), [`PanelComponent`](#panelcomponent), [`PartKey`](#partkey), [`PartNames`](#partnames), [`PluginSectionComponent`](#pluginsectioncomponent), [`PluginSpot`](#pluginspot), [`Reveal`](#reveal), [`RevealBeat`](#revealbeat), [`RevealGroup`](#revealgroup), [`RevealPoint`](#revealpoint), [`SavesState`](#savesstate), [`Say`](#say), [`SceneRolls`](#scenerolls), [`SceneTiming`](#scenetiming), [`ScreenTransition`](#screentransition), [`SectionProps`](#sectionprops), [`SidebarProps`](#sidebarprops), [`StatDisplay`](#statdisplay), [`StoryProps`](#storyprops), [`StyleOptions`](#styleoptions), [`Transition`](#transition), [`TransitionName`](#transitionname), [`UiOptions`](#uioptions), [`UiStringKey`](#uistringkey), [`VideoProps`](#videoprops), [`ViewerMedia`](#viewermedia), [`Words`](#words)

## assetUrl

Function. Explained in [Components](/docs/react/components#asseturl).

Where a picture really is. A build made with `ifloom build --inline-assets`
puts every file from `art/` into the page as a data URL, under its path;
everywhere else the path is used as it is.

```ts shape
import { assetUrl } from '@ifloom/react'
function assetUrl(src: string): string
```

## Backlog

Const. Explained in [Components](/docs/react/components#backlog).

What was shown, oldest first, each scene followed by the choice made in it. Needs the runner's backlog on. `useBacklog` gives the entries alone.

```ts shape
import { Backlog } from '@ifloom/react'
const Backlog: ComponentType<{ className?: string; }>
```

## Beat

Const. Explained in [Components](/docs/react/components#beat).

One beat of a scene's body: narration, a spoken line, a picture, a video,
or a pick the player made earlier in a flowing scene (`chose`, its label,
small and set in).
Letters, notes and signs are inline pieces in a line (`InlineMail`,
`InlineProp`, `InlineMono`). A picture whose block has `ui.tilt` sits at a
slight angle. A sound beat draws nothing, and a spoken line with a voice
gets a button to hear it again while the game's sound is playing. A picture
or a clip opens in the `MediaViewer` when clicked, unless the viewer is off.
Each carries `data-beat` with its kind, and `data-part="beat"`, except a
video, which is a `"video"` part. A line with inline actions or tooltips
draws them as `InlineAction` and `Tip` buttons in the line. Replace it in `components` to draw some
kinds your own way and hand the rest to `Default`.

```ts shape
import { Beat } from '@ifloom/react'
const Beat: ComponentType<{ beat: SceneBeat; }>
```

## BeatGroup

Const. Explained in [Components](/docs/react/components#beatgroup).

A section of the scene's body with ui hints: its beats (`children`) in one
`group` part, with each hint that's a string, a number or true/false as a
`data-*` attribute (`{ card: 'result' }` is `data-card="result"`), so a
game styles the section as one box. `section` is the section's hints.
Replace it in `components` to draw a section your own way; the beats in
it still come in on time.

```ts shape
import { BeatGroup } from '@ifloom/react'
const BeatGroup: ComponentType<{ section: BlockUi & { readonly [hint: string]: unknown; }; children: ReactNode; }>
```

## BehaviourOptions

Type. Explained in [Components](/docs/react/components#behaviouroptions).

How the UI behaves: the media viewer, keyboard shortcuts and motion. Part of `UiOptions`.

```ts shape
import type { BehaviourOptions } from '@ifloom/react'
type BehaviourOptions = {
  viewer?: boolean
  keys?: boolean | KeyOptions
  motion?: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `viewer` | `boolean` | yes |  | Let the player click a picture or a video in the story to see it large. On if left out. |
| `keys` | `boolean \| KeyOptions` | yes |  | Keyboard shortcuts: 1 to 9 for the choices or buttons on screen, Escape for the menu, and any keys of the game's own in `map`. Off if left out. A minigame's keys work either way. |
| `motion` | `boolean` | yes |  | Play scene transitions and prose reveals (the `ui.transition` and `ui.reveal` hints). On if left out. `false` shows every scene and every line at once. A player whose system asks for reduced motion gets them at once either way. |

## ChangeItem

Const. Explained in [Components](/docs/react/components#changeitem).

One stat the last command moved, as a `change` part: its signed text in the
stat's format (`change-text`), then the change's `name` when the view
gives one (`change-label`): an entity's name, or the stat's label when its
format doesn't say what it is. It carries `data-stat`, `data-of` for an
entity's stat and `data-dir="up"` or `"down"`.

```ts shape
import { ChangeItem } from '@ifloom/react'
const ChangeItem: ComponentType<{ change: ChangeView; }>
```

## Changes

Const. Explained in [Components](/docs/react/components#changes).

The stats the last command moved (`view.changes`), as a `changes` list of
`ChangeItem`s. Draws nothing when nothing moved. Not in the default layout:
place it in yours, after `<Scene />` for feedback under the story.

```ts shape
import { Changes } from '@ifloom/react'
const Changes: ComponentType<{ className?: string; }>
```

## checkUiHints

Function. Explained in [Presentation hints](/docs/react/hints#checkuihints).

Each problem with the React UI's hints in a game, as `where: what`: a hint
this UI doesn't read on that place (a typo, or another UI's), and each
value a hint's declaration in `UI_HINTS` finds wrong, such as a transition
the game doesn't have, a `timer` that isn't one of the game's timers, pips
on a stat with a range over 20, or a `hue` outside 0 to 360.

It also reads the prose, and the words blocks write in place, for inline
pieces, `[[ui:name|…]]`: a name that is neither built in (`INLINE_PIECES`),
nor a plugin UI's, nor one of the game's own `inline` components, which
would show only its words; and each built-in piece its check finds wrong,
such as a `modal` with no prose key. A game's own component of a built-in
name reads its arguments its own way, so it isn't checked.

Empty when all is well.

```ts shape
import { checkUiHints } from '@ifloom/react'
function checkUiHints(game: Game, options?: CheckUiOptions): string[]
```

## CheckUiOptions

Type. Explained in [Presentation hints](/docs/react/hints#checkuioptions).

What `checkUiHints` takes besides the game.

```ts shape
import type { CheckUiOptions } from '@ifloom/react'
type CheckUiOptions = {
  plugins?: readonly PluginUi[]
  inline?: InlineComponents
  allow?: readonly string[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `plugins` | `readonly PluginUi[]` | yes |  | The plugin UIs the game draws with (the same list it gives `mountGame`): their `hints` and `inline` pieces are known. |
| `inline` | `InlineComponents` | yes |  | The game's own inline pieces (the same object you give `mountGame` or the `GameProvider`). |
| `allow` | `readonly string[]` | yes |  | Hints and inline names that aren't reported (`['mood']`, say, for another UI's). |

## ChoiceButton

Const. Explained in [Components](/docs/react/components#choicebutton).

A choice or an action as a button: its label, its price, and (when it is
greyed out) the reason, on the button itself so the player never has to
hover to learn why. A warning (pressable, but the game would refuse it, as
running past dawn) is marked and written under it. With `keys` on, a
numbered choice shows its number key.

```ts shape
import { ChoiceButton } from '@ifloom/react'
const ChoiceButton: ComponentType<{ choice: RenderedChoice; className?: string; }>
```

## ChoiceList

Const. Explained in [Components](/docs/react/components#choicelist).

A list of choices or actions, one per row. `part` names it for styling: `'choices'`, or `'actions'` for the room's buttons.

```ts shape
import { ChoiceList } from '@ifloom/react'
const ChoiceList: ComponentType<{ choices: RenderedChoice[]; className?: string; part?: 'actions' | 'choices'; }>
```

## Classes

Type. Explained in [Components](/docs/react/components#classes).

Classes for a part. A string is merged over the built-in classes (yours win
where they clash); a function gets the built-in classes and returns the ones
to use, so `() => 'font-serif'` replaces them outright.

```ts shape
import type { Classes } from '@ifloom/react'
type Classes = {
  entities?: string | ((defaults: string) => string)
  actions?: string | ((defaults: string) => string)
  inputs?: string | ((defaults: string) => string)
  settings?: string | ((defaults: string) => string)
  stats?: string | ((defaults: string) => string)
  timers?: string | ((defaults: string) => string)
  changes?: string | ((defaults: string) => string)
  setting?: string | ((defaults: string) => string)
  stat?: string | ((defaults: string) => string)
  scene?: string | ((defaults: string) => string)
  timer?: string | ((defaults: string) => string)
  achievements?: string | ((defaults: string) => string)
  achievement?: string | ((defaults: string) => string)
  button?: string | ((defaults: string) => string)
  picture?: string | ((defaults: string) => string)
  video?: string | ((defaults: string) => string)
  input?: string | ((defaults: string) => string)
  choice?: string | ((defaults: string) => string)
  minigame?: string | ((defaults: string) => string)
  channel?: string | ((defaults: string) => string)
  dice?: string | ((defaults: string) => string)
  bold?: string | ((defaults: string) => string)
  cheats?: string | ((defaults: string) => string)
  cheat?: string | ((defaults: string) => string)
  devices?: string | ((defaults: string) => string)
  app?: string | ((defaults: string) => string)
  feed?: string | ((defaults: string) => string)
  post?: string | ((defaults: string) => string)
  jobs?: string | ((defaults: string) => string)
  job?: string | ((defaults: string) => string)
  message?: string | ((defaults: string) => string)
  location?: string | ((defaults: string) => string)
  exits?: string | ((defaults: string) => string)
  quests?: string | ((defaults: string) => string)
  quest?: string | ((defaults: string) => string)
  shop?: string | ((defaults: string) => string)
  goods?: string | ((defaults: string) => string)
  statuses?: string | ((defaults: string) => string)
  status?: string | ((defaults: string) => string)
  unlocks?: string | ((defaults: string) => string)
  unlock?: string | ((defaults: string) => string)
  wardrobe?: string | ((defaults: string) => string)
  debug?: string | ((defaults: string) => string)
  inventory?: string | ((defaults: string) => string)
  title?: string | ((defaults: string) => string)
  viewer?: string | ((defaults: string) => string)
  mods?: string | ((defaults: string) => string)
  page?: string | ((defaults: string) => string)
  sidebar?: string | ((defaults: string) => string)
  story?: string | ((defaults: string) => string)
  overlay?: string | ((defaults: string) => string)
  clock?: string | ((defaults: string) => string)
  section?: string | ((defaults: string) => string)
  'section-title'?: string | ((defaults: string) => string)
  'section-toggle'?: string | ((defaults: string) => string)
  'section-body'?: string | ((defaults: string) => string)
  'section-badge'?: string | ((defaults: string) => string)
  'top-bar'?: string | ((defaults: string) => string)
  'top-bar-title'?: string | ((defaults: string) => string)
  'drawer-button'?: string | ((defaults: string) => string)
  drawer?: string | ((defaults: string) => string)
  'drawer-overlay'?: string | ((defaults: string) => string)
  'stat-label'?: string | ((defaults: string) => string)
  'stat-value'?: string | ((defaults: string) => string)
  'stat-level'?: string | ((defaults: string) => string)
  'stat-progress'?: string | ((defaults: string) => string)
  'stat-bar'?: string | ((defaults: string) => string)
  'stat-pips'?: string | ((defaults: string) => string)
  'stat-pip'?: string | ((defaults: string) => string)
  'scene-transition'?: string | ((defaults: string) => string)
  'scene-header'?: string | ((defaults: string) => string)
  'scene-portrait'?: string | ((defaults: string) => string)
  'scene-title'?: string | ((defaults: string) => string)
  'scene-image'?: string | ((defaults: string) => string)
  beats?: string | ((defaults: string) => string)
  beat?: string | ((defaults: string) => string)
  'speaker-name'?: string | ((defaults: string) => string)
  reveal?: string | ((defaults: string) => string)
  'inline-mail'?: string | ((defaults: string) => string)
  'mail-header'?: string | ((defaults: string) => string)
  'mail-body'?: string | ((defaults: string) => string)
  'inline-prop'?: string | ((defaults: string) => string)
  'inline-mono'?: string | ((defaults: string) => string)
  'voice-replay'?: string | ((defaults: string) => string)
  group?: string | ((defaults: string) => string)
  fold?: string | ((defaults: string) => string)
  'fold-summary'?: string | ((defaults: string) => string)
  'fold-beats'?: string | ((defaults: string) => string)
  change?: string | ((defaults: string) => string)
  'change-text'?: string | ((defaults: string) => string)
  'change-label'?: string | ((defaults: string) => string)
  'inline-action'?: string | ((defaults: string) => string)
  tip?: string | ((defaults: string) => string)
  'tip-content'?: string | ((defaults: string) => string)
  'inline-ui'?: string | ((defaults: string) => string)
  'inline-modal'?: string | ((defaults: string) => string)
  italic?: string | ((defaults: string) => string)
  'picture-layer'?: string | ((defaults: string) => string)
  hotspot?: string | ((defaults: string) => string)
  'hotspot-warning'?: string | ((defaults: string) => string)
  'viewer-open'?: string | ((defaults: string) => string)
  'viewer-close'?: string | ((defaults: string) => string)
  choices?: string | ((defaults: string) => string)
  'choice-key'?: string | ((defaults: string) => string)
  'choice-label'?: string | ((defaults: string) => string)
  'choice-warning'?: string | ((defaults: string) => string)
  'choice-price'?: string | ((defaults: string) => string)
  'choice-irreversible'?: string | ((defaults: string) => string)
  'choice-reason'?: string | ((defaults: string) => string)
  badge?: string | ((defaults: string) => string)
  notices?: string | ((defaults: string) => string)
  'notices-more'?: string | ((defaults: string) => string)
  notice?: string | ((defaults: string) => string)
  'notice-image'?: string | ((defaults: string) => string)
  'notice-title'?: string | ((defaults: string) => string)
  'notice-text'?: string | ((defaults: string) => string)
  'notice-dismiss'?: string | ((defaults: string) => string)
  'notice-strip'?: string | ((defaults: string) => string)
  'notice-strip-item'?: string | ((defaults: string) => string)
  'dice-label'?: string | ((defaults: string) => string)
  'dice-faces'?: string | ((defaults: string) => string)
  'dice-face'?: string | ((defaults: string) => string)
  'dice-plus'?: string | ((defaults: string) => string)
  'dice-total'?: string | ((defaults: string) => string)
  'dice-outcome'?: string | ((defaults: string) => string)
  'dice-critical'?: string | ((defaults: string) => string)
  'dice-overlay'?: string | ((defaults: string) => string)
  'dice-dismiss'?: string | ((defaults: string) => string)
  'timer-label'?: string | ((defaults: string) => string)
  'timer-bar'?: string | ((defaults: string) => string)
  'timer-left'?: string | ((defaults: string) => string)
  'minigame-title'?: string | ((defaults: string) => string)
  'minigame-state'?: string | ((defaults: string) => string)
  'minigame-timer'?: string | ((defaults: string) => string)
  'minigame-inputs'?: string | ((defaults: string) => string)
  'minigame-input'?: string | ((defaults: string) => string)
  menu?: string | ((defaults: string) => string)
  'menu-button'?: string | ((defaults: string) => string)
  dialog?: string | ((defaults: string) => string)
  'dialog-overlay'?: string | ((defaults: string) => string)
  'dialog-title'?: string | ((defaults: string) => string)
  'dialog-close'?: string | ((defaults: string) => string)
  saves?: string | ((defaults: string) => string)
  'saves-actions'?: string | ((defaults: string) => string)
  'save-slot'?: string | ((defaults: string) => string)
  'save-name'?: string | ((defaults: string) => string)
  'save-details'?: string | ((defaults: string) => string)
  'saves-message'?: string | ((defaults: string) => string)
  'saves-blocked'?: string | ((defaults: string) => string)
  'saves-empty'?: string | ((defaults: string) => string)
  'file-button'?: string | ((defaults: string) => string)
  backlog?: string | ((defaults: string) => string)
  'backlog-entry'?: string | ((defaults: string) => string)
  'backlog-title'?: string | ((defaults: string) => string)
  'backlog-choice'?: string | ((defaults: string) => string)
  'backlog-empty'?: string | ((defaults: string) => string)
  mod?: string | ((defaults: string) => string)
  'mod-name'?: string | ((defaults: string) => string)
  'mod-version'?: string | ((defaults: string) => string)
  'mod-state'?: string | ((defaults: string) => string)
  'mod-text'?: string | ((defaults: string) => string)
  'mod-problem'?: string | ((defaults: string) => string)
  'mods-message'?: string | ((defaults: string) => string)
  'mods-empty'?: string | ((defaults: string) => string)
  'mods-restart'?: string | ((defaults: string) => string)
  'mods-changed'?: string | ((defaults: string) => string)
  'inventory-title'?: string | ((defaults: string) => string)
  thing?: string | ((defaults: string) => string)
  'thing-name'?: string | ((defaults: string) => string)
  'thing-count'?: string | ((defaults: string) => string)
  'thing-text'?: string | ((defaults: string) => string)
  'entity-table'?: string | ((defaults: string) => string)
  'entity-heading'?: string | ((defaults: string) => string)
  'entity-columns'?: string | ((defaults: string) => string)
  'entity-column'?: string | ((defaults: string) => string)
  'entity-row'?: string | ((defaults: string) => string)
  'entity-name'?: string | ((defaults: string) => string)
  'entity-image'?: string | ((defaults: string) => string)
  'entity-desc'?: string | ((defaults: string) => string)
  'entity-value'?: string | ((defaults: string) => string)
  'input-label'?: string | ((defaults: string) => string)
  'input-field'?: string | ((defaults: string) => string)
  'input-options'?: string | ((defaults: string) => string)
  'input-submit'?: string | ((defaults: string) => string)
  'input-error'?: string | ((defaults: string) => string)
  'title-page'?: string | ((defaults: string) => string)
  'title-art'?: string | ((defaults: string) => string)
  'title-name'?: string | ((defaults: string) => string)
  'title-subtitle'?: string | ((defaults: string) => string)
  'title-buttons'?: string | ((defaults: string) => string)
  'title-button'?: string | ((defaults: string) => string)
  'page-heading'?: string | ((defaults: string) => string)
  'page-back'?: string | ((defaults: string) => string)
  'settings-page'?: string | ((defaults: string) => string)
  'setting-label'?: string | ((defaults: string) => string)
  'setting-control'?: string | ((defaults: string) => string)
  'setting-value'?: string | ((defaults: string) => string)
  'settings-empty'?: string | ((defaults: string) => string)
  'settings-message'?: string | ((defaults: string) => string)
  'settings-mods'?: string | ((defaults: string) => string)
  'mods-title'?: string | ((defaults: string) => string)
  'mods-hint'?: string | ((defaults: string) => string)
  'load-page'?: string | ((defaults: string) => string)
  'credits-page'?: string | ((defaults: string) => string)
  credits?: string | ((defaults: string) => string)
  credit?: string | ((defaults: string) => string)
  'credit-link'?: string | ((defaults: string) => string)
  'gate-page'?: string | ((defaults: string) => string)
  'gate-title'?: string | ((defaults: string) => string)
  'gate-text'?: string | ((defaults: string) => string)
  'gate-buttons'?: string | ((defaults: string) => string)
  'gate-confirm'?: string | ((defaults: string) => string)
  'gate-decline'?: string | ((defaults: string) => string)
  'achievement-earned'?: string | ((defaults: string) => string)
  'achievement-image'?: string | ((defaults: string) => string)
  'achievement-progress'?: string | ((defaults: string) => string)
  'achievement-progress-text'?: string | ((defaults: string) => string)
  'achievement-text'?: string | ((defaults: string) => string)
  'achievement-title'?: string | ((defaults: string) => string)
  'achievements-button'?: string | ((defaults: string) => string)
  'achievements-count'?: string | ((defaults: string) => string)
  'achievements-empty'?: string | ((defaults: string) => string)
  'achievements-title'?: string | ((defaults: string) => string)
  'achievements-page'?: string | ((defaults: string) => string)
  people?: string | ((defaults: string) => string)
  person?: string | ((defaults: string) => string)
  'person-actions'?: string | ((defaults: string) => string)
  'person-desc'?: string | ((defaults: string) => string)
  'person-name'?: string | ((defaults: string) => string)
  'person-portrait'?: string | ((defaults: string) => string)
  relationship?: string | ((defaults: string) => string)
  'relationship-header'?: string | ((defaults: string) => string)
  'relationship-stats'?: string | ((defaults: string) => string)
  relationships?: string | ((defaults: string) => string)
  'cheat-text'?: string | ((defaults: string) => string)
  'cheat-used'?: string | ((defaults: string) => string)
  'cheats-button'?: string | ((defaults: string) => string)
  'cheats-group'?: string | ((defaults: string) => string)
  'cheats-group-title'?: string | ((defaults: string) => string)
  'debug-error'?: string | ((defaults: string) => string)
  'debug-field'?: string | ((defaults: string) => string)
  'debug-form'?: string | ((defaults: string) => string)
  'debug-header'?: string | ((defaults: string) => string)
  'debug-heading'?: string | ((defaults: string) => string)
  'debug-label'?: string | ((defaults: string) => string)
  'debug-list'?: string | ((defaults: string) => string)
  'debug-log'?: string | ((defaults: string) => string)
  'debug-section'?: string | ((defaults: string) => string)
  'debug-seed'?: string | ((defaults: string) => string)
  'debug-state'?: string | ((defaults: string) => string)
  'debug-title'?: string | ((defaults: string) => string)
  'app-back'?: string | ((defaults: string) => string)
  'app-button'?: string | ((defaults: string) => string)
  'app-entries'?: string | ((defaults: string) => string)
  'app-entry'?: string | ((defaults: string) => string)
  'app-entry-image'?: string | ((defaults: string) => string)
  'app-entry-text'?: string | ((defaults: string) => string)
  'app-entry-title'?: string | ((defaults: string) => string)
  'app-header'?: string | ((defaults: string) => string)
  'app-icon'?: string | ((defaults: string) => string)
  'app-launcher'?: string | ((defaults: string) => string)
  'app-prose'?: string | ((defaults: string) => string)
  'app-title'?: string | ((defaults: string) => string)
  'device-badge'?: string | ((defaults: string) => string)
  'device-button'?: string | ((defaults: string) => string)
  'device-screen'?: string | ((defaults: string) => string)
  'app-badge'?: string | ((defaults: string) => string)
  'post-author'?: string | ((defaults: string) => string)
  'post-comment'?: string | ((defaults: string) => string)
  'post-comment-name'?: string | ((defaults: string) => string)
  'post-image'?: string | ((defaults: string) => string)
  'post-meta'?: string | ((defaults: string) => string)
  'post-portrait'?: string | ((defaults: string) => string)
  'post-text'?: string | ((defaults: string) => string)
  'thing-drop'?: string | ((defaults: string) => string)
  'job-actions'?: string | ((defaults: string) => string)
  'job-details'?: string | ((defaults: string) => string)
  'job-fired'?: string | ((defaults: string) => string)
  'job-next'?: string | ((defaults: string) => string)
  'job-pay'?: string | ((defaults: string) => string)
  'job-rank'?: string | ((defaults: string) => string)
  'job-record'?: string | ((defaults: string) => string)
  'job-shift'?: string | ((defaults: string) => string)
  'job-text'?: string | ((defaults: string) => string)
  'job-title'?: string | ((defaults: string) => string)
  'jobs-title'?: string | ((defaults: string) => string)
  bubble?: string | ((defaults: string) => string)
  conversation?: string | ((defaults: string) => string)
  'conversation-last'?: string | ((defaults: string) => string)
  'conversation-name'?: string | ((defaults: string) => string)
  'conversation-portrait'?: string | ((defaults: string) => string)
  'conversation-unread'?: string | ((defaults: string) => string)
  conversations?: string | ((defaults: string) => string)
  'messages-empty'?: string | ((defaults: string) => string)
  thread?: string | ((defaults: string) => string)
  'thread-back'?: string | ((defaults: string) => string)
  'thread-portrait'?: string | ((defaults: string) => string)
  'thread-title'?: string | ((defaults: string) => string)
  typing?: string | ((defaults: string) => string)
  exit?: string | ((defaults: string) => string)
  'location-name'?: string | ((defaults: string) => string)
  'location-text'?: string | ((defaults: string) => string)
  'location-thing'?: string | ((defaults: string) => string)
  'location-thing-name'?: string | ((defaults: string) => string)
  'location-thing-pick'?: string | ((defaults: string) => string)
  'location-things'?: string | ((defaults: string) => string)
  'quest-done'?: string | ((defaults: string) => string)
  'quest-hint'?: string | ((defaults: string) => string)
  'quest-stage'?: string | ((defaults: string) => string)
  'quest-summary'?: string | ((defaults: string) => string)
  'quest-title'?: string | ((defaults: string) => string)
  'quests-done'?: string | ((defaults: string) => string)
  'quests-title'?: string | ((defaults: string) => string)
  'shop-closed'?: string | ((defaults: string) => string)
  'shop-empty'?: string | ((defaults: string) => string)
  good?: string | ((defaults: string) => string)
  'good-name'?: string | ((defaults: string) => string)
  'good-desc'?: string | ((defaults: string) => string)
  'good-image'?: string | ((defaults: string) => string)
  'good-details'?: string | ((defaults: string) => string)
  'good-off'?: string | ((defaults: string) => string)
  'good-full-price'?: string | ((defaults: string) => string)
  'good-stock'?: string | ((defaults: string) => string)
  'good-owned'?: string | ((defaults: string) => string)
  'good-actions'?: string | ((defaults: string) => string)
  'status-label'?: string | ((defaults: string) => string)
  'status-modifiers'?: string | ((defaults: string) => string)
  'status-stacks'?: string | ((defaults: string) => string)
  'status-summary'?: string | ((defaults: string) => string)
  'status-turns'?: string | ((defaults: string) => string)
  'statuses-title'?: string | ((defaults: string) => string)
  'unlock-form'?: string | ((defaults: string) => string)
  'unlock-input'?: string | ((defaults: string) => string)
  'unlock-name'?: string | ((defaults: string) => string)
  'unlock-problem'?: string | ((defaults: string) => string)
  'unlock-state'?: string | ((defaults: string) => string)
  'unlock-text'?: string | ((defaults: string) => string)
  'unlocks-entered'?: string | ((defaults: string) => string)
  'unlocks-list'?: string | ((defaults: string) => string)
  'unlocks-message'?: string | ((defaults: string) => string)
  'unlocks-title'?: string | ((defaults: string) => string)
  'wardrobe-slot'?: string | ((defaults: string) => string)
  'wardrobe-slot-name'?: string | ((defaults: string) => string)
  'wardrobe-title'?: string | ((defaults: string) => string)
  'wardrobe-worn'?: string | ((defaults: string) => string)
  // …
}
```

Its fields are the keys of `Partial<Record<PartKey, string | ((defaults: string) => string)>>`, so they grow when a game or a plugin adds to those.

## Clock

Const. Explained in [Components](/docs/react/components#clock).

Where the game is in time, as its plugins say (`view.when`): nothing in a game with no calendar. A thin default on `useClock`.

```ts shape
import { Clock } from '@ifloom/react'
const Clock: ComponentType<object>
```

## ClockState

Type. Explained in [Components](/docs/react/components#clockstate).

What `useClock` returns: where the game is in time.

```ts shape
import type { ClockState } from '@ifloom/react'
type ClockState = {
  when: string | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `when` | `string \| null` |  |  | The line the plugins wrote (`view.when`), such as "Day 3 · Wednesday morning", or null when none says. |

## Components

Type. Explained in [Components](/docs/react/components#components).

Replacements for any of the `OverridableComponents`, by name.

```ts shape
import type { Components } from '@ifloom/react'
type Components = {
  Game?: Override<GameProps> | undefined
  Sidebar?: Override<SidebarProps> | undefined
  Story?: Override<StoryProps> | undefined
  Overlay?: Override<{ className?: string; children?: ReactNode; }> | undefined
  Section?: Override<SectionProps> | undefined
  When?: Override<{ condition: Condition; children?: ReactNode; }> | undefined
  Title?: Override<{ className?: string; }> | undefined
  Clock?: Override<object> | undefined
  StatList?: Override<object> | undefined
  RoomActions?: Override<{ className?: string; }> | undefined
  Scene?: Override<{ className?: string; }> | undefined
  Beat?: Override<{ beat: SceneBeat; }> | undefined
  SceneHeader?: Override<{ scene: { id: string | null; key: string; title: string; body: string; beats: SceneBeat[]; fresh: number; tags: string[]; speaker: SpeakerView | null; image: string | null; picture: PictureView | null; choices: RenderedChoice[]; ui?: Ui<SceneUi>; }; }> | undefined
  BeatGroup?: Override<{ section: BlockUi & { readonly [hint: string]: unknown; }; children: ReactNode; }> | undefined
  Fold?: Override<{ label: string; children: ReactNode; }> | undefined
  InlineAction?: Override<{ text: string; choice: RenderedChoice; className?: string; }> | undefined
  Tip?: Override<{ text: string; tip: string; className?: string; }> | undefined
  ChoiceList?: Override<{ choices: RenderedChoice[]; className?: string; part?: 'actions' | 'choices'; }> | undefined
  ChoiceButton?: Override<{ choice: RenderedChoice; className?: string; }> | undefined
  PriceTag?: Override<{ price: Price; className?: string; }> | undefined
  Notices?: Override<{ className?: string; limit?: number; }> | undefined
  Notice?: Override<{ notice: NoticeView; }> | undefined
  NoticeStrip?: Override<{ className?: string; }> | undefined
  MinigameCard?: Override<{ className?: string; }> | undefined
  DiceRoll?: Override<DiceRollProps> | undefined
  DiceOverlay?: Override<{ rolls: readonly Roll[]; className?: string; }> | undefined
  Countdown?: Override<CountdownProps> | undefined
  Timers?: Override<{ className?: string; }> | undefined
  Changes?: Override<{ className?: string; }> | undefined
  ChangeItem?: Override<{ change: ChangeView; }> | undefined
  GameMenu?: Override<{ className?: string; }> | undefined
  SavesMenu?: Override<{ className?: string; onLoaded?: (() => void); }> | undefined
  Backlog?: Override<{ className?: string; }> | undefined
  ModManager?: Override<{ className?: string; }> | undefined
  Inventory?: Override<InventoryProps> | undefined
  PanelHost?: Override<object> | undefined
  EntityTable?: Override<{ kinds?: string[]; className?: string; }> | undefined
  InputFields?: Override<{ className?: string; }> | undefined
  InputField?: Override<{ input: InputView; }> | undefined
  Picture?: Override<ClassAttributes<HTMLImageElement> & ImgHTMLAttributes<HTMLImageElement> & { 'data-part'?: string; }> | undefined
  Video?: Override<VideoProps | (Omit<DetailedHTMLProps<VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>, 'src' | 'poster' | 'autoPlay' | 'loop' | 'muted' | 'controls'> & { src: string; poster?: string; alt?: string; autoplay: boolean; loop: boolean; muted: boolean; controls: boolean; })> | undefined
  LayeredPicture?: Override<{ picture: PictureView; className?: string; }> | undefined
  Hotspot?: Override<{ hotspot: HotspotView; }> | undefined
  MediaViewer?: Override<MediaViewerProps> | undefined
  Icon?: Override<{ name: IconName; label?: string; }> | undefined
  TitlePage?: Override<{ className?: string; }> | undefined
  SettingsPage?: Override<{ className?: string; }> | undefined
  LoadPage?: Override<{ className?: string; }> | undefined
  CreditsPage?: Override<{ className?: string; }> | undefined
  GatePage?: Override<{ className?: string; }> | undefined
  // …
}
```

Plugins add fields of their own to it, which their pages list.

## Countdown

Const. Explained in [Components](/docs/react/components#countdown).

A running timer, by id: its label, a bar that empties as it runs down, and
the seconds left. Marked `data-urgent` with a quarter or less to go. With
motion off, or a player who asks for reduced motion, only the seconds show.
Draws nothing once the timer has run out or stopped.

```ts shape
import { Countdown } from '@ifloom/react'
const Countdown: ComponentType<CountdownProps>
```

## CountdownProps

Type. Explained in [Components](/docs/react/components#countdownprops).

```ts shape
import type { CountdownProps } from '@ifloom/react'
type CountdownProps = {
  timer: string
  label?: boolean
  className?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `timer` | `string` |  |  | The timer's id. Nothing is drawn while it isn't running. |
| `label` | `boolean` | yes |  | Show the timer's `label` above the bar. True if left out. |
| `className` | `string` | yes |  |  |

## Credit

Type. Explained in [Components](/docs/react/components#credit-gateoptions-and-pagedef).

A line of the credits, or a link.

```ts shape
import type { Credit } from '@ifloom/react'
type Credit = string | { label: string; href: string }
```

## CreditsPage

Const. Explained in [Components](/docs/react/components#creditspage).

The credits page: `PagesOptions.credits`, a line each, links opening in a new tab.

```ts shape
import { CreditsPage } from '@ifloom/react'
const CreditsPage: ComponentType<{ className?: string; }>
```

## DefaultLayout

Component. Explained in [Components](/docs/react/components#defaultlayout).

The React UI's own layout, which `GameShell` and `mountGame` draw when you
give them none. The react and next templates start you with a copy of it in
`src/layout.tsx`. Each section hides itself when the game has nothing for
it, so the same layout suits a novel and a town. What the game's plugin UIs
bring goes at each `<Plugins at="…" />`, in the order of its `plugins` list.

```ts shape
import { DefaultLayout } from '@ifloom/react'
function DefaultLayout(): JSX.Element
```

## DiceOverlay

Const. Explained in [Components](/docs/react/components#diceoverlay).

Rolls the story doesn't name, shown for a moment over the scene: those the
last command made that no block's `ui.dice` hint names, such as a roll a
trigger made as the player came in. Each is a `DiceRoll`; the whole is the
`dice-overlay` part, which goes after a few seconds or when the player
dismisses it (`dice-dismiss`). `Scene` draws it.

```ts shape
import { DiceOverlay } from '@ifloom/react'
const DiceOverlay: ComponentType<{ rolls: readonly Roll[]; className?: string; }>
```

## DiceRoll

Const. Explained in [Components](/docs/react/components#diceroll).

One roll the engine made: its dice, tumbling for `DICE_ROLL_MS` and then
settling on the rolled faces, what was added, the total, and with a target,
passed or failed and what it needed. A die on its top face or on 1 is marked,
and so is a critical. Parts: `dice` (with `data-roll`, `data-state`
`rolling` or `settled`, `data-passed` and `data-critical`), `dice-label`,
`dice-faces`, `dice-face`, `dice-plus`, `dice-total`, `dice-outcome` and
`dice-critical`. A screen reader hears the result once the dice settle.

```ts shape
import { DiceRoll } from '@ifloom/react'
const DiceRoll: ComponentType<DiceRollProps>
```

## DiceRollProps

Type. Explained in [Components](/docs/react/components#dicerollprops).

```ts shape
import type { DiceRollProps } from '@ifloom/react'
type DiceRollProps = {
  roll: Roll
  animate?: boolean
  className?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `roll` | `Roll` |  |  | The roll to draw, from `view.rolls`: its dice, each die's face and its total. |
| `animate` | `boolean` | yes |  | Tumble before settling. True if left out; the motion option or a player's reduced-motion setting turns it off whatever this says. |
| `className` | `string` | yes |  |  |

## EntityTable

Const. Explained in [Components](/docs/react/components#entitytable).

The things the game keeps several of (`view.entities`): a table per kind,
one row each, with its picture and description when it has them and the
stats the player can see on it. Only the kinds given, or every listed kind;
nothing at all when they are all empty.

```ts shape
import { EntityTable } from '@ifloom/react'
const EntityTable: ComponentType<{ kinds?: string[]; className?: string; }>
```

## Fold

Const. Explained in [Components](/docs/react/components#fold).

A section with a `ui.fold` hint (what `fold()` writes), inside its
`BeatGroup`: its beats (`children`) in a `fold` part the player opens and
shuts, a `<details>`, under `label` (the hint's words) in a `fold-summary`
part, with the beats in `fold-beats`. Shut to begin with. Replace it in
`components` to draw a fold your own way.

```ts shape
import { Fold } from '@ifloom/react'
const Fold: ComponentType<{ label: string; children: ReactNode; }>
```

## Game

Const. Explained in [Components](/docs/react/components#game).

The page: the root of a layout, inside the game's provider. It draws the
`page` part, a grid with the side column and the story side by side when it
has a `Sidebar` (it then carries `data-has-sidebar`), or one centred column
when it doesn't. With `pages` on, `GameShell` and `mountGame` draw it on
the `game` page, and the title screen, settings and the rest in its place.

```ts shape
import { Game } from '@ifloom/react'
const Game: ComponentType<GameProps>
```

## GameContextValue

Type. Explained in [Components](/docs/react/components#gamecontextvalue).

```ts shape
import type { GameContextValue } from '@ifloom/react'
type GameContextValue = {
  runner: Runner
  mods?: ModsOption
  snapshot: RunnerSnapshot
  view: View
  send: (command: CommandRef) => Result<GameState>
  panels: Record<string, PanelComponent>
  inline: InlineComponents
  sections: Record<string, PluginSectionComponent>
  plugins: readonly PluginUi[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `runner` | `Runner` |  |  | The runner the game was mounted with. |
| `mods` | `ModsOption` | yes |  | The mods option the game was mounted with, for the mods page; undefined for a game without mods. |
| `snapshot` | `RunnerSnapshot` |  |  | Everything the runner gives a UI to draw, as `runner.snapshot()`: the view, settings, backlog, undo, saves and helpers. |
| `view` | `View` |  |  | The view, as `snapshot.view`. |
| `send` | `(command: CommandRef) => Result<GameState>` |  |  | Run a command, a plain one or a plugin's in short as its helpers write it (`shop.buy('counter', 'food:bun')`). Returns what `runner.apply` returned, so a caller can show a refusal. |
| `panels` | `Record<string, PanelComponent>` |  |  | The panels the UI draws by name: the plugin UIs' with the game's own over them. |
| `inline` | `InlineComponents` |  |  | The game's own inline pieces, by name; the built-in ones are in `BUILT_IN_INLINE`. |
| `sections` | `Record<string, PluginSectionComponent>` |  |  | The renderers for plugin sections in apps, by plugin id: the plugin UIs' with the game's own over them. |
| `plugins` | `readonly PluginUi[]` |  |  | The plugin UIs from the provider's `plugins` whose plugin the game has, in that order. |

## GameMenu

Const. Explained in [Components](/docs/react/components#gamemenu).

The player's menu: saves, the backlog, undo and redo — each only if the game
turned it on when it made the runner, mods when the provider has them, and
each plugin UI's `settings` (the unlocks plugin's code box, say) behind a
button of its own. With pages on, it also has Settings (if the game has
any, or mods or a plugin UI's settings, which are there instead) and Title
screen, which switch to those pages. With `keys` on, Escape opens the same
buttons in a dialog.

```ts shape
import { GameMenu } from '@ifloom/react'
const GameMenu: ComponentType<{ className?: string; }>
```

## GameProps

Type. Explained in [Components](/docs/react/components#gameprops).

```ts shape
import type { GameProps } from '@ifloom/react'
type GameProps = {
  className?: string
  children?: ReactNode
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `className` | `string` | yes |  | Classes added to its own. |
| `children` | `ReactNode` | yes |  | The regions: a `Sidebar`, a `Story`, an `Overlay` and whatever else the page has. |

## GameProvider

Component. Explained in [Components](/docs/react/components#gameprovider).

```ts shape
import { GameProvider } from '@ifloom/react'
function GameProvider(props: GameProviderProps): JSX.Element
```

## GameProviderProps

Type. Explained in [Components](/docs/react/components#gameproviderprops).

```ts shape
import type { GameProviderProps } from '@ifloom/react'
type GameProviderProps = {
  components?: Components
  classes?: Classes
  unstyled?: boolean
  viewer?: boolean
  keys?: boolean | KeyOptions
  motion?: boolean
  runner: Runner
  plugins?: readonly PluginUi[]
  panels?: Record<string, PanelComponent>
  inline?: InlineComponents
  sections?: Record<string, PluginSectionComponent>
  mods?: ModsOption
  children: ReactNode
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `components` | `Components` | yes |  | Replacements for built-in components, by name. |
| `classes` | `Classes` | yes |  | Classes for parts, by `data-part` name. |
| `unstyled` | `boolean` | yes |  | Drop every built-in class. The structure and the `data-part`s stay, for your own styles. |
| `viewer` | `boolean` | yes |  | Let the player click a picture or a video in the story to see it large. On if left out. |
| `keys` | `boolean \| KeyOptions` | yes |  | Keyboard shortcuts: 1 to 9 for the choices or buttons on screen, Escape for the menu, and any keys of the game's own in `map`. Off if left out. A minigame's keys work either way. |
| `motion` | `boolean` | yes |  | Play scene transitions and prose reveals (the `ui.transition` and `ui.reveal` hints). On if left out. `false` shows every scene and every line at once. A player whose system asks for reduced motion gets them at once either way. |
| `runner` | `Runner` |  |  | The runner to draw and send commands to, such as `browserRunner(game)` or `createRunner(game)`. |
| `plugins` | `readonly PluginUi[]` | yes |  | The plugin UIs to draw, each from a plugin's `/react` subpath, such as `shopUi` from `@ifloom/plugin-shop/react`. Their panels, words and the rest apply, and the default layout places what they bring, in this order. One for a plugin the game doesn't have does nothing. Leave a plugin out to draw it yourself. |
| `panels` | `Record<string, PanelComponent>` | yes |  | The game's own panels, by the name its scenes, apps and `panel` effects give. An open panel's name here goes over a built-in one. |
| `inline` | `InlineComponents` | yes |  | The game's own components for `[[ui:name\|words\|arg\|…]]` in its prose, by name. One here goes over a built-in one of the same name (`modal`, `image`); a name nothing draws shows its words. |
| `sections` | `Record<string, PluginSectionComponent>` | yes |  | Renderers for plugin sections in apps, by plugin id, over the plugin UIs' (the messages and feed UIs draw theirs). |
| `mods` | `ModsOption` | yes |  | Mods the player can add, turn off or remove. Leave out for a game without mods. |
| `children` | `ReactNode` |  |  |  |

## GameShell

Component. Explained in [The React UI](/docs/react#gameshell).

The whole React UI, and the one root every entry draws (`mountGame` draws
it too): the game's provider (the snapshot, the UI options, the keys and
the clock), the game's sound, its text size, the pages if `pages` is on,
and the layout, `DefaultLayout` unless you give your own. Every part a
layout uses is exported on its own, so a game can build another page
entirely.

```ts shape
import { GameShell } from '@ifloom/react'
function GameShell(props: GameShellProps): JSX.Element
```

## GameShellProps

Type. Explained in [The React UI](/docs/react#gameshellprops).

```ts shape
import type { GameShellProps } from '@ifloom/react'
type GameShellProps = {
  sections?: Record<string, PluginSectionComponent>
  inline?: InlineComponents
  plugins?: readonly PluginUi[]
  components?: Components
  classes?: Classes
  unstyled?: boolean
  viewer?: boolean
  keys?: boolean | KeyOptions
  motion?: boolean
  runner: Runner
  panels?: Record<string, PanelComponent>
  mods?: ModsOption
  layout?: ComponentType
  pages?: boolean | PagesOptions
  audio?: false | AudioOptions
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `sections` | `Record<string, PluginSectionComponent>` | yes |  | Renderers for plugin sections in apps, by plugin id, over the plugin UIs' (the messages and feed UIs draw theirs). |
| `inline` | `InlineComponents` | yes |  | The game's own components for `[[ui:name\|words\|arg\|…]]` in its prose, by name. One here goes over a built-in one of the same name (`modal`, `image`); a name nothing draws shows its words. |
| `plugins` | `readonly PluginUi[]` | yes |  | The plugin UIs to draw, each from a plugin's `/react` subpath, such as `shopUi` from `@ifloom/plugin-shop/react`. Their panels, words and the rest apply, and the default layout places what they bring, in this order. One for a plugin the game doesn't have does nothing. Leave a plugin out to draw it yourself. |
| `components` | `Components` | yes |  | Replacements for built-in components, by name. |
| `classes` | `Classes` | yes |  | Classes for parts, by `data-part` name. |
| `unstyled` | `boolean` | yes |  | Drop every built-in class. The structure and the `data-part`s stay, for your own styles. |
| `viewer` | `boolean` | yes |  | Let the player click a picture or a video in the story to see it large. On if left out. |
| `keys` | `boolean \| KeyOptions` | yes |  | Keyboard shortcuts: 1 to 9 for the choices or buttons on screen, Escape for the menu, and any keys of the game's own in `map`. Off if left out. A minigame's keys work either way. |
| `motion` | `boolean` | yes |  | Play scene transitions and prose reveals (the `ui.transition` and `ui.reveal` hints). On if left out. `false` shows every scene and every line at once. A player whose system asks for reduced motion gets them at once either way. |
| `runner` | `Runner` |  |  | The runner to draw and send commands to, such as `browserRunner(game)` or `createRunner(game)`. |
| `panels` | `Record<string, PanelComponent>` | yes |  | The game's own panels, by the name its scenes, apps and `panel` effects give. An open panel's name here goes over a built-in one. |
| `mods` | `ModsOption` | yes |  | Mods the player can add, turn off or remove. Leave out for a game without mods. |
| `layout` | `ComponentType` | yes |  | The page, as a component: a `Game` with a `Sidebar`, a `Story` and the rest, as in your `src/layout.tsx`, or any component of your own, since `useGame()` and every built-in component work in it. `DefaultLayout` if left out. |
| `pages` | `boolean \| PagesOptions` | yes |  | The title screen and the pages around the game: `true`, or what they show. Off if left out, and the game starts straight away. With them on, the layout is drawn on the `game` page. |
| `audio` | `false \| AudioOptions` | yes |  | Sound, through `@ifloom/audio`. It starts on its own when the game lists any tracks in `game.audio`; `false` turns it off, and an object is passed to `startAudio` as its options. |

## GateOptions

Type. Explained in [Components](/docs/react/components#credit-gateoptions-and-pagedef).

A notice the player confirms once before the title screen. Every word of it is the game's.

```ts shape
import type { GateOptions } from '@ifloom/react'
type GateOptions = {
  title: string
  text: string
  confirm: string
  decline?: { label: string; href?: string }
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `title` | `string` |  |  | The gate's heading. |
| `text` | `string` |  |  | Paragraphs, split on blank lines. |
| `confirm` | `string` |  |  | The button that moves on. |
| `decline` | `{ label: string; href?: string }` | yes |  | A button that doesn't: it goes to `href` if given, otherwise it stays. |

## GatePage

Const. Explained in [Components](/docs/react/components#gatepage).

A notice the player confirms before the title screen, from
`PagesOptions.gate`. Confirming is remembered in the profile's `ui:gate`
namespace, so it shows once per device. Declining goes to its `href`, or
stays.

```ts shape
import { GatePage } from '@ifloom/react'
const GatePage: ComponentType<{ className?: string; }>
```

## Hotspot

Const. Explained in [Components](/docs/react/components#hotspot).

One hotspot on a layered picture: a button over it, placed by its `rect` in
percent. Its `aria-label` is the hotspot's label. A greyed-out one stays in
the tab order with `aria-disabled`, gives its reason in `title` and to a
screen reader, and sends nothing. One with a warning shows the warning icon.

```ts shape
import { Hotspot } from '@ifloom/react'
const Hotspot: ComponentType<{ hotspot: HotspotView; }>
```

## InlineAction

Const. Explained in [Components](/docs/react/components#inlineaction).

An inline action, from `[[act:id|words]]`: the words as an `inline-action`
button that sends the choice's command, with its price after them. Greyed
out, it has `data-disabled` and `aria-disabled` and stays focusable, and a
tap, hover or focus shows the reason in a `tip-content` bubble. A warning
or an irreversible note shows the same way. Inline actions have no number
key: the number keys pick the choices in the list.

```ts shape
import { InlineAction } from '@ifloom/react'
const InlineAction: ComponentType<{ text: string; choice: RenderedChoice; className?: string; }>
```

## InlineComponent

Type. Explained in [Components](/docs/react/components#inlinecomponent-and-inlineprops).

A component that draws an inline piece of the prose named `N`.

```ts shape
import type { InlineComponent } from '@ifloom/react'
type InlineComponent<N extends string = string> = ComponentType<InlineProps<N>>
```

## InlineComponents

Type. Explained in [Components](/docs/react/components#inlinecomponents).

A game's own inline pieces by name, for `[[ui:name|…]]` in its prose. A
name `InlineUi` declares gets its arguments typed; any other name takes them
as text.

```ts shape
import type { InlineComponents } from '@ifloom/react'
type InlineComponents = {
  modal?: InlineComponent<'modal'>
  image?: InlineComponent<'image'>
  mail?: InlineComponent<'mail'>
  prop?: InlineComponent<'prop'>
  mono?: InlineComponent<'mono'>
  // …
}
```

It also takes any other key: `[key: string]: ComponentType<InlineProps<never>> | undefined`.

Its fields are the keys of `{ [N in keyof InlineUi]?: InlineComponent<N> } & { [name: string]: ComponentType<InlineProps<never>> | undefined }`, so they grow when a game or a plugin adds to those.

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `modal` | `InlineComponent<'modal'>` | yes |  | `[[ui:modal\|words\|key]]`: the words open a dialog showing the prose line `key`, titled `title` if given, else the words. |
| `image` | `InlineComponent<'image'>` | yes |  | `[[ui:image\|words\|path]]`: the words open the picture at `path` (resolved as `[[img:…]]` resolves it) in the viewer, described by `alt`. |
| `mail` | `InlineComponent<'mail'>` | yes |  | `[[ui:mail\|body\|From: Ava\|Subject: Hello]]`: a letter or an email, its header lines as written, then the body. A paragraph of its own. |
| `prop` | `InlineComponent<'prop'>` | yes |  | `[[ui:prop\|words\|sticky]]`: a note in the story's world, by its face (`sticky`, `clip` or `diary`). A paragraph of its own. |
| `mono` | `InlineComponent<'mono'>` | yes |  | `[[ui:mono\|words]]`: words in a typewriter face, such as a sign or a screen. |

## InlineImage

Component. Explained in [Components](/docs/react/components#inlineimage).

The built-in `image`, from `[[ui:image|words|path]]` or
`[[ui:image|words|path|alt]]`: the words as an `InlineTrigger` that opens
the picture at `path` in the `MediaViewer`, the lightbox a story's pictures
open in. The path is resolved as `[[img:…]]` resolves it (`art/`, `.jpg` for
a bare name), and `alt` describes it, else the words. Replace it with an
`image` of your own in `inline`.

```ts shape
import { InlineImage } from '@ifloom/react'
function InlineImage(props: InlineProps<'image'>): JSX.Element
```

## InlineMail

Component. Explained in [Components](/docs/react/components#inlinemail).

The built-in `mail`, from `[[ui:mail|body|From: Ava|Subject: Hello]]`: a
letter or an email as a card, an `inline-mail` part, with each header line
as written (a `mail-header` part), then the body (a `mail-body` part).
Written as a paragraph of its own, it draws as one. Replace it with a
`mail` of your own in `inline`.

```ts shape
import { InlineMail } from '@ifloom/react'
function InlineMail(props: InlineProps<'mail'>): JSX.Element
```

## InlineModal

Component. Explained in [Components](/docs/react/components#inlinemodal).

The built-in `modal`, from `[[ui:modal|words|key]]` or
`[[ui:modal|words|key|title]]`: the words as an `InlineTrigger` that opens
a dialog with the prose line `key`, as `proseBeats` gives it for this save, drawn as a
scene's paragraphs are, in an `inline-modal` part. The dialog is titled
`title`, else the words. Escape, the close button or a click outside close
it, and focus goes back to the words. A key with no prose shows the words.
Replace it with a `modal` of your own in `inline`.

```ts shape
import { InlineModal } from '@ifloom/react'
function InlineModal(props: InlineProps<'modal'>): JSX.Element
```

## InlineMono

Component. Explained in [Components](/docs/react/components#inlinemono).

The built-in `mono`, from `[[ui:mono|words]]`: the words in a typewriter face, an `inline-mono` part. Replace it with a `mono` of your own in `inline`.

```ts shape
import { InlineMono } from '@ifloom/react'
function InlineMono(props: InlineProps<'mono'>): JSX.Element
```

## InlineProp

Component. Explained in [Components](/docs/react/components#inlineprop).

The built-in `prop`, from `[[ui:prop|words|face]]`: a note in the story's
world, an `inline-prop` part with `data-face` (`sticky`, `clip`, `diary`, or
whatever face the prose gives). Written as a paragraph of its own, it draws
as one. Replace it with a `prop` of your own in `inline`.

```ts shape
import { InlineProp } from '@ifloom/react'
function InlineProp(props: InlineProps<'prop'>): JSX.Element
```

## InlineProps

Type. Explained in [Components](/docs/react/components#inlinecomponent-and-inlineprops).

What an inline piece of the prose gets, from `[[ui:name|words|arg|…]]`: its
`name`, the `text` to show and the `args` after the words, typed by what
`InlineUi` declares for that name.

```ts shape
import type { InlineProps } from '@ifloom/react'
type InlineProps<N extends string = string> = {
  name: N
  text: string
  args: InlineUiArgs<N>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `name` | `N` |  |  | The piece's name, as `[[ui:name\|…]]` wrote it. |
| `text` | `string` |  |  | Its words, the second part. |
| `args` | `InlineUiArgs<N>` |  |  | The parts after its words, typed by the name's entry in `InlineUi`. |

## InlineTrigger

Component. Explained in [Components](/docs/react/components#inlinetrigger).

The words of an inline piece as a button that opens something over the
page: the part `inline-ui`, with `data-ui` set to the piece's name and
`aria-haspopup="dialog"`. When `open` goes back to false, focus returns to
it. The built-in `modal` and `image` use it, and so can a game's own.

```ts shape
import { InlineTrigger } from '@ifloom/react'
function InlineTrigger(props: { name: string; open: boolean; onOpen: () => void; className?: string; children: ReactNode }): JSX.Element
```

## InputField

Const. Explained in [Components](/docs/react/components#inputfield).

One input: a text box, a number box, or the options to pick from. Shows the engine's refusal if the value won't do.

```ts shape
import { InputField } from '@ifloom/react'
const InputField: ComponentType<{ input: InputView; }>
```

## InputFields

Const. Explained in [Components](/docs/react/components#inputfields).

The inputs on offer while no scene is open (`view.inputs`), such as a
field a room offers. Draws nothing while a scene is open, since `Scene`
draws those itself, or when there are none.

```ts shape
import { InputFields } from '@ifloom/react'
const InputFields: ComponentType<{ className?: string; }>
```

## Inventory

Const. Explained in [Components](/docs/react/components#inventory).

What you carry: the things you hold (`view.held`), each with its count and
a line about it. The inventory plugin's UI draws its own `InventoryCard` in
its place, with a button that uses each thing and, with `drop`, one that
drops it.

```ts shape
import { Inventory } from '@ifloom/react'
const Inventory: ComponentType<InventoryProps>
```

## InventoryProps

Type. Explained in [Components](/docs/react/components#inventoryprops).

```ts shape
import type { InventoryProps } from '@ifloom/react'
type InventoryProps = {
  className?: string
  title?: string | false
  drop?: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `className` | `string` | yes |  |  |
| `title` | `string \| false` | yes |  | Replaces the heading; `false` leaves it out, as under a section's title. |
| `drop` | `boolean` | yes |  | A drop button on each thing, where a plugin's UI draws one, such as the inventory plugin's. The core list has none. |

## KeepPicturesOn

Component. Explained in [Components](/docs/react/components#keeppictureson).

Draws its children's pictures even while the pictures setting is off.

```ts shape
import { KeepPicturesOn } from '@ifloom/react'
function KeepPicturesOn(props: { children: ReactNode }): JSX.Element
```

## KeyOptions

Type. Explained in [Components](/docs/react/components#keyoptions).

What `keys` turns on, when it's an object rather than `true`.

```ts shape
import type { KeyOptions } from '@ifloom/react'
type KeyOptions = {
  map?: Record<string, Command>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `map` | `Record<string, Command>` | yes |  | Keys of the game's own, by `KeyboardEvent.key` (`'m'`, `'F2'`, `' '`): the command each sends. They come before the built-in keys, so mapping `'1'` or `'Escape'` replaces what that key does. |

## LayeredPicture

Const. Explained in [Components](/docs/react/components#layeredpicture).

A layered picture with hotspots: `view.scene.picture`, or a place's
`location.picture`. The layers are stacked bottom first, each filling a box
whose shape is the picture's `aspect`, else the first layer's own, else 16/9.
Pictures go through `Picture` and videos through `Video`. It's drawn even
while the game's pictures setting is off, since its hotspots are play.

```ts shape
import { LayeredPicture } from '@ifloom/react'
const LayeredPicture: ComponentType<{ picture: PictureView; className?: string; }>
```

## LoadPage

Const. Explained in [Components](/docs/react/components#loadpage).

The load page: every save, newest first, to load; any that can't be read, to delete; and importing a save file. Needs the runner made with `saves`.

```ts shape
import { LoadPage } from '@ifloom/react'
const LoadPage: ComponentType<{ className?: string; }>
```

## MediaViewer

Const. Explained in [Components](/docs/react/components#mediaviewer).

A picture or a video from the story, shown large over the page. A `Beat`
opens it when the player clicks its picture or clip; Escape, a click
outside or the close button closes it. Turn it off with `viewer: false`.

```ts shape
import { MediaViewer } from '@ifloom/react'
const MediaViewer: ComponentType<MediaViewerProps>
```

## MediaViewerProps

Type. Explained in [Components](/docs/react/components#mediaviewerprops-and-viewermedia).

```ts shape
import type { MediaViewerProps } from '@ifloom/react'
type MediaViewerProps = {
  media: ViewerMedia
  open: boolean
  onOpenChange: (open: boolean) => void
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `media` | `ViewerMedia` |  |  | The picture or video to show. |
| `open` | `boolean` |  |  | Whether it's showing. |
| `onOpenChange` | `(open: boolean) => void` |  |  | Called with false when the player closes it. |

## MinigameCard

Const. Explained in [Components](/docs/react/components#minigamecard).

The minigame being played: its title, the running state's words, a bar
counting down its timer, and a button for each live input. The keyboard
presses inputs too: the minigame's `keys`, else the arrows and space.
`Scene` draws it in place of the scene while a minigame runs.

```ts shape
import { MinigameCard } from '@ifloom/react'
const MinigameCard: ComponentType<{ className?: string; }>
```

## MinigameControls

Type. Explained in [Components](/docs/react/components#minigamecontrols).

```ts shape
import type { MinigameControls } from '@ifloom/react'
type MinigameControls = {
  minigame: MinigameView | null
  send: (input: string) => ReturnType<Runner['apply']>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `minigame` | `MinigameView \| null` |  |  | The minigame being played, as the view has it, or `null`. |
| `send` | `(input: string) => ReturnType<Runner['apply']>` |  |  | Press one of its inputs. Returns what `apply` returned, so a refusal can be shown. |

## ModManager

Const. Explained in [Components](/docs/react/components#modmanager).

The mod manager: the mods the player has added, each on or off or removed,
and adding one from a file. Mods change the game itself, so a change takes
effect when the game is built again — `onChange` is where the game does that,
usually by reloading the page. Problems the loader found in a mod are listed
under it, and once anything has changed, a line saying a restart applies it
and the button that does. Needs `mods` on the provider. It's in the menu,
and on the settings page when the game has pages. `useMods` is the same
without the look.

```ts shape
import { ModManager } from '@ifloom/react'
const ModManager: ComponentType<{ className?: string; }>
```

## ModsOption

Type. Explained in [Components](/docs/react/components#modsoption).

The game's mods, for the mod manager: the store, what the loader said about them, and how to start over with a change.

```ts shape
import type { ModsOption } from '@ifloom/react'
type ModsOption = {
  store: Mods
  problems?: string[]
  onChange?: () => void
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `store` | `Mods` |  |  | Where the player's mods are kept: `mods(game.id, driver)` from `@ifloom/engine`, over the same driver as the saves. |
| `problems` | `string[]` | yes |  | The loader's problems, as `describeProblem` writes them; the ones starting `mod:<id> ` are shown under that mod. |
| `onChange` | `() => void` | yes |  | Build the game again with the mods as they now are — usually `() => location.reload()`. |

## ModsState

Type. Explained in [Components](/docs/react/components#modsstate).

What `useMods` gives a mod manager.

```ts shape
import type { ModsState } from '@ifloom/react'
type ModsState = {
  available: boolean
  list: InstalledMod[]
  add: (file: File) => Promise<boolean>
  toggle: (id: string) => Promise<void>
  remove: (id: string) => Promise<void>
  changed: boolean
  restart: (() => void) | undefined
  problemsFor: (id: string) => string[]
  message: string | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `available` | `boolean` |  |  | False when the provider was given no `mods`. |
| `list` | `InstalledMod[]` |  |  | The mods the player has added. |
| `add` | `(file: File) => Promise<boolean>` |  |  | Add a mod from a file. True if it was added; otherwise `message` says why. |
| `toggle` | `(id: string) => Promise<void>` |  |  | Turn a mod on or off. |
| `remove` | `(id: string) => Promise<void>` |  |  | Remove a mod. |
| `changed` | `boolean` |  |  | Whether anything changed since the game was built, so a restart would differ. |
| `restart` | `(() => void) \| undefined` |  |  | Build the game again with the mods as they are now: the provider's `onChange`. Undefined if it gave none. |
| `problemsFor` | `(id: string) => string[]` |  |  | The problems the loader found in one mod. |
| `message` | `string \| null` |  |  | Why the last file could not be added, or null. |

## mountGame

Function. Explained in [The React UI](/docs/react#mountgame).

Start a game in the page: a runner with undo, saves and autosave (from
`browserRunner`, so it starts with the player's stored settings), the
whole React UI (`GameShell`, with your `layout`) drawn into `#root`, and
the game's sound playing if it has any. Takes a game, or what `loadGame` returns, whose
problems are logged as warnings. Resolves to the runner once the game is
drawn, for anything the game wants to drive itself.

```ts shape
import { mountGame } from '@ifloom/react'
function mountGame(loaded: Game | { game: Game; problems?: readonly unknown[] }, options?: MountOptions): Promise<Runner>
```

## MountOptions

Type. Explained in [The React UI](/docs/react#mountoptions).

```ts shape
import type { MountOptions } from '@ifloom/react'
type MountOptions = {
  audio?: false | AudioOptions
  sections?: Record<string, PluginSectionComponent>
  inline?: InlineComponents
  plugins?: readonly PluginUi[]
  components?: Components
  classes?: Classes
  unstyled?: boolean
  viewer?: boolean
  keys?: boolean | KeyOptions
  motion?: boolean
  panels?: Record<string, PanelComponent>
  mods?: ModsOption
  layout?: ComponentType
  pages?: boolean | PagesOptions
  root?: string | Element
  start?: GameState
  runner?: RunnerOptions
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `audio` | `false \| AudioOptions` | yes |  | Sound, through `@ifloom/audio`. It starts on its own when the game lists any tracks in `game.audio`; `false` turns it off, and an object is passed to `startAudio` as its options. |
| `sections` | `Record<string, PluginSectionComponent>` | yes |  | Renderers for plugin sections in apps, by plugin id, over the plugin UIs' (the messages and feed UIs draw theirs). |
| `inline` | `InlineComponents` | yes |  | The game's own components for `[[ui:name\|words\|arg\|…]]` in its prose, by name. One here goes over a built-in one of the same name (`modal`, `image`); a name nothing draws shows its words. |
| `plugins` | `readonly PluginUi[]` | yes |  | The plugin UIs to draw, each from a plugin's `/react` subpath, such as `shopUi` from `@ifloom/plugin-shop/react`. Their panels, words and the rest apply, and the default layout places what they bring, in this order. One for a plugin the game doesn't have does nothing. Leave a plugin out to draw it yourself. |
| `components` | `Components` | yes |  | Replacements for built-in components, by name. |
| `classes` | `Classes` | yes |  | Classes for parts, by `data-part` name. |
| `unstyled` | `boolean` | yes |  | Drop every built-in class. The structure and the `data-part`s stay, for your own styles. |
| `viewer` | `boolean` | yes |  | Let the player click a picture or a video in the story to see it large. On if left out. |
| `keys` | `boolean \| KeyOptions` | yes |  | Keyboard shortcuts: 1 to 9 for the choices or buttons on screen, Escape for the menu, and any keys of the game's own in `map`. Off if left out. A minigame's keys work either way. |
| `motion` | `boolean` | yes |  | Play scene transitions and prose reveals (the `ui.transition` and `ui.reveal` hints). On if left out. `false` shows every scene and every line at once. A player whose system asks for reduced motion gets them at once either way. |
| `panels` | `Record<string, PanelComponent>` | yes |  | The game's own panels, by the name its scenes, apps and `panel` effects give. An open panel's name here goes over a built-in one. |
| `mods` | `ModsOption` | yes |  | Mods the player can add, turn off or remove. Leave out for a game without mods. |
| `layout` | `ComponentType` | yes |  | The page, as a component: a `Game` with a `Sidebar`, a `Story` and the rest, as in your `src/layout.tsx`, or any component of your own, since `useGame()` and every built-in component work in it. `DefaultLayout` if left out. |
| `pages` | `boolean \| PagesOptions` | yes |  | The title screen and the pages around the game: `true`, or what they show. Off if left out, and the game starts straight away. With them on, the layout is drawn on the `game` page. |
| `root` | `string \| Element` | yes |  | Where to draw it: an element, or a selector for one. `'#root'` if left out. |
| `start` | `GameState` | yes |  | The state to start from. A new game with a random seed if left out. |
| `runner` | `RunnerOptions` | yes |  | Merged over the defaults: undo 50 deep, saves in localStorage, an autosave each turn. |

## Notice

Const. Explained in [Components](/docs/react/components#notice).

One notice: its picture, title and text, and a button to dismiss it.

```ts shape
import { Notice } from '@ifloom/react'
const Notice: ComponentType<{ notice: NoticeView; }>
```

## Notices

Const. Explained in [Components](/docs/react/components#notices).

Unseen notices, newest first, up to `limit`. The `'notices'` part, in the
layout's overlay by default. On a narrow screen only the newest shows, with
a `notices-more` button ("+2 more") that shows the rest.

```ts shape
import { Notices } from '@ifloom/react'
const Notices: ComponentType<{ className?: string; limit?: number; }>
```

## NoticeStrip

Const. Explained in [Components](/docs/react/components#noticestrip).

What's waiting for the player, as a row of counts: unseen notices, then what
the plugin UIs put at its `strip` spot, such as each app with a badge on the
game's devices. A count is a button that opens where it is: the notices in
a dialog, or the device on that app. Nothing when there's nothing unread. It's the `'notice-strip'` layout part, which no
built-in layout includes.

```ts shape
import { NoticeStrip } from '@ifloom/react'
const NoticeStrip: ComponentType<{ className?: string; }>
```

## Overlay

Const. Explained in [Components](/docs/react/components#overlay).

What floats over the page as it scrolls, and sits after it at the end: the
notices, in the default layout. It sticks to the bottom of the window, so
nothing is left under it. Nothing in it, it takes no room.

```ts shape
import { Overlay } from '@ifloom/react'
const Overlay: ComponentType<{ className?: string; children?: ReactNode; }>
```

## OverridableComponents

Type. Explained in [Components](/docs/react/components#overridablecomponents-and-partnames).

The built-in components a game can replace, by name, each with the props it
takes. A plugin's React UI adds its own by augmenting this interface:

  declare module '@ifloom/react' {
    interface OverridableComponents { ShopCounter: Override&lt;ShopCounterProps> }
  }

```ts shape
import type { OverridableComponents } from '@ifloom/react'
type OverridableComponents = {
  Game: Override<GameProps>
  Sidebar: Override<SidebarProps>
  Story: Override<StoryProps>
  Overlay: Override<{ className?: string; children?: ReactNode; }>
  Section: Override<SectionProps>
  When: Override<{ condition: Condition; children?: ReactNode; }>
  Title: Override<{ className?: string; }>
  Clock: Override<object>
  StatList: Override<object>
  RoomActions: Override<{ className?: string; }>
  Scene: Override<{ className?: string; }>
  Beat: Override<{ beat: SceneBeat; }>
  SceneHeader: Override<{ scene: { id: string | null; key: string; title: string; body: string; beats: SceneBeat[]; fresh: number; tags: string[]; speaker: SpeakerView | null; image: string | null; picture: PictureView | null; choices: RenderedChoice[]; ui?: Ui<SceneUi>; }; }>
  BeatGroup: Override<{ section: BlockUi & { readonly [hint: string]: unknown; }; children: ReactNode; }>
  Fold: Override<{ label: string; children: ReactNode; }>
  InlineAction: Override<{ text: string; choice: RenderedChoice; className?: string; }>
  Tip: Override<{ text: string; tip: string; className?: string; }>
  ChoiceList: Override<{ choices: RenderedChoice[]; className?: string; part?: 'actions' | 'choices'; }>
  ChoiceButton: Override<{ choice: RenderedChoice; className?: string; }>
  PriceTag: Override<{ price: Price; className?: string; }>
  Notices: Override<{ className?: string; limit?: number; }>
  Notice: Override<{ notice: NoticeView; }>
  NoticeStrip: Override<{ className?: string; }>
  MinigameCard: Override<{ className?: string; }>
  DiceRoll: Override<DiceRollProps>
  DiceOverlay: Override<{ rolls: readonly Roll[]; className?: string; }>
  Countdown: Override<CountdownProps>
  Timers: Override<{ className?: string; }>
  Changes: Override<{ className?: string; }>
  ChangeItem: Override<{ change: ChangeView; }>
  GameMenu: Override<{ className?: string; }>
  SavesMenu: Override<{ className?: string; onLoaded?: (() => void); }>
  Backlog: Override<{ className?: string; }>
  ModManager: Override<{ className?: string; }>
  Inventory: Override<InventoryProps>
  PanelHost: Override<object>
  EntityTable: Override<{ kinds?: string[]; className?: string; }>
  InputFields: Override<{ className?: string; }>
  InputField: Override<{ input: InputView; }>
  Picture: Override<ClassAttributes<HTMLImageElement> & ImgHTMLAttributes<HTMLImageElement> & { 'data-part'?: string; }>
  Video: Override<VideoProps | (Omit<DetailedHTMLProps<VideoHTMLAttributes<HTMLVideoElement>, HTMLVideoElement>, 'src' | 'poster' | 'autoPlay' | 'loop' | 'muted' | 'controls'> & { src: string; poster?: string; alt?: string; autoplay: boolean; loop: boolean; muted: boolean; controls: boolean; })>
  LayeredPicture: Override<{ picture: PictureView; className?: string; }>
  Hotspot: Override<{ hotspot: HotspotView; }>
  MediaViewer: Override<MediaViewerProps>
  Icon: Override<{ name: IconName; label?: string; }>
  TitlePage: Override<{ className?: string; }>
  SettingsPage: Override<{ className?: string; }>
  LoadPage: Override<{ className?: string; }>
  CreditsPage: Override<{ className?: string; }>
  GatePage: Override<{ className?: string; }>
  // …
}
```

Plugins add fields of their own to it, which their pages list.

## Page

Type. Explained in [Components](/docs/react/components#page-and-pagestate).

A page by name: a built-in one, or the id of one in `PagesOptions.pages`.

```ts shape
import type { Page } from '@ifloom/react'
type Page = 'gate' | 'title' | 'game' | 'load' | 'settings' | 'credits' | (string & {})
```

## PageDef

Type. Explained in [Components](/docs/react/components#credit-gateoptions-and-pagedef).

A page a game or plugin adds, with the title screen's button for it.

```ts shape
import type { PageDef } from '@ifloom/react'
type PageDef = {
  label: string
  component: ComponentType
  showOnTitle?: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `label` | `string` |  |  | The title screen's button for it. |
| `component` | `ComponentType` |  |  | What it draws. `usePage().back()` leaves it. |
| `showOnTitle` | `boolean` | yes |  | Whether the title screen offers it. On unless set false. |

## PagesOptions

Type. Explained in [Components](/docs/react/components#pagesoptions).

What the title screen and the pages around it show.

```ts shape
import type { PagesOptions } from '@ifloom/react'
type PagesOptions = {
  subtitle?: string
  art?: string
  credits?: Credit[]
  gate?: GateOptions
  pages?: Record<string, PageDef>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `subtitle` | `string` | yes |  | A line under the title. |
| `art` | `string` | yes |  | A picture for the title screen, by its path. |
| `credits` | `Credit[]` | yes |  | Lines and links for the credits page. No Credits button without them. |
| `gate` | `GateOptions` | yes |  | A notice shown before the title screen until the player confirms it. |
| `pages` | `Record<string, PageDef>` | yes |  | Pages the game adds, by id. One with the id of a page a plugin UI adds, such as `achievements`, goes over it. |

## PageState

Type. Explained in [Components](/docs/react/components#page-and-pagestate).

Where the player is among the pages, and how to move.

```ts shape
import type { PageState } from '@ifloom/react'
type PageState = {
  enabled: boolean
  page: Page
  from: Page | null
  go: (page: Page) => void
  back: () => void
  options: PagesOptions
  added: Readonly<Record<string, PageDef>>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `enabled` | `boolean` |  |  | False when the game was mounted without `pages`: the game is all there is. |
| `page` | `Page` |  |  | The page showing. |
| `from` | `Page \| null` |  |  | The page under this one, which `back` returns to; null at the title, the gate or the game. |
| `go` | `(page: Page) => void` |  |  | Show a page. `title`, `game` and `gate` start afresh; any other goes on top of the one showing. |
| `back` | `() => void` |  |  | Return to the page under this one, or the title screen if there is none. |
| `options` | `PagesOptions` |  |  | The options the pages were set up with. |
| `added` | `Readonly<Record<string, PageDef>>` |  |  | Every page added to the built-in ones, by id: the plugin UIs' (`achievements`, say) and the game's own `pages` over them. |

## PanelComponent

Type. Explained in [Components](/docs/react/components#panelcomponent).

A game's own component for a scene panel, an app's panel section or a panel
content opens (`{ panel }`): it gets the data the game's custom panel
returned, or what the panel was opened with.

```ts shape
import type { PanelComponent } from '@ifloom/react'
type PanelComponent = ComponentType<{ data: unknown }>
```

## PanelHost

Const. Explained in [Components](/docs/react/components#panelhost).

Draws the panel content opened (`view.panel`) in a dialog: the game's own
`panels` by its name, else a plugin UI's panel of that name, else one of
`BUILT_IN_PANELS`, with what it was opened with as `data`. Closing the
dialog sends `closePanel`. The default layout has one; a layout of your own
puts it anywhere inside the `GameProvider`.

```ts shape
import { PanelHost } from '@ifloom/react'
const PanelHost: ComponentType<object>
```

## PartKey

Type. Explained in [Components](/docs/react/components#partkey).

A `data-part` name: one of `PART_KEYS`, or one a plugin's UI adds through `PartNames`.

```ts shape
import type { PartKey } from '@ifloom/react'
type PartKey =
  | 'entities'
  | 'actions'
  | 'inputs'
  | 'settings'
  | 'stats'
  | 'timers'
  | 'changes'
  | 'setting'
  | 'stat'
  | 'scene'
  | 'timer'
  | 'button'
  | 'picture'
  | 'video'
  | 'input'
  | 'choice'
  | 'minigame'
  | 'dice'
  | 'bold'
  | 'inventory'
  | 'title'
  | 'viewer'
  | 'mods'
  | 'page'
  | 'sidebar'
  | 'story'
  | 'overlay'
  | 'clock'
  | 'section'
  | 'section-title'
  | 'section-toggle'
  | 'section-body'
  | 'section-badge'
  | 'top-bar'
  | 'top-bar-title'
  | 'drawer-button'
  | 'drawer'
  | 'drawer-overlay'
  | 'stat-label'
  | 'stat-value'
  | 'stat-level'
  | 'stat-progress'
  | 'stat-bar'
  | 'stat-pips'
  | 'stat-pip'
  | 'scene-transition'
  | 'scene-header'
  | 'scene-portrait'
  | 'scene-title'
  | 'scene-image'
  | 'beats'
  | 'beat'
  | 'speaker-name'
  | 'reveal'
  | 'inline-mail'
  | 'mail-header'
  | 'mail-body'
  | 'inline-prop'
  | 'inline-mono'
  | 'voice-replay'
  | 'group'
  | 'fold'
  | 'fold-summary'
  | 'fold-beats'
  | 'change'
  | 'change-text'
  | 'change-label'
  | 'inline-action'
  | 'tip'
  | 'tip-content'
  | 'inline-ui'
  | 'inline-modal'
  | 'italic'
  | 'picture-layer'
  | 'hotspot'
  | 'hotspot-warning'
  | 'viewer-open'
  | 'viewer-close'
  | 'choices'
  | 'choice-key'
  | 'choice-label'
  | 'choice-warning'
  | 'choice-price'
  | 'choice-irreversible'
  | 'choice-reason'
  | 'badge'
  | 'notices'
  | 'notices-more'
  | 'notice'
  | 'notice-image'
  | 'notice-title'
  | 'notice-text'
  | 'notice-dismiss'
  | 'notice-strip'
  | 'notice-strip-item'
  | 'dice-label'
  | 'dice-faces'
  | 'dice-face'
  | 'dice-plus'
  | 'dice-total'
  | 'dice-outcome'
  | 'dice-critical'
  | 'dice-overlay'
  | 'dice-dismiss'
  | 'timer-label'
  | 'timer-bar'
  | 'timer-left'
  | 'minigame-title'
  | 'minigame-state'
  | 'minigame-timer'
  | 'minigame-inputs'
  | 'minigame-input'
  | 'menu'
  | 'menu-button'
  | 'dialog'
  | 'dialog-overlay'
  | 'dialog-title'
  | 'dialog-close'
  | 'saves'
  | 'saves-actions'
  | 'save-slot'
  | 'save-name'
  | 'save-details'
  | 'saves-message'
  | 'saves-blocked'
  | 'saves-empty'
  | 'file-button'
  | 'backlog'
  | 'backlog-entry'
  | 'backlog-title'
  | 'backlog-choice'
  | 'backlog-empty'
  | 'mod'
  | 'mod-name'
  | 'mod-version'
  | 'mod-state'
  | 'mod-text'
  | 'mod-problem'
  | 'mods-message'
  | 'mods-empty'
  | 'mods-restart'
  | 'mods-changed'
  | 'inventory-title'
  | 'thing'
  | 'thing-name'
  | 'thing-count'
  | 'thing-text'
  | 'entity-table'
  | 'entity-heading'
  | 'entity-columns'
  | 'entity-column'
  | 'entity-row'
  | 'entity-name'
  | 'entity-image'
  | 'entity-desc'
  | 'entity-value'
  | 'input-label'
  | 'input-field'
  | 'input-options'
  | 'input-submit'
  | 'input-error'
  | 'title-page'
  | 'title-art'
  | 'title-name'
  | 'title-subtitle'
  | 'title-buttons'
  | 'title-button'
  | 'page-heading'
  | 'page-back'
  | 'settings-page'
  | 'setting-label'
  | 'setting-control'
  | 'setting-value'
  | 'settings-empty'
  | 'settings-message'
  | 'settings-mods'
  | 'mods-title'
  | 'mods-hint'
  | 'load-page'
  | 'credits-page'
  | 'credits'
  | 'credit'
  | 'credit-link'
  | 'gate-page'
  | 'gate-title'
  | 'gate-text'
  | 'gate-buttons'
  | 'gate-confirm'
  | 'gate-decline'
  | Extract<keyof PartNames, string>
```

## PartNames

Type. Explained in [Components](/docs/react/components#overridablecomponents-and-partnames).

The parts a plugin's React UI draws, by name, added by augmenting this
interface so `classes` and `usePart` take them typed:

  declare module '@ifloom/react' {
    interface PartNames { shop: true; good: true }
  }

```ts shape
import type { PartNames } from '@ifloom/react'
type PartNames = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## Picture

Const. Explained in [Components](/docs/react/components#picture).

An image that takes no space if its file is missing (a portrait the game
hasn't drawn yet, art left out of a build) instead of showing a broken icon.
It loads lazily (`loading="lazy"`, `decoding="async"`), so a picture far down
the page waits until the player scrolls near it. It draws nothing while the
game's pictures setting (`ui.settings.images`) is off, except in a layered
picture. Every picture the UI draws goes through it, so replacing it in
`components` changes them all.

```ts shape
import { Picture } from '@ifloom/react'
const Picture: ComponentType<ClassAttributes<HTMLImageElement> & ImgHTMLAttributes<HTMLImageElement> & { 'data-part'?: string; }>
```

## Plugins

Component. Explained in [The React UI](/docs/react#plugins).

What the game's plugin UIs place at one spot of the layout, in the order of
its `plugins` list: nothing for a plugin the game doesn't have. The default
layout has one at each `PluginSpot`; a layout of your own puts them where
it likes, or draws the plugins' components itself. The `room` spot draws
nothing while a minigame runs, since the minigame stands where the room is.

```ts shape
import { Plugins } from '@ifloom/react'
function Plugins(props: { at: PluginSpot }): JSX.Element | null
```

## PluginSectionComponent

Type. Explained in [Components](/docs/react/components#pluginsectioncomponent).

Draws another plugin's view inside an app: a messages channel, a feed. Gets the plugin's slice of the view and the section's `with`.

```ts shape
import type { PluginSectionComponent } from '@ifloom/react'
type PluginSectionComponent = ComponentType<{ data: unknown; with: Record<string, unknown> }>
```

## PluginSpot

Type. Explained in [Plugin UIs and the kit](/docs/react/kit#pluginspot).

Where the layout puts what plugin UIs bring, in the order of the game's
`plugins` list:

- `stats`: inside the side column's Stats section, under the stats.
- `sidebar`: the side column, after the Stats section.
- `room`: the story, after the scene and before the room's actions. Nothing is drawn here while a minigame runs.
- `story`: the end of the story, after the room's actions.
- `strip`: the `NoticeStrip`'s row of counts, after the notices.

```ts shape
import type { PluginSpot } from '@ifloom/react'
type PluginSpot = 'stats' | 'sidebar' | 'room' | 'story' | 'strip'
```

## PriceTag

Const. Explained in [Components](/docs/react/components#pricetag).

What a button costs, as the engine wrote it: the price's `text`, its stats, then plugins' notes ("until evening").

```ts shape
import { PriceTag } from '@ifloom/react'
const PriceTag: ComponentType<{ price: Price; className?: string; }>
```

## Reveal

Type.

How a block of prose is revealed: `delay` milliseconds after the reveal before it (or the scene coming on), coming in with `as`.

```ts shape
import type { Reveal } from '@ifloom/react'
type Reveal = {
  delay?: number
  as?: TransitionName
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `delay` | `number` | yes |  | Milliseconds to wait after the reveal before it, or after the scene comes on. |
| `as` | `TransitionName` | yes |  | How the block comes in. |

## RevealBeat

Type. Explained in [Components](/docs/react/components#revealpoint-revealgroup-and-revealbeat).

One beat of a run, with its index in the scene's beats, and the roll drawn settled before it, if its `ui.dice` names one that isn't new.

```ts shape
import type { RevealBeat } from '@ifloom/react'
type RevealBeat = {
  beat: SceneBeat
  index: number
  roll?: Roll
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `beat` | `SceneBeat` |  |  |  |
| `index` | `number` |  |  | Its index in `view.scene.beats`. |
| `roll` | `Roll` | yes |  | The roll its `ui.dice` names, drawn settled, when it isn't new. |

## RevealGroup

Type. Explained in [Components](/docs/react/components#revealpoint-revealgroup-and-revealbeat).

A run of a scene's beats, and the reveal that holds it back (null for the first, shown with the screen).

```ts shape
import type { RevealGroup } from '@ifloom/react'
type RevealGroup = {
  reveal: RevealPoint | null
  dice?: Roll
  beats: RevealBeat[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `reveal` | `RevealPoint \| null` |  |  | The reveal that holds this run back, or null for the first run, shown with the screen. |
| `dice` | `Roll` | yes |  | A new roll whose dice tumble before this run, which waits for them to settle: the one its first beat's `ui.dice` names. |
| `beats` | `RevealBeat[]` |  |  | The run's beats, in order. |

## RevealPoint

Type. Explained in [Components](/docs/react/components#revealpoint-revealgroup-and-revealbeat).

A reveal as the React UI plays it: where the prose holds back, how long since the run before (`delay`), how it comes in (`as`), and when, from the screen coming on (`at`).

```ts shape
import type { RevealPoint } from '@ifloom/react'
type RevealPoint = {
  delay: number
  as: TransitionName
  at: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `delay` | `number` |  |  | Milliseconds since the run before. |
| `as` | `TransitionName` |  |  | How the run comes in. |
| `at` | `number` |  |  | When it comes, in milliseconds from the screen coming on. |

## RoomActions

Const. Explained in [Components](/docs/react/components#roomactions).

The buttons offered while no scene is open: the game's own and its plugins', such as a place's things to do.

```ts shape
import { RoomActions } from '@ifloom/react'
const RoomActions: ComponentType<{ className?: string; }>
```

## SavesMenu

Const. Explained in [Components](/docs/react/components#savesmenu).

The save and load menu: every slot newest first, to load, overwrite, delete
or export as a file; a save that can't be read, to delete; a new slot; and importing a file a player kept.
While the game's `saveable` refuses saving, the Save buttons are greyed out with the reason. Needs
the runner made with `saves`. Says plainly when a save was made with packs or
plugins this game doesn't have. `useSaves` is the same without the look.

```ts shape
import { SavesMenu } from '@ifloom/react'
const SavesMenu: ComponentType<{ className?: string; onLoaded?: (() => void); }>
```

## SavesState

Type. Explained in [Components](/docs/react/components#savesstate).

What `useSaves` gives a save menu.

```ts shape
import type { SavesState } from '@ifloom/react'
type SavesState = {
  available: boolean
  saving: SavingView
  slots: SaveMeta[]
  broken: BrokenSave[]
  save: (name?: string) => Promise<boolean>
  overwrite: (slot: string) => Promise<boolean>
  load: (slot: string) => Promise<boolean>
  remove: (slot: string) => Promise<void>
  exportFile: (slot: string) => Promise<void>
  importFile: (file: File) => Promise<boolean>
  message: string | null
  missingPacks: string[]
  missingPlugins: string[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `available` | `boolean` |  |  | False when the runner was made without `saves`: there is nothing to list. |
| `saving` | `SavingView` |  |  | Whether the game lets the player save now, and why not: `view.saving`. Loading is always allowed. |
| `slots` | `SaveMeta[]` |  |  | Every save that can be read, newest first, as the runner's snapshot lists them. |
| `broken` | `BrokenSave[]` |  |  | Saves that are there but can't be read, with why. They can only be deleted. |
| `save` | `(name?: string) => Promise<boolean>` |  |  | Save in a new slot (the next free number), with the player's `name` for it if given. True if it was written. |
| `overwrite` | `(slot: string) => Promise<boolean>` |  |  | Save over an existing slot. True if it was written. |
| `load` | `(slot: string) => Promise<boolean>` |  |  | Load a slot. True if it loaded. |
| `remove` | `(slot: string) => Promise<void>` |  |  | Delete a slot. |
| `exportFile` | `(slot: string) => Promise<void>` |  |  | Download a slot as a `.json` file the player can keep. |
| `importFile` | `(file: File) => Promise<boolean>` |  |  | Load a save from a file the player kept. True if it loaded. |
| `message` | `string \| null` |  |  | Why the last save, load or import failed, or null. |
| `missingPacks` | `string[]` |  |  | Packs the last loaded save was made with that this game doesn't have. |
| `missingPlugins` | `string[]` |  |  | Plugins the last loaded save was made with that this game doesn't have. |

## Say

Type. Explained in [Components](/docs/react/components#uistringkey-words-and-say).

How a component says a word: by its key, with `{name}` filled from `vars`.

```ts shape
import type { Say } from '@ifloom/react'
type Say<K extends string = UiStringKey> = (key: K, vars?: Record<string, string | number>) => string
```

## Scene

Const. Explained in [Components](/docs/react/components#scene).

The main column: the scene on screen, or the room when none is. Its picture (the
`LayeredPicture` when the scene has one, else its `image`), its body, then
either the game's own panel for it or its choices. While a minigame runs, it
draws that instead: the game's panel named by the minigame's id, else
`MinigameCard`.

It plays the content's `ui.transition` hints when the screen (`view.scene.key`)
changes, in a `scene-transition` part that keeps a copy of the scene before
for its `out`, and reveals each block with a `ui.reveal` hint in a `reveal`
part, with the choices after the last. A click on the scene or a key press
shows the rest at once. The `motion` option, or the player's reduced-motion
setting, turns all of it off. A speaker with a `ui.hue` gets their lines in
that colour. The timing is `useScene`'s; the heading is `SceneHeader`.

Dice: a block with a `ui.dice` hint gets the `DiceRoll` of the roll the last
command made under that key, drawn before it, and a new roll's block waits
for its dice to settle. New rolls no block names show for a moment in a
`DiceOverlay`.

Timers: a block with a `ui.timer` hint gets a `Countdown` of that timer
after it, while it runs.

Groups: the beats of a section with any ui hint are drawn together in a
`BeatGroup`, and a section with a `ui.fold` hint (what `fold()` writes) has
its beats in a `Fold` inside its group. Replace either, or `SceneHeader`,
in `components` to restyle that part and keep the motion.

Inputs: the inputs on offer while the scene is open (`view.inputs`) are
drawn after its words and before its choices, as `InputField`s in an
`inputs` part. The layout's `InputFields` draws only those on offer while
no scene is open.

```ts shape
import { Scene } from '@ifloom/react'
const Scene: ComponentType<{ className?: string; }>
```

## SceneHeader

Const. Explained in [Components](/docs/react/components#sceneheader).

The scene's heading: the speaker's portrait, when the scene has a speaker
with a picture (`scene-portrait`), and its title (`scene-title`), in a
`scene-header` part. Gets `scene`, as `view.scene`. Replace it in
`components` to draw the heading your own way; it comes in with the scene.

```ts shape
import { SceneHeader } from '@ifloom/react'
const SceneHeader: ComponentType<{ scene: { id: string | null; key: string; title: string; body: string; beats: SceneBeat[]; fresh: number; tags: string[]; speaker: SpeakerView | null; image: string | null; picture: PictureView | null; choices: RenderedChoice[]; ui?: Ui<SceneUi>; }; }>
```

## SceneRolls

Type. Explained in [Components](/docs/react/components#scenerolls).

The rolls on screen: all the last command made, the new ones that tumble, and `at`, which counts each new set.

```ts shape
import type { SceneRolls } from '@ifloom/react'
type SceneRolls = {
  all: readonly Roll[]
  fresh: readonly Roll[]
  at: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `all` | `readonly Roll[]` |  |  | The rolls the last command made: `view.rolls`. |
| `fresh` | `readonly Roll[]` |  |  | The rolls the command that led here made, whose dice tumble. Empty for a screen that wasn't new. |
| `at` | `number` |  |  | A count that moves on with each new set of rolls: key the dice by it, so a new set tumbles again. |

## SceneTiming

Type. Explained in [Components](/docs/react/components#scenetiming).

Everything `Scene` works out before it draws: see `useScene`.

```ts shape
import type { SceneTiming } from '@ifloom/react'
type SceneTiming = {
  view: View
  motion: boolean
  transition: ScreenTransition
  leave: { out?: TransitionName; ms?: number }
  groups: RevealGroup[]
  last: number
  pending: boolean
  revealed: boolean
  skip: () => void
  rolls: SceneRolls
  unnamed: readonly Roll[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `view` | `View` |  |  | The view drawn. |
| `motion` | `boolean` |  |  | Whether transitions, reveals and tumbling dice play: the `motion` option, unless the player asks for reduced motion. |
| `transition` | `ScreenTransition` |  |  | How this screen comes in and goes out. `key` is `view.scene.key`: key the screen's element by it. |
| `leave` | `{ out?: TransitionName; ms?: number }` |  |  | How the screen before goes, when the choice that led here says (its `out` and `ms`), over that screen's own. |
| `groups` | `RevealGroup[]` |  |  | The scene's beats in runs: those shown with the screen, then each that waits for a reveal or for dice. Empty while a minigame runs. |
| `last` | `number` |  |  | When the last run comes, in milliseconds from the screen coming on; 0 with none. The choices come with it. |
| `pending` | `boolean` |  |  | Whether runs are still to come: until then the choices can't be pressed, and a click or a key calls `skip`. |
| `revealed` | `boolean` |  |  | Whether the player skipped the wait, or every run came in. Dice drawn after it show settled. |
| `skip` | `() => void` |  |  | Show everything at once. |
| `rolls` | `SceneRolls` |  |  | The rolls on screen. |
| `unnamed` | `readonly Roll[]` |  |  | New rolls that no beat on screen names, for a moment over the scene (`DiceOverlay`). |

## ScreenTransition

Type. Explained in [Components](/docs/react/components#screentransition).

The screen on show, and how it comes in and goes out.

```ts shape
import type { ScreenTransition } from '@ifloom/react'
type ScreenTransition = {
  key: string
  in: TransitionName
  out: TransitionName
  ms: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `key` | `string` |  |  | `view.scene.key`: key the screen's element by it, so a new screen is a new element. |
| `in` | `TransitionName` |  |  | How this screen comes in. |
| `out` | `TransitionName` |  |  | How it goes out. |
| `ms` | `number` |  |  | How long each takes, in milliseconds. |

## Section

Const. Explained in [Components](/docs/react/components#section).

A titled part of a layout, in the side column or the story. It hides itself
when its children draw nothing (the plugin isn't there, the list is empty).

- `collapsible` folds it in place with a button on its title. Each player's
  choice is remembered per `id` in the profile's `ui:sections`.
- `dialog` draws its title, with `badge` if given, as a button that opens
  the children in a dialog, looking as a folding section's title does
  with its chevron pointing out.
- `when` shows it only while a condition holds.

```ts shape
import { Section } from '@ifloom/react'
const Section: ComponentType<SectionProps>
```

## SectionProps

Type. Explained in [Components](/docs/react/components#sectionprops).

```ts shape
import type { SectionProps } from '@ifloom/react'
type SectionProps = {
  id: string
  title: string
  collapsible?: boolean
  dialog?: boolean
  open?: boolean
  when?: Condition
  badge?: ReactNode
  className?: string
  children?: ReactNode
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | What it's called for the profile: the open or folded state is kept under it. |
| `title` | `string` |  |  | Its heading, as the player reads it. |
| `collapsible` | `boolean` | yes |  | Fold in place with a button on its title. The player's choice is remembered. |
| `dialog` | `boolean` | yes |  | Draw a button that opens the children in a dialog, instead of the children. |
| `open` | `boolean` | yes |  | Open at first, for a folding section: true if left out. The player's last choice wins. |
| `when` | `Condition` | yes |  | Only while this condition holds, such as `{ 'places/at': { location: 'home' } }`. |
| `badge` | `ReactNode` | yes |  | Something small after the title: a count, a "new". |
| `className` | `string` | yes |  |  |
| `children` | `ReactNode` | yes |  |  |

## SettingsPage

Const. Explained in [Components](/docs/react/components#settingspage).

The settings page, drawn from `view.settings`: a checkbox for a toggle,
radio buttons for a choice, a slider for a range. Each change goes through
`runner.setSetting`: a ui setting is written to the profile, and a play
setting changes the game in play and is kept in the profile for the next
new game. A refusal is shown under the list. Each plugin UI's `settings`
follow, such as the unlocks plugin's code box, and with `mods`,
a Mods section holding the `ModManager`.

```ts shape
import { SettingsPage } from '@ifloom/react'
const SettingsPage: ComponentType<{ className?: string; }>
```

## Sidebar

Const. Explained in [Components](/docs/react/components#sidebar).

The side column, with what you put in it. Below Tailwind's `md` (48rem) it
becomes a drawer: a slim `top-bar` with the game's title, the clock and a
`drawer-button` that slides the column in as a `drawer` (a dialog: focus
stays in it, and Escape closes it). The drawer closes after the player
picks something, unless a dialog it opened is still open.

```ts shape
import { Sidebar } from '@ifloom/react'
const Sidebar: ComponentType<SidebarProps>
```

## SidebarProps

Type. Explained in [Components](/docs/react/components#sidebarprops).

```ts shape
import type { SidebarProps } from '@ifloom/react'
type SidebarProps = {
  className?: string
  children?: ReactNode
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `className` | `string` | yes |  | Classes added to its own. |
| `children` | `ReactNode` | yes |  | What the sidebar holds: sections, stats, plugins' spots. |

## StatDisplay

Type. Explained in [Presentation hints](/docs/react/hints#statdisplay).

How the sidebar draws a stat: its number, a bar from `min` to `max`, or pips, one per point.

```ts shape
import type { StatDisplay } from '@ifloom/react'
type StatDisplay = 'number' | 'bar' | 'pips'
```

## StatGauge

Component. Explained in [Plugin UIs and the kit](/docs/react/kit#statgauge).

A stat's value as a bar from its `min` to its `max`, or as pips, one per
point, in rows of ten at most and of equal length, by its `ui.display`
hint: the `<dd>` `StatList` draws under a stat. The row's length is the
`--pips-per-row` custom property on the `stat-pips` part.
A plugin's UI that lists stats of its own draws it too.

```ts shape
import { StatGauge } from '@ifloom/react'
function StatGauge(props: { stat: StatView }): JSX.Element
```

## StatList

Const. Explained in [Components](/docs/react/components#statlist).

The stats the game lists, with their values written as the game formats them.
A stat with levels also shows its level and a bar towards the next one. A
stat whose `ui.display` hint is `'bar'` gets a bar from its `min` to its
`max` under it, and one with `'pips'` a row of pips, one per point (a bar
past 20).

```ts shape
import { StatList } from '@ifloom/react'
const StatList: ComponentType<object>
```

## Story

Const. Explained in [Components](/docs/react/components#story).

The main column, with what you put in it: the scene, then the bottom area
(exits, the room's actions, the people here) in the default layout. It
fills the width the side column leaves. The scene's title, prose, choices,
inputs, exits and the people here keep to `--width-prose`, a reading column
centred in the story unless `align` or `--margin-prose` says otherwise;
pictures and panels keep the whole width.

```ts shape
import { Story } from '@ifloom/react'
const Story: ComponentType<StoryProps>
```

## StoryProps

Type. Explained in [Components](/docs/react/components#storyprops).

```ts shape
import type { StoryProps } from '@ifloom/react'
type StoryProps = {
  align?: 'center' | 'start'
  className?: string
  children?: ReactNode
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `align` | `'center' \| 'start'` | yes |  | Where the reading column sits when the story is wider than `--width-prose`: `'center'` or `'start'`. Left out, the `--margin-prose` token decides, which centres it unless a preset or the game's stylesheet says otherwise. |
| `className` | `string` | yes |  |  |
| `children` | `ReactNode` | yes |  |  |

## StyleOptions

Type. Explained in [Components](/docs/react/components#styleoptions).

How the UI looks: the components it draws and the classes on its parts. Part of `UiOptions`.

```ts shape
import type { StyleOptions } from '@ifloom/react'
type StyleOptions = {
  components?: Components
  classes?: Classes
  unstyled?: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `components` | `Components` | yes |  | Replacements for built-in components, by name. |
| `classes` | `Classes` | yes |  | Classes for parts, by `data-part` name. |
| `unstyled` | `boolean` | yes |  | Drop every built-in class. The structure and the `data-part`s stay, for your own styles. |

## TEXT_SIZES

Const. Explained in [Presentation hints](/docs/react/hints#text_sizes).

The text sizes the React UI's styles size the page for, from `ui.settings.textSize`. Another value needs CSS of the game's own.

```ts shape
import { TEXT_SIZES } from '@ifloom/react'
const TEXT_SIZES: readonly ['small', 'normal', 'large', 'larger']
```

## TextSize

Function. Explained in [Components](/docs/react/components#textsize).

Copies the setting the game names in `ui.settings.textSize` to
`data-text-size` on `<html>`, now and whenever it changes, so the page is
sized from its root on every page, the title's included. Draws nothing.
`GameShell` has one.

```ts shape
import { TextSize } from '@ifloom/react'
function TextSize(): null
```

## Timers

Const. Explained in [Components](/docs/react/components#timers).

Every running timer's `Countdown`, in the order they started. Nothing while none runs.

```ts shape
import { Timers } from '@ifloom/react'
const Timers: ComponentType<{ className?: string; }>
```

## Tip

Const. Explained in [Components](/docs/react/components#tip).

A tooltip in the prose, from `[[tip:key|words]]`: the words as a `tip`
button, and the note in a `tip-content` bubble, shown on hover, keyboard
focus or a tap, and read as the button's description.

```ts shape
import { Tip } from '@ifloom/react'
const Tip: ComponentType<{ text: string; tip: string; className?: string; }>
```

## Title

Const. Explained in [Components](/docs/react/components#title).

The game's title. `Clock` is where it is in time.

```ts shape
import { Title } from '@ifloom/react'
const Title: ComponentType<{ className?: string; }>
```

## TitlePage

Const. Explained in [Components](/docs/react/components#titlepage).

The title screen: the game's title, the subtitle and art if given, and the
buttons Continue (the newest save), New game, New Game+ (once the game has
been finished, if it carries anything over), Load, Settings (if the game has
any), the pages the plugin UIs and the game add (the achievements plugin's
Achievements, say), and Credits (if given).

```ts shape
import { TitlePage } from '@ifloom/react'
const TitlePage: ComponentType<{ className?: string; }>
```

## Transition

Type. Explained in [Presentation hints](/docs/react/hints#transition-1).

How something comes on screen (`in`) and goes off it (`out`), over `ms` milliseconds each. A name on its own means both.

```ts shape
import type { Transition } from '@ifloom/react'
type Transition = {
  in?: TransitionName
  out?: TransitionName
  ms?: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `in` | `TransitionName` | yes |  | How the new screen comes in. |
| `out` | `TransitionName` | yes |  | How the screen before goes out. |
| `ms` | `number` | yes |  | How long each takes, in milliseconds. |

## TransitionName

Type. Explained in [Presentation hints](/docs/react/hints#transitionname).

A transition by name: one of `TRANSITIONS`, or one the game adds.

```ts shape
import type { TransitionName } from '@ifloom/react'
type TransitionName = (typeof TRANSITIONS)[number] | (string & {})
```

## TRANSITIONS

Const.

The transitions the React UI's styles draw. A game can add its own names in `game.ui.transitionNames`, with CSS of its own.

```ts shape
import { TRANSITIONS } from '@ifloom/react'
const TRANSITIONS: readonly ['fade', 'slide-up', 'slide-left', 'zoom', 'none']
```

## UiOptions

Type. Explained in [Components](/docs/react/components#uioptions).

What a game passes to make the UI its own: how it looks and how it behaves. `GameProvider`, `GameShell` and `mountGame` all take these.

```ts shape
import type { UiOptions } from '@ifloom/react'
type UiOptions = {
  components?: Components
  classes?: Classes
  unstyled?: boolean
  viewer?: boolean
  keys?: boolean | KeyOptions
  motion?: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `components` | `Components` | yes |  | Replacements for built-in components, by name. |
| `classes` | `Classes` | yes |  | Classes for parts, by `data-part` name. |
| `unstyled` | `boolean` | yes |  | Drop every built-in class. The structure and the `data-part`s stay, for your own styles. |
| `viewer` | `boolean` | yes |  | Let the player click a picture or a video in the story to see it large. On if left out. |
| `keys` | `boolean \| KeyOptions` | yes |  | Keyboard shortcuts: 1 to 9 for the choices or buttons on screen, Escape for the menu, and any keys of the game's own in `map`. Off if left out. A minigame's keys work either way. |
| `motion` | `boolean` | yes |  | Play scene transitions and prose reveals (the `ui.transition` and `ui.reveal` hints). On if left out. `false` shows every scene and every line at once. A player whose system asks for reduced motion gets them at once either way. |

## UiProvider

Component. Explained in [Components](/docs/react/components#uiprovider).

Gives the components below it a game's `components`, `classes`, `unstyled`, `viewer`, `keys` and `motion`. `GameProvider` uses it.

```ts shape
import { UiProvider } from '@ifloom/react'
function UiProvider(props: UiOptions & { children: ReactNode }): JSX.Element
```

## UiStringKey

Type. Explained in [Components](/docs/react/components#uistringkey-words-and-say).

```ts shape
import type { UiStringKey } from '@ifloom/react'
type UiStringKey =
  | 'settings'
  | 'stats'
  | 'changes'
  | 'chose'
  | 'close'
  | 'remove'
  | 'newGame'
  | 'dismiss'
  | 'inventory'
  | 'noSaves'
  | 'mods'
  | 'notices'
  | 'menu'
  | 'saves'
  | 'backlog'
  | 'credits'
  | 'zoom'
  | 'load'
  | 'statLevel'
  | 'statProgress'
  | 'allSeen'
  | 'back'
  | 'undo'
  | 'redo'
  | 'save'
  | 'saveNew'
  | 'exportSave'
  | 'importSave'
  | 'brokenSave'
  | 'missingPacks'
  | 'missingPlugins'
  | 'backlogEmpty'
  | 'enter'
  | 'addMod'
  | 'noMods'
  | 'modOn'
  | 'modOff'
  | 'applyMods'
  | 'modsHint'
  | 'modsChanged'
  | 'heldCount'
  | 'continue'
  | 'newGamePlus'
  | 'noSettings'
  | 'titlePage'
  | 'replayVoice'
  | 'closeViewer'
  | 'openSidebar'
  | 'timeLeft'
  | 'timerLeft'
  | 'diceNeeds'
  | 'dicePassed'
  | 'diceFailed'
  | 'diceCriticalMax'
  | 'diceCriticalMin'
  | 'diceRolled'
  | 'diceRolledPassed'
  | 'diceRolledFailed'
  | 'diceDismiss'
  | 'noticesMore'
  | 'noticesFewer'
  | 'unread'
```

## useAudio

Function. Explained in [Components](/docs/react/components#useaudio).

Play the game's sound while the component is mounted, with `@ifloom/audio`.
Inside a `GameProvider` it plays that game; outside, pass `runner`. Returns
the player once it has started. `GameShell` and `mountGame` play the
game's sound themselves; a `useAudio` beside them takes over from theirs,
with its options, so the sound never plays twice.

```ts shape
import { useAudio } from '@ifloom/react'
function useAudio(options?: AudioOptions & { runner?: Runner }): AudioPlayer | null
```

## useBacklog

Function. Explained in [Components](/docs/react/components#usebacklog).

The backlog's entries, oldest first, as the runner's snapshot has them. Empty unless the runner's backlog is on.

```ts shape
import { useBacklog } from '@ifloom/react'
function useBacklog(): readonly BacklogEntry[]
```

## useClock

Function. Explained in [Components](/docs/react/components#useclock).

Where the game is in time, as the plugins' `label`s write it. `Clock` is drawn from it; the calendar plugin's UI has its parts (`useCalendar`).

```ts shape
import { useClock } from '@ifloom/react'
function useClock(): ClockState
```

## useGame

Function. Explained in [Components](/docs/react/components#usegame).

The runner, its snapshot, the current view and `send`. Only inside a `GameProvider`.

```ts shape
import { useGame } from '@ifloom/react'
function useGame(): GameContextValue
```

## useHolds

Function. Explained in [Components](/docs/react/components#useholds).

Whether a condition holds now, against the state on show: any condition
content can write, `{ 'places/at': { location: 'home' } }` say. It only
reads, so saves and replays are as they were.

An escape hatch for a layout: the view already says what the player can
see, so reach for it only to place a part of your own by a condition the
view has no field for, as `Section`'s `when` and `When` do. What the story
shows belongs in content, where the engine checks it.

```ts shape
import { useHolds } from '@ifloom/react'
function useHolds(condition: Condition | undefined): boolean
```

## useMinigame

Function. Explained in [Components](/docs/react/components#useminigame).

The minigame being played, and a way to press its inputs. Its timers run
on the game's clock, which `GameProvider` runs. With `keys: true` it also
maps the keyboard to the inputs, as `MinigameCard` does.

```ts shape
import { useMinigame } from '@ifloom/react'
function useMinigame(options?: { keys?: boolean }): MinigameControls
```

## useMods

Function. Explained in [Components](/docs/react/components#usemods).

The mod manager without the look: the list, adding, toggling and removing, and restarting. Needs `mods` on the provider.

```ts shape
import { useMods } from '@ifloom/react'
function useMods(): ModsState
```

## useMotion

Function. Explained in [Components](/docs/react/components#usemotion).

Whether to play transitions and reveals: the `motion` option, unless the player asks for reduced motion.

```ts shape
import { useMotion } from '@ifloom/react'
function useMotion(): boolean
```

## usePage

Function. Explained in [Components](/docs/react/components#usepage).

Where the player is among the pages. Outside pages (`pages` off), `enabled` is false and the page is always `game`.

```ts shape
import { usePage } from '@ifloom/react'
function usePage(): PageState
```

## usePart

Function. Explained in [Components](/docs/react/components#usepart).

The attributes for one part: its `data-part` and its classes. `defaults` are
the built-in classes; `extra` is a `className` a caller passed, added last.

```ts shape
import { usePart } from '@ifloom/react'
function usePart(name: PartKey, defaults: string, extra?: string): { 'data-part': PartKey; className: string }
```

## usePicturesShown

Function. Explained in [Components](/docs/react/components#usepicturesshown).

Whether pictures are drawn here: false only while the setting the game names
in `ui.settings.images` is off. True outside a game, in a game that names
none, and inside a layered picture.

```ts shape
import { usePicturesShown } from '@ifloom/react'
function usePicturesShown(): boolean
```

## usePluginUis

Function. Explained in [Plugin UIs and the kit](/docs/react/kit#usepluginuis).

The plugin UIs the game in context has, in the order of its `plugins` list.

```ts shape
import { usePluginUis } from '@ifloom/react'
function usePluginUis(): readonly PluginUi[]
```

## useProfile

Function. Explained in [Components](/docs/react/components#useprofile).

What the profile holds in a namespace, kept up to date as it changes. Undefined without a profile or before the first read.

```ts shape
import { useProfile } from '@ifloom/react'
function useProfile<T = unknown>(namespace: string): T | undefined
```

## useReducedMotion

Function.

Whether the player's system asks for reduced motion. Follows the setting as it changes.

```ts shape
import { useReducedMotion } from '@ifloom/react'
function useReducedMotion(): boolean
```

## useSaves

Function. Explained in [Components](/docs/react/components#usesaves).

The save menu without the menu: the slots, and saving, loading, deleting,
exporting and importing them. Needs the runner made with `saves`.

```ts shape
import { useSaves } from '@ifloom/react'
function useSaves(): SavesState
```

## useScene

Function. Explained in [Components](/docs/react/components#usescene).

The scene's timing and state, with nothing drawn: what `Scene` draws from.
Use it in a scene of your own to keep the React UI's motion.

- The transition: the screen's `ui.transition` over the game's, with the
  choice that led here (the runner's `snapshot.pressed`) deciding how it
  comes in and, with an `out`, how the screen before goes.
- The runs: the beats shown with the screen, then each block with a
  `ui.reveal`, or a `ui.dice` naming a roll the last command just made,
  and the beats after it, each with when it comes.
- The wait: `pending` until the player clicks or presses a key (the first
  key press after a screen comes on calls `skip`, and does nothing else),
  or until the last run has come in.
- The dice: new rolls (`rolls.fresh`) tumble before their run; any other
  roll a beat names is on its `roll`, drawn settled; new rolls no beat
  names are `unnamed`.

With motion off, nothing waits: `pending` is false and every roll is settled.

```ts shape
import { useScene } from '@ifloom/react'
function useScene(): SceneTiming
```

## useSetting

Function. Explained in [Components](/docs/react/components#usesetting).

A setting's current value, as the runner's snapshot has it, kept up to date:
a play setting's from the game in play, a ui setting's from the profile.
Undefined for a setting the game doesn't declare.

```ts shape
import { useSetting } from '@ifloom/react'
function useSetting(id: string): KvValue | undefined
```

## useTimer

Function. Explained in [Components](/docs/react/components#usetimer-and-usetimers).

One running timer by id, or null when it isn't running (not started, stopped, or run out).

```ts shape
import { useTimer } from '@ifloom/react'
function useTimer(id: string): TimerView | null
```

## useTimers

Function. Explained in [Components](/docs/react/components#usetimer-and-usetimers).

The running timers, as `view.timers` has them, in the order they started.

```ts shape
import { useTimers } from '@ifloom/react'
function useTimers(): TimerView[]
```

## useWords

Function. Explained in [Components](/docs/react/components#usewords).

`uiSay` for the game in context. Given a plugin UI's own `words`, it says
those keys too, and the UI's own.

```ts shape
import { useWords } from '@ifloom/react'
function useWords(): Say
function useWords<W extends Words>(words: W): Say<(keyof W & string) | UiStringKey>
```

## Video

Const. Explained in [Components](/docs/react/components#video).

A video clip, from a `video` beat, a layered picture's layer or a post. It plays inline
and, by default, like a GIF: by itself, looping and muted. It loads nothing
until it scrolls into view (`preload="none"`), starts when it does, and
pauses when it scrolls out again. A clip with sound follows the game's audio
settings: muted while the mute setting is on, at the `video` channel's
volume setting, else the `sfx` channel's.

```ts shape
import { Video } from '@ifloom/react'
const Video: ComponentType<VideoProps>
```

## VideoProps

Type. Explained in [Components](/docs/react/components#videoprops).

```ts shape
import type { VideoProps } from '@ifloom/react'
type VideoProps = {
  src: string
  poster?: string
  alt?: string
  autoplay: boolean
  loop: boolean
  muted: boolean
  controls: boolean
  // …
}
```

Plugins add fields of their own to it, which their pages list.

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `src` | `string` |  |  | The file, through `artSrc`. |
| `poster` | `string` | yes |  | A picture to show before it plays. |
| `alt` | `string` | yes |  | What the clip shows, for a screen reader. |
| `autoplay` | `boolean` |  |  | Start playing as soon as it's shown. |
| `loop` | `boolean` |  |  | Play it again when it ends. |
| `muted` | `boolean` |  |  | False asks for sound, which then follows the game's audio settings. |
| `controls` | `boolean` |  |  | Show the browser's play, pause and volume controls. |

## ViewerMedia

Type. Explained in [Components](/docs/react/components#mediaviewerprops-and-viewermedia).

A picture or a video beat: what the viewer shows.

```ts shape
import type { ViewerMedia } from '@ifloom/react'
type ViewerMedia = Extract<SceneBeat, { type: 'image' } | { type: 'video' }>
```

## When

Const. Explained in [Components](/docs/react/components#when).

Its children while `condition` holds, and nothing otherwise. `useHolds` is the same as a hook.

```ts shape
import { When } from '@ifloom/react'
const When: ComponentType<{ condition: Condition; children?: ReactNode; }>
```

## WithPages

Component. Explained in [Components](/docs/react/components#withpages).

The game, or with `pages` on, the pages around it: the game shows
only on the `game` page. Used inside a `GameProvider`; a layout's `Game`
uses it, so a layout needn't.

```ts shape
import { WithPages } from '@ifloom/react'
function WithPages(props: { pages?: boolean | PagesOptions; children: ReactNode }): JSX.Element
```

## Words

Type. Explained in [Components](/docs/react/components#words).

A table of words in English by key, as a plugin's React UI declares its own
(`{ buy: 'Buy' }`). A game rewords any of them the same way as the UI's,
with `ui.<key>` in its strings.

```ts shape
import type { Words } from '@ifloom/react'
type Words = {
  [key: string]: string
}
```
