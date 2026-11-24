---
title: "@ifloom/engine"
description: "Every export of @ifloom/engine, the main entry for writing and running a game: its signature and its fields."
---
Generated from the source of `@ifloom/engine` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Functions: [`actionOf`](#actionof), [`amountOf`](#amountof), [`apply`](#apply), [`applyEffects`](#applyeffects), [`artSrc`](#artsrc), [`audioSrc`](#audiosrc), [`buildEffects`](#buildeffects), [`callOf`](#callof), [`canHold`](#canhold), [`cases`](#cases), [`chance`](#chance), [`checkGame`](#checkgame), [`choice`](#choice-1), [`clampStat`](#clampstat), [`commandOf`](#commandof), [`createRunner`](#createrunner), [`decide`](#decide), [`declaredTrait`](#declaredtrait), [`declaredWithTrait`](#declaredwithtrait), [`describeProblem`](#describeproblem), [`dismiss`](#dismiss), [`draw`](#draw), [`drawOne`](#drawone), [`effectsOf`](#effectsof), [`entitiesOf`](#entitiesof), [`entityDescription`](#entitydescription), [`entityImage`](#entityimage), [`entityKv`](#entitykv), [`entityName`](#entityname), [`entityOf`](#entityof), [`entityTags`](#entitytags), [`explain`](#explain), [`explainText`](#explaintext), [`fillTokens`](#filltokens), [`fold`](#fold), [`give`](#give), [`hash`](#hash), [`heldBy`](#heldby), [`heldCount`](#heldcount), [`holderOf`](#holderof), [`holding`](#holding), [`holds`](#holds), [`image`](#image), [`inlineChoices`](#inlinechoices), [`inlineMarkup`](#inlinemarkup), [`inRange`](#inrange), [`isUnique`](#isunique), [`jump`](#jump), [`lackingLine`](#lackingline), [`loadGame`](#loadgame), [`loadState`](#loadstate), [`mediaType`](#mediatype), [`memoryDriver`](#memorydriver), [`minigame`](#minigame), [`mods`](#mods-1), [`move`](#move), [`need`](#need), [`notify`](#notify), [`panel`](#panel), [`parseRef`](#parseref), [`pluginQuery`](#pluginquery), [`point`](#point), [`profile`](#profile-1), [`proseBeats`](#prosebeats), [`protagonist`](#protagonist), [`reasonOf`](#reasonof), [`replay`](#replay), [`resolveHolder`](#resolveholder), [`saves`](#saves-1), [`say`](#say), [`sceneOf`](#sceneof), [`screen`](#screen-1), [`startingState`](#startingstate), [`statLevel`](#statlevel), [`statOf`](#statof), [`statValue`](#statvalue), [`storylineOpen`](#storylineopen), [`stringOf`](#stringof), [`take`](#take), [`text`](#text), [`traitOf`](#traitof), [`translatableFields`](#translatablefields), [`uiInContent`](#uiincontent-1), [`upgradePack`](#upgradepack), [`view`](#view-1), [`weighted`](#weighted), [`when`](#when), [`whyNot`](#whynot), [`withTrait`](#withtrait), [`writeEntity`](#writeentity)
- Constants: [`PLAYER`](#player), [`SAVE_VERSION`](#save_version), [`SCHEMA`](#schema), [`STRINGS`](#strings), [`YOU`](#you)
- Types: [`ActionCost`](#actioncost), [`ActionDef`](#actiondef), [`Amount`](#amount), [`Applied`](#applied), [`AudioChannelView`](#audiochannelview), [`AudioCue`](#audiocue), [`AudioState`](#audiostate), [`AudioView`](#audioview), [`AutosaveOptions`](#autosaveoptions), [`BacklogEntry`](#backlogentry), [`BacklogOptions`](#backlogoptions), [`BeatSize`](#beatsize), [`Block`](#block), [`Blocked`](#blocked), [`BlockExtras`](#blockextras), [`BlockUi`](#blockui), [`BrokenSave`](#brokensave), [`ButtonDef`](#buttondef), [`CarryOver`](#carryover), [`Change`](#change), [`ChangesDef`](#changesdef), [`ChangeView`](#changeview), [`ChannelDef`](#channeldef), [`Checked`](#checked), [`Choice`](#choice), [`ChoiceUi`](#choiceui), [`Command`](#command), [`CommandCall`](#commandcall), [`CommandLog`](#commandlog), [`CommandRef`](#commandref), [`CommandRegistry`](#commandregistry), [`Condition`](#condition), [`ConditionCall`](#conditioncall), [`ConditionRegistry`](#conditionregistry), [`Content`](#content), [`CreatedEntity`](#createdentity), [`CreateFields`](#createfields), [`CustomContext`](#customcontext), [`DataScene`](#datascene), [`Dice`](#dice), [`Effect`](#effect), [`EffectCall`](#effectcall), [`EffectRef`](#effectref), [`EffectRegistry`](#effectregistry), [`EntitiesView`](#entitiesview), [`EntityDef`](#entitydef), [`EntityRef`](#entityref), [`EntityState`](#entitystate), [`EntityUi`](#entityui), [`EntityView`](#entityview), [`Explanation`](#explanation), [`FileRef`](#fileref), [`FillPart`](#fillpart), [`FlowChoice`](#flowchoice), [`FlowState`](#flowstate), [`FlowStep`](#flowstep), [`Formula`](#formula), [`Game`](#game), [`GameAudio`](#gameaudio), [`GameBase`](#gamebase), [`GameMedia`](#gamemedia), [`GameRules`](#gamerules), [`GameState`](#gamestate), [`GameUi`](#gameui), [`HeldView`](#heldview), [`HelperRegistry`](#helperregistry), [`HelpersIn`](#helpersin), [`HistoryOptions`](#historyoptions), [`Holder`](#holder), [`HotspotDef`](#hotspotdef), [`HotspotView`](#hotspotview), [`InlinePart`](#inlinepart), [`InlineSpan`](#inlinespan), [`InlineUi`](#inlineui), [`InlineUiArgs`](#inlineuiargs), [`InputDef`](#inputdef), [`InputView`](#inputview), [`InstalledMod`](#installedmod), [`KindDef`](#kinddef), [`KvValue`](#kvvalue), [`Loaded`](#loaded), [`LoadedSave`](#loadedsave), [`LoadOptions`](#loadoptions), [`MediaState`](#mediastate), [`MigrationTools`](#migrationtools), [`MinigameDef`](#minigamedef), [`MinigameInput`](#minigameinput), [`MinigameSceneFields`](#minigamescenefields), [`MinigameState`](#minigamestate), [`MinigameStateDef`](#minigamestatedef), [`MinigameTarget`](#minigametarget), [`MinigameTransition`](#minigametransition), [`MinigameView`](#minigameview), [`ModFile`](#modfile), [`Mods`](#mods), [`Notice`](#notice), [`NoticesView`](#noticesview), [`NoticeView`](#noticeview), [`Once`](#once), [`OpenPanel`](#openpanel), [`Pack`](#pack), [`Patch`](#patch), [`Phrase`](#phrase), [`PhraseRow`](#phraserow), [`Phrases`](#phrases), [`PhraseWithArgs`](#phrasewithargs), [`PictureDef`](#picturedef), [`PictureLayer`](#picturelayer), [`PictureLayerView`](#picturelayerview), [`PictureView`](#pictureview), [`Placement`](#placement), [`PlaylistDef`](#playlistdef), [`PluginCall`](#plugincall), [`PoolFile`](#poolfile), [`Price`](#price), [`Probe`](#probe), [`Problem`](#problem), [`Profile`](#profile), [`ProseStore`](#prosestore), [`Query`](#query), [`QueryRegistry`](#queryregistry), [`Range`](#range), [`RawPack`](#rawpack), [`Reason`](#reason), [`RenderedChoice`](#renderedchoice), [`Result`](#result), [`Roll`](#roll), [`RollsState`](#rollsstate), [`Runner`](#runner), [`RunnerOptions`](#runneroptions), [`RunnerSnapshot`](#runnersnapshot), [`RunningTimer`](#runningtimer), [`SaveDriver`](#savedriver), [`SaveExtra`](#saveextra), [`SaveFile`](#savefile), [`SaveListing`](#savelisting), [`SaveMeta`](#savemeta), [`Saves`](#saves), [`SavingView`](#savingview), [`SceneBeat`](#scenebeat), [`SceneMedia`](#scenemedia), [`ScenePanel`](#scenepanel), [`SceneUi`](#sceneui), [`Screen`](#screen), [`ScreenChoice`](#screenchoice), [`ScreenScene`](#screenscene), [`Select`](#select), [`SettingDef`](#settingdef), [`SettingView`](#settingview), [`SpeakerView`](#speakerview), [`StartOptions`](#startoptions), [`StatDef`](#statdef), [`StatKey`](#statkey), [`StatLevels`](#statlevels), [`StatRound`](#statround), [`Stats`](#stats), [`StatUi`](#statui), [`StatView`](#statview), [`StatWords`](#statwords), [`StoryletFields`](#storyletfields), [`StorylineDef`](#storylinedef), [`StorylineState`](#storylinestate), [`StringKey`](#stringkey), [`Strings`](#strings-1), [`TextLine`](#textline), [`TimerDef`](#timerdef), [`TimerView`](#timerview), [`Times`](#times), [`TrackDef`](#trackdef), [`TraitData`](#traitdata), [`TraitRegistry`](#traitregistry), [`TraitSource`](#traitsource), [`TraitTable`](#traittable), [`TriggerDef`](#triggerdef), [`Ui`](#ui), [`UiField`](#uifield), [`UiInContent`](#uiincontent), [`UiTarget`](#uitarget), [`ValueRef`](#valueref), [`VariantMember`](#variantmember), [`VideoFlags`](#videoflags), [`VideoView`](#videoview), [`View`](#view), [`ViewOptions`](#viewoptions), [`ViewRegistry`](#viewregistry), [`ViewsIn`](#viewsin), [`WordField`](#wordfield), [`WordPart`](#wordpart), [`WordShape`](#wordshape)

## ActionCost

Type. Explained in [Actions and buttons](/docs/reference/actions#actioncost).

What an action costs.

```ts shape
import type { ActionCost } from '@ifloom/engine'
type ActionCost = {
  stats?: Record<string, number>
  reasons?: Record<string, string>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `stats` | `Record<string, number>` | yes |  | Stats it spends, by id, in the order the button should list them. |
| `reasons` | `Record<string, string>` | yes |  | Refusal lines by stat id, when this action's voice beats the stat's own. |

## ActionDef

Type. Explained in [Actions and buttons](/docs/reference/actions#actiondef).

Something the player can do, as a button: the game's own in content's
`actions`, a plugin's (a place's, an app's). It is a `ButtonDef`, the
fields a choice has.

Pressing one with only a `command` sends that command. One with a cost,
effects or `once` sends `{ type: 'action', id }`, which runs its command
first, then pays its cost and applies its effects: the game's by its id,
a plugin's as `'<plugin>/<id>'`. One with no `label` is never drawn as a
button: a choice's command, another button or a hotspot runs it.

```ts shape
import type { ActionDef } from '@ifloom/engine'
type ActionDef = {
  id: string
  label?: string
  labels?: { when?: Condition; label: string }[]
  when?: Condition
  blocked?: Blocked[]
  cost?: ActionCost
  effects?: EffectRef[]
  command?: CommandRef
  once?: Once
  tags?: string[]
  irreversible?: string
  ui?: Ui<ChoiceUi>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `label` | `string` | yes |  | Its words, as written, with tokens filled: `'Order a tea'`. A scene's choice with none shows its id; an action with none is never drawn as a button. |
| `labels` | `{ when?: Condition; label: string }[]` | yes |  | Words that depend on state, "Not today" before you have bought it, "Right." after. The first whose `when` holds wins; `label` is the fallback. |
| `when` | `Condition` | yes |  | Only offered, and only done, while this holds. |
| `blocked` | `Blocked[]` | yes |  | Shown but greyed out while one of these holds, with its reason (or left off with `hide`), and refused with it. The first that holds wins. |
| `cost` | `ActionCost` | yes |  | Stats it spends: checked before it runs, listed on its button, and paid after its command. |
| `effects` | `EffectRef[]` | yes |  | Applied after the cost, in order. A plugin's or the game's own in short for one that is computed. |
| `command` | `CommandRef` | yes |  | A command it sends as well, run first: a plugin's in short (`{ 'devices/open': { id: 'messages' } }`) or the engine's. It is greyed out with that command's reason while it would be refused, and its price includes what the command spends. Any command but `choose`. |
| `once` | `Once` | yes |  | Once in the game (`{ per: 'game' }`) or once a turn (`{ per: 'turn' }`): spent once it has been pressed, as `state.chosen` counts it. `reason` is what the player reads on it afterwards: a choice stays on screen and pays nothing more, an action is refused. |
| `tags` | `string[]` | yes |  | Words the UI can style or filter it by. The engine gives them no meaning. |
| `irreversible` | `string` | yes |  | A warning that it can't be undone, which the UI shows on it. |
| `ui` | `Ui<ChoiceUi>` | yes |  | Presentation hints for the UI, carried to its button as written. See `ChoiceUi`. |

## actionOf

Function. Explained in [Actions and buttons](/docs/reference/actions#actionof).

The action `{ type: 'action', id }` does, in this state: one of the game's
content `actions` by its id, or a plugin's by `'<plugin>/<id>'`, as its
`action` answers, else among its buttons now. Undefined when there is none.

```ts shape
import { actionOf, type Game } from '@ifloom/engine'
function actionOf(state: GameState, game: Game, id: string): ActionDef | undefined
```

## Amount

Type. Explained in [Amounts](/docs/reference/amounts#amount).

A number content names, worked out when it is read: a number as written, a
stat of the player's by id, a stat with `{ stat, of? }`, a
kv key's number with `{ kv, of? }` (a value that is not a number counts as
0), a value by name with `{ value, with? }`, or how many entities there are
with `{ count, where?, units? }`, counted as the `count` condition counts.
They combine as a `Formula` does (`sum`, `product`, `min`, `max`, `scale`,
`clamp`), with any amount as a part. `of` names whose, as it does in conditions. Read one with `amountOf`.
Effects take one in `by` and `to`, ranges in their bounds, stats in `min`
and `max`, and rolls in `plus` and `against`:
`{ stat: 'coins', gte: { stat: 'rent' } }` holds while the player has at
least the rent.

```ts shape
import type { Amount } from '@ifloom/engine'
type Amount = number | StatKey | { stat: StatKey; of?: string } | { kv: string; of?: string } | ValueRef | { count: string | Select; where?: Condition; units?: true } | { sum: Amount[] } | { product: Amount[] } | { min: Amount[] } | { max: Amount[] } | { scale: Amount; by: number } | { clamp: Amount; min?: number; max?: number }
```

## amountOf

Function. Explained in [Amounts](/docs/reference/amounts#amountof).

An amount worked out in this state: a number as written, a stat (the
player's by id, or `{ stat, of }`), a kv key's number (`{ kv, of }`), a
value by name (`{ value, with }`), a count of entities (`{ count }`) or a
formula of them. Anything that doesn't read as a finite number is 0, as an
owner that isn't there is.

```ts shape
import { amountOf, type Game } from '@ifloom/engine'
function amountOf(state: GameState, game: Game, amount: Amount): number
```

## Applied

Type. Explained in [Commands](/docs/reference/commands#applied).

What `apply` says about a command: the shape of a `Result`, with the state
on both sides. When `ok` is false the command was refused, `state` is the
one it was sent to, untouched, and `reason` says why.

```ts shape
import type { Applied } from '@ifloom/engine'
type Applied = { ok: true; state: GameState; reason?: never; newGame?: true } | { ok: false; state: GameState; reason: string }
```

## apply

Function. Explained in [Commands](/docs/reference/commands#apply).

Run a command and say whether it took: the next state, and why it was
refused when it was. A refusal leaves the state as it was.

```ts shape
import { apply, type Game } from '@ifloom/engine'
function apply(state: GameState | null, game: Game, ref: CommandRef): Applied
```

## applyEffects

Function. Explained in [Effects](/docs/reference/effects#applyeffects).

Apply effects as content writes them, the engine's and short plugin calls
(`{ 'quests/start': { quest: 'bread' } }`) alike, as a plugin's
`context.apply` does: a call to an effect nobody has is left out.

```ts shape
import { applyEffects, type Game } from '@ifloom/engine'
function applyEffects(state: GameState, game: Game, effects: readonly EffectRef[]): GameState
```

## artSrc

Function. Explained in [Prose and markup](/docs/reference/prose#artsrc).

The one place a picture's or a video's path is resolved, from the game's
`art/` folder: `'photo/ava.svg'` and `'art/photo/ava.svg'` are both
`'art/photo/ava.svg'`. A bare name is a `.jpg`, or an `.mp4` when `type` is
`'video'`. A URL (`https:`, `data:`, `//host/…`) is left as it is.

```ts shape
import { artSrc } from '@ifloom/engine'
function artSrc(path: string, type?: 'image' | 'video'): string
```

## AudioChannelView

Type. Explained in [Audio](/docs/reference/audio#audiochannelview).

One channel as a player needs it.

```ts shape
import type { AudioChannelView } from '@ifloom/engine'
type AudioChannelView = {
  mode: 'background' | 'cue'
  track: string | null
  src: string | null
  loop: boolean
  volume: number
  volumeSetting: string | null
  crossfade: number
  duck: { under: string[]; to: number } | null
  playlist?: { tracks: string[]; srcs: string[]; volumes: number[]; order: 'inOrder' | 'loop' | 'shuffle' }
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `mode` | `'background' \| 'cue'` |  |  | `background` plays a track or playlist until told otherwise; `cue` plays one-shot sounds, listed in `cues`. |
| `track` | `string \| null` |  |  | The track or playlist playing; null for silence, and always null on a cue channel. |
| `src` | `string \| null` |  |  | The file to play, through `audioSrc`; a playlist's first. Null for silence. |
| `loop` | `boolean` |  |  | Whether it repeats. A playlist repeats as a whole unless its order is `'inOrder'`. |
| `volume` | `number` |  |  | The track's own volume, 0 to 1; a playlist's first track's. Multiply by the setting's value. |
| `volumeSetting` | `string \| null` |  |  | The ui setting that sets this channel's volume, or null for none. |
| `crossfade` | `number` |  |  | Milliseconds to fade between tracks. 0 on a cue channel. |
| `duck` | `{ under: string[]; to: number } \| null` |  |  | Quieten this channel to `to` (0 to 1) while any channel in `under` plays; null when it doesn't duck. |
| `playlist` | `{ tracks: string[]; srcs: string[]; volumes: number[]; order: 'inOrder' \| 'loop' \| 'shuff…` | yes |  | A playlist's files, volumes and order, already shuffled when it shuffles. |

## AudioCue

Type. Explained in [Audio](/docs/reference/audio#audiocue).

A one-shot sound that is due. Play each key once.

```ts shape
import type { AudioCue } from '@ifloom/engine'
type AudioCue = {
  key: string
  channel: string
  track: string
  src: string
  volume: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `key` | `string` |  |  | The same for the same sound in the same showing, across view calls and reloads. |
| `channel` | `string` |  |  | The cue channel it plays on: `sfx` or `voice` unless the game declares others. |
| `track` | `string` |  |  | The track's id in `game.audio.tracks`. |
| `src` | `string` |  |  | The file to play, through `audioSrc`. |
| `volume` | `number` |  |  | The track's own volume, 0 to 1. Multiply by the channel's volume setting. |

## audioSrc

Function. Explained in [Audio](/docs/reference/audio#audiosrc).

Where a sound file is, relative to the page. Like `artSrc`: relative, never
rooted at `/`, under `audio/`, and a bare name is an `.ogg`.

```ts shape
import { audioSrc } from '@ifloom/engine'
function audioSrc(path: string): string
```

## AudioState

Type. Explained in [Audio](/docs/reference/audio#audiostate).

What a save keeps about audio, at `state.audio`.

```ts shape
import type { AudioState } from '@ifloom/engine'
type AudioState = {
  channels: Record<string, string | null>
  cues: { seq: number; track: string }[]
  seq: number
  shown: number
  started: Record<string, { track: string; turn: number }>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `channels` | `Record<string, string \| null>` |  |  | What effects have put on background channels. Null is silence; a channel not here is the effects' to leave alone. |
| `cues` | `{ seq: number; track: string }[]` |  |  | The last few `sound` effects, oldest first, each with its place in the running count. |
| `seq` | `number` |  |  | How many `sound` effects there have been. |
| `shown` | `number` |  |  | How many times a scene has been entered, all scenes together. Each showing's sounds get keys of their own. |
| `started` | `Record<string, { track: string; turn: number }>` |  |  | What each background channel is playing and the turn it started, for a shuffled playlist's draw. |

## AudioView

Type. Explained in [Audio](/docs/reference/audio#audioview).

What `view.audio` holds.

```ts shape
import type { AudioView } from '@ifloom/engine'
type AudioView = {
  channels: Record<string, AudioChannelView>
  cues: AudioCue[]
  muteSetting: string | null
  soundSetting: string | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `channels` | `Record<string, AudioChannelView>` |  |  | Every channel, resolved: the open scene's choice, then an effect's, then a plugin's, then the game's default. |
| `cues` | `AudioCue[]` |  |  | Sounds from `sound` effects and the open scene's sound and voice beats, in order. |
| `muteSetting` | `string \| null` |  |  | The ui setting that mutes everything while on, or null for none. |
| `soundSetting` | `string \| null` |  |  | The ui setting that mutes everything while off, or null for none. |

## AutosaveOptions

Type. Explained in [The runner](/docs/reference/runner#autosaveoptions).

When the runner saves on its own. Off unless the game sets it.

```ts shape
import type { AutosaveOptions } from '@ifloom/engine'
type AutosaveOptions = {
  slot?: string
  every: 'command' | 'scene' | 'turn'
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `slot` | `string` | yes |  | The slot it writes to. `'auto'` if left out. |
| `every` | `'command' \| 'scene' \| 'turn'` |  |  | After every command, or only when the scene or the turn changes. Skipped while the game's `saveable` refuses saving. |

## BacklogEntry

Type. Explained in [The runner](/docs/reference/runner#backlogentry).

One scene as the player saw it.

```ts shape
import type { BacklogEntry } from '@ifloom/engine'
type BacklogEntry = {
  turn: number
  when: string | null
  sceneId: string
  title: string
  beats: SceneBeat[]
  chose?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `turn` | `number` |  |  | The turn it was shown in. |
| `when` | `string \| null` |  |  | Where the game was in time, in plugins' words (`view.when`), or null if none says. |
| `sceneId` | `string` |  |  | The scene's id. The backlog keeps scenes only, not the room. |
| `title` | `string` |  |  | The scene's heading as it was shown. |
| `beats` | `SceneBeat[]` |  |  | What the player read, as the view's beats. |
| `chose` | `string` | yes |  | The label of the choice the player made in this scene, once they made one. |

## BacklogOptions

Type. Explained in [The runner](/docs/reference/runner#backlogoptions).

What was shown, turn by turn, for a "what did she just say" screen. Off unless asked for.

```ts shape
import type { BacklogOptions } from '@ifloom/engine'
type BacklogOptions = {
  limit?: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `limit` | `number` | yes |  | How many entries to keep. 200 if left out. |

## BeatSize

Type. Explained in [Prose and markup](/docs/reference/prose#beatsize).

How wide an `image` or `video` beat is drawn: `inline` in the column with the words, `wide` across it.

```ts shape
import type { BeatSize } from '@ifloom/engine'
type BeatSize = 'inline' | 'wide'
```

## Block

Type. Explained in [Scenes](/docs/reference/scenes#block).

A scene, as data.

The body is *composed* from blocks rather than looked up whole. That is
the point: under the old model one key had to cover an entire body, so any
branch the key did not carry got frozen onto whichever version was exported.
Here each block is its own key, so a key can only ever mean one thing, and
adding a conditional line is adding a block rather than multiplying the
key space.

```ts shape
import type { Block } from '@ifloom/engine'
type Block = ({ text: string; id?: string; when?: Condition } | { prose: string; when?: Condition } | { variants: string; when?: Condition; gate?: Record<string, Condition>; image?: Record<string, string> } | { media: SceneMedia; when?: Condition } | { say: string; speaker: string; voice?: string; id?: string; when?: Condition } | { blocks: Block[]; when?: Condition } | { cases: Block[]; when?: Condition } | { decide: string; choices: FlowChoice[]; when?: Condition } | { point: string; when?: undefined } | { minigame: string; when?: Condition } | { panel: string; with?: PluginArgs; when?: Condition }) & { ui?: Ui<BlockUi> }
```

## Blocked

Type. Explained in [Actions and buttons](/docs/reference/actions#blocked).

Why something the player could do is refused for now: a choice, an action,
a place, an app. Each entry is checked in order, and the first
whose `when` holds refuses it with its `reason`, which the button shows
greyed out. With `hide`, the button is left off the screen instead.

```ts shape
import type { Blocked } from '@ifloom/engine'
type Blocked = {
  when: Condition
  reason: Reason
  hide?: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `when` | `Condition` |  |  | Refused while this holds. |
| `reason` | `Reason` |  |  | What the player reads on the greyed-out button, and the refusal. |
| `hide` | `boolean` | yes |  | Leave it off the screen while `when` holds, rather than greyed out. |

## BlockExtras

Type. Explained in [Flowing scenes](/docs/reference/flows#blockextras).

What any block can have besides its own: a condition it shows under, and presentation hints.

```ts shape
import type { BlockExtras } from '@ifloom/engine'
type BlockExtras = {
  when?: Condition
  ui?: Ui<BlockUi>
}
```

## BlockUi

Type. Explained in [Presentation hints](/docs/reference/ui-hints#sceneui-choiceui-blockui-entityui-statui-and-gameui).

Hints on a block of a scene's body, carried on the first beat the block makes. Empty here; a UI package augments it.

```ts shape
import type { BlockUi } from '@ifloom/engine'
type BlockUi = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## BrokenSave

Type. Explained in [Saves](/docs/reference/saves#brokensave).

A save that is there but can't be read, as `list()` gives it: its slot, and
why, in the words `read` would give. Listed so the player can delete it.

```ts shape
import type { BrokenSave } from '@ifloom/engine'
type BrokenSave = {
  slot: string
  broken: string
}
```

## buildEffects

Function. Explained in [Calls by name](/docs/reference/custom#buildeffects).

Effects as the reducer takes them: a call to an effect nobody has (a
plugin the game doesn't have, a name the game never declared) is left
out, as it would do nothing; the content checker (`checkGame`) reports it
by name. Every other effect is kept as written, and a call runs in its
turn, on the state the effects before it left.

```ts shape
import { buildEffects, type Game } from '@ifloom/engine'
function buildEffects(game: Game, refs: readonly EffectRef[]): Effect[]
```

## ButtonDef

Type. Explained in [Actions and buttons](/docs/reference/actions#buttondef).

Something the player can press: a scene's choice (`Choice`) or an action
(`ActionDef`). Both have these fields, read the same way: its words, when
it is offered and why it is refused, what it costs, what it does and a
command it sends, once a turn, and words and hints for the UI.

Pressing one runs, in order: its command, its cost, then its effects.

```ts shape
import type { ButtonDef } from '@ifloom/engine'
type ButtonDef = {
  id: string
  label?: string
  labels?: { when?: Condition; label: string }[]
  when?: Condition
  blocked?: Blocked[]
  cost?: ActionCost
  effects?: EffectRef[]
  command?: CommandRef
  once?: Once
  tags?: string[]
  irreversible?: string
  ui?: Ui<ChoiceUi>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `label` | `string` | yes |  | Its words, as written, with tokens filled: `'Order a tea'`. A scene's choice with none shows its id; an action with none is never drawn as a button. |
| `labels` | `{ when?: Condition; label: string }[]` | yes |  | Words that depend on state, "Not today" before you have bought it, "Right." after. The first whose `when` holds wins; `label` is the fallback. |
| `when` | `Condition` | yes |  | Only offered, and only done, while this holds. |
| `blocked` | `Blocked[]` | yes |  | Shown but greyed out while one of these holds, with its reason (or left off with `hide`), and refused with it. The first that holds wins. |
| `cost` | `ActionCost` | yes |  | Stats it spends: checked before it runs, listed on its button, and paid after its command. |
| `effects` | `EffectRef[]` | yes |  | Applied after the cost, in order. A plugin's or the game's own in short for one that is computed. |
| `command` | `CommandRef` | yes |  | A command it sends as well, run first: a plugin's in short (`{ 'devices/open': { id: 'messages' } }`) or the engine's. It is greyed out with that command's reason while it would be refused, and its price includes what the command spends. Any command but `choose`. |
| `once` | `Once` | yes |  | Once in the game (`{ per: 'game' }`) or once a turn (`{ per: 'turn' }`): spent once it has been pressed, as `state.chosen` counts it. `reason` is what the player reads on it afterwards: a choice stays on screen and pays nothing more, an action is refused. |
| `tags` | `string[]` | yes |  | Words the UI can style or filter it by. The engine gives them no meaning. |
| `irreversible` | `string` | yes |  | A warning that it can't be undone, which the UI shows on it. |
| `ui` | `Ui<ChoiceUi>` | yes |  | Presentation hints for the UI, carried to its button as written. See `ChoiceUi`. |

## callOf

Function. Explained in [Calls by name](/docs/reference/custom#callof).

The name and arguments of a call in short, `{ 'calendar/pass': { by: 2 } }`
as `{ name: 'calendar/pass', with: { by: 2 } }`, or undefined for anything
else: one of the engine's own effects or conditions. For code that looks at
a list of effects, such as a plugin's guard or price.

```ts shape
import { callOf } from '@ifloom/engine'
function callOf(entry: object): { name: string; with: Record<string, unknown> } | undefined
```

## canHold

Function. Explained in [Entities](/docs/reference/entities#canhold).

Whether a holder is there to hold: the player always, a unique entity while it is in the game.

```ts shape
import { canHold, type Game } from '@ifloom/engine'
function canHold(state: GameState, game: Game, holder: string): boolean
```

## CarryOver

Type. Explained in [Game state](/docs/reference/state#carryover).

What a New Game+ takes from the game before: player stats, kv keys and what the player holds.

```ts shape
import type { CarryOver } from '@ifloom/engine'
type CarryOver = {
  stats?: string[]
  kv?: string[]
  held?: string[] | 'all'
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `stats` | `string[]` | yes |  | The player's stats to carry, by id. |
| `kv` | `string[]` | yes |  | kv keys, by name. |
| `held` | `string[] \| 'all'` | yes |  | Things the player holds, by reference (`'food:apple'`), or `'all'` for everything the player holds. A thing made in play comes with them. |

## cases

Function. Explained in [Flowing scenes](/docs/reference/flows#the-builders).

The first block that fits: each of `blocks` is tried in order, and only the
first whose own `when` holds, or that has none, is shown. Leave the last
without a `when` for the otherwise. A `when` in `extras` leaves the whole
thing out while it fails.

```ts fragment
cases([
  text(`Rain streaks the window.`, { when: { kv: 'rain' } }),
  text(`Ava's umbrella is by the door.`, { when: { kv: 'cloudy' } }),
  text(`The street is dry.`),
])
```

```ts shape
import { cases } from '@ifloom/engine'
function cases(blocks: Block[], extras?: BlockExtras): Block
```

## chance

Function. Explained in [Randomness](/docs/reference/random#chance).

True `numerator` times in `outOf`, drawn from these parts.

```ts shape
import { chance } from '@ifloom/engine'
function chance(numerator: number, outOf: number, ...parts: (string | number)[]): boolean
```

## Change

Type. Explained in [Changes](/docs/reference/changes#change).

One stat a command moved: whose, from what to what, and the change written in the stat's own words.

```ts shape
import type { Change } from '@ifloom/engine'
type Change = {
  stat: string
  of?: EntityRef
  from: number
  to: number
  by: number
  label: string
  text: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `stat` | `string` |  |  | The stat's id. |
| `of` | `EntityRef` | yes |  | The entity whose stat it is; left out for the player's. |
| `from` | `number` |  |  | What it read before the command. |
| `to` | `number` |  |  | What it reads now. |
| `by` | `number` |  |  | How far it moved: `to - from`, above 0 for up. |
| `label` | `string` |  |  | The stat's `label`. |
| `text` | `string` |  |  | The change written with the stat's `format`, signed: `'+30 coins'`, `'-£5'`. |

## ChangesDef

Type. Explained in [Changes](/docs/reference/changes#changesdef).

Which stats `view.changes` tracks: their ids. An entity stat's id covers that stat on every entity.

```ts shape
import type { ChangesDef } from '@ifloom/engine'
type ChangesDef = {
  stats: string[]
}
```

## ChangeView

Type. Explained in [Changes](/docs/reference/changes#changeview).

One stat a command moved, as the view hands it to a UI: the `Change`, and who or what it's about in words.

```ts shape
import type { ChangeView } from '@ifloom/engine'
type ChangeView = {
  stat: string
  of?: EntityRef
  from: number
  to: number
  by: number
  label: string
  text: string
  name?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `stat` | `string` |  |  | The stat's id. |
| `of` | `EntityRef` | yes |  | The entity whose stat it is; left out for the player's. |
| `from` | `number` |  |  | What it read before the command. |
| `to` | `number` |  |  | What it reads now. |
| `by` | `number` |  |  | How far it moved: `to - from`, above 0 for up. |
| `label` | `string` |  |  | The stat's `label`. |
| `text` | `string` |  |  | The change written with the stat's `format`, signed: `'+30 coins'`, `'-£5'`. |
| `name` | `string` | yes |  | The words to show after `text`, so the change says what moved: the entity's name for an entity's stat (`+4 Ava`), else the stat's `label` when `text` doesn't say it in words (`+1 Charm`, `+20% Mood`). Left out when the stat's format already does (`+30 coins`). |

## ChannelDef

Type. Explained in [Audio](/docs/reference/audio#channeldef).

How a channel behaves.

```ts shape
import type { ChannelDef } from '@ifloom/engine'
type ChannelDef = {
  mode: 'background' | 'cue'
  crossfade?: number
  volume?: string
  duck?: { under: string[]; to: number }
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `mode` | `'background' \| 'cue'` |  |  | Background channels play one thing until it changes; cue channels play each sound once, overlapping. |
| `crossfade` | `number` | yes |  | Milliseconds to fade from one track to the next. Background only; 1000 for music, 600 for ambience. |
| `volume` | `string` | yes |  | A ui setting (a range) that sets this channel's volume. |
| `duck` | `{ under: string[]; to: number }` | yes |  | Off unless declared: quieten this channel to `to` (0 to 1) while any of `under` is playing. |

## Checked

Type. Explained in [Checking content](/docs/reference/checks#checked).

What `checkGame` finds.

```ts shape
import type { Checked } from '@ifloom/engine'
type Checked = {
  problems: Problem[]
  warnings: Problem[]
  files: FileRef[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `problems` | `Problem[]` |  |  | What's wrong with the content: a broken reference, a key declared twice, a call with the wrong arguments. Any problem fails `ifloom check`. |
| `warnings` | `Problem[]` |  |  | What may go wrong in play but isn't a problem, such as a token that may be unset with no fallback. A warning fails no check. |
| `files` | `FileRef[]` |  |  | Every file the content names (pictures, videos, sounds) and where, for a build to check they exist. |

## checkGame

Function. Explained in [Checking content](/docs/reference/checks#checkgame).

Everything wrong with a game's content, and every file it names. Runs on
any `Game`, hand-built or loaded. Give `probes` to also render every scene
against each state, so a scene that throws for one (through the game's own
conditions or values) is reported. A hand-built game's problems name the
pack `game`.

```ts shape
import { checkGame, type Game } from '@ifloom/engine'
function checkGame(game: Game, options?: { probes?: readonly Probe[] }): Checked
```

## Choice

Type. Explained in [Scenes](/docs/reference/scenes#choice).

A choice in a scene: a `ButtonDef`, sent as `{ type: 'choose', id }`. Its
id is unique within the scene, and `state.chosen` counts it as
`<scene>#<id>`.

A choice with `once` stays on screen once it is spent, with its
`once.reason`, and pays nothing more, which is how the caps read as
character rather than vanishing.

```ts shape
import type { Choice } from '@ifloom/engine'
type Choice = {
  id: string
  label?: string
  labels?: { when?: Condition; label: string }[]
  when?: Condition
  blocked?: Blocked[]
  cost?: ActionCost
  effects?: EffectRef[]
  command?: CommandRef
  once?: (Once & { key?: string; })
  tags?: string[]
  irreversible?: string
  ui?: Ui<ChoiceUi>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `label` | `string` | yes |  | Its words, as written, with tokens filled: `'Order a tea'`. A scene's choice with none shows its id; an action with none is never drawn as a button. |
| `labels` | `{ when?: Condition; label: string }[]` | yes |  | Words that depend on state, "Not today" before you have bought it, "Right." after. The first whose `when` holds wins; `label` is the fallback. |
| `when` | `Condition` | yes |  | Only offered, and only done, while this holds. |
| `blocked` | `Blocked[]` | yes |  | Shown but greyed out while one of these holds, with its reason (or left off with `hide`), and refused with it. The first that holds wins. |
| `cost` | `ActionCost` | yes |  | Stats it spends: checked before it runs, listed on its button, and paid after its command. |
| `effects` | `EffectRef[]` | yes |  | Applied after the cost, in order. A plugin's or the game's own in short for one that is computed. |
| `command` | `CommandRef` | yes |  | A command it sends as well, run first: a plugin's in short (`{ 'devices/open': { id: 'messages' } }`) or the engine's. It is greyed out with that command's reason while it would be refused, and its price includes what the command spends. Any command but `choose`. |
| `once` | `(Once & { key?: string; })` | yes |  | Once in the game (`{ per: 'game' }`) or once a turn (`{ per: 'turn' }`): spent once it has been pressed, as `state.chosen` counts it. `reason` is what the player reads on it afterwards: a choice stays on screen and pays nothing more, an action is refused. |
| `tags` | `string[]` | yes |  | Words the UI can style or filter it by. The engine gives them no meaning. |
| `irreversible` | `string` | yes |  | A warning that it can't be undone, which the UI shows on it. |
| `ui` | `Ui<ChoiceUi>` | yes |  | Presentation hints for the UI, carried to its button as written. See `ChoiceUi`. |

## choice

Function. Explained in [Flowing scenes](/docs/reference/flows#the-builders).

A choice at a decision, or among a scene's ending choices. `label` is its
words. Everything a `Choice` has goes in `fields`: its `effects`, `cost`,
`blocked`, `once` or `command`, and `then`, what the flow shows once it is
picked. Its id is unique within the scene.

```ts shape
import { choice } from '@ifloom/engine'
function choice(id: string, label: string, fields?: Omit<FlowChoice, 'id' | 'label'>): FlowChoice
```

## ChoiceUi

Type. Explained in [Presentation hints](/docs/reference/ui-hints#sceneui-choiceui-blockui-entityui-statui-and-gameui).

Hints on a choice or a room's button. Empty here; a UI package augments it.

```ts shape
import type { ChoiceUi } from '@ifloom/engine'
type ChoiceUi = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## clampStat

Function. Explained in [Stats](/docs/reference/stats#clampstat).

A value held to the stat's declared range (0–100 unless it says).

```ts shape
import { clampStat, type Game } from '@ifloom/engine'
function clampStat(state: GameState, game: Game, id: string, value: number): number
```

## Command

Type. Explained in [Commands](/docs/reference/commands#command).

A command: one of the types in `CommandMap`.

```ts shape
import type { Command } from '@ifloom/engine'
type Command =
  | { type: 'setting'; id: string; to: KvValue; }
  | { type: 'scene'; id: string; }
  | { type: 'action'; id: string; }
  | { type: 'input'; id: string; to?: KvValue; }
  | { type: 'minigame'; input: string; }
  | { type: 'start'; seed?: number; kv?: Record<string, KvValue>; }
  | { type: 'newGame'; }
  | { type: 'custom'; name: string; with?: Record<string, unknown>; }
  | { type: 'dismiss'; id?: string; }
  | { type: 'choose'; id: string; }
  | { type: 'leave'; }
  | { type: 'tick'; ms: number; }
  | { type: 'closePanel'; }
```

## CommandCall

Type. Explained in [Writing a plugin](/docs/reference/plugins#conditioncall-effectcall-and-commandcall).

A command by name, a plugin's or the game's own, in short: checked against `CommandRegistry`.

```ts shape
import type { CommandCall } from '@ifloom/engine'
type CommandCall = CallIn<CommandRegistry>
```

## CommandLog

Type. Explained in [The runner](/docs/reference/runner#commandlog).

Everything needed to play a game back exactly: the state it started from and
every command since. The engine is deterministic, so `replay` gives the same
state every time — a bug report a developer can step through, or two
versions of a game played the same way and compared.

```ts shape
import type { CommandLog } from '@ifloom/engine'
type CommandLog = {
  game: string
  start: GameState
  commands: Command[]
  schema?: number
  plugins?: Record<string, number>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `game` | `string` |  |  | The game's id, so a log isn't played against another game. |
| `start` | `GameState` |  |  | The state the commands were applied to, in order. |
| `commands` | `Command[]` |  |  | Every command applied, in order, refused ones included. |
| `schema` | `number` | yes |  | The engine's `SCHEMA` the commands were written in. A log from before logs kept it has none, and is read as the oldest. |
| `plugins` | `Record<string, number>` | yes |  | Each plugin's `commandVersion` the commands were written in, by plugin id. |

## commandOf

Function. Explained in [Calls by name](/docs/reference/custom#commandof).

A command as the engine runs it: a plugin's short form read as `{ type: 'custom', name, with }`.

```ts shape
import { commandOf } from '@ifloom/engine'
function commandOf(ref: CommandRef): Command
```

## CommandRef

Type. Explained in [Calls by name](/docs/reference/custom#commandref).

A command as content writes it: a plain command, or a plugin's in short (`{ 'places/go': { id: 'cafe' } }`), checked against `CommandRegistry`.

```ts shape
import type { CommandRef } from '@ifloom/engine'
type CommandRef = Command | CommandCall
```

## CommandRegistry

Type. Explained in [Writing a plugin](/docs/reference/plugins#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry).

The commands plugins and the game add, by full name, with what content writes as each one's value. As `ConditionRegistry`.

```ts shape
import type { CommandRegistry } from '@ifloom/engine'
type CommandRegistry = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## Condition

Type. Explained in [Conditions](/docs/reference/conditions#condition).

A condition: one of the kinds in `ConditionMap`, told apart by its one kind
key, or a plugin's condition in short: `{ 'quests/done': { quest: 'bakery' } }`,
checked against `ConditionRegistry` when the plugin declares its calls. See `PluginCall`.

```ts shape
import type { Condition } from '@ifloom/engine'
type Condition =
  | { kv: string; is?: KvValue | readonly KvValue[]; of?: string; } & Range
  | { all: Condition[]; }
  | { any: Condition[]; }
  | { not: Condition; }
  | { count: string | Select; where?: Condition; units?: true; } & Range
  | { entity: string; at?: string; } & Range
  | { turn: Range; }
  | { storyline: string; open?: boolean; }
  | { setting: string; is?: KvValue; } & Range
  | { stat: string; of?: string; } & Range
  | { level: string; of?: string; } & Range
  | { chose: string; } & Range
  | { seen: string; } & Range
  | { since: string; last?: boolean; } & Range
  | { scene: string[]; }
  | { timer: string; } & Range
  | { roll: string; passed?: boolean; critical?: boolean | 'max' | 'min'; }
  | ConditionCall
```

## ConditionCall

Type. Explained in [Writing a plugin](/docs/reference/plugins#conditioncall-effectcall-and-commandcall).

A condition by name, a plugin's or the game's own, in short: checked against `ConditionRegistry`.

```ts shape
import type { ConditionCall } from '@ifloom/engine'
type ConditionCall = CallIn<ConditionRegistry>
```

## ConditionRegistry

Type. Explained in [Writing a plugin](/docs/reference/plugins#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry).

The conditions plugins and the game add, by full name, with what content
writes as each one's value: its arguments, or `true` for none.

```ts fragment
declare module '@ifloom/engine' {
  interface ConditionRegistry {
    'quests/done': { quest: string }
    'calendar/weekend': true
  }
}
```

```ts shape
import type { ConditionRegistry } from '@ifloom/engine'
type ConditionRegistry = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## Content

Type. Explained in [Content, packs and loading](/docs/reference/loader#content-and-packs).

The game's own content: one file of it, such as `story/cafe.ts`. It has no
id or schema, since it is compiled with the engine it runs on, and each
thing it declares (a scene, a stat, a prose key) may be declared only once
across the game's content.

```ts shape
import type { Content } from '@ifloom/engine'
type Content = {
  name?: string
  strings?: Record<string, string>
  prose?: Record<string, string>
  words?: Record<string, string>
  variants?: Record<string, VariantMember[]>
  data?: Record<string, Record<string, readonly PluginEntry[]>>
  kinds?: KindDef[]
  entities?: EntityDef[]
  traits?: TraitTable
  kv?: Record<string, KvValue>
  resets?: Record<string, KvValue>
  storylines?: StorylineDef[]
  actions?: ActionDef[]
  triggers?: TriggerDef[]
  inputs?: InputDef[]
  settings?: SettingDef[]
  stats?: StatDef[]
  introScene?: string
  scenes?: DataScene[]
  minigames?: MinigameDef[]
  timers?: TimerDef[]
  audio?: Partial<GameAudio>
  media?: GameMedia
  ui?: Ui<GameUi>
  saveable?: Blocked[]
  locks?: Lock[]
  phrases?: Phrases
  changes?: ChangesDef
  finished?: Condition
  carryOver?: CarryOver
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `name` | `string` | yes |  | What problems call this content, such as `story.cafe`. Without one, they say `content`. |
| `strings` | `Record<string, string>` | yes |  | Player-facing words by key, over the engine's and plugins' own. |
| `prose` | `Record<string, string>` | yes |  | Prose by key. |
| `words` | `Record<string, string>` | yes |  | Other words for fields of the content, by key: a translation, which is one pack with this table (and its own `prose` for the lines read by key). Each key names one field the player reads, as `translatableFields` lists them: `action.wait.label`, `entity.character:ava.name`, `scene.cafe.counter.text.intro`. It is laid over the content once everything is merged, a later pack's over an earlier one's, and a key that names no field is reported. |
| `variants` | `Record<string, VariantMember[]>` | yes |  | Variants membership by variants name, in draw order. Content and packs append to a name. A member is a prose key, or `{ prose: key, weight }` to be drawn more or less often than the rest. |
| `data` | `Record<string, Record<string, readonly PluginEntry[]>>` | yes |  | Content for the game's plugins, by plugin id and then list: `{ quests: { quests: [...] } }`. A pack's entry replaces one with the same id, as its scenes do. |
| `kinds` | `KindDef[]` | yes |  | Kinds of thing the game keeps several of. A later pack can redeclare one by id. |
| `entities` | `EntityDef[]` | yes |  | Things of those kinds there at the start. A later pack can redeclare one by kind and id. |
| `traits` | `TraitTable` | yes |  | Traits given to entities, by trait id and then entity, over what each entity declares itself: `{ 'laundry/washable': { 'clothing:scarf': { temp: 30 } } }`. A later pack's row replaces an earlier one's. |
| `kv` | `Record<string, KvValue>` | yes |  | The kv store a new game starts with, by key: a later pack's value replaces an earlier one's. |
| `resets` | `Record<string, KvValue>` | yes |  | Keys reset each turn, by key: a later pack's value replaces an earlier one's. |
| `storylines` | `StorylineDef[]` | yes |  |  |
| `actions` | `ActionDef[]` | yes |  | Actions, by id: a later pack's replaces an earlier one's. |
| `triggers` | `TriggerDef[]` | yes |  |  |
| `inputs` | `InputDef[]` | yes |  |  |
| `settings` | `SettingDef[]` | yes |  | What the player can change from a settings screen. A later pack can redeclare one by id. |
| `stats` | `StatDef[]` | yes |  | Stats the game keeps. A later pack can redeclare one by id. |
| `introScene` | `string` | yes |  | The scene on screen on the first frame: a later pack's replaces an earlier one's. |
| `scenes` | `DataScene[]` | yes |  |  |
| `minigames` | `MinigameDef[]` | yes |  | Minigames. A later pack's replaces an earlier one's by id. |
| `timers` | `TimerDef[]` | yes |  | Timers. A later pack's replaces an earlier one's by id. |
| `audio` | `Partial<GameAudio>` | yes |  | Sounds, channels and defaults over the game's own. A later pack's track or channel replaces an earlier one's by id; its `mute` and `default` entries win too. |
| `media` | `GameMedia` | yes |  | Pools of pictures and videos. A later pack's pool replaces an earlier one's by id. |
| `ui` | `Ui<GameUi>` | yes |  | Hints for the whole game, hint by hint: a later pack's hint replaces an earlier one's, and the rest are kept. |
| `saveable` | `Blocked[]` | yes |  | When saving is refused, after the entries before; one with the `id` of an earlier one takes its place. |
| `locks` | `Lock[]` | yes |  | Locks after the ones before; one with the `id` of an earlier one takes its place. |
| `phrases` | `Phrases` | yes |  | Words for mid-sentence that change with the state, printed as `{{name}}`: each phrase a list of `{ when?, text }` rows tried in order (or a plain string), and a nested object a group, named with a `.`. A later pack's phrase replaces an earlier one's by its full name, and a pack can add phrases to a group. |
| `changes` | `ChangesDef` | yes |  | The stats whose changes `view.changes` lists, by id: `{ stats: ['coins', 'trust'] }`. Every file's and pack's lists are added together. With none, nothing is tracked. |
| `finished` | `Condition` | yes |  | When the game counts as finished. The runner records the first time it holds in the profile's `core:finished`, so a title screen can offer New Game+. A pack's replaces the content's. |
| `carryOver` | `CarryOver` | yes |  | What a New Game+ carries over from the game before. A pack's replaces the content's, whole. |

## CreatedEntity

Type. Explained in [Effects](/docs/reference/effects#createdentity).

What a created entity is given in `create`: a name (or a `like` to read it from), a description, a picture, tags, traits, stats and kv.

```ts shape
import type { CreatedEntity } from '@ifloom/engine'
type CreatedEntity = {
  id?: string
  name?: string
  description?: string
  image?: string
  tags?: string[]
  traits?: Record<string, unknown>
  stats?: Record<string, number>
  kv?: Record<string, KvValue>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` | yes |  | Its id within its kind: the next free number (`#1`, `#2`) if left out. |
| `name` | `string` | yes |  | What the player reads. The `like`'s, if it is made like one and left out. |
| `description` | `string` | yes |  | A line or two about it, tokens filled in when it is read. The `like`'s, if left out. |
| `image` | `string` | yes |  | Its picture, through `artSrc`. The `like`'s, if left out. |
| `tags` | `string[]` | yes |  | Its tags, after its kind's and its `like`'s. |
| `traits` | `Record<string, unknown>` | yes |  | Its trait data, by trait id, over its `like`'s or its kind's. |
| `stats` | `Record<string, number>` | yes |  | Where its stats start, over its `like`'s. |
| `kv` | `Record<string, KvValue>` | yes |  | Its kv keys at the start, over its `like`'s. |

## CreateFields

Type. Explained in [Effects](/docs/reference/effects#createfields).

The fields `create` takes besides its kind.

```ts shape
import type { CreateFields } from '@ifloom/engine'
type CreateFields = {
  like?: string
  with?: CreatedEntity
  at?: Placement
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `like` | `string` | yes |  | Another entity of the same kind it reads what it isn't given from. |
| `with` | `CreatedEntity` | yes |  | What it is made with: its id, name, description, picture, tags, traits, stats and kv. |
| `at` | `Placement` | yes |  | Who holds it once made: a holder for one, or how many each holds. Nobody if left out. |

## createRunner

Function. Explained in [The runner](/docs/reference/runner#createrunner).

The one object a UI drives. It wraps `apply` with what every game's UI
would otherwise build for itself — undo and redo, a backlog, a command log,
saving, loading and autosave — and tells listeners when the state changes.
Everything but the command log is off unless the game turns it on.

```ts shape
import { createRunner, type Game } from '@ifloom/engine'
function createRunner(game: Game, start: GameState, options?: RunnerOptions): Runner
```

## CustomContext

Type. Explained in [Calls by name](/docs/reference/custom#customcontext).

What every function of a plugin's or the game's is handed besides the state,
whatever it is: the game, the plugins' answers and values, and seeded
draws. `PluginContext` is this and the rest.

```ts shape
import type { CustomContext, Game } from '@ifloom/engine'
type CustomContext = {
  game: Game
  query: Query
  value: (name: string, args?: PluginArgs) => string | number | undefined
  roll: (max: number, name: string) => number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `game` | `Game` |  |  | The loaded game. |
| `query` | `Query` |  |  | Ask a plugin something by its full name: `query('places/here')`. Undefined when the game does not have that plugin. |
| `value` | `(name: string, args?: PluginArgs) => string \| number \| undefined` |  |  | A value by name, a plugin's (`messages/unread`) or the game's own, asked with `args`. Undefined when nobody has it. |
| `roll` | `(max: number, name: string) => number` |  |  | A whole number from 0 to `max - 1`, drawn from the save's seed, the turn and `name`: the same save and turn always draw the same. |

## DataScene

Type. Explained in [Scenes](/docs/reference/scenes#datascene).

```ts shape
import type { DataScene } from '@ifloom/engine'
type DataScene = {
  drawnFrom?: string[]
  weight?: number
  when?: Condition
  minigame?: string
  id: string
  title?: string
  speaker?: string
  tags?: string[]
  panel?: ScenePanel
  audio?: Record<string, string | null>
  picture?: PictureDef
  ui?: Ui<SceneUi>
  body: Block[]
  choices: Choice[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `drawnFrom` | `string[]` | yes |  | The draws this scene can come up in, by name: `['cafe']`. A `{ scene: { from: 'cafe' } }` effect draws one of the scenes that name `'cafe'` here. Separate from `tags`, which only style the scene. |
| `weight` | `number` | yes |  | How likely a draw is to pick it, against the others it could pick. 1 if left out. Needs `drawnFrom`. |
| `when` | `Condition` | yes |  | Only drawn while this holds. It gates draws only: a `scene` command or effect naming the scene opens it regardless. |
| `minigame` | `string` | yes |  | A minigame that starts when the scene is entered. The scene shows again once it ends. |
| `id` | `string` |  |  |  |
| `title` | `string` | yes |  | Its heading, the view's `scene.title`. The room's title, else the game's, if left out. |
| `speaker` | `string` | yes |  | Who the scene is with, by entity id or reference (`'ava'`, `'character:ava'`): the view's `scene.speaker` and `scene.image`. |
| `tags` | `string[]` | yes |  | Words the UI can style the scene by: `['letter']`, `['flashback']`. The engine gives them no meaning. |
| `panel` | `ScenePanel` | yes |  | A panel open for as long as the scene is: `{ panel: 'counter', with: { vendor: 'cafe' } }`. It is `view.panel`, as one the `panel` effect opens is, with the scene's id in `scene`. A panel needing worked-out data reads it from the view or a value. See `ScenePanel`. |
| `audio` | `Record<string, string \| null>` | yes |  | What plays on background channels while the scene is open, by channel: `{ ambience: 'rain' }`. Null silences one. |
| `picture` | `PictureDef` | yes |  | A layered picture with hotspots, drawn over the scene. See `view.scene.picture`. |
| `ui` | `Ui<SceneUi>` | yes |  | Presentation hints for the UI, carried to `view.scene.ui` as written. See `SceneUi`. |
| `body` | `Block[]` |  |  | What the scene shows, top to bottom: prose, text, speech, media, decisions and the rest. See `Block`. |
| `choices` | `Choice[]` |  |  | The buttons under the body. A flowing scene's picks are in its decisions instead. |

## decide

Function. Explained in [Flowing scenes](/docs/reference/flows#the-builders).

A decision: the flow waits here until the player picks one of `choices`.
The pick's `then` comes next, then the blocks after the decision. Its id
is unique within the scene.

```ts shape
import { decide } from '@ifloom/engine'
function decide(id: string, choices: FlowChoice[], extras?: BlockExtras): Block
```

## declaredTrait

Function. Explained in [Entities](/docs/reference/entities#declaredtrait).

The data of one trait on one entity, as content declares it, typed as
`TraitRegistry` says for the id; undefined when it doesn't have it. A row in
content's `traits` table wins, then the entity's own `traits`, each laid
over its kind's default. It reads content only, for a check or anything
else with no state: an entity created in play has its kind's here, and
`traitOf` adds what it was created with. It doesn't ask whether the
entity is still in the game.

```ts shape
import { declaredTrait } from '@ifloom/engine'
function declaredTrait<K extends string>(game: TraitSource, ref: string, id: K): TraitData<K> | undefined
```

## declaredWithTrait

Function. Explained in [Entities](/docs/reference/entities#declaredwithtrait).

Every declared entity that has a trait, as references, in content order: content only, as `declaredTrait` reads.

```ts shape
import { declaredWithTrait } from '@ifloom/engine'
function declaredWithTrait(game: TraitSource, id: string): EntityRef[]
```

## describeProblem

Function. Explained in [Checking content](/docs/reference/checks#problem-and-describeproblem).

A problem as a line: `pack · where · what`.

```ts shape
import { describeProblem } from '@ifloom/engine'
function describeProblem(problem: Problem): string
```

## Dice

Type. Explained in [Dice rolls](/docs/reference/rolls#dice).

Dice as content writes them: notation (`'2d6+1'`, `'1d20'`, `'d100'`) or a count of dice and their sides.

```ts shape
import type { Dice } from '@ifloom/engine'
type Dice = string | { count?: number; sides: number }
```

## dismiss

Function. Explained in [Notices](/docs/reference/notices#dismiss).

The state with one notice, or every notice, marked seen.

```ts shape
import { dismiss } from '@ifloom/engine'
function dismiss(state: GameState, id?: string): GameState
```

## draw

Function. Explained in [Randomness](/docs/reference/random#draw).

A whole number in [0, max), drawn from these parts.

```ts shape
import { draw } from '@ifloom/engine'
function draw(max: number, ...parts: (string | number)[]): number
```

## drawOne

Function. Explained in [Randomness](/docs/reference/random#drawone).

One of these, drawn from these parts.

```ts shape
import { drawOne } from '@ifloom/engine'
function drawOne<T>(items: readonly T[], ...parts: (string | number)[]): T
```

## Effect

Type. Explained in [Effects](/docs/reference/effects#effect).

An effect: one of the effects in `EffectMap`, told apart by its one key, as
a condition is (`{ stat: 'coins', by: -2 }`, `{ scene: null }`), or a
plugin's effect or the game's own in short: `{ 'quests/start': { quest: 'bakery' } }`,
`{ 'game/payRent': {} }`. It runs in its turn, on the state the effects
before it left. See `PluginCall`.

```ts shape
import type { Effect } from '@ifloom/engine'
type Effect =
  | { kv: string; to: KvValue; of?: string; }
  | { kv: string; by: Amount; of?: string; }
  | { kv: string; random: [Amount, Amount]; of?: string; }
  | { audio: string; to?: string | null; }
  | { entity: string; at?: string; by: Amount; }
  | { entity: string; at?: string; to: Amount; }
  | { turn: true | { by: number; }; }
  | { stat: string; by: Amount; of?: string; }
  | { stat: string; to: Amount; of?: string; }
  | { scene: string | { from: string; otherwise?: string; } | null; }
  | { timer: string; to?: number | null; }
  | { timer: string; by: number; }
  | { roll: string; dice: Dice; plus?: Amount; against?: Amount; }
  | { you: string | null; }
  | { minigame: string; }
  | { sound: string; }
  | { move: string; from?: string; to: string; by?: Amount; }
  | { remove: string; }
  | { create: string; } & CreateFields
  | { each: string | Select; where?: Condition; effects: Effect[]; }
  | { closeStoryline: string; turns: number; }
  | { notify: string; text?: string; image?: string; tag?: string; id?: string; }
  | { point: string; }
  | { panel: string | null; with?: PluginArgs; }
  | EffectCall
```

## EffectCall

Type. Explained in [Writing a plugin](/docs/reference/plugins#conditioncall-effectcall-and-commandcall).

An effect by name, a plugin's or the game's own, in short: checked against `EffectRegistry`.

```ts shape
import type { EffectCall } from '@ifloom/engine'
type EffectCall = CallIn<EffectRegistry>
```

## EffectRef

Type. Explained in [Calls by name](/docs/reference/custom#effectref).

An effect as content writes it: one of the engine's, or a plugin's or the game's own in short. The same as `Effect`.

```ts shape
import type { EffectRef } from '@ifloom/engine'
type EffectRef = Effect
```

## EffectRegistry

Type. Explained in [Writing a plugin](/docs/reference/plugins#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry).

The effects plugins and the game add, by full name, with what content writes as each one's value. As `ConditionRegistry`.

```ts shape
import type { EffectRegistry } from '@ifloom/engine'
type EffectRegistry = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## effectsOf

Function. Explained in [Actions and buttons](/docs/reference/actions#effectsof).

What a command would apply, worked out before it runs, for plugins' guards
and prices and locks by effect to look at: an action's cost (as stat
effects) then its effects, a choice's effects, a plugin
command's `effectsOf`. Anything else applies nothing that can be known ahead.

```ts shape
import { effectsOf, type Game } from '@ifloom/engine'
function effectsOf(state: GameState, game: Game, command: CommandRef): Effect[]
```

## entitiesOf

Function. Explained in [Entities](/docs/reference/entities#entitiesof).

Every entity of a kind in the game, as references: the declared ones in
the order content gives them, then the ones created in play, in the order
they came.

```ts shape
import { entitiesOf, type Game } from '@ifloom/engine'
function entitiesOf(state: GameState, game: Game, kind: string): EntityRef[]
```

## EntitiesView

Type. Explained in [The view](/docs/reference/view#entitiesview-and-entityview).

```ts shape
import type { EntitiesView } from '@ifloom/engine'
type EntitiesView = {
  id: string
  label: string
  plural: string
  unique: boolean
  entries: EntityView[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The kind's id: `'character'`. |
| `label` | `string` |  |  | The kind's name for one: `'Character'`. |
| `plural` | `string` |  |  | The kind's name for several, for a heading: `'Characters'`. Its `label` if the kind gives none. |
| `unique` | `boolean` |  |  | The kind's `unique`: each one is one particular thing. |
| `entries` | `EntityView[]` |  |  | Its entities that are listed and visible, declared ones first, then the ones created in play. |

## EntityDef

Type. Explained in [Entities](/docs/reference/entities#entitydef).

One thing of a kind, as content declares it: there from the start of the game.

```ts shape
import type { EntityDef } from '@ifloom/engine'
type EntityDef = {
  id: string
  of: string
  name: string
  description?: string
  image?: string
  tags?: string[]
  visible?: Condition
  stats?: Record<string, number>
  kv?: Record<string, KvValue>
  at?: Placement
  traits?: { [K in keyof TraitRegistry]?: Partial<TraitRegistry[K]> } & Record<string, unknown>
  ui?: Ui<EntityUi>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | Unique within its kind. |
| `of` | `string` |  |  | Its kind's id. |
| `name` | `string` |  |  | What the player reads: "Ana". Prose tokens are filled in when it is read. |
| `description` | `string` | yes |  | A line or two about it, tokens filled in as for the name. |
| `image` | `string` | yes |  | Its picture, through `artSrc`. |
| `tags` | `string[]` | yes |  | Words a UI or a plugin can sort or pick it by, after its kind's. |
| `visible` | `Condition` | yes |  | Whether the view lists it, asked with `'$'` as it. Always, if left out. |
| `stats` | `Record<string, number>` | yes |  | Where its stats start, where they differ from each stat's `start`. |
| `kv` | `Record<string, KvValue>` | yes |  | Its kv keys at the start. |
| `at` | `Placement` | yes |  | Who holds it at the start: a holder (`'player'`, or a unique entity such as `'character:ava'`) for one, or how many each holds: `{ player: 2, 'place:larder': 6 }`. Held by nobody if left out. |
| `traits` | `{ [K in keyof TraitRegistry]?: Partial<TraitRegistry[K]> } & Record<string, unknown>` | yes |  | Its traits, by trait id: `{ 'laundry/washable': { temp: 30 } }`. Over its kind's, and under a row for it in content's `traits` table. An object is laid over its kind's field by field, so it gives only the fields that differ. |
| `ui` | `Ui<EntityUi>` | yes |  | Presentation hints for the UI, laid over its kind's field by field, carried to the view as written. See `EntityUi`. |

## entityDescription

Function. Explained in [Entities](/docs/reference/entities#entitydescription).

An entity's description, filled like its name; undefined when it has none.

```ts shape
import { entityDescription, type Game } from '@ifloom/engine'
function entityDescription(state: GameState, game: Game, ref: string): string | undefined
```

## entityImage

Function. Explained in [Entities](/docs/reference/entities#entityimage).

An entity's picture as written (before `artSrc`): the one it was created with, its declaration's, else that of the one it was created `like`.

```ts shape
import { entityImage, type Game } from '@ifloom/engine'
function entityImage(state: GameState, game: Game, ref: string): string | undefined
```

## entityKv

Function. Explained in [Entities](/docs/reference/entities#entitykv).

An entity's kv store as it reads: the keys of the one it was created
`like`, then its declaration's, with what play set laid over them.

```ts shape
import { entityKv, type Game } from '@ifloom/engine'
function entityKv(state: GameState, game: Game, ref: string): Record<string, KvValue>
```

## entityName

Function. Explained in [Entities](/docs/reference/entities#entityname).

An entity's name as the player reads it: the name it was created with, or
its declaration's, with prose tokens filled. Its id when it has neither.

```ts shape
import { entityName, type Game } from '@ifloom/engine'
function entityName(state: GameState, game: Game, ref: string): string
```

## entityOf

Function. Explained in [Entities](/docs/reference/entities#entityof).

What play has changed about an entity: the save's record of it, `{}` for
a declared one nothing has changed. Undefined when it isn't in the game.

```ts shape
import { entityOf, type Game } from '@ifloom/engine'
function entityOf(state: GameState, game: Game, ref: string): EntityState | undefined
```

## EntityRef

Type. Explained in [Entities](/docs/reference/entities#entityref).

Which entity, as content names it: `'staff:ana'`, its kind and its id, so
a bare id or a typo with no `:` fails to compile where a reference is
wanted. Inside an `each` or a `count`'s `where`, content writes `'$'` for
the one being looked at, in fields typed as plain strings.

```ts shape
import type { EntityRef } from '@ifloom/engine'
type EntityRef = `${string}:${string}`
```

## EntityState

Type. Explained in [Entities](/docs/reference/entities#entitystate).

What play has changed about one entity, as the save keeps it. A declared
entity has no record until something changes it, and reads the rest from
its declaration; one created in play keeps the name it was given.

```ts shape
import type { EntityState } from '@ifloom/engine'
type EntityState = {
  name?: string
  description?: string
  image?: string
  like?: EntityRef
  tags?: string[]
  traitData?: Record<string, unknown>
  stats?: Stats
  kv?: Record<string, KvValue>
  traits?: Record<string, unknown>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `name` | `string` | yes |  | The name it was created with. A declared entity's name is read from content. |
| `description` | `string` | yes |  | The description it was created with, as written. |
| `image` | `string` | yes |  | The picture it was created with, as written. |
| `like` | `EntityRef` | yes |  | The entity it was created like: what it doesn't have itself (its name, description, picture, tags, stats, kv and traits) is read from that one. |
| `tags` | `string[]` | yes |  | Tags it was created with, after its kind's and its `like`'s. |
| `traitData` | `Record<string, unknown>` | yes |  | Trait data it was created with, by trait id, over its `like`'s or its kind's. Its traits' state is in `traits`. |
| `stats` | `Stats` | yes |  | Stats changed in play, by id. Others read from the declaration, then the stat's `start`. |
| `kv` | `Record<string, KvValue>` | yes |  | kv keys set in play. Others read from the declaration. |
| `traits` | `Record<string, unknown>` | yes |  | The state of its traits that keep one, by trait id, once play changed it. See `traitState`. |

## entityTags

Function. Explained in [Entities](/docs/reference/entities#entitytags).

An entity's tags: its kind's, then those of the one it was created `like`, then its own, each once.

```ts shape
import { entityTags, type Game } from '@ifloom/engine'
function entityTags(state: GameState, game: Game, ref: string): string[]
```

## EntityUi

Type. Explained in [Presentation hints](/docs/reference/ui-hints#sceneui-choiceui-blockui-entityui-statui-and-gameui).

Hints on a kind (for each of its entities) and on an entity, laid over its kind's. Empty here; a UI package augments it.

```ts shape
import type { EntityUi } from '@ifloom/engine'
type EntityUi = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## EntityView

Type. Explained in [The view](/docs/reference/view#entitiesview-and-entityview).

One entity as the UI draws it.

```ts shape
import type { EntityView } from '@ifloom/engine'
type EntityView = {
  id: string
  ref: string
  name: string
  description: string | null
  image: string | null
  tags: string[]
  flags: Record<string, boolean>
  stats: StatView[]
  kv: Record<string, KvValue>
  ui?: Ui<EntityUi>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `ref` | `string` |  |  | How content names it: `'staff:ana'`. |
| `name` | `string` |  |  | Its name, with prose tokens filled in. |
| `description` | `string \| null` |  |  | Its description, filled in the same way; null with none. |
| `image` | `string \| null` |  |  | Its picture's path, through `artSrc`; null with none. |
| `tags` | `string[]` |  |  | Its kind's tags, then its own. |
| `flags` | `Record<string, boolean>` |  |  | Each of its kind's `flags`, by name: whether it holds for this one. Empty when the kind declares none. |
| `stats` | `StatView[]` |  |  | Its kind's listed stats that the player can see on it, in declared order. |
| `kv` | `Record<string, KvValue>` |  |  | Its kv store as it reads: what it was declared with, and what play set. |
| `ui` | `Ui<EntityUi>` | yes |  | Its presentation hints, its own over its kind's, as written; left out with none. See `EntityUi`. |

## explain

Function. Explained in [Conditions](/docs/reference/conditions#explain).

Explain a condition against a state, part by part. No condition always holds.

```ts shape
import { explain, type Game } from '@ifloom/engine'
function explain(state: GameState, game: Game, condition: Condition | undefined): Explanation
```

## explainText

Function. Explained in [Conditions](/docs/reference/conditions#explaintext).

An explanation as indented lines, ✓ or ✗ on each: for a log or a debug panel.

```ts shape
import { explainText } from '@ifloom/engine'
function explainText(explanation: Explanation, depth?: number): string
```

## Explanation

Type. Explained in [Conditions](/docs/reference/conditions#explanation).

Why a condition holds or not, part by part.

The question authors ask most is "why is this greyed out?" or "why is this
missing?". `explain` answers it: the whole condition tree, each part marked
true or false, each leaf saying what it read and what it wanted.

```ts shape
import type { Explanation } from '@ifloom/engine'
type Explanation = {
  holds: boolean
  why: string
  parts?: Explanation[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `holds` | `boolean` |  |  | Whether this part holds. |
| `why` | `string` |  |  | One line: what this part checked, what it found. |
| `parts` | `Explanation[]` | yes |  | The parts of an `all`, `any` or `not`. |

## FileRef

Type. Explained in [Checking content](/docs/reference/checks#fileref).

A file the game names, as the page asks for it (after `artSrc` or `audioSrc`), with where it is named.

```ts shape
import type { FileRef } from '@ifloom/engine'
type FileRef = {
  path: string
  type: 'picture' | 'video' | 'audio'
  where: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `path` | `string` |  |  | The file, as the page asks for it. |
| `type` | `'picture' \| 'video' \| 'audio'` |  |  | What sort of file it is. |
| `where` | `string` |  |  | Where the content names it, as a `Problem`'s `where` is written. |

## FillPart

Type. Explained in [Saves](/docs/reference/saves#fillpart).

What `MigrationTools.fill` can fill, each named by the feature that fills
it: the player's stats (start values), kv keys (the content's starting kv
and the keys it resets each turn) and play settings (defaults).

```ts shape
import type { FillPart } from '@ifloom/engine'
type FillPart =
  | 'kv'
  | 'settings'
  | 'stats'
```

## fillTokens

Function. Explained in [Prose and markup](/docs/reference/prose#filltokens).

Fill the tokens a line of prose may carry:

- `{{name}}`: a name of the game's own, looked up as a phrase (content's
  `phrases`, with `.` between groups: `{{outfit.verdict}}`), then a value
  in `rules.values`, then a key in the kv store (a name the player typed is
  a key like any other: `{{playerName}}`);
- `{{plugin/name}}`: a plugin's value, with any arguments after the name:
  `{{messages/unread channel=texts}}`;
- `{{kv:key of=storyline:baker}}`: a key in another kv store;
- `{{v:game/name}}` and `{{v:plugin/name}}`, the older way to write a
  value, which still works.

Any of them can end in `|` and words shown while the token is unset:
`{{flatmateName|Your flatmate}}`. Unset is a kv key that is unset or not
text or a number, a phrase no row of which holds, a value nobody has, or
one that gives `''`. The fallback is shown as written, with no tokens in it.
Without one, an unset bare name (`{{name}}`) prints nothing, and any other
token naming nothing is left as it is, so the missing name shows on
screen. Words a token prints are never read for tokens again, but a
phrase's own words are filled when it is printed.

```ts shape
import { fillTokens, type Game } from '@ifloom/engine'
function fillTokens(state: GameState, game: Game, text: string): string
```

## FlowChoice

Type. Explained in [Flowing scenes](/docs/reference/flows#flowchoice).

A choice at a decision: a `Choice`, and what the flow shows once it is picked, before carrying on.

```ts shape
import type { FlowChoice } from '@ifloom/engine'
type FlowChoice = {
  id: string
  label?: string
  labels?: { when?: Condition; label: string }[]
  when?: Condition
  blocked?: Blocked[]
  cost?: ActionCost
  effects?: EffectRef[]
  command?: CommandRef
  once?: (Once & { key?: string; })
  tags?: string[]
  irreversible?: string
  ui?: Ui<ChoiceUi>
  then?: Block[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `label` | `string` | yes |  | Its words, as written, with tokens filled: `'Order a tea'`. A scene's choice with none shows its id; an action with none is never drawn as a button. |
| `labels` | `{ when?: Condition; label: string }[]` | yes |  | Words that depend on state, "Not today" before you have bought it, "Right." after. The first whose `when` holds wins; `label` is the fallback. |
| `when` | `Condition` | yes |  | Only offered, and only done, while this holds. |
| `blocked` | `Blocked[]` | yes |  | Shown but greyed out while one of these holds, with its reason (or left off with `hide`), and refused with it. The first that holds wins. |
| `cost` | `ActionCost` | yes |  | Stats it spends: checked before it runs, listed on its button, and paid after its command. |
| `effects` | `EffectRef[]` | yes |  | Applied after the cost, in order. A plugin's or the game's own in short for one that is computed. |
| `command` | `CommandRef` | yes |  | A command it sends as well, run first: a plugin's in short (`{ 'devices/open': { id: 'messages' } }`) or the engine's. It is greyed out with that command's reason while it would be refused, and its price includes what the command spends. Any command but `choose`. |
| `once` | `(Once & { key?: string; })` | yes |  | Once in the game (`{ per: 'game' }`) or once a turn (`{ per: 'turn' }`): spent once it has been pressed, as `state.chosen` counts it. `reason` is what the player reads on it afterwards: a choice stays on screen and pays nothing more, an action is refused. |
| `tags` | `string[]` | yes |  | Words the UI can style or filter it by. The engine gives them no meaning. |
| `irreversible` | `string` | yes |  | A warning that it can't be undone, which the UI shows on it. |
| `ui` | `Ui<ChoiceUi>` | yes |  | Presentation hints for the UI, carried to its button as written. See `ChoiceUi`. |
| `then` | `Block[]` | yes |  | Shown once it is picked, then the flow carries on after the decision, or from the point its `{ point }` effect names. |

## FlowState

Type. Explained in [Flowing scenes](/docs/reference/flows#flowstate).

The open scene's visit: its path so far, and what the flow is waiting on, if anything.

```ts shape
import type { FlowState } from '@ifloom/engine'
type FlowState = {
  scene: string
  path: FlowStep[]
  waiting: { minigame: string } | { panel: string } | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `scene` | `string` |  |  | The scene this visit is of. |
| `path` | `FlowStep[]` |  |  | The picks made, the points jumped to and the minigames and panels done with, in order: what the view replays to draw the visit. |
| `waiting` | `{ minigame: string } \| { panel: string } \| null` |  |  | The minigame being played or the panel open where the flow stands, until it is done; null while it waits on nothing. |

## FlowStep

Type. Explained in [Flowing scenes](/docs/reference/flows#flowstep).

One step of a visit's path, in the order they came: a pick at a decision
or among the ending choices (`chose`), a jump to a point a pick made, or a
minigame or panel in the flow done with.

```ts shape
import type { FlowStep } from '@ifloom/engine'
type FlowStep = { chose: string } | { point: string } | { minigame: string } | { panel: string }
```

## fold

Function. Explained in [Flowing scenes](/docs/reference/flows#the-builders).

Blocks the player can open and shut, under `label`: a letter to read, a
long aside. It is presentation only, a section with the React UI's `fold`
hint, and keeps no state; a UI that doesn't know the hint shows the blocks.

```ts shape
import { fold } from '@ifloom/engine'
function fold(label: string, blocks: Block[], extras?: BlockExtras): Block
```

## Formula

Type. Explained in [Stats](/docs/reference/stats#formula).

How a derived stat is worked out from other stats. A number is itself, a
string is another stat's value (the same entity's, for a stat with `of`),
and the rest combine formulas:

- `{ sum: [...] }`, `{ product: [...] }`, `{ min: [...] }`, `{ max: [...] }`;
- `{ scale: f, by: n }` is f times n;
- `{ clamp: f, min?, max? }` holds f between the two.

```ts shape
import type { Formula } from '@ifloom/engine'
type Formula = number | string | { sum: Formula[] } | { product: Formula[] } | { min: Formula[] } | { max: Formula[] } | { scale: Formula; by: number } | { clamp: Formula; min?: number; max?: number }
```

## Game

Type. Explained in [The game](/docs/reference/game#game).

A game: what the core reads, and what each feature does.

```ts shape
import type { Game } from '@ifloom/engine'
type Game = {
  id: string
  title: string
  version?: number
  packs?: string[]
  prose?: ProseStore
  rules?: GameRules
  strings?: Record<string, string>
  plugins?: readonly Plugin<any>[]
  data?: Record<string, Record<string, readonly PluginEntry[]>>
  kinds?: KindDef[]
  entities?: EntityDef[]
  traits?: TraitTable
  kv?: Record<string, KvValue>
  resets?: Record<string, KvValue>
  storylines?: StorylineDef[]
  actions?: ActionDef[]
  triggers?: TriggerDef[]
  inputs?: InputDef[]
  settings?: SettingDef[]
  stats?: StatDef[]
  introScene?: string
  scenes: DataScene[]
  minigames?: MinigameDef[]
  timers?: TimerDef[]
  audio?: GameAudio
  media?: GameMedia
  ui?: Ui<GameUi>
  saveable?: Blocked[]
  locks?: Lock[]
  phrases?: Record<string, PhraseRow[] | PhraseWithArgs>
  changes?: ChangesDef
  carryOver?: CarryOver
  finished?: Condition
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `title` | `string` |  |  | The game's name, as a title screen shows it. |
| `version` | `number` | yes |  | The game's own version, a whole number from 1. Saves record it, and `migrations` carry an older save forward. Declaring it also stops the engine filling new stats, settings and entities into old saves by itself: your migration steps (`rules.migrations`) fill them with `tools.fill()`. 1 if left out. |
| `packs` | `string[]` | yes |  | The ids of the packs the game was loaded with, in order (not its own content, which has none). Saves record them. |
| `prose` | `ProseStore` | yes |  | The words read by key: `prose`, `variants` and their weights, filled in for a save. `loadGame` makes it from the content's `prose`. |
| `rules` | `GameRules` | yes |  | The game's own code: its hooks, providers and the calls content makes as `game/<name>`. See `GameRules`. |
| `strings` | `Record<string, string>` | yes |  | The game's words for anything the engine or a plugin says to the player, by key: `{ finishFirst: 'Not yet.', 'quests/notDoing': 'Not on your list.' }`. Packs can add theirs; a later pack's line wins. |
| `plugins` | `readonly Plugin<any>[]` | yes |  | The plugins the game is built with, in the order their hooks run. |
| `data` | `Record<string, Record<string, readonly PluginEntry[]>>` | yes |  | Content for plugins, by plugin id and then list: `data.quests.quests`. Merged from packs by id, as scenes are. |
| `kinds` | `KindDef[]` | yes |  | The kinds of thing the game keeps several of, each with its own stats. |
| `entities` | `EntityDef[]` | yes |  | The things of those kinds there are at the start. More can be created in play. |
| `traits` | `TraitTable` | yes |  | Traits by id and then entity. Given to `loadGame`, rows over what entities declare; on the game it returns, every entity's traits, worked out. Read them with `declaredTrait`. |
| `kv` | `Record<string, KvValue>` | yes |  | The kv store a new game starts with, such as the stretch it opens in: `{ phase: 'arrival' }`. |
| `resets` | `Record<string, KvValue>` | yes |  | kv keys put back at the start of each turn, with the value each goes back to: what "once this turn" was counting. |
| `storylines` | `StorylineDef[]` | yes |  | Threads of story with their own kv store, closed for a while when they need a rest. None if left out. |
| `actions` | `ActionDef[]` | yes |  | What the player can do, by id. One with a `label` is a button in every room while no scene is open; one with none is done only by `{ type: 'action', id }`. None if left out. |
| `triggers` | `TriggerDef[]` | yes |  | Effects that happen by themselves the first time a condition holds. |
| `inputs` | `InputDef[]` | yes |  | What the player can type or pick, and the kv key each one writes. |
| `settings` | `SettingDef[]` | yes |  | What the player can change from a settings screen. None if left out. |
| `stats` | `StatDef[]` | yes |  | Every stat the game keeps. The engine has none of its own. |
| `introScene` | `string` | yes |  | The scene on screen on the first frame. Left out, the game opens on its idle screen. |
| `scenes` | `DataScene[]` |  |  | Every scene, as data. |
| `minigames` | `MinigameDef[]` | yes |  | The game's minigames. None if left out. |
| `timers` | `TimerDef[]` | yes |  | The game's timers. None if left out. |
| `audio` | `GameAudio` | yes |  | The game's sounds and channels. No audio if left out. |
| `media` | `GameMedia` | yes |  | The game's pools of pictures and videos. None if left out. |
| `ui` | `Ui<GameUi>` | yes |  | Hints for the whole game, such as how every screen comes in. Carried as written; the engine gives them no meaning. |
| `saveable` | `Blocked[]` | yes |  | When saving is refused, and why: `blocked` entries, refused while `when` holds, as a choice's are. The first that holds gives the reason. Saving is always allowed if left out. |
| `locks` | `Lock[]` | yes |  | What the player cannot do for now, and why. Checked in order; the first that stops a command gives the reason. |
| `phrases` | `Record<string, PhraseRow[] \| PhraseWithArgs>` | yes |  | The game's phrases, by their full dotted name (`outfit.verdict`), each as its rows, or its rows with the arguments it takes. None if left out. |
| `changes` | `ChangesDef` | yes |  | The stats whose changes are tracked, from content and every pack together. Left out, nothing is tracked. |
| `carryOver` | `CarryOver` | yes |  | What a New Game+ carries over from the game before. See `startingState`'s `carry`. |
| `finished` | `Condition` | yes |  | When the game counts as finished. The runner records the first time it holds in the profile's `core:finished`, so a title screen can offer New Game+. |

## GameAudio

Type. Explained in [Audio](/docs/reference/audio#gameaudio).

The game's sounds, the channels they play on and the settings that set their volume.

```ts shape
import type { GameAudio } from '@ifloom/engine'
type GameAudio = {
  tracks: Record<string, TrackDef | PlaylistDef>
  channels?: Record<string, ChannelDef>
  mute?: string
  sound?: string
  default?: Record<string, string>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `tracks` | `Record<string, TrackDef \| PlaylistDef>` |  |  | Every track and playlist, by id: a file with its volume, or a list of tracks to play in turn. |
| `channels` | `Record<string, ChannelDef>` | yes |  | Merged over the defaults: `music` and `ambience` (background), `sfx` and `voice` (cue). |
| `mute` | `string` | yes |  | A ui setting (a toggle) that mutes everything while it is on: a "Mute" box. |
| `sound` | `string` | yes |  | A ui setting (a toggle) that plays sound only while it is on: a "Sound" box, the other way round from `mute`. |
| `default` | `Record<string, string>` | yes |  | What each background channel plays when nothing else says, by channel. |

## GameBase

Type. Explained in [Content, packs and loading](/docs/reference/loader#gamebase).

What `loadGame` takes beside the content: what the game is (its `id`,
`title` and `version`) and its code (its plugins and its rules). Anything a
mod could change is content, and goes in the content or a pack instead.

```ts shape
import type { GameBase } from '@ifloom/engine'
type GameBase = {
  id: string
  title: string
  version?: number
  plugins?: readonly Plugin<any>[]
  rules?: GameRules
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `title` | `string` |  |  | The game's name, as a title screen shows it. |
| `version` | `number` | yes |  | The game's own version, a whole number from 1. Saves record it, and `migrations` carry an older save forward. Declaring it also stops the engine filling new stats, settings and entities into old saves by itself: your migration steps (`rules.migrations`) fill them with `tools.fill()`. 1 if left out. |
| `plugins` | `readonly Plugin<any>[]` | yes |  | The plugins the game is built with, in the order their hooks run. |
| `rules` | `GameRules` | yes |  | The game's own code: its hooks, providers and the calls content makes as `game/<name>`. See `GameRules`. |

## GameMedia

Type. Explained in [Media](/docs/reference/media#gamemedia).

The game's media: pools of files, by id.

```ts shape
import type { GameMedia } from '@ifloom/engine'
type GameMedia = {
  pools?: Record<string, PoolFile[]>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `pools` | `Record<string, PoolFile[]>` | yes |  | Named lists of files content picks from: `[[img:@door\|night]]`, `{ pool: 'door', tags: ['night'] }`. |

## GameRules

Type. Explained in [Rules and hooks](/docs/reference/rules#gamerules).

The game's own code: a plain object with what a plugin can have, for the
game itself, with no plugin to write. Content calls what it declares as it
calls a plugin's, with `game` as the plugin's id: `{ 'game/tired': true }`
as a condition, `{ 'game/payRent': {} }` as an effect, `{{catName}}` in
prose, `{ 'game/rest': true }` as a command.

The engine runs it as the plugin `game`, the first of the game's plugins:
every hook and provider runs before every plugin's, with the same context a
plugin's gets (`PluginContext`, and `TurnContext` for the turn hooks), whose
`slice`, `get` and `set` read and write the game's own state when it has a
`start`. Every member is optional and means what a plugin's does (see
`Plugin`), but `migrations`, which carry the whole save from one version of
the game to the next. A plugin's identity, versions, content, words and declared calls and data are
the game's own content, so they aren't here. What is locked and what resets
each turn are content: `locks` and `resets`.

```ts shape
import type { GameRules, Game } from '@ifloom/engine'
type GameRules<S = any> = {
  conditions?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => boolean>
  effects?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => GameState>
  view?: ((state: GameState, context: PluginContext<S>) => unknown)
  references?: PluginReferences
  commands?: Record<string, PluginCommand<S, PluginArgs>>
  traits?: readonly TraitDef<any, any>[]
  actions?: ((state: GameState, context: PluginContext<S>) => readonly ButtonDef[] | undefined)
  audio?: ((state: GameState, context: PluginContext<S>) => Record<string, string | null> | undefined)
  scene?: ((state: GameState, context: PluginContext<S>) => RoomScene | undefined)
  action?: ((state: GameState, id: string, context: PluginContext<S>) => ButtonDef | undefined)
  label?: ((state: GameState, context: PluginContext<S>) => string | undefined)
  start?: ((game: Game) => S)
  values?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => string | number>
  macros?: Record<string, Macro<S, PluginArgs>>
  queries?: Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => unknown>
  statModifiers?: ((state: GameState, context: PluginContext<S>) => readonly StatModifier[] | undefined)
  onTurn?: ((state: GameState, context: TurnContext<S>) => GameState)
  onTurnDone?: ((state: GameState, context: TurnContext<S>) => GameState)
  onStat?: ((before: GameState, after: GameState, stat: string, by: number, context: PluginContext<S>) => GameState)
  onCommand?: ((before: GameState, after: GameState, context: PluginContext<S>) => GameState)
  guard?: ((state: GameState, asked: Asked, context: PluginContext<S>) => Refusal | undefined)
  price?: ((state: GameState, effects: readonly Effect[], context: PluginContext<S>) => string[] | undefined)
  saveName?: ((state: GameState, context: PluginContext<S>) => string | undefined)
  profile?: ((state: GameState, previous: GameState, stored: unknown, context: PluginContext<S>) => unknown)
  check?: (game: Game, tools: CheckTools) => PluginProblem[]
  migrations?: Record<number, (state: GameState, tools: MigrationTools) => GameState>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `conditions` | `Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => boolean>` | yes |  | Conditions content can test, by name, without the prefix. |
| `effects` | `Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => GameSta…` | yes |  | Effects content can apply, by name. Each takes the state as the effects before it left it and returns the next one, so two in one list compose. What one does is hidden from prices and guards until it runs; an effect that only stands for other effects is a `macro` instead. |
| `view` | `((state: GameState, context: PluginContext<S>) => unknown)` | yes |  | What the UI needs from this plugin, at `view.plugins[id]`. `V` is its type; declare it in `ViewRegistry` under the plugin's id, and every view types `view.plugins[id]` as `V`. |
| `references` | `PluginReferences` | yes |  | What this plugin's calls and content name, for the content checker to resolve as it resolves the engine's own. See `PluginReferences`. |
| `commands` | `Record<string, PluginCommand<S, PluginArgs>>` | yes |  | Commands a button can send, by name. |
| `traits` | `readonly TraitDef<any, any>[]` | yes |  | Traits this plugin gives meaning to: named data entities carry, written on a kind, an entity or content's `traits` table, which the plugin reads with `declaredTrait`. Each id is the plugin's id, `/` and a name. Data only: what a trait does is the plugin's code. |
| `actions` | `((state: GameState, context: PluginContext<S>) => readonly ButtonDef[] \| undefined)` | yes |  | Actions offered while no scene is open, drawn as buttons before the game's own `actions` and exactly like them: a room's things to do, say. |
| `audio` | `((state: GameState, context: PluginContext<S>) => Record<string, string \| null> \| undefin…` | yes |  | What plays on background channels, by channel: a place's ambience. Below an open scene's choice and an `audio` effect's, above the game's default. Null silences a channel; a channel left out is the next plugin's, then the default's. The first plugin that names a channel wins it. |
| `scene` | `((state: GameState, context: PluginContext<S>) => RoomScene \| undefined)` | yes |  | What the screen shows while no scene is open: a room's description, a shop front, a dashboard's heading. The first plugin that answers fills it; with none, the screen is the game's title and its buttons. |
| `action` | `((state: GameState, id: string, context: PluginContext<S>) => ButtonDef \| undefined)` | yes |  | One of this plugin's actions that isn't among its `actions` now, by id without the prefix: an app's, say. `{ type: 'action', id: '<plugin>/<id>' }` does it, as for a button with a cost or effects, which is looked up among the `actions` when this has none. Undefined when there is none. |
| `label` | `((state: GameState, context: PluginContext<S>) => string \| undefined)` | yes |  | Where the game is, in a few words for a header or a save: "Day 3 · Wednesday morning". |
| `start` | `((game: Game) => S)` | yes |  | Its state in a new game. A plugin with no state leaves this out. |
| `values` | `Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => string…` | yes |  | Words and numbers content can read by name, asked with arguments as a condition is: in prose as &lt;code v-pre>{{id/name channel=texts}}&lt;/code>, and as `{ value: 'id/name', with }` for a badge or a stat's ceiling. |
| `macros` | `Record<string, Macro<S, PluginArgs>>` | yes |  | Effects that stand for other effects, by name, called by content as any effect is: each returns the effects it stands for, worked out from the state, so a button's price and the guards see what it would do. A name is an effect's or a macro's, never both. See `Macro`. |
| `queries` | `Record<string, (state: GameState, args: PluginArgs, context: PluginContext<S>) => unknown>` | yes |  | Answers other plugins can ask for by name, without importing this one: `context.query('calendar/whenNext', { when })`. For what a condition's yes or no cannot say — a place, a time, a list. |
| `statModifiers` | `((state: GameState, context: PluginContext<S>) => readonly StatModifier[] \| undefined)` | yes |  | Changes to what the player's stats read right now, worked out from the plugin's state: a timed boost, say. Nothing is written into the state; every reading of the stat (conditions, derived stats, costs, the view) sees the changed value, and `stat` effects still write the kept value underneath. Must not read stats itself, or it reads itself. |
| `onTurn` | `((state: GameState, context: TurnContext<S>) => GameState)` | yes |  | A hook: the end of a turn, once the counter has moved on and `resets` are back, in the order the hooks run (the game's first). Returns the next state. `context.before` is the state as the turn ended, and a `turn` effect applied through `context.apply` does nothing. |
| `onTurnDone` | `((state: GameState, context: TurnContext<S>) => GameState)` | yes |  | A hook: the end of a turn, once every `onTurn` has run, so it sees what they did: the calendar's new day, a status worn off. In the same order and with the same context as `onTurn`. Returns the next state. |
| `onStat` | `((before: GameState, after: GameState, stat: string, by: number, context: PluginContext<S…` | yes |  | A hook: one of the player's stats just changed, by a `stat` effect. `before` is the state before it, `after` the state with it, `by` how far it moved. Return `before` to say it did not take, `after` to let it, or `after` with more besides. Runs in the order the hooks run (the game's first), each seeing what the one before returned. |
| `onCommand` | `((before: GameState, after: GameState, context: PluginContext<S>) => GameState)` | yes |  | A hook: after every command that took, with the state it started from and the state after. The context is the state after. Returns the next state. |
| `guard` | `((state: GameState, asked: Asked, context: PluginContext<S>) => Refusal \| undefined)` | yes |  | Whether a command may go ahead, given what it would do (`effectsOf`). Asked of every command but the ones that ignore locks, after the locks. |
| `price` | `((state: GameState, effects: readonly Effect[], context: PluginContext<S>) => string[] \|…` | yes |  | What a button costs that the engine cannot say, in the plugin's words: `['until evening']`. Asked with the effects the button would apply. |
| `saveName` | `((state: GameState, context: PluginContext<S>) => string \| undefined)` | yes |  | The name a save is listed under, such as the name the player typed, kept as `SaveMeta.playerName` and shown for `@you`'s lines. The first that answers names it (the game's first); with none, saves have no name. |
| `profile` | `((state: GameState, previous: GameState, stored: unknown, context: PluginContext<S>) => u…` | yes |  | What the plugin keeps in the player's profile, which outlives saves and new games: earned achievements, a gallery of endings. The runner asks it after every command that took, with the state after, the state before and what the plugin's profile namespace (its id) holds now. Return a new value to store, or undefined to leave it. Only a runner with a `profile` asks; `apply` never does. |
| `check` | `(game: Game, tools: CheckTools) => PluginProblem[]` | yes |  | Rules of this plugin's own that a reference can't say: two entries with one id, an exit to nowhere. Run by the content checker after the references; `tools` words anything else the plugin names as the checker does. |
| `migrations` | `Record<number, (state: GameState, tools: MigrationTools) => GameState>` | yes |  | Steps that carry a save from one version of the game to the next, keyed by the version they upgrade from: step 1 takes a version-1 save to version 2. They run when an older save loads, after the engine's and plugins' own migrations, on the whole state. A version with no step is carried forward unchanged. The version is the base's `version`. |

## GameState

Type. Explained in [Game state](/docs/reference/state#gamestate).

The whole save: the core's fields and each feature's. Each field's new-game
value and load default are declared once, in `FIELDS` (intake.ts) or the
feature's `state`.

```ts shape
import type { GameState, Notice } from '@ifloom/engine'
type GameState = {
  version: typeof SAVE_VERSION
  seed: number
  plugins: Record<string, PluginSlice>
  gameVersion?: number
  entities: Record<string, Record<string, EntityState>>
  created: Record<string, number>
  removed: string[]
  held: Record<string, Record<string, number>>
  you: EntityRef | null
  turn: number
  kv: Record<string, KvValue>
  storylines: Record<string, StorylineState>
  notices: Notice[]
  fired: Record<string, number>
  settings: Record<string, KvValue>
  stats: Stats
  sceneId: string | null
  seen: Record<string, Times>
  chosen: Record<string, Times>
  minigame: MinigameState | null
  flow: FlowState | null
  timers: Record<string, RunningTimer>
  audio: AudioState
  media: MediaState
  panel: OpenPanel | null
  rolls: RollsState
  changes: Change[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `version` | `typeof SAVE_VERSION` |  |  | The save format's version, `SAVE_VERSION`: `loadState` carries an older one forward. |
| `seed` | `number` |  |  | Fixed per save. Keeps variant variants from dealing identically every run. |
| `plugins` | `Record<string, PluginSlice>` |  |  | Each plugin's own state, by plugin id. |
| `gameVersion` | `number` | yes |  | The game's own version (`game.version`) the save was made with. Only there when the game declares a version; a save without it is version 1. |
| `entities` | `Record<string, Record<string, EntityState>>` |  |  | What play changed about the game's entities, by kind and id: `entities.staff.ana`. A declared entity has no record until something changes it; one created in play has one from the start. |
| `created` | `Record<string, number>` |  |  | How many of each kind have been created in play, for the next one's id. |
| `removed` | `string[]` |  |  | Entities the game declares that were removed in play, by reference: gone for good. |
| `held` | `Record<string, Record<string, number>>` |  |  | What play changed about who holds what, by holder and then thing: `held.player['food:apple']`. A count is kept once written, 0 included; anything else reads where content's `at` starts it. |
| `you` | `EntityRef \| null` |  |  | The protagonist the player is playing, as `'you'` reads: null for the player themselves. |
| `turn` | `number` |  |  | How many turns have passed: the engine's one clock. What a turn is belongs to the game — a day, an hour, a week, a chapter — and everything the engine dates (`seen`, `fired`, notices) is dated in turns. |
| `kv` | `Record<string, KvValue>` |  |  |  |
| `storylines` | `Record<string, StorylineState>` |  |  |  |
| `notices` | `Notice[]` |  |  | What the game has told the player outside scenes, oldest first. |
| `fired` | `Record<string, number>` |  |  | The turn each trigger last fired, by trigger id. |
| `settings` | `Record<string, KvValue>` |  |  | The value of each `play` setting the game declares, by id. |
| `stats` | `Stats` |  |  | The player's stats. An entity's are on the entity. |
| `sceneId` | `string \| null` |  |  |  |
| `seen` | `Record<string, Times>` |  |  | Each scene the player has entered, by id: how many times, and the turn of the first time and the last. The engine's own record of what the player has actually watched, so a chain can say "not until you have seen the rung before this one", and how long ago, without every link needing a hand-written kv key. Re-entering the scene you are already in — a hub redrawing itself after a choice — is not a viewing and does not count. |
| `chosen` | `Record<string, Times>` |  |  | Each choice the player has picked, by `scene#choice`: how many times, and the turn of the first time and the last. Kept for every choice, so content can branch on an earlier decision without each one needing a kv key of its own, and a choice's `once` reads it. |
| `minigame` | `MinigameState \| null` |  |  | The minigame being played, or null. |
| `flow` | `FlowState \| null` |  |  | The open scene's visit: each pick, jump and wait passed, in order, and what the flow waits on. Null with no scene open, and for a visit with nothing to keep yet. It starts again each time a scene is entered. |
| `timers` | `Record<string, RunningTimer>` |  |  | The running timers, by id, in the order they started. |
| `audio` | `AudioState` |  |  | What effects have put on the audio channels, the last few sounds, and the count of scenes entered. |
| `media` | `MediaState` |  |  | The file each pool request was given, so a revisit and a reload show the same one. |
| `panel` | `OpenPanel \| null` |  |  | The panel open over the story, or null. |
| `rolls` | `RollsState` |  |  |  |
| `changes` | `Change[]` |  |  | The stats the last command moved, in the order the game declares them, the player's first. A tick that moved nothing keeps the list before it. |

## GameUi

Type. Explained in [Presentation hints](/docs/reference/ui-hints#sceneui-choiceui-blockui-entityui-statui-and-gameui).

Hints for the whole game. Empty here; a UI package augments it.

```ts shape
import type { GameUi } from '@ifloom/engine'
type GameUi = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## give

Function. Explained in [Entities](/docs/reference/entities#give-take-move-and-holding).

Give the player (whoever they are playing) some of a thing: 1 if left
out. A unique thing someone else holds is taken from them.

```ts fragment
effects: [give('food:apple', 2)]
```

```ts shape
import { give } from '@ifloom/engine'
function give(ref: string, n?: number): Effect
```

## hash

Function. Explained in [Randomness](/docs/reference/random#hash).

FNV-1a, then the murmur3 finalizer. One character changes every bit.

```ts shape
import { hash } from '@ifloom/engine'
function hash(text: string): number
```

## heldBy

Function. Explained in [Entities](/docs/reference/entities#heldby).

What a holder (`'you'` by default) holds, and how many of each, in the
order the game has its entities: declared ones in content order, then
those created in play.

```ts shape
import { heldBy, type Game } from '@ifloom/engine'
function heldBy(state: GameState, game: Game, at?: string): { ref: EntityRef; count: number }[]
```

## heldCount

Function. Explained in [Entities](/docs/reference/entities#heldcount).

How many of a thing a holder holds (`'you'` by default): 0 for anything not held there, or not in the game.

```ts shape
import { heldCount, type Game } from '@ifloom/engine'
function heldCount(state: GameState, game: Game, ref: string, at?: string): number
```

## HeldView

Type. Explained in [The view](/docs/reference/view#heldview).

One thing a holder has, as the UI draws it.

```ts shape
import type { HeldView } from '@ifloom/engine'
type HeldView = {
  ref: EntityRef
  name: string
  description: string | null
  image: string | null
  tags: string[]
  count: number
  at: Holder
  ui?: Ui<EntityUi>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `ref` | `EntityRef` |  |  | How content names it: `'food:apple'`. |
| `name` | `string` |  |  | Its name, with prose tokens filled in. |
| `description` | `string \| null` |  |  | Its description, filled in the same way; null with none. |
| `image` | `string \| null` |  |  | Its picture's path, through `artSrc`; null with none. |
| `tags` | `string[]` |  |  | Its kind's tags, then its own. |
| `count` | `number` |  |  | How many are held. |
| `at` | `Holder` |  |  | Who holds it: the protagonist being played, or `'player'`. |
| `ui` | `Ui<EntityUi>` | yes |  | Its presentation hints, its own over its kind's, as written; left out with none. See `EntityUi`. |

## HelperRegistry

Type. Explained in [The runner](/docs/reference/runner#helperregistry).

What a helper started beside the runner reports, by its id, for a UI to
draw: `startUnlocks` from `@ifloom/plugin-unlocks` reports `unlocks`. A
helper types its own by augmenting this, as a plugin types its view in
`ViewRegistry`.

```ts shape
import type { HelperRegistry } from '@ifloom/engine'
type HelperRegistry = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## HelpersIn

Type. Explained in [The runner](/docs/reference/runner#helpersin).

What the helpers report, by id: typed for each helper that declares itself in `HelperRegistry`.

```ts shape
import type { HelpersIn } from '@ifloom/engine'
type HelpersIn = {
  [key: string]: unknown
  // …
}
```

Plugins add fields of their own to it, which their pages list.

## HistoryOptions

Type. Explained in [The runner](/docs/reference/runner#historyoptions).

Undo and redo. Off unless the game asks for it; when on, `depth` steps deep,
and never back past a barrier.

```ts shape
import type { HistoryOptions } from '@ifloom/engine'
type HistoryOptions = {
  depth?: number
  stopAtIrreversible?: boolean
  stopAtNewTurn?: boolean
  stopWhen?: Condition
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `depth` | `number` | yes |  | How many steps back undo reaches. 50 if left out. |
| `stopAtIrreversible` | `boolean` | yes |  | No undo past a choice the game marks `irreversible`. On unless set false. |
| `stopAtNewTurn` | `boolean` | yes |  | No undo past the start of a new turn. |
| `stopWhen` | `Condition` | yes |  | No undo past any state where this holds, tested after each command. |

## Holder

Type. Explained in [Entities](/docs/reference/entities#holder-and-placement).

Who holds things: `'player'`, a unique entity (`'character:ava'`), or
`'you'`, whoever the player is playing now (the player, unless a `you`
effect switched to a protagonist).

```ts shape
import type { Holder } from '@ifloom/engine'
type Holder = EntityRef | typeof PLAYER | typeof YOU
```

## holderOf

Function. Explained in [Entities](/docs/reference/entities#holderof).

Who holds a thing, when one holder does (always so for a unique thing); undefined when nobody does.

```ts shape
import { holderOf, type Game } from '@ifloom/engine'
function holderOf(state: GameState, game: Game, ref: string): Holder | undefined
```

## holding

Function. Explained in [Entities](/docs/reference/entities#give-take-move-and-holding).

Whether the player (whoever they are playing) holds at least `n` of a thing: 1 if left out.

```ts shape
import { holding } from '@ifloom/engine'
function holding(ref: string, n?: number): Condition
```

## holds

Function. Explained in [Conditions](/docs/reference/conditions#holds).

Whether a condition holds. No condition always holds. A condition is
looked up by its one kind key (`TABLES` in core.ts); one with no kind key,
or two, holds nowhere, and the content checker reports it. A range bound
that is an `Amount` is worked out first, so the kind reads a number.

```ts shape
import { holds, type Game } from '@ifloom/engine'
function holds(state: GameState, game: Game, condition: Condition | undefined): boolean
```

## HotspotDef

Type. Explained in [Media](/docs/reference/media#hotspotdef).

A clickable area on a picture, drawn by the UI as a button. It does one of two
things: sends `command`, or takes the scene's choice `choice`.

```ts shape
import type { HotspotDef } from '@ifloom/engine'
type HotspotDef = {
  id: string
  rect: [ number, number, number, number ]
  label: string
  command?: CommandRef
  choice?: string
  when?: Condition
  layer?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `rect` | `[ number, number, number, number ]` |  |  | Where it sits, in percent of the picture: `[x, y, width, height]` from the top left. |
| `label` | `string` |  |  | What a screen reader reads, and the tooltip. |
| `command` | `CommandRef` | yes |  | What it sends, as an action's `command`. |
| `choice` | `string` | yes |  | A choice of the open scene, by id. |
| `when` | `Condition` | yes |  | Only there while this holds. |
| `layer` | `string` | yes |  | Only there while the layer with this id is shown. |

## HotspotView

Type. Explained in [Media](/docs/reference/media#hotspotview).

A hotspot as the UI draws it: a button over the picture.

```ts shape
import type { HotspotView } from '@ifloom/engine'
type HotspotView = {
  id: string
  rect: [ number, number, number, number ]
  label: string
  command: Command
  disabled?: string
  warning?: string
  layer?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `rect` | `[ number, number, number, number ]` |  |  | Where it sits, in percent of the picture: `[x, y, width, height]` from the top left. |
| `label` | `string` |  |  |  |
| `command` | `Command` |  |  | What pressing it sends: its own `command`, or the command that takes its `choice`. |
| `disabled` | `string` | yes |  | Why it cannot be pressed now, as a button's `disabled`. |
| `warning` | `string` | yes |  | Pressable, but a plugin warns against it, as a button's `warning`. |
| `layer` | `string` | yes |  | The layer it goes with, by id; left out for one on the picture as a whole. |

## image

Function. Explained in [Flowing scenes](/docs/reference/flows#the-builders).

A picture or a video in the flow, where it stands: `image('cafe/cup', { alt: 'A cup of tea' })`.

```ts shape
import { image } from '@ifloom/engine'
function image(src: string, media?: Omit<SceneMedia, 'src'> & BlockExtras): Block
```

## inlineChoices

Function. Explained in [The view](/docs/reference/view#inlinechoices).

The choices and buttons a scene's or a room's prose holds inline, in the order they come.

```ts shape
import { inlineChoices } from '@ifloom/engine'
function inlineChoices(beats: readonly SceneBeat[]): RenderedChoice[]
```

## inlineMarkup

Function. Explained in [Prose and markup](/docs/reference/prose#inlinemarkup).

A line of prose cut at its inline markup (`[[act:…]]`, `[[tip:…]]`,
`[[ui:…]]`, `**bold**`, `*italic*`), or null when it has none. Markup with
no id or key, a tooltip or UI piece with no words, a UI piece whose name
isn't an id or with an empty argument, or stars that don't close are left
in the words as written, so they show on screen; the content checker
reports them. A `\*` is a star shown as it is. Bold and italics inside the
words of inline markup, or around it, are not read.

```ts shape
import { inlineMarkup } from '@ifloom/engine'
function inlineMarkup(text: string): InlinePart[] | null
```

## InlinePart

Type. Explained in [Prose and markup](/docs/reference/prose#inlinepart).

A piece of a line, as `inlineMarkup` reads it: words, or an inline action, tooltip, bold or italics as written.

```ts shape
import type { InlinePart } from '@ifloom/engine'
type InlinePart = { type: 'text'; text: string } | { type: 'act'; id: string; text?: string; markup: string } | { type: 'tip'; key: string; text: string; markup: string } | { type: 'ui'; name: string; text: string; args: string[]; markup: string } | { type: 'bold'; text: string; markup: string } | { type: 'italic'; text: string; markup: string }
```

## InlineSpan

Type. Explained in [Prose and markup](/docs/reference/prose#inlinespan).

A piece of a line of prose that holds inline markup, in order. `text` is
words to show as they are. `action` is an inline action, from
`[[act:id|words]]`: `text` is the words to draw as its link and `choice` is
the choice (or, in a room, the action) it presses, with its availability,
reason and price as the list would show them. `tip` is a tooltip, from
`[[tip:key|words]]`: `text` is the words shown and `tip` the prose line
`key`, filled in for this save.

```ts shape
import type { InlineSpan } from '@ifloom/engine'
type InlineSpan = { type: 'text'; text: string } | { type: 'action'; text: string; choice: RenderedChoice } | { type: 'tip'; text: string; tip: string } | { type: 'bold'; text: string } | { type: 'italic'; text: string } | { type: 'ui'; name: string; text: string; args: string[] }
```

## InlineUi

Type. Explained in [Presentation hints](/docs/reference/ui-hints#inlineui).

The pieces a UI draws inside a line of prose, from `[[ui:name|words|arg|…]]`,
by name, each with the arguments it takes after the words as a tuple of
text. Empty here; a UI package augments it:

```ts fragment
declare module '@ifloom/engine' {
  interface InlineUi { modal: [key: string, title?: string] }
}
```

The engine never reads it: the span it gives the view (`{ type: 'ui' }`)
has `name: string` and `args: string[]`, so a name no UI declared still
comes through. It's there for a UI's components to type their arguments.

```ts shape
import type { InlineUi } from '@ifloom/engine'
type InlineUi = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## InlineUiArgs

Type. Explained in [Presentation hints](/docs/reference/ui-hints#inlineuiargs).

The arguments of a UI piece named `N`: what a UI package declared in `InlineUi`, else any text.

```ts shape
import type { InlineUiArgs } from '@ifloom/engine'
type InlineUiArgs<N extends string> = N extends keyof InlineUi ? InlineUi[N] : readonly string[]
```

## InputDef

Type. Explained in [Inputs](/docs/reference/inputs#inputdef).

Something the player types or picks, written to a kv key: a name for a
pet, the time an alarm goes off, a note. The engine checks the value against
the declaration, so a UI can't put anything else in.

```ts shape
import type { InputDef } from '@ifloom/engine'
type InputDef = {
  id: string
  label: string
  type: 'text' | 'number' | 'choice'
  key?: string
  when?: Condition
  maxLength?: number
  min?: number
  max?: number
  options?: { value: KvValue; label: string }[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `label` | `string` |  |  | What the field is called. |
| `type` | `'text' \| 'number' \| 'choice'` |  |  | What the player enters: `text` (typed words), `number` or `choice` (one of `options`). |
| `key` | `string` | yes |  | The kv key it writes. The input's id if left out. |
| `when` | `Condition` | yes |  | Only on offer while this holds. |
| `maxLength` | `number` | yes |  | Text: the most characters, after trimming. 40 if left out. |
| `min` | `number` | yes |  | Number: the range, inclusive. |
| `max` | `number` | yes |  | Number: the highest it takes. |
| `options` | `{ value: KvValue; label: string }[]` | yes |  | Choice: the values on offer, with what the player reads for each. |

## InputView

Type. Explained in [The view](/docs/reference/view#inputview).

```ts shape
import type { InputView } from '@ifloom/engine'
type InputView = {
  id: string
  label: string
  type: InputDef['type']
  maxLength: number | null
  min: number | null
  max: number | null
  options: { value: KvValue; label: string }[]
  value: KvValue | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `label` | `string` |  |  |  |
| `type` | `InputDef['type']` |  |  | What the player enters: `text`, `number` or `choice`. |
| `maxLength` | `number \| null` |  |  | Text: the most characters it takes, after trimming (40 unless the input says). Null for a number or a choice. |
| `min` | `number \| null` |  |  | Number: the lowest it takes, or null with no bound (and for text or a choice). |
| `max` | `number \| null` |  |  | Number: the highest it takes, or null with no bound (and for text or a choice). |
| `options` | `{ value: KvValue; label: string }[]` |  |  | Choice: the values on offer, with what the player reads for each. Empty for text or a number. |
| `value` | `KvValue \| null` |  |  | What its key holds now, if anything. |

## inRange

Function. Explained in [Conditions](/docs/reference/conditions#inrange).

Is the number in the range? Each bound is worked out in the state first,
so `{ gte: { stat: 'rent' } }` reads the rent. A range with no bounds asks
whether the number is above 0.

```ts shape
import { inRange, type Game } from '@ifloom/engine'
function inRange(state: GameState, game: Game, value: number, range: Range): boolean
```

## InstalledMod

Type. Explained in [Mods](/docs/reference/mods#installedmod).

A mod the player has added, as the store keeps it.

```ts shape
import type { InstalledMod } from '@ifloom/engine'
type InstalledMod = {
  id: string
  name: string
  version?: string
  description?: string
  enabled: boolean
  pack: Pack
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `name` | `string` |  |  |  |
| `version` | `string` | yes |  | The mod's own version, as its author writes it. |
| `description` | `string` | yes |  | A line for the mods screen. |
| `enabled` | `boolean` |  |  | Off mods stay installed and are left out of the game. |
| `pack` | `Pack` |  |  | The content it adds, as the mod file wrote it. |

## isUnique

Function. Explained in [Entities](/docs/reference/entities#isunique).

Whether an entity's kind is `unique`: each one is one particular thing, which can hold others.

```ts shape
import { isUnique, type Game } from '@ifloom/engine'
function isUnique(game: Pick<Game, 'kinds' | 'plugins'>, ref: string): boolean
```

## jump

Function. Explained in [Flowing scenes](/docs/reference/flows#the-builders).

A choice's effect that carries the flow on from a point instead of after
its decision, once its `then` is done: `{ point: id }`. The point can be
anywhere in the scene, and the flow reads on from it. A flow loops only
this way, through a pick.

```ts shape
import { jump } from '@ifloom/engine'
function jump(id: string): { point: string }
```

## KindDef

Type. Explained in [Entities](/docs/reference/entities#kinddef).

A kind of thing the game keeps several of, each with its own stats and
kv keys: the staff of a café, the dishes on its menu, the rooms of a
house. A stat declared with `of: 'staff'` belongs to every member of staff
rather than to the player.

```ts shape
import type { KindDef } from '@ifloom/engine'
type KindDef = {
  id: string
  label: string
  plural?: string
  unique?: boolean
  listed?: boolean | Condition
  tags?: string[]
  flags?: Record<string, Condition>
  traits?: { [K in keyof TraitRegistry]?: Partial<TraitRegistry[K]> } & Record<string, unknown>
  ui?: Ui<EntityUi>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `label` | `string` |  |  | What the player reads for one: "Member of staff". |
| `plural` | `string` | yes |  | For more than one: "Staff". The label if left out. |
| `unique` | `boolean` | yes |  | Each one is one particular thing, such as a person, rather than a sort of thing, such as a dish. |
| `listed` | `boolean \| Condition` | yes |  | Whether the view lists the kind's entities: `true`, `false`, or a condition asked for each, with `'$'` as that one. A game's own kinds are listed if left out; a plugin's are not, unless the plugin says. |
| `tags` | `string[]` | yes |  | Words every one of the kind has, before its own `tags`. |
| `flags` | `Record<string, Condition>` | yes |  | Named conditions asked for each listed entity, with `'$'` as that one, for the view's `flags`: `{ met: { 'cast/met': { character: '$' } } }`. |
| `traits` | `{ [K in keyof TraitRegistry]?: Partial<TraitRegistry[K]> } & Record<string, unknown>` | yes |  | Traits every one of the kind has, by trait id: defaults its entities start from. Where an entity gives the same trait, an object here is laid under the entity's, field by field; anything else is replaced whole. |
| `ui` | `Ui<EntityUi>` | yes |  | Presentation hints for the UI, for every one of the kind, under each entity's own. See `EntityUi`. |

## KvValue

Type. Explained in [Game state](/docs/reference/state#kvvalue).

A value in the kv store: true/false, a number or text.

```ts shape
import type { KvValue } from '@ifloom/engine'
type KvValue = boolean | number | string
```

## lackingLine

Function. Explained in [Stats](/docs/reference/stats#lackingline).

The refusal for a cost the player cannot cover.

```ts shape
import { lackingLine, type Game } from '@ifloom/engine'
function lackingLine(game: Game, id: string, amount: number): string
```

## Loaded

Type. Explained in [Content, packs and loading](/docs/reference/loader#loaded).

```ts shape
import type { Loaded, Game } from '@ifloom/engine'
type Loaded = {
  game: Game
  prose: Record<string, string>
  variants: Record<string, string[]>
  problems: Problem[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `game` | `Game` |  |  | The game, ready to run. |
| `prose` | `Record<string, string>` |  |  | Every line of prose by key, merged from the content and the packs. |
| `variants` | `Record<string, string[]>` |  |  | Every variants list by name, with its members' keys. |
| `problems` | `Problem[]` |  |  | What's wrong with the content and the packs, each naming the one it came from. Empty for a game that's fine. |

## LoadedSave

Type. Explained in [Saves](/docs/reference/saves#loadedsave).

A save read back: what it says about itself, and the state, carried forward.

```ts shape
import type { LoadedSave } from '@ifloom/engine'
type LoadedSave = {
  meta: SaveMeta
  state: GameState
  missingPacks: string[]
  missingPlugins: string[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `meta` | `SaveMeta` |  |  | What the save says about itself. |
| `state` | `GameState` |  |  | The state, carried forward to this game's version through `loadState`. |
| `missingPacks` | `string[]` |  |  | Packs the save was made with that the game wasn't loaded with, such as a mod since turned off. |
| `missingPlugins` | `string[]` |  |  | Plugins the save was made with that this game does not have. Their state is kept, unused. |

## loadGame

Function. Explained in [Content, packs and loading](/docs/reference/loader#loadgame).

Merge the game's content, then the packs over it in order, and report
everything wrong with the result, naming the content or pack that brought
it. The result is checked with the content checker (`checkGame`); this adds
only where each problem came from, and what is wrong with the content and
packs themselves: a key declared twice across the content, or a key they
can't hold. A mod author gets "mod:spicier · scene allie.talk · choice kiss ·
unknown scene 'allie.snog'", not a stack trace.

```ts shape
import { loadGame } from '@ifloom/engine'
function loadGame(content: readonly Content[], base: GameBase, options?: LoadOptions): Loaded
```

## LoadOptions

Type. Explained in [Content, packs and loading](/docs/reference/loader#loadoptions).

What else `loadGame` takes.

```ts shape
import type { LoadOptions } from '@ifloom/engine'
type LoadOptions = {
  packs?: readonly Pack[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `packs` | `readonly Pack[]` | yes |  | Packs to load over the content, in order, each over the ones before: mods, unlocked content, JSON exports. |

## loadState

Function. Explained in [Saves](/docs/reference/saves#loadstate).

A state from anywhere (a save, a command log, a test) made ready to play in
this game, or the reason it can't be, through `say`. In order: the engine's
own steps and each field's load default, the plugins' migrations, the
game's migrations, then what the game declares and the save lacks.

```ts shape
import { loadState, type Game } from '@ifloom/engine'
function loadState(raw: unknown, game: Game): Result<GameState>
```

## MediaState

Type. Explained in [Media](/docs/reference/media#mediastate).

What a save keeps about media, at `state.media`.

```ts shape
import type { MediaState } from '@ifloom/engine'
type MediaState = {
  picks: Record<string, string>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `picks` | `Record<string, string>` |  |  | The file each pool request was given, by pick key. See `pickKey`. |

## mediaType

Function. Explained in [Prose and markup](/docs/reference/prose#mediatype).

Whether a file is a picture or a video, by its extension.

```ts shape
import { mediaType } from '@ifloom/engine'
function mediaType(src: string): 'image' | 'video'
```

## memoryDriver

Function. Explained in [Saves](/docs/reference/saves#memorydriver).

Saves in memory, gone when the page is. For tests and previews.

```ts shape
import { memoryDriver } from '@ifloom/engine'
function memoryDriver(): SaveDriver
```

## MigrationTools

Type. Explained in [Saves](/docs/reference/saves#migrationtools).

What a step of `rules.migrations` is given besides the state.

```ts shape
import type { MigrationTools, Game } from '@ifloom/engine'
type MigrationTools = {
  game: Game
  fill: (parts?: FillPart[]) => GameState
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `game` | `Game` |  |  | The game the save is loading into, for a step that needs its content: which entity an old id now names, say. |
| `fill` | `(parts?: FillPart[]) => GameState` |  |  | The state this step was given, with what the game declares and the save lacks filled in: the parts asked for, or every part if left out. Nothing is filled unless a step calls this. See `FillPart`. |

## minigame

Function. Explained in [Commands](/docs/reference/commands#minigame).

A minigame played where it stands. The flow waits until it ends, then carries on.

```ts shape
import { minigame } from '@ifloom/engine'
function minigame(id: string, extras?: BlockExtras): Block
```

## MinigameDef

Type. Explained in [Minigames](/docs/reference/minigames#minigamedef).

A minigame: its states, the one it starts in, its kv store and the keys a UI maps to its inputs.

```ts shape
import type { MinigameDef } from '@ifloom/engine'
type MinigameDef = {
  id: string
  title?: string
  start: string
  kv?: Record<string, number>
  keys?: Record<string, string[]>
  states: Record<string, MinigameStateDef>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `title` | `string` | yes |  | Its heading, what the UI calls it. |
| `start` | `string` |  |  | The state it starts in. |
| `kv` | `Record<string, number>` | yes |  | Its kv store and where each key starts, numbers all: `{ score: 0 }`. Content reads and writes them with `of: 'minigame'`, and a key it uses must be declared here. |
| `keys` | `Record<string, string[]>` | yes |  | The keys a UI maps to each input, by input name: `{ up: ['ArrowUp', 'w'] }`. Key names as `KeyboardEvent.key` gives them. A UI picks its own if left out. |
| `states` | `Record<string, MinigameStateDef>` |  |  | Its states, by name. See `MinigameStateDef`. |

## MinigameInput

Type. Explained in [Minigames](/docs/reference/minigames#minigameinput).

An input of the minigame being played, as a button: drawn as any other
button is, since it has what a `RenderedChoice` needs.

```ts shape
import type { MinigameInput } from '@ifloom/engine'
type MinigameInput = {
  id: string
  label: string
  command: { type: 'minigame'; input: string }
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The input's name, as the minigame's `on` names it: `'up'`. |
| `label` | `string` |  |  | Its words: the `minigame.<input>` string (`Up`, `Space`), or its name with a capital. |
| `command` | `{ type: 'minigame'; input: string }` |  |  | What pressing it sends. |

## MinigameSceneFields

Type. Explained in [Minigames](/docs/reference/minigames#minigamescenefields).

A scene's field that starts a minigame.

```ts shape
import type { MinigameSceneFields } from '@ifloom/engine'
type MinigameSceneFields = {
  minigame?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `minigame` | `string` | yes |  | A minigame that starts when the scene is entered. The scene shows again once it ends. |

## MinigameState

Type. Explained in [Minigames](/docs/reference/minigames#minigamestate).

The minigame being played.

```ts shape
import type { MinigameState } from '@ifloom/engine'
type MinigameState = {
  id: string
  state: string
  elapsed: number
  kv: Record<string, number>
  steps: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `state` | `string` |  |  | The state it is in. |
| `elapsed` | `number` |  |  | Milliseconds of ticks since it entered that state. |
| `kv` | `Record<string, number>` |  |  | Its kv store, as play has left it. |
| `steps` | `number` |  |  | How many transitions it has taken, for its random draws. |

## MinigameStateDef

Type. Explained in [Minigames](/docs/reference/minigames#minigamestatedef).

One state of a minigame.

```ts shape
import type { MinigameStateDef } from '@ifloom/engine'
type MinigameStateDef = {
  label?: string
  after?: { ms: number } & MinigameTransition
  on?: ({ input: string; when?: Condition; label?: string } & MinigameTransition)[]
  always?: ({ when?: Condition } & MinigameTransition)[]
  final?: { effects?: EffectRef[]; copy?: Record<string, string> }
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `label` | `string` | yes |  | What the player reads while the minigame is in this state, tokens filled. |
| `after` | `{ ms: number } & MinigameTransition` | yes |  | A timer. Once `ms` milliseconds of ticks have passed in this state, the transition is taken. Staying put (no `go` or `to`) starts the timer again. The same `tick` runs it down as runs the game's named timers, in the order they run out. |
| `on` | `({ input: string; when?: Condition; label?: string } & MinigameTransition)[]` | yes |  | What the inputs do here. The first entry for the input whose `when` holds is taken; an input with none is not live. `label` is the input's words for its button in this state, tokens filled, such as a quiz's answer: the first live entry with one gives it, and without one the button reads the `minigame.<input>` string, else the input's name. |
| `always` | `({ when?: Condition } & MinigameTransition)[]` | yes |  | Taken as soon as the state is entered: the first whose `when` holds. A state that only decides where to go next, such as a win or a loss. |
| `final` | `{ effects?: EffectRef[]; copy?: Record<string, string> }` | yes |  | Entering this state ends the minigame. `copy` writes keys of the minigame's kv to the player's (`{ score: 'arrows.best' }`); then the minigame closes and `effects` apply. |

## MinigameTarget

Type. Explained in [Minigames](/docs/reference/minigames#minigametarget).

A state a transition can go to at random: its id, or its id with a weight (1 if left out).

```ts shape
import type { MinigameTarget } from '@ifloom/engine'
type MinigameTarget = string | { state: string; weight?: number }
```

## MinigameTransition

Type. Explained in [Minigames](/docs/reference/minigames#minigametransition).

Where a transition goes, and what it does on the way.

```ts shape
import type { MinigameTransition } from '@ifloom/engine'
type MinigameTransition = {
  go?: string
  to?: MinigameTarget[]
  effects?: EffectRef[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `go` | `string` | yes |  | The state it goes to. |
| `to` | `MinigameTarget[]` | yes |  | A state drawn at random, by weight, when there is no `go`. Seeded by the save, so the same save draws the same states. |
| `effects` | `EffectRef[]` | yes |  | What it does before it moves: any effect, a `kv` one with `of: 'minigame'` or a turn among them. A transition with no `go` or `to` stays where it is. |

## MinigameView

Type. Explained in [Minigames](/docs/reference/minigames#minigameview).

The minigame being played, as the UI draws it.

```ts shape
import type { MinigameView } from '@ifloom/engine'
type MinigameView = {
  id: string
  title: string | null
  state: string
  label: string | null
  timeLeft: number | null
  timeTotal: number | null
  inputs: MinigameInput[]
  kv: Record<string, number>
  keys: Record<string, string[]>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `title` | `string \| null` |  |  | The minigame's own title, or null. |
| `state` | `string` |  |  | The state it is in. |
| `label` | `string \| null` |  |  | The state's words, from its `label`, or null. `view.scene.body` has them rendered. |
| `timeLeft` | `number \| null` |  |  | Milliseconds left on the state's timer, or null with no timer. |
| `timeTotal` | `number \| null` |  |  | The timer's whole length, or null with no timer. |
| `inputs` | `MinigameInput[]` |  |  | The inputs that do something now, in the order the state lists them, as buttons. |
| `kv` | `Record<string, number>` |  |  | Its kv store now. |
| `keys` | `Record<string, string[]>` |  |  | The keys the game maps to each input, by input name. Empty if it maps none. |

## ModFile

Type. Explained in [Mods](/docs/reference/mods#modfile).

A mod as a file: what it is, which game it is for, and the pack it adds.
Data only — scenes, prose, locations, patches, plugin content — so it can do
nothing a pack can't, and nothing runs that the game didn't ship.

```ts shape
import type { ModFile } from '@ifloom/engine'
type ModFile = {
  ifloomMod: 1
  id: string
  name: string
  version?: string
  game: string
  description?: string
  pack: Pack
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `ifloomMod` | `1` |  |  | The format of this file: 1. |
| `id` | `string` |  |  |  |
| `name` | `string` |  |  |  |
| `version` | `string` | yes |  | The mod's own version, as its author writes it: `'1.2'`. |
| `game` | `string` |  |  | The game it was made for, by id. |
| `description` | `string` | yes |  | A line for the mods screen. |
| `pack` | `Pack` |  |  | The content it adds: a `Pack`, laid over the game's content. |

## Mods

Type. Explained in [The showcase: Small Town](/docs/guide/showcase#mods).

One game's installed mods, as `mods` gives them. Nothing here rejects: when
the driver fails, each answers a failure that says so, with the driver's
error as its `cause`.

```ts shape
import type { Mods } from '@ifloom/engine'
type Mods = {
  list: () => Promise<Result<InstalledMod[]>>
  add: (text: string) => Promise<Result<InstalledMod>>
  remove: (id: string) => Promise<Result<void>>
  setEnabled: (id: string, enabled: boolean) => Promise<Result<void>>
  packs: () => Promise<Result<Pack[]>>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `list` | `() => Promise<Result<InstalledMod[]>>` |  |  | Every installed mod, on or off, in name order. One stored unreadably is left out. |
| `add` | `(text: string) => Promise<Result<InstalledMod>>` |  |  | Add a mod from a file's text, on, replacing one with the same id. The mod, or why it can't be added. |
| `remove` | `(id: string) => Promise<Result<void>>` |  |  | Remove a mod. Nothing happens if it isn't installed. |
| `setEnabled` | `(id: string, enabled: boolean) => Promise<Result<void>>` |  |  | Turn a mod on or off. Nothing happens if it isn't installed. |
| `packs` | `() => Promise<Result<Pack[]>>` |  |  | The packs of the mods that are on, in name order, to load over the game's content as `packs`. |

## mods

Function. Explained in [Mods](/docs/reference/mods#mods).

One game's installed mods, kept wherever its driver keeps them — IndexedDB
in a browser, so a mod survives reloads and needs no server.

```ts shape
import { mods } from '@ifloom/engine'
function mods(gameId: string, driver: SaveDriver): Mods
```

## move

Function. Explained in [Effects](/docs/reference/effects#move).

Move a thing to another holder: from the player (whoever they are
playing) for a stack, from wherever it is for a unique thing, unless
`from` says; all there is unless `by` says.

```ts fragment
effects: [move('gift:scarf', 'character:ava')]
```

```ts shape
import { move } from '@ifloom/engine'
function move(ref: string, to: string, options?: { from?: Holder; by?: number }): Effect
```

## need

Function. Explained in [Actions and buttons](/docs/reference/actions#need).

A `blocked` entry written the other way round: refused with `reason` unless
`when` holds. `need('Not on an empty stomach.', { stat: 'energy', gte: 2 })`.

```ts shape
import { need } from '@ifloom/engine'
function need(reason: Reason, when: Condition): Blocked
```

## Notice

Type. Explained in [Notices](/docs/reference/notices#notice).

Something the game tells the player outside a scene: a message arrived, a
quest moved on, the rent is due. Raised by the `notify` effect, shown by the
UI as a badge or a toast, and marked seen with the `dismiss` command.

```ts shape
import type { Notice } from '@ifloom/engine'
type Notice = {
  id: string
  title: string
  text?: string
  image?: string
  tag?: string
  turn: number
  seen: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `title` | `string` |  |  | A short line, as written. |
| `text` | `string` | yes |  | More words, as written, if there are any. Tokens are filled as the view shows it. |
| `image` | `string` | yes |  | A picture, as a path in the game's `art/` folder (`'notes/bins.jpg'`) or a URL. |
| `tag` | `string` | yes |  | What it is about, for badges: `'messages'`, `'quests'`. |
| `turn` | `number` |  |  | The turn it was raised. |
| `seen` | `boolean` |  |  | Whether the player has dismissed it. |

## NoticesView

Type. Explained in [The view](/docs/reference/view#noticesview-and-noticeview).

```ts shape
import type { NoticesView } from '@ifloom/engine'
type NoticesView = {
  unseen: NoticeView[]
  byTag: Record<string, number>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `unseen` | `NoticeView[]` |  |  | Not yet dismissed, newest first. |
| `byTag` | `Record<string, number>` |  |  | How many unseen notices each tag has: badges. Untagged ones count under `''`. |

## NoticeView

Type. Explained in [The view](/docs/reference/view#noticesview-and-noticeview).

```ts shape
import type { NoticeView } from '@ifloom/engine'
type NoticeView = {
  id: string
  title: string
  text: string
  image: string | null
  tag: string | null
  turn: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `title` | `string` |  |  | A short line, as written. |
| `text` | `string` |  |  | The notice's words, tokens filled in; empty if it has none. |
| `image` | `string \| null` |  |  | Its picture's path, through `artSrc`; null with none. |
| `tag` | `string \| null` |  |  | What it's about, for badges: `'messages'`. Null with none. |
| `turn` | `number` |  |  | The turn it was raised. |

## notify

Function. Explained in [Notices](/docs/reference/notices#notify).

The state with a notice raised. One with the id of an earlier notice replaces it, unseen, as the newest.

```ts shape
import { notify, type Notice } from '@ifloom/engine'
function notify(state: GameState, notice: Omit<Notice, 'id' | 'turn' | 'seen'> & { id?: string }): GameState
```

## Once

Type. Explained in [Storylets](/docs/reference/storylets#once-at-most-and-only-while).

How often something can happen: once in the whole game, or once a turn.
`reason` is what the player reads on a button once it is spent; the
engine's `done` string ("Already done.") if left out.

```ts shape
import type { Once } from '@ifloom/engine'
type Once = {
  per: 'game' | 'turn'
  reason?: Reason
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `per` | `'game' \| 'turn'` |  |  | Once in the whole game, or at most once a turn. |
| `reason` | `Reason` | yes |  | What the player reads on it once it's spent. The `done` string if left out. |

## OpenPanel

Type. Explained in [Panels](/docs/reference/panels#openpanel).

The panel that is open: its name, and what it was opened with.

```ts shape
import type { OpenPanel } from '@ifloom/engine'
type OpenPanel = {
  panel: string
  with: PluginArgs
  scene?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `panel` | `string` |  |  | Its name, as the UI knows it: `'shop'`, `'jobs'`, or one of the game's own. |
| `with` | `PluginArgs` |  |  | What it was opened with, such as `{ vendor: 'cafe' }`. Empty if the effect gave nothing. |
| `scene` | `string` | yes |  | The scene that holds it open, for a scene's own `panel`: it is open for as long as the scene is, and `closePanel` doesn't close it. Left out for one the `panel` effect opened. |

## Pack

Type. Explained in [Content, packs and loading](/docs/reference/loader#pack).

Content from outside the game's code: a mod, unlocked supporter content or
a JSON export. It goes over the game's content and the packs before it,
replacing what they declare by id, and saves record its id.

```ts shape
import type { Pack } from '@ifloom/engine'
type Pack = {
  id: string
  schema: number
  plugins?: Record<string, number>
  strings?: Record<string, string>
  prose?: Record<string, string>
  words?: Record<string, string>
  variants?: Record<string, VariantMember[]>
  data?: Record<string, Record<string, readonly PluginEntry[]>>
  kinds?: KindDef[]
  entities?: EntityDef[]
  traits?: TraitTable
  kv?: Record<string, KvValue>
  resets?: Record<string, KvValue>
  storylines?: StorylineDef[]
  actions?: ActionDef[]
  triggers?: TriggerDef[]
  inputs?: InputDef[]
  settings?: SettingDef[]
  stats?: StatDef[]
  scenes?: DataScene[]
  patches?: Patch[]
  introScene?: string
  minigames?: MinigameDef[]
  timers?: TimerDef[]
  audio?: Partial<GameAudio>
  media?: GameMedia
  ui?: Ui<GameUi>
  saveable?: Blocked[]
  locks?: Lock[]
  phrases?: Phrases
  changes?: ChangesDef
  finished?: Condition
  carryOver?: CarryOver
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The pack's id, which saves record: `mod:<id>` for a mod's. |
| `schema` | `number` |  |  | Schema this pack was written against. An older one is upgraded as it loads; a newer one is refused. |
| `plugins` | `Record<string, number>` | yes |  | The version of each plugin's content this pack was written for, by plugin id (`{ shop: 13 }`), as `Plugin.contentVersion` numbers them. An older one is upgraded by that plugin's own steps as it loads. A plugin left out is read as written for the pack's `schema`, or the plugin's own version if that is lower. |
| `strings` | `Record<string, string>` | yes |  | Player-facing words by key, over the engine's and plugins' own. |
| `prose` | `Record<string, string>` | yes |  | Prose by key. |
| `words` | `Record<string, string>` | yes |  | Other words for fields of the content, by key: a translation, which is one pack with this table (and its own `prose` for the lines read by key). Each key names one field the player reads, as `translatableFields` lists them: `action.wait.label`, `entity.character:ava.name`, `scene.cafe.counter.text.intro`. It is laid over the content once everything is merged, a later pack's over an earlier one's, and a key that names no field is reported. |
| `variants` | `Record<string, VariantMember[]>` | yes |  | Variants membership by variants name, in draw order. Content and packs append to a name. A member is a prose key, or `{ prose: key, weight }` to be drawn more or less often than the rest. |
| `data` | `Record<string, Record<string, readonly PluginEntry[]>>` | yes |  | Content for the game's plugins, by plugin id and then list: `{ quests: { quests: [...] } }`. A pack's entry replaces one with the same id, as its scenes do. |
| `kinds` | `KindDef[]` | yes |  | Kinds of thing the game keeps several of. A later pack can redeclare one by id. |
| `entities` | `EntityDef[]` | yes |  | Things of those kinds there at the start. A later pack can redeclare one by kind and id. |
| `traits` | `TraitTable` | yes |  | Traits given to entities, by trait id and then entity, over what each entity declares itself: `{ 'laundry/washable': { 'clothing:scarf': { temp: 30 } } }`. A later pack's row replaces an earlier one's. |
| `kv` | `Record<string, KvValue>` | yes |  | The kv store a new game starts with, by key: a later pack's value replaces an earlier one's. |
| `resets` | `Record<string, KvValue>` | yes |  | Keys reset each turn, by key: a later pack's value replaces an earlier one's. |
| `storylines` | `StorylineDef[]` | yes |  |  |
| `actions` | `ActionDef[]` | yes |  | Actions, by id: a later pack's replaces an earlier one's. |
| `triggers` | `TriggerDef[]` | yes |  |  |
| `inputs` | `InputDef[]` | yes |  |  |
| `settings` | `SettingDef[]` | yes |  | What the player can change from a settings screen. A later pack can redeclare one by id. |
| `stats` | `StatDef[]` | yes |  | Stats the game keeps. A later pack can redeclare one by id. |
| `scenes` | `DataScene[]` | yes |  |  |
| `patches` | `Patch[]` | yes |  | Surgical changes to content an earlier pack declared. |
| `introScene` | `string` | yes |  | The scene on screen on the first frame: a later pack's replaces an earlier one's. |
| `minigames` | `MinigameDef[]` | yes |  | Minigames. A later pack's replaces an earlier one's by id. |
| `timers` | `TimerDef[]` | yes |  | Timers. A later pack's replaces an earlier one's by id. |
| `audio` | `Partial<GameAudio>` | yes |  | Sounds, channels and defaults over the game's own. A later pack's track or channel replaces an earlier one's by id; its `mute` and `default` entries win too. |
| `media` | `GameMedia` | yes |  | Pools of pictures and videos. A later pack's pool replaces an earlier one's by id. |
| `ui` | `Ui<GameUi>` | yes |  | Hints for the whole game, hint by hint: a later pack's hint replaces an earlier one's, and the rest are kept. |
| `saveable` | `Blocked[]` | yes |  | When saving is refused, after the entries before; one with the `id` of an earlier one takes its place. |
| `locks` | `Lock[]` | yes |  | Locks after the ones before; one with the `id` of an earlier one takes its place. |
| `phrases` | `Phrases` | yes |  | Words for mid-sentence that change with the state, printed as `{{name}}`: each phrase a list of `{ when?, text }` rows tried in order (or a plain string), and a nested object a group, named with a `.`. A later pack's phrase replaces an earlier one's by its full name, and a pack can add phrases to a group. |
| `changes` | `ChangesDef` | yes |  | The stats whose changes `view.changes` lists, by id: `{ stats: ['coins', 'trust'] }`. Every file's and pack's lists are added together. With none, nothing is tracked. |
| `finished` | `Condition` | yes |  | When the game counts as finished. The runner records the first time it holds in the profile's `core:finished`, so a title screen can offer New Game+. A pack's replaces the content's. |
| `carryOver` | `CarryOver` | yes |  | What a New Game+ carries over from the game before. A pack's replaces the content's, whole. |

## panel

Function. Explained in [Effects](/docs/reference/effects#panel).

A panel opened where it stands, with what it needs. The flow waits until the player closes it.

```ts shape
import { panel } from '@ifloom/engine'
function panel(name: string, args?: PluginArgs, extras?: BlockExtras): Block
```

## parseRef

Function. Explained in [Entities](/docs/reference/entities#parseref).

Split `'staff:ana'` into its kind and id; undefined if it is not one. Takes any string, as content writes them.

```ts shape
import { parseRef } from '@ifloom/engine'
function parseRef(ref: string): { kind: string; id: string } | undefined
```

## Patch

Type. Explained in [Content, packs and loading](/docs/reference/loader#patch).

A surgical change to a data scene an earlier pack declared: a choice added, dropped or replaced.

```ts shape
import type { Patch } from '@ifloom/engine'
type Patch = { scene: string; addChoice: DataScene['choices'][number]; before?: string } | { scene: string; dropChoice: string } | { scene: string; replaceChoice: DataScene['choices'][number] }
```

## Phrase

Type. Explained in [Phrases](/docs/reference/phrases#phrase-phraserow-and-phrasewithargs).

A phrase as content writes it: its rows, tried in order, a plain string (a phrase with one row), or rows with the arguments they take.

```ts shape
import type { Phrase } from '@ifloom/engine'
type Phrase = string | PhraseRow[] | PhraseWithArgs
```

## PhraseRow

Type. Explained in [Phrases](/docs/reference/phrases#phrase-phraserow-and-phrasewithargs).

One row of a phrase: its words, shown while `when` holds (always, without one). Tokens in the words are filled.

```ts shape
import type { PhraseRow } from '@ifloom/engine'
type PhraseRow = {
  when?: Condition
  text: string
}
```

## Phrases

Type. Explained in [Phrases](/docs/reference/phrases#phrases).

Phrases as content writes them, by name: a phrase, or a group of more by
name, as deep as you like. `{ outfit: { verdict: [...] }, weather: 'grey' }`
declares `outfit.verdict` and `weather`.

```ts shape
import type { Phrases } from '@ifloom/engine'
type Phrases = {
  [key: string]: Phrase | Phrases
}
```

## PhraseWithArgs

Type. Explained in [Phrases](/docs/reference/phrases#phrase-phraserow-and-phrasewithargs).

A phrase that takes arguments: their names in `args`, and its rows. In a
row's `when`, a string that is exactly `$<arg>` becomes what the token
passed, as an entity reference when it names one; in its `text`, `$<arg>`
becomes that entity's name, or the value as passed.

```ts shape
import type { PhraseWithArgs } from '@ifloom/engine'
type PhraseWithArgs = {
  args: string[]
  rows: PhraseRow[]
}
```

## PictureDef

Type. Explained in [Media](/docs/reference/media#picturedef).

A layered picture with hotspots, on a scene or a place.

```ts shape
import type { PictureDef } from '@ifloom/engine'
type PictureDef = {
  layers: PictureLayer[]
  hotspots?: HotspotDef[]
  aspect?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `layers` | `PictureLayer[]` |  |  | Bottom first. |
| `hotspots` | `HotspotDef[]` | yes |  | The clickable areas on it, each a button the UI draws over the picture. |
| `aspect` | `string` | yes |  | Width over height, as CSS writes it: `'16/9'`. The UI's own if left out. |

## PictureLayer

Type. Explained in [Media](/docs/reference/media#picturelayer).

One layer of a picture: a file, or a pick from a pool, shown while `when` holds.

```ts shape
import type { PictureLayer } from '@ifloom/engine'
type PictureLayer = {
  id?: string
  src?: string
  pool?: string
  tags?: string[]
  when?: Condition
  video?: boolean
  controls?: boolean
  once?: boolean
  sound?: boolean
  poster?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` | yes |  | What hotspots name to go with this layer. |
| `src` | `string` | yes |  | The file, in the game's `art/` folder or a URL. Give this or `pool`. |
| `pool` | `string` | yes |  | A pool in `game.media.pools` to pick the file from, kept for the save once picked. |
| `tags` | `string[]` | yes |  | The tags the pool's pick should have, most important first. |
| `when` | `Condition` | yes |  | Shown only while this holds. |
| `video` | `boolean` | yes |  | Draw it as a video. A `.mp4` or `.webm` file is one anyway. |
| `controls` | `boolean` | yes |  | Show the player's controls. It then waits to be started instead of playing by itself. |
| `once` | `boolean` | yes |  | Play once instead of looping. |
| `sound` | `boolean` | yes |  | Play with sound instead of muted. |
| `poster` | `string` | yes |  | A still to show before it plays, as a path like any picture's. |

## PictureLayerView

Type. Explained in [Media](/docs/reference/media#picturelayerview).

A picture layer as the UI draws it.

```ts shape
import type { PictureLayerView } from '@ifloom/engine'
type PictureLayerView = {
  id: string | null
  src: string
  video?: VideoView
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string \| null` |  |  |  |
| `src` | `string` |  |  | The file to draw, through `artSrc` (a pool's pick resolved). |
| `video` | `VideoView` | yes |  | How it plays, when it is a video. |

## PictureView

Type. Explained in [Media](/docs/reference/media#pictureview).

A picture as the UI draws it: the layers shown now, bottom first, and the hotspots on them.

```ts shape
import type { PictureView } from '@ifloom/engine'
type PictureView = {
  aspect: string | null
  layers: PictureLayerView[]
  hotspots: HotspotView[]
}
```

## Placement

Type. Explained in [Entities](/docs/reference/entities#holder-and-placement).

Where a thing is placed: one holder for one of it, or how many each holder has.

```ts shape
import type { Placement } from '@ifloom/engine'
type Placement = Holder | Partial<Record<Holder, number>>
```

## PLAYER

Const. Explained in [Entities](/docs/reference/entities#player-and-you).

The player as a holder: what is theirs whoever they are playing.

```ts shape
import { PLAYER } from '@ifloom/engine'
const PLAYER: 'player'
```

## PlaylistDef

Type. Explained in [Audio](/docs/reference/audio#playlistdef).

Several background tracks played one after another, by id in `game.audio.tracks`.

```ts shape
import type { PlaylistDef } from '@ifloom/engine'
type PlaylistDef = {
  playlist: (string | { track: string; weight?: number })[]
  order?: 'inOrder' | 'loop' | 'shuffle'
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `playlist` | `(string \| { track: string; weight?: number })[]` |  |  | Track ids, each on a background channel. In a shuffled playlist a track can carry a weight, `{ track: 'rain', weight: 3 }`, and is then more likely to come early in the order. A plain id has weight 1. |
| `order` | `'inOrder' \| 'loop' \| 'shuffle'` | yes |  | `'inOrder'` plays the list once, `'loop'` plays it over and over, and `'shuffle'` plays it over and over in an order drawn from the save's seed. With weights, the shuffle draws the first track by weight, then the next from those left, and so on, so a heavier track tends to play sooner. `'loop'` if left out. |

## PluginCall

Type. Explained in [Calls by name](/docs/reference/custom#plugincall).

A plugin's condition, effect or command in short, or the game's own
(`game/…`, from its `rules`): its full name as the only key, and its
arguments as the value, `{ 'quests/done': { quest: 'bakery' } }`. The arguments are
always an object; `true` calls it with none, as in `{ 'calendar/weekend':
true }`. Anything else (a list, a string, a number) is a problem the content
checker reports, and the call is asked with no arguments.

```ts shape
import type { PluginCall } from '@ifloom/engine'
type PluginCall = {
  [key: `${string}/${string}`]: true | PluginArgs
}
```

## pluginQuery

Function. Explained in [Writing a plugin](/docs/reference/plugins#pluginquery).

A plugin's query by full name, ready to ask. Undefined when the game does
not have it. As `context.query`, a name declared in `QueryRegistry` takes
its arguments and answers its type; any other takes any arguments, with the
answer's type given.

```ts shape
import { pluginQuery, type Game } from '@ifloom/engine'
function pluginQuery<K extends keyof QueryRegistry>(game: Game | undefined, name: K): ((state: GameState, ...args: QueryArgs<K>) => QueryAnswer<K>) | undefined
function pluginQuery<T = unknown>(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => T) | undefined
```

## point

Function. Explained in [Effects](/docs/reference/effects#point).

A place in the flow a choice can jump to, with `jump(id)`: at the top of a scene's body, in a section or in a choice's `then`.

```ts shape
import { point } from '@ifloom/engine'
function point(id: string): Block
```

## PoolFile

Type. Explained in [Media](/docs/reference/media#poolfile).

One file in a pool: its path, as any picture's, the tags it answers to, and
how often it is picked against the other files that fit (1 if left out).

```ts shape
import type { PoolFile } from '@ifloom/engine'
type PoolFile = {
  src: string
  tags?: string[]
  weight?: number
}
```

## Price

Type. Explained in [The view](/docs/reference/view#price).

What pressing a button will spend, shown on it before it is pressed. Only
costs: what a choice *pays* stays off the label, because a payout printed on
a line tells the player which line is the right one.

```ts shape
import type { Price } from '@ifloom/engine'
type Price = {
  stats?: { id: string; amount: number; text: string }[]
  notes?: string[]
  text: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `stats` | `{ id: string; amount: number; text: string }[]` | yes |  | Stats it spends, in the order the button lists them, written for the player. |
| `notes` | `string[]` | yes |  | What plugins say it costs, in their words: "until evening". |
| `text` | `string` |  |  | The whole price as one line for the player: each stat's `text`, then the notes, joined by the `priceSeparator` string (`2 coins · until evening`). |

## Probe

Type. Explained in [Checking content](/docs/reference/checks#probe).

A state to render every scene against, named for the problems it finds.

```ts shape
import type { Probe } from '@ifloom/engine'
type Probe = {
  name: string
  state: GameState
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `name` | `string` |  |  | What the problems it finds are named by: `'evening, after the café'`. |
| `state` | `GameState` |  |  | The state to render every scene against. |

## Problem

Type. Explained in [Checking content](/docs/reference/checks#problem-and-describeproblem).

Something wrong with a game's content: the pack it came from (`game` for a hand-built game), where, and what.

```ts shape
import type { Problem } from '@ifloom/engine'
type Problem = {
  pack: string
  where: string
  what: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `pack` | `string` |  |  | The content or pack it came from, by name or id: `game` for a hand-built game. |
| `where` | `string` |  |  | What in it: `scene cafe.counter`, `finished`. |
| `what` | `string` |  |  | What's wrong: `unknown storyline "tides"`. |

## Profile

Type. Explained in [The profile](/docs/reference/profile#profile-1).

What outlives a save: the player's settings, whether they have finished the
game, and whatever plugins keep (achievements, say). One JSON object of
namespaces, kept at `<game id>.profile` in a save driver.

The engine uses two namespaces: `core:settings` (every setting's stored
value, by id) and `core:finished` (`{ at }`, when the game was first
finished). A UI uses `ui:` names (the React gate is `ui:gate`). A plugin
uses its own bare id, which can't hold a `:`, so the prefixes are reserved.

```ts shape
import type { Profile } from '@ifloom/engine'
type Profile = {
  get: <T = unknown>(namespace: string) => Promise<T | undefined>
  set: (namespace: string, value: unknown) => Promise<void>
  update: <T = unknown>(namespace: string, change: (current: T | undefined) => T | undefined) => Promise<T | undefined>
  subscribe: (listener: (namespace: string, value: unknown) => void) => () => void
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `get` | `<T = unknown>(namespace: string) => Promise<T \| undefined>` |  |  | What a namespace holds, or undefined if nothing does. |
| `set` | `(namespace: string, value: unknown) => Promise<void>` |  |  | Store a value in a namespace. Undefined clears it. |
| `update` | `<T = unknown>(namespace: string, change: (current: T \| undefined) => T \| undefined) => Pr…` |  |  | Change a namespace from what it holds now, with no other write in between. Return undefined (or the same value) to leave it. Resolves to what it holds afterwards. |
| `subscribe` | `(listener: (namespace: string, value: unknown) => void) => () => void` |  |  | Hear about every write, with the namespace and its new value. Returns the way to stop. |

## profile

Function. Explained in [The profile](/docs/reference/profile#profile).

A game's profile, kept wherever its driver keeps things. Reads and writes
run one at a time, in order. Only the game's `id` is read, so a profile can
be opened before the game is built: `profile({ id: 'small-town' }, driver)`.

```ts shape
import { profile, type Game } from '@ifloom/engine'
function profile(game: Pick<Game, 'id'>, driver: SaveDriver): Profile
```

## proseBeats

Function. Explained in [Prose and markup](/docs/reference/prose#prosebeats).

The prose line `key` as beats, formatted as a scene's body is: its tokens
filled for this save, cut into paragraphs and spoken lines, each speaker
named from their entity, and its inline markup (bold, italics, UI pieces)
in `spans`. For a UI that shows a line by key away from the scene, such as
a dialog an inline piece opens. Null when the game has no line by that key.

```ts shape
import { proseBeats, type Game } from '@ifloom/engine'
function proseBeats(state: GameState, game: Game, key: string): SceneBeat[] | null
```

## ProseStore

Type. Explained in [Prose and markup](/docs/reference/prose#prosestore).

Prose and variants members the declarative scenes draw on.

```ts shape
import type { ProseStore } from '@ifloom/engine'
type ProseStore = {
  line: (key: string, state?: GameState) => string | undefined
  variants: (name: string) => string[]
  weight?: (name: string, key: string) => number
  keys?: () => string[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `line` | `(key: string, state?: GameState) => string \| undefined` |  |  | The words for a key, with `{{playerName}}` and friends filled in. |
| `variants` | `(name: string) => string[]` |  |  | The members of a variants list, by its name, in declaration order. |
| `weight` | `(name: string, key: string) => number` | yes |  | A member's weight in a variants list, 1 if it has none. Left out, every member weighs 1. |
| `keys` | `() => string[]` | yes |  | Every key the store has words for, so the content checker can read all the prose's markup. Left out, it reads only the keys content names. |

## protagonist

Function. Explained in [Entities](/docs/reference/entities#protagonist-and-resolveholder).

Who `'you'` is now: the protagonist the `you` effect chose, or `'player'` when none was.

```ts shape
import { protagonist } from '@ifloom/engine'
function protagonist(state: GameState): Holder
```

## Query

Type. Explained in [Writing a plugin](/docs/reference/plugins#query).

Ask a plugin or the game something by full name. A name declared in
`QueryRegistry` takes its arguments and answers its type; any other takes any
arguments, with the answer's type given: `query<number>('loyalty/stampsLeft')`.
Undefined when the game does not have it.

```ts shape
import type { Query } from '@ifloom/engine'
type Query = { <K extends keyof QueryRegistry>(name: K, ...args: QueryArgs<K>): QueryAnswer<K> | undefined; <T = unknown>(name: string, args?: PluginArgs): T | undefined }
```

## QueryRegistry

Type. Explained in [Writing a plugin](/docs/reference/plugins#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry).

The queries plugins and the game answer, by full name, each as a function
from its arguments to its answer, which `context.query` and `pluginQuery`
read: `'loyalty/stampsLeft': () => number`. Holds `PartnerQueries`, what
first-party plugins ask each other, so those are typed in every program.

```ts shape
import type { QueryRegistry } from '@ifloom/engine'
type QueryRegistry = {
  'calendar/now': () => { day: number; period: string }
  'calendar/periods': () => string[]
  'calendar/bedtime': () => boolean
  'places/here': () => string | null
  'places/holder': () => EntityRef | null
  'places/known': (args: { location: string }) => boolean
  'cast/portrait': (args: { character: string }) => string | undefined
  'cast/contacts': () => CastContact[]
  'cast/sender': (args: { from: string }) => SenderView
  // …
}
```

Plugins add fields of their own to it, which their pages list.

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `calendar/now` | `() => { day: number; period: string }` |  |  | The calendar's day, from 0, and period. |
| `calendar/periods` | `() => string[]` |  |  | The calendar's periods, in order. |
| `calendar/bedtime` | `() => boolean` |  |  | Whether it's a time the player could go to bed. |
| `places/here` | `() => string \| null` |  |  | The id of the place the player is in, or null for nowhere. |
| `places/holder` | `() => EntityRef \| null` |  |  | The entity of the place the player is in, which holds what is put down there; null when nowhere. |
| `places/known` | `(args: { location: string }) => boolean` |  |  | Whether the game has this place. |
| `cast/portrait` | `(args: { character: string }) => string \| undefined` |  |  | A character's face, their person's `portrait`; undefined for none. |
| `cast/contacts` | `() => CastContact[]` |  |  | Everyone met who can be called. |
| `cast/sender` | `(args: { from: string }) => SenderView` |  |  | Who a message or a post is from: the entity's name and picture, a person's `portrait` as the face. |

## Range

Type. Explained in [Conditions](/docs/reference/conditions#range).

Bounds a number is compared with, as conditions compare one: `{ gte: 3 }`
is 3 or more. Each bound is an `Amount`, so it can be another number in
the game: `{ gte: { stat: 'rent' } }`.

```ts shape
import type { Range } from '@ifloom/engine'
type Range = {
  gte?: Amount
  gt?: Amount
  lte?: Amount
  lt?: Amount
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `gte` | `Amount` | yes |  | The number is this or more. |
| `gt` | `Amount` | yes |  | The number is more than this. |
| `lte` | `Amount` | yes |  | The number is this or less. |
| `lt` | `Amount` | yes |  | The number is less than this. |

## RawPack

Type. Explained in [Writing a plugin](/docs/reference/plugins#rawpack).

A pack as it came in: some schema's shape, not necessarily this one.

```ts shape
import type { RawPack } from '@ifloom/engine'
type RawPack = {
  schema: number
}
```

It also takes any other key: `[key: string]: unknown`.

## Reason

Type. Explained in [Actions and buttons](/docs/reference/actions#reason).

Words a player reads when something is refused: written in place
(`'Closed.'`), or a line of the strings table by its key (`{ string:
'shop/closed' }`), so a game rewords it once for every place it is used.
Read it with `reasonOf`.

```ts shape
import type { Reason } from '@ifloom/engine'
type Reason = string | { string: string }
```

## reasonOf

Function. Explained in [Strings](/docs/reference/strings#reasonof).

A refusal's words: a `Reason` written in place as it is, or one by key
(`{ string: 'shop/closed' }`) from the game's strings, through `stringOf`.

```ts shape
import { reasonOf, type Game } from '@ifloom/engine'
function reasonOf(game: Game | undefined, reason: string | { string: string }): string
```

## RenderedChoice

Type. Explained in [The view](/docs/reference/view#renderedchoice).

```ts shape
import type { RenderedChoice } from '@ifloom/engine'
type RenderedChoice = {
  id: string
  label: string
  price?: Price
  disabled?: string
  tags?: string[]
  irreversible?: string
  ui?: Ui<ChoiceUi>
  warning?: string
  command: Command
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `label` | `string` |  |  |  |
| `price` | `Price` | yes |  | What pressing it costs, worked out for this state, with its words in `text`. Left out when it's free. |
| `disabled` | `string` | yes |  | Why it can't be pressed now, as the player reads it. Left out when it can. |
| `tags` | `string[]` | yes |  | The choice's or button's tags, for a UI to style or filter it by. |
| `irreversible` | `string` | yes |  | A warning that it can't be undone, for the UI to show on it. |
| `ui` | `Ui<ChoiceUi>` | yes |  | The choice's or button's presentation hints, as written; left out with none. See `ChoiceUi`. |
| `warning` | `string` | yes |  | Pressable, but the game would rather you didn't, and says why: a plugin guard's soft refusal: running past dawn, say. The reducer refuses it all the same, so a UI shows the warning and offers something else. |
| `command` | `Command` |  |  | What to send when the player presses it: `runner.apply(choice.command)`. |

## replay

Function. Explained in [The runner](/docs/reference/runner#replay).

Play a command log back against a game. Its start comes in through
`loadState`, and its commands are carried forward from the versions the
log records, by the engine's command steps and each plugin's
`commandMigrations`, so a log from an older engine, plugin or game still
plays; the reason comes back when it can't. Commands that are refused are
skipped, as they were then.

```ts shape
import { replay, type Game } from '@ifloom/engine'
function replay(game: Game, log: CommandLog): Result<GameState>
```

## resolveHolder

Function. Explained in [Entities](/docs/reference/entities#protagonist-and-resolveholder).

A holder as content writes it, made real: `'you'` is the protagonist, or the player.

```ts shape
import { resolveHolder } from '@ifloom/engine'
function resolveHolder(state: GameState, holder: string): string
```

## Result

Type. Explained in [The runner](/docs/reference/runner#result).

The answer to anything that can fail in a way the caller should expect: a
save that won't read, a mod for another game, a command the game refuses.
`ok` says which it is. On success `value` holds the answer; on failure
`reason` says why, in words a player can read, and `cause` holds the error
behind it when one was thrown, such as a save driver's, for a log. Nothing
that returns a `Result` throws for these failures.

```ts shape
import type { Result } from '@ifloom/engine'
type Result<T> = { ok: true; value: T; reason?: never; cause?: never } | { ok: false; reason: string; cause?: unknown; value?: never }
```

## Roll

Type. Explained in [Dice rolls](/docs/reference/rolls#roll).

One roll, as it was made: the faces each die showed, what was added, the total, and the outcome against a target.

```ts shape
import type { Roll } from '@ifloom/engine'
type Roll = {
  key: string
  dice: string
  faces: number[]
  plus: number
  total: number
  against?: number
  passed?: boolean
  critical?: 'max' | 'min'
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `key` | `string` |  |  | The kv key the total was stored under. |
| `dice` | `string` |  |  | The dice thrown, as notation without what is added: `'2d6'`. |
| `faces` | `number[]` |  |  | The face each die showed, in order. |
| `plus` | `number` |  |  | Everything added to the faces: the notation's own `+1` and the effect's `plus`. 0 when nothing was. |
| `total` | `number` |  |  | The faces added up, plus `plus`. |
| `against` | `number` | yes |  | The target the total had to reach, when the effect gave one. |
| `passed` | `boolean` | yes |  | Whether the total reached `against`; there only with a target. |
| `critical` | `'max' \| 'min'` | yes |  | `'max'` when every die showed its highest face, `'min'` when every die showed 1. |

## RollsState

Type. Explained in [Dice rolls](/docs/reference/rolls#rollsstate).

The rolls a save has made: how many in all, the last command's, and the latest under each key.

```ts shape
import type { RollsState } from '@ifloom/engine'
type RollsState = {
  made: number
  last: Roll[]
  latest: Record<string, Roll>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `made` | `number` |  |  | How many rolls this save has made: part of each new roll's seed. |
| `last` | `Roll[]` |  |  | The rolls the last command made, in order. |
| `latest` | `Record<string, Roll>` |  |  | The latest roll under each key, for the `roll` condition. |

## Runner

Type. Explained in [The runner](/docs/reference/runner#runner).

The one object a UI drives, as `createRunner` (or `browserRunner` from `@ifloom/browser`) gives it.
Anything that can fail in a way a UI should expect (a refused command, an
empty slot, a setting with no profile to keep it) answers with a `Result`
and never throws.

```ts shape
import type { Runner, Game } from '@ifloom/engine'
type Runner = {
  readonly game: Game
  readonly state: GameState
  view: () => View
  apply: (ref: CommandRef) => Result<GameState>
  undo: () => boolean
  redo: () => boolean
  log: () => CommandLog
  played: () => number
  readonly saves: Saves | undefined
  readonly offers: { undo: boolean; backlog: boolean }
  save: (slot: string, name?: string | undefined) => Promise<Result<SaveMeta>>
  restore: (loaded: LoadedSave) => void
  load: (slot: string) => Promise<Result<LoadedSave>>
  settled: () => Promise<void>
  readonly profile: Profile | undefined
  setSetting: (id: string, to: KvValue) => Result<KvValue>
  newGame: (start?: StartOptions | undefined) => Promise<GameState>
  snapshot: () => RunnerSnapshot
  subscribe: (listener: (snapshot: RunnerSnapshot) => void) => () => void
  setHelper: <K extends string>(id: K, value: (K extends 'unlocks' ? HelperRegistry[K] : unknown) | undefined) => void
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `game` | `Game` |  |  | The game this runner plays. |
| `state` | `GameState` |  |  | The current state. |
| `view` | `() => View` |  |  | What a UI draws for the current state. Built once per state: asked again for the same state, it hands back the same object, so a UI, the audio player and the backlog can all read it without building it again. Each plugin's view is shown its own profile namespace. When one of those changes, the view becomes a new object with that plugin's view built again, and listeners are told, though the state is the same. |
| `apply` | `(ref: CommandRef) => Result<GameState>` |  |  | Run a command: the new state, or why it was refused (the state is then left as it was). A `tick` is logged like any command, but undo steps over it, it adds nothing to the backlog, and it autosaves only when it changes the scene or the turn (for those policies). A `newGame`, sent on its own or by a choice, starts a new game as `newGame()` does, with the profile's play settings as last read. |
| `undo` | `() => boolean` |  |  | Step back one command. False when there is nothing to undo. |
| `redo` | `() => boolean` |  |  | Step forward again after an undo. False when there is nothing to redo. |
| `log` | `() => CommandLog` |  |  | The start state and every command since, for `replay`. |
| `played` | `() => number` |  |  | Time played, in milliseconds, counting from any save loaded. |
| `saves` | `Saves \| undefined` |  |  | The saves this runner writes to, for a menu that reads, exports or imports them. Undefined without `saves`. What it writes and removes shows in the snapshot's `saves`. Like the store, it never rejects: when the driver fails, each call answers why and tells `onSaveError`. |
| `offers` | `{ undo: boolean; backlog: boolean }` |  |  | Whether the game turned on undo, and the backlog: what a menu should offer. |
| `save` | `(slot: string, name?: string \| undefined) => Promise<Result<SaveMeta>>` |  |  | Save to a slot now: what the save says about itself, or why it wasn't written (no `saves`, the game's `saveable` refuses it now, or the driver failed). `view().saving` says beforehand whether it would be refused. |
| `restore` | `(loaded: LoadedSave) => void` |  |  | Put a save in play that did not come from a slot, one the player imported from a file (`saves.importText`), as `load` would. |
| `load` | `(slot: string) => Promise<Result<LoadedSave>>` |  |  | Load a slot: the state, a fresh history, backlog and log from it, and the time played it recorded. A failure says why: no `saves`, an empty slot, a save this game can't read, or the driver failed (told to `onSaveError` too). |
| `settled` | `() => Promise<void>` |  |  | Settles when every autosave and profile write so far has been written, and the profile first read for the settings and the plugins' views. |
| `profile` | `Profile \| undefined` |  |  | The profile this runner writes settings and `finished` to, for a UI's own namespaces. Undefined without `profile`. It never rejects: a read the driver fails answers undefined, and a write it fails is dropped, each told to `onSaveError`. |
| `setSetting` | `(id: string, to: KvValue) => Result<KvValue>` |  |  | Change a setting of either kind, checked against its declaration. A `play` setting is sent as the `setting` command, so it changes the game in play, and the profile keeps it for the next new game. A `ui` setting is written to the profile only, and needs one. Listeners are told. The value set, or why it was refused. |
| `newGame` | `(start?: StartOptions \| undefined) => Promise<GameState>` |  |  | Start a new game in place: fresh history, backlog and log, no time played. Play settings not given are the player's: the profile's, or without one the game in play's. The seed is random unless given. For New Game+, pass `carry: runner.state`. |
| `snapshot` | `() => RunnerSnapshot` |  |  | Everything a UI draws, in one value: see `RunnerSnapshot`. The same object comes back until any part of it changes. |
| `subscribe` | `(listener: (snapshot: RunnerSnapshot) => void) => () => void` |  |  | Hear about every new snapshot: a change of state, of a setting, of what the view shows of the profile, of the saves, or of what a helper reports. Each listener is handed the new snapshot. Returns the way to stop. |
| `setHelper` | `<K extends string>(id: K, value: (K extends 'unlocks' ? HelperRegistry[K] : unknown) \| un…` |  |  | Report what a helper started beside the runner is doing, under its id, in the snapshot's `helpers`: `startUnlocks` reports whether a code is being checked. Undefined takes it out. Listeners are told when it changes. |

## RunnerOptions

Type. Explained in [The runner](/docs/reference/runner#runneroptions).

```ts shape
import type { RunnerOptions } from '@ifloom/engine'
type RunnerOptions = {
  saves?: Saves
  history?: HistoryOptions | boolean
  backlog?: BacklogOptions | boolean
  autosave?: AutosaveOptions
  now?: () => number
  onSaveError?: (error: unknown) => void
  profile?: Profile
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `saves` | `Saves` | yes |  | Where `save`, `load` and autosave write. Needed for any of them. |
| `history` | `HistoryOptions \| boolean` | yes |  | Keep states for undo and redo: `true` for 50 steps back, or a `HistoryOptions`. Off if left out. |
| `backlog` | `BacklogOptions \| boolean` | yes |  | Keep what was shown, scene by scene, for a backlog screen: `true` for 200 entries, or a `BacklogOptions`. Off if left out. |
| `autosave` | `AutosaveOptions` | yes |  | Save to a slot of its own (`'auto'`) after every command, or when the scene or the turn changes. Needs `saves`. Off if left out. |
| `now` | `() => number` | yes |  | The clock for time played. `Date.now` if left out; tests pass their own. |
| `onSaveError` | `(error: unknown) => void` | yes |  | Told the error when the driver fails: an autosave, `save`, `load`, any call through `runner.saves` or `runner.profile`, the first listing of the saves, or a profile write. Later writes still run; without this, a failure is dropped. |
| `profile` | `Profile` | yes |  | What outlives a save: settings, `finished`, plugins' namespaces. Without one, nothing is written there, and a `ui` setting can't be changed. |

## RunnerSnapshot

Type. Explained in [The runner](/docs/reference/runner#runnersnapshot).

Everything a UI draws from the runner, in one value: the view, the
settings, the backlog, whether undo and redo would do anything, the saves
and what the helpers report. `runner.snapshot()` gives it, and
`runner.subscribe` hands each new one to its listeners. It is a new object
whenever any part of it changes, and the same object until then, so a UI
that keeps it whole (Vue's `shallowRef`, React's `useSyncExternalStore`, a
Svelte store) draws again exactly when something changed.

```ts shape
import type { RunnerSnapshot } from '@ifloom/engine'
type RunnerSnapshot = {
  readonly state: GameState
  readonly view: View
  readonly settings: Readonly<Record<string, KvValue>>
  readonly backlog: readonly BacklogEntry[]
  readonly canUndo: boolean
  readonly canRedo: boolean
  readonly saves: readonly SaveListing[]
  readonly helpers: HelpersIn
  readonly pressed: RenderedChoice | null
  readonly fresh: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `state` | `GameState` |  |  | The state in play, as `runner.state`. |
| `view` | `View` |  |  | What a UI draws for that state, as `runner.view()`. |
| `settings` | `Readonly<Record<string, KvValue>>` |  |  | Every setting the game declares, by id, with its value now. A `play` setting's comes from the game in play; a `ui` setting's from the profile, or its default until the profile has been read (`settled`) or without one. Stored values that no longer fit are read as the default. |
| `backlog` | `readonly BacklogEntry[]` |  |  | What was shown, oldest first. Empty unless the backlog is on. |
| `canUndo` | `boolean` |  |  | Whether `undo` would do anything. |
| `canRedo` | `boolean` |  |  | Whether `redo` would do anything. |
| `saves` | `readonly SaveListing[]` |  |  | Every save in the runner's `saves`, as `saves.list()` gives them: newest first, then any that can't be read. Read once when the runner starts (`settled` waits for it), then kept up to date as the runner saves and as `runner.saves` writes and removes. Empty without `saves`. |
| `helpers` | `HelpersIn` |  |  | What the helpers started beside the runner report, by id, such as `unlocks`. See `setHelper`. |
| `pressed` | `RenderedChoice \| null` |  |  | The choice or button that led to the screen on show, as it was offered: its `id`, its `command` and its `ui` hints as written, so a UI can play the transition a choice asks for. Set when a command the runner runs changes the screen (`view.scene.key`), from the choices, inline actions and buttons of the view it was sent from, and kept while the screen stays. Null when nothing pressed led here: a tick, a command sent by hand, an undo, a redo, a load or a new game. |
| `fresh` | `boolean` |  |  | Whether the state on show came from a command the runner just ran, rather than an undo, a redo, a load or a new game. A UI animates what the player just did only while it's true, such as the dice of `view.rolls`. |

## RunningTimer

Type. Explained in [Timers](/docs/reference/timers#runningtimer).

A running timer, as the save keeps it: milliseconds left and its whole length.

```ts shape
import type { RunningTimer } from '@ifloom/engine'
type RunningTimer = {
  left: number
  total: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `left` | `number` |  |  | Milliseconds left. At 0 it runs out on the next tick. |
| `total` | `number` |  |  | The length it was started with, in milliseconds, which adding time can raise. |

## SAVE_VERSION

Const. Explained in [Saves](/docs/reference/saves#save_version).

The save format's version. Only a change to the shape of something saves
already have bumps it, with a step in `STEPS` (intake.ts) that reshapes it.
An added field doesn't: it declares a load default in `FIELDS` or in its
feature's `state`, and older saves get that default when they load.

```ts shape
import { SAVE_VERSION } from '@ifloom/engine'
const SAVE_VERSION: 24
```

## SaveDriver

Type. Explained in [Saves](/docs/reference/saves#savedriver).

Where saves are kept. The save store speaks to a driver and nothing else, so
a game picks where its saves live (the browser's localStorage or IndexedDB
from `@ifloom/browser`, memory for tests, or a driver of its own, such as a
desktop wrapper's file system or a sync service the player signs into)
without the rest of the engine knowing which.

Every driver is asynchronous, whether or not its storage is, so a game can
swap one for another without changing a line that calls it.

```ts shape
import type { SaveDriver } from '@ifloom/engine'
type SaveDriver = {
  name: string
  get: (key: string) => Promise<string | null>
  set: (key: string, value: string) => Promise<void>
  remove: (key: string) => Promise<void>
  keys: (prefix: string) => Promise<string[]>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `name` | `string` |  |  | For diagnostics and the debug panel: "localStorage", "indexedDB"… |
| `get` | `(key: string) => Promise<string \| null>` |  |  | The text stored under a key, or null if there's none. |
| `set` | `(key: string, value: string) => Promise<void>` |  |  | Store text under a key, replacing what was there. |
| `remove` | `(key: string) => Promise<void>` |  |  | Delete a key. Nothing happens if it isn't there. |
| `keys` | `(prefix: string) => Promise<string[]>` |  |  | Every key that starts with this prefix. |

## SaveExtra

Type. Explained in [Saves](/docs/reference/saves#saveextra).

What a save's write is given besides the state.

```ts shape
import type { SaveExtra } from '@ifloom/engine'
type SaveExtra = {
  name?: string
  played?: number
  savedAt?: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `name` | `string` | yes |  | The player's name for it. One made from where and when if left out. |
| `played` | `number` | yes |  | Time played, in milliseconds. 0 if left out. |
| `savedAt` | `number` | yes |  | When it was written, epoch milliseconds. Now if left out. |

## SaveFile

Type. Explained in [Saves](/docs/reference/saves#savefile).

A save as it is written: the state, and what it says about itself. `ifloom`
is the format of this envelope, 1, apart from the state's own `version`
(`SAVE_VERSION`), which `loadState` carries forward.

```ts shape
import type { SaveFile } from '@ifloom/engine'
type SaveFile = {
  ifloom: 1
  meta: SaveMeta
  state: GameState
}
```

## SaveListing

Type. Explained in [Saves](/docs/reference/saves#savelisting).

One entry of a game's saves, as `list()` gives them: a save's meta, or a save that can't be read.

```ts shape
import type { SaveListing } from '@ifloom/engine'
type SaveListing = SaveMeta | BrokenSave
```

## SaveMeta

Type. Explained in [Saves](/docs/reference/saves#savemeta).

What a save says about itself, for a load screen.

```ts shape
import type { SaveMeta } from '@ifloom/engine'
type SaveMeta = {
  game: string
  slot: string
  name: string
  savedAt: number
  played: number
  turn: number
  when: string | null
  playerName: string | null
  packs: string[]
  plugins: Record<string, number>
  gameVersion: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `game` | `string` |  |  | The game it belongs to; another game's save is refused on import. |
| `slot` | `string` |  |  | The slot it's in: `'1'`, `'auto'`, or the game's own name for one. |
| `name` | `string` |  |  | The player's name for it, or one made from where and when. |
| `savedAt` | `number` |  |  | When it was written, epoch milliseconds. |
| `played` | `number` |  |  | Time played, in milliseconds, as the runner counted it. |
| `turn` | `number` |  |  | How many turns had passed. |
| `when` | `string \| null` |  |  | When and where the game was, in plugins' words ("Day 3 · Wednesday morning · The café"), or null if none says. |
| `playerName` | `string \| null` |  |  | What the first `saveName` that answers gave for the state (the game's `rules.saveName`, then each plugin's), such as the name the player typed, or null. |
| `packs` | `string[]` |  |  | The ids of the packs the game was loaded with; a missing mod is reported on load. |
| `plugins` | `Record<string, number>` |  |  | The plugins the game was built with, and the version of each one's state. |
| `gameVersion` | `number` |  |  | The game's own version (`game.version`) the save was made with; 1 for a game that declares none. |

## Saves

Type. Explained in [Writing a plugin](/docs/reference/plugins#saves).

One game's saves, as `saves` gives them. Nothing here rejects: when the
driver fails, each answers a failure in words a player can read, with the
driver's error as its `cause`.

```ts shape
import type { Saves } from '@ifloom/engine'
type Saves = {
  readonly driver: SaveDriver
  write: (slot: string, state: GameState, extra?: SaveExtra | undefined) => Promise<Result<SaveMeta>>
  read: (slot: string) => Promise<Result<LoadedSave | null>>
  list: () => Promise<Result<SaveListing[]>>
  remove: (slot: string) => Promise<Result<void>>
  exportSlot: (slot: string) => Promise<Result<string | null>>
  importText: (text: string) => Result<LoadedSave>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `driver` | `SaveDriver` |  |  | Where the saves are kept. |
| `write` | `(slot: string, state: GameState, extra?: SaveExtra \| undefined) => Promise<Result<SaveMet…` |  |  | Write a state to a slot: what the save says about itself, or `notSaved` if the driver fails. |
| `read` | `(slot: string) => Promise<Result<LoadedSave \| null>>` |  |  | A slot read back, carried forward and checked against this game. The value is null when the slot is empty; a failure says why the save can't be read, or is `notLoaded` if the driver fails. |
| `list` | `() => Promise<Result<SaveListing[]>>` |  |  | Every save this game has, newest first, then any that can't be read, as `{ slot, broken }` with the reason, by slot. Tell them apart with `'broken' in entry`; a broken one can still be removed. `notListed` if the driver fails. |
| `remove` | `(slot: string) => Promise<Result<void>>` |  |  | Delete a slot. Nothing happens if it is empty. `notRemoved` if the driver fails. |
| `exportSlot` | `(slot: string) => Promise<Result<string \| null>>` |  |  | A save as text a player can keep as a file, or null if the slot is empty. `notExported` if the driver fails. |
| `importText` | `(text: string) => Result<LoadedSave>` |  |  | Text from a file a player picked, checked against this game: the save, or why it was refused. |

## saves

Function. Explained in [Saves](/docs/reference/saves#saves).

One game's saves, kept wherever its driver keeps them.

Keys carry the game's id: opened from disk, every game shares one storage
origin in Chromium, and itch.io serves many games from shared domains. The
format's version lives inside the save (`loadState`), never in the key, so a
new version never orphans an old save. Slots are names — `'auto'`,
`'quick'`, `'1'` — chosen by the game.

```ts shape
import { saves, type Game } from '@ifloom/engine'
function saves(game: Game, driver: SaveDriver): Saves
```

## SavingView

Type. Explained in [The view](/docs/reference/view#savingview).

Whether the player can save now, and why not: what `view.saving` holds.

```ts shape
import type { SavingView } from '@ifloom/engine'
type SavingView = {
  allowed: boolean
  reason: string | null
  visible: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `allowed` | `boolean` |  |  | False while one of `game.saveable`'s entries holds. |
| `reason` | `string \| null` |  |  | The first entry's `reason` that holds, or null when saving is allowed. |
| `visible` | `boolean` |  |  | False while that entry has `hide`: leave Save off the screen rather than greyed out. |

## say

Function. Explained in [Flowing scenes](/docs/reference/flows#the-builders).

A spoken line, under who says it, by id as `@id: "…"` in prose names them:
an entity, by reference or by bare id as a scene's `speaker` is (`'ava'` is
`character:ava`), `'you'` for whoever the player is playing, or `'player'`.
Its beat is a `say` with that `speaker` and their name.

```ts shape
import { say } from '@ifloom/engine'
function say(who: string, words: string, extras?: BlockExtras & { id?: string; voice?: string }): Block
```

## SceneBeat

Type. Explained in [Prose and markup](/docs/reference/prose#scenebeat).

One piece of a scene's body, as the UI draws it. Any beat can carry `ui`:
the presentation hints of the block it starts, as content wrote them.

```ts shape
import type { SceneBeat } from '@ifloom/engine'
type SceneBeat = ({ type: 'text'; text: string; spans?: InlineSpan[] } | { type: 'say'; who: 'character' | 'player'; speaker?: EntityRef; name?: string; text: string; voice?: string; spans?: InlineSpan[] } | { type: 'image'; src: string; alt?: string; size: BeatSize } | { type: 'video'; src: string; poster?: string; alt?: string; size: BeatSize; autoplay: boolean; loop: boolean; muted: boolean; controls: boolean } | { type: 'sound'; track: string } | { type: 'chose'; label: string }) & { ui?: Ui<BlockUi>; section?: Ui<BlockUi> }
```

## SceneMedia

Type. Explained in [Scenes](/docs/reference/scenes#scenemedia).

A picture or a video in a scene's body, as a `{ media }` block. Give a file
as `src`, or ask a pool for one with `pool` and `tags`.

```ts shape
import type { SceneMedia } from '@ifloom/engine'
type SceneMedia = {
  src?: string
  pool?: string
  tags?: string[]
  alt?: string
  size?: 'inline' | 'wide'
  at?: 'lead' | 'end'
  video?: boolean
  controls?: boolean
  once?: boolean
  sound?: boolean
  poster?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `src` | `string` | yes |  |  |
| `pool` | `string` | yes |  | A pool in `game.media.pools` to pick the file from. |
| `tags` | `string[]` | yes |  | The tags the pick should have, most important first. See `poolCandidates`. |
| `alt` | `string` | yes |  |  |
| `size` | `'inline' \| 'wide'` | yes |  | `'inline'` if left out. |
| `at` | `'lead' \| 'end'` | yes |  | Where it sits. Left out, a `{ media }` block sits where it is in the body, in order with the prose. `lead` opens the scene, which is where an establishing still belongs; `end` follows the body. |
| `video` | `boolean` | yes |  | Draw it as a video. A `.mp4` or `.webm` file is one anyway. |
| `controls` | `boolean` | yes |  | Show the player's controls. It then waits to be started instead of playing by itself. |
| `once` | `boolean` | yes |  | Play once instead of looping. |
| `sound` | `boolean` | yes |  | Play with sound instead of muted. |
| `poster` | `string` | yes |  | A still to show before it plays, as a path like any picture's. |

## sceneOf

Function. Explained in [The game](/docs/reference/game#sceneof).

The scene with this id, as content declares it, or undefined.

```ts shape
import { sceneOf, type Game } from '@ifloom/engine'
function sceneOf(game: Game, id: string): DataScene | undefined
```

## ScenePanel

Type. Explained in [Panels](/docs/reference/panels#scenepanel).

A panel a scene holds open for as long as it is on screen: its name, and what it is opened with.

```ts shape
import type { ScenePanel } from '@ifloom/engine'
type ScenePanel = {
  panel: string
  with?: PluginArgs
}
```

## SceneUi

Type. Explained in [Presentation hints](/docs/reference/ui-hints#sceneui-choiceui-blockui-entityui-statui-and-gameui).

Hints on a scene, and on a room scene (a place's), for the UI that draws it. Empty here; a UI package augments it.

```ts shape
import type { SceneUi } from '@ifloom/engine'
type SceneUi = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## SCHEMA

Const. Explained in [Content, packs and loading](/docs/reference/loader#schema).

The content format this engine reads. A pack of an older one is upgraded by `PACK_STEPS`; a newer one is refused.

```ts shape
import { SCHEMA } from '@ifloom/engine'
const SCHEMA: 30
```

## Screen

Type. Explained in [The view](/docs/reference/view#screen-1).

One state's screen. See `screen`.

```ts shape
import type { Screen } from '@ifloom/engine'
type Screen = {
  scene: ScreenScene
  choices: ScreenChoice[]
  actions: ScreenChoice[]
  picture: PictureView | null
  plugins: Record<string, unknown>
  picks: Record<string, string>
  audio: AudioView & { tracks: Record<string, string | null> }
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `scene` | `ScreenScene` |  |  | The open scene as rendered, or the room when none is open. A minigame being played is drawn over either: see `view.minigame`. |
| `choices` | `ScreenChoice[]` |  |  | The open scene's visible choices, each with its effects, availability and price. Empty for the room, and while a minigame is played. |
| `actions` | `ScreenChoice[]` |  |  | The room's buttons while no scene is open and no lock stops everything: the `actions` providers' (the game's rules' first, then each plugin's), then the game's own `actions`. |
| `picture` | `PictureView \| null` |  |  | The open scene's layered picture and its hotspots, or null. |
| `plugins` | `Record<string, unknown>` |  |  | Every plugin's view, by plugin id. |
| `picks` | `Record<string, string>` |  |  | The pool picks this screen made that the save doesn't hold yet, by pick key. The reducer records them. |
| `audio` | `AudioView & { tracks: Record<string, string \| null> }` |  |  | What should be playing, as `view.audio` has it, and `tracks`: the track each background channel resolved to (null for silence), which the reducer records as started. |

## screen

Function. Explained in [The view](/docs/reference/view#screen).

One state, drawn once: the open scene (or the room), its choices with their
effects, availability and price, the room's buttons, the picture, the plugins'
views, and the pool picks and audio they imply. The open scene is rendered
once, and every choice's availability and effects come from that one render.

`view` formats a screen for a UI. Use `screen` when you need what `view`
leaves out: what each choice would apply, or the picks and tracks.

```ts shape
import { screen, type Game } from '@ifloom/engine'
function screen(state: GameState, game: Game, options?: ViewOptions): Screen
```

## ScreenChoice

Type. Explained in [The view](/docs/reference/view#screenchoice).

A choice or a button on a screen: as the view shows it, and what pressing it would apply.

```ts shape
import type { ScreenChoice } from '@ifloom/engine'
type ScreenChoice = {
  id: string
  label: string
  price?: Price
  disabled?: string
  tags?: string[]
  irreversible?: string
  ui?: Ui<ChoiceUi>
  warning?: string
  command: Command
  effects: Effect[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `label` | `string` |  |  |  |
| `price` | `Price` | yes |  | What pressing it costs, worked out for this state, with its words in `text`. Left out when it's free. |
| `disabled` | `string` | yes |  | Why it can't be pressed now, as the player reads it. Left out when it can. |
| `tags` | `string[]` | yes |  | The choice's or button's tags, for a UI to style or filter it by. |
| `irreversible` | `string` | yes |  | A warning that it can't be undone, for the UI to show on it. |
| `ui` | `Ui<ChoiceUi>` | yes |  | The choice's or button's presentation hints, as written; left out with none. See `ChoiceUi`. |
| `warning` | `string` | yes |  | Pressable, but the game would rather you didn't, and says why: a plugin guard's soft refusal: running past dawn, say. The reducer refuses it all the same, so a UI shows the warning and offers something else. |
| `command` | `Command` |  |  | What to send when the player presses it: `runner.apply(choice.command)`. |
| `effects` | `Effect[]` |  |  | What it would apply, as `effectsOf` says: a choice's effects, an action's cost and effects. |

## ScreenScene

Type. Explained in [The view](/docs/reference/view#screenscene).

The scene on a screen, or the room when none is open, without its choices and picture.

```ts shape
import type { ScreenScene } from '@ifloom/engine'
type ScreenScene = {
  id: string | null
  key: string
  title: string
  body: string
  beats: SceneBeat[]
  fresh: number
  tags: string[]
  speaker: SpeakerView | null
  image: string | null
  ui?: Ui<SceneUi>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string \| null` |  |  | The open scene's id, or null for the room. |
| `key` | `string` |  |  | Which screen this is: `scene:<id>` while a scene is open, `minigame:<id>` while a minigame is played, `room:<id>` for a plugin's room scene (a place, by its id), and `room` with none. It changes when the screen does, and only then. |
| `title` | `string` |  |  | The heading: the scene's title, or the room's. |
| `body` | `string` |  |  | The words as content wrote them, markup and all. Draw `beats`, which is this parsed. |
| `beats` | `SceneBeat[]` |  |  | The body parsed into paragraphs, speech, pictures and past picks, ready to draw. See `SceneBeat`. |
| `fresh` | `number` |  |  | The first of `beats` the flow's last step brought, from its `chose` on: what a pick, a jump or a minigame or panel done with added, so a UI can animate only that. 0 when the visit has taken no step, and for the room. |
| `tags` | `string[]` |  |  | The scene's tags, for the UI to style it by. |
| `speaker` | `SpeakerView \| null` |  |  | Who is speaking: the scene's `speaker`, as their entity is. Null with none, or one that names no entity. |
| `image` | `string \| null` |  |  | The big picture to draw with the scene: the speaker's, else null. |
| `ui` | `Ui<SceneUi>` | yes |  | The scene's presentation hints (the room scene's, when no scene is open), as written; left out with none. See `SceneUi`. |

## Select

Type. Explained in [Entities](/docs/reference/entities#select).

Which entities a `count` or an `each` looks at: those `of` a kind, those a
holder holds (`at`), those with a tag or a trait, and those `where` holds
for, with `'$'` as each one. Every entity in the game if it says none.

```ts shape
import type { Select } from '@ifloom/engine'
type Select = {
  of?: string
  at?: string
  tag?: string
  trait?: string
  where?: Condition
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `of` | `string` | yes |  | A kind. |
| `at` | `string` | yes |  | A holder: only what it holds (`'you'`, `'player'` or a unique entity). |
| `tag` | `string` | yes |  | A tag it has, its kind's or its own. |
| `trait` | `string` | yes |  | A trait it has, by id. |
| `where` | `Condition` | yes |  | A condition asked for each, with `'$'` as that one. |

## SettingDef

Type. Explained in [Settings](/docs/reference/settings#settingdef).

Something the player can change from a settings screen, declared by the
game. A `play` setting (the default) is part of the game state and saved
with it; a `ui` setting never enters the state and lives in the profile.

```ts shape
import type { SettingDef } from '@ifloom/engine'
type SettingDef = { id: string; label: string; affects?: 'play' | 'ui' } & ({ type: 'toggle'; default: boolean } | { type: 'choice'; options: { value: string; label: string }[]; default: string } | { type: 'range'; min: number; max: number; step?: number; default: number })
```

## SettingView

Type. Explained in [The view](/docs/reference/view#settingview).

A setting as a settings screen draws it.

```ts shape
import type { SettingView } from '@ifloom/engine'
type SettingView = {
  id: string
  label: string
  type: 'toggle' | 'choice' | 'range'
  affects: 'play' | 'ui'
  options?: { value: string; label: string }[]
  min?: number
  max?: number
  step?: number
  default: KvValue
  value: KvValue | null
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `label` | `string` |  |  |  |
| `type` | `'toggle' \| 'choice' \| 'range'` |  |  | How the player sets it: a `toggle` (on or off), a `choice` among `options`, or a `range` from `min` to `max`. |
| `affects` | `'play' \| 'ui'` |  |  | `play` settings live in the save and change the game; `ui` settings live in the profile and only change how it's shown. |
| `options` | `{ value: string; label: string }[]` | yes |  | A choice's options. |
| `min` | `number` | yes |  | A range's bounds and step. |
| `max` | `number` | yes |  | A range's highest value. |
| `step` | `number` | yes |  | A range's step. 1 if the setting gives none. |
| `default` | `KvValue` |  |  | The value it has until the player changes it, as the game declares it. |
| `value` | `KvValue \| null` |  |  | A play setting's value in this game. Null for a ui setting, which the UI reads from the profile. |

## SpeakerView

Type. Explained in [The view](/docs/reference/view#speakerview).

Who is speaking, or who sent something, as the screen draws them.

```ts shape
import type { SpeakerView } from '@ifloom/engine'
type SpeakerView = {
  id: string
  ref: EntityRef
  name: string
  image: string | null
  ui?: Ui<EntityUi>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The id as content named them: `'ava'`, or a reference, `'character:ava'`. |
| `ref` | `EntityRef` |  |  | The entity they are. |
| `name` | `string` |  |  |  |
| `image` | `string \| null` |  |  | Their entity's picture, through `artSrc`; null for none. |
| `ui` | `Ui<EntityUi>` | yes |  | Their presentation hints, as their entity has them; left out with none. See `EntityUi`. |

## startingState

Function. Explained in [Commands](/docs/reference/commands#startingstate).

A new game: every field at its start value, with a New Game+'s carried
values laid over, then what features work out from the whole state (what
the opening screen starts playing).

```ts shape
import { startingState, type Game } from '@ifloom/engine'
function startingState(game: Game, options?: StartOptions): GameState
```

## StartOptions

Type. Explained in [Commands](/docs/reference/commands#startoptions).

```ts shape
import type { StartOptions } from '@ifloom/engine'
type StartOptions = {
  seed?: number
  kv?: Record<string, KvValue>
  settings?: Record<string, unknown>
  carry?: GameState
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `seed` | `number` | yes |  | Fixes the save's random draws. Left out, it is hashed from the game's id, so tests deal the same cards. |
| `kv` | `Record<string, KvValue>` | yes |  | Keys to write to the kv store before the first scene: a name from a title screen, a difficulty. |
| `settings` | `Record<string, unknown>` | yes |  | The player's stored values for the game's `play` settings, usually the profile's `core:settings`. A setting given no value, or one it doesn't take, starts at its default; ids the game doesn't declare are ignored. |
| `carry` | `GameState` | yes |  | The state a finished game ended on, for a New Game+: the stats, kv keys and things the game's `carryOver` lists are copied from it. |

## StatDef

Type. Explained in [Stats](/docs/reference/stats#statdef).

A number the game keeps for the player: charisma, money, energy, a
reputation — whatever the game is about. The engine has none of its own; a
game declares every stat it uses, and one with no stats declares none.

```ts shape
import type { StatDef } from '@ifloom/engine'
type StatDef = {
  id: string
  of?: string
  label: string
  start?: number
  min?: Amount
  max?: Amount
  visible?: Condition
  listed?: boolean
  spendable?: boolean
  lacking?: StatWords
  format?: StatWords
  derive?: Formula
  levels?: StatLevels
  round?: StatRound
  ui?: Ui<StatUi>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `of` | `string` | yes |  | The kind of entity it belongs to: `'staff'` gives every member of staff one. The player's if left out. |
| `label` | `string` |  |  | What the player reads: "Charisma", "Money". |
| `start` | `number` | yes |  | Where a new game starts it. 0 if left out. |
| `min` | `Amount` | yes |  | Lowest it can go. 0 if left out. An `Amount`, so a floor can move with the game: `{ stat: 'debtLimit' }`. |
| `max` | `Amount` | yes |  | Highest it can go. 100 if left out. An `Amount`, so a ceiling can move with the game: another stat (`{ stat: 'fitness' }`), or a value by name (`{ value: 'game/energyMax' }`, with `with` for its arguments). A ceiling that reads the stat itself reads 100. |
| `visible` | `Condition` | yes |  | When the player can see it. Always, if left out. |
| `listed` | `boolean` | yes |  | Whether it belongs in the view's stat list. True if left out. A game that shows a stat its own way — a gauge, a purse — sets this false. |
| `spendable` | `boolean` | yes |  | Spent on things: money, energy, time on the clock. A spendable stat is what a button's price is made of. |
| `lacking` | `StatWords` | yes |  | The refusal when a cost needs more than the player has, with `{n}` for the amount: `'Not enough on you.'`, `'Need {n} energy.'`, or one for 1 and one for any other amount, as `format` takes. Without it: "Not enough" and the label. |
| `format` | `StatWords` | yes |  | How the value is written for the player, with `{n}` for the number: `'£{n}'`, `'{n} energy'`. For words that change with the number, one for 1 and one for any other: `{ one: '{n} coin', other: '{n} coins' }`. Just the number if left out. |
| `derive` | `Formula` | yes |  | Work the stat out from others instead of keeping it: `{ sum: ['strength', 'agility'] }`. A derived stat is read like any stat and never written; the loader reports a `stat` effect on one. See `Formula`. |
| `levels` | `StatLevels` | yes |  | Levels the stat passes as it grows. None if left out. See `StatLevels`. |
| `round` | `StatRound` | yes |  | How the value reads: `'floor'`, `'round'` or `'ceil'` to a whole number, or `'none'` to read it as it is. Applied to what is read, last, after `derive` and any plugin's modifiers, then held to the range; the kept value underneath is never rounded. `'none'` if left out. |
| `ui` | `Ui<StatUi>` | yes |  | Presentation hints for the UI, carried to the stat's view as written. See `StatUi`. |

## StatKey

Type. Explained in [Game state](/docs/reference/state#statkey).

A stat's id. The game declares its stats; see `StatDef`.

```ts shape
import type { StatKey } from '@ifloom/engine'
type StatKey = string
```

## statLevel

Function. Explained in [Stats](/docs/reference/stats#statlevel).

Where a stat with `levels` stands: its level, the value the next one starts
at (null at the top), and how far it is from this level's start to the
next, 0 to 1 (1 at the top). Undefined for a stat with no levels.

```ts shape
import { statLevel, type Game } from '@ifloom/engine'
function statLevel(state: GameState, game: Game, id: string, of?: string): { level: number; next: number | null; progress: number } | undefined
```

## StatLevels

Type. Explained in [Stats](/docs/reference/stats#statlevels).

Levels on a stat: thresholds it passes as it grows, and what to tell the player when it passes one.

```ts shape
import type { StatLevels } from '@ifloom/engine'
type StatLevels = {
  at: number[]
  notice?: string
  hidden?: boolean
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `at` | `number[]` |  |  | The value each level starts at, lowest first. Below the first is level 0. |
| `notice` | `string` | yes |  | Raised as a notice tagged `level` when a command takes the player's stat up a level, with `{label}` and `{level}` filled in: `'{label} is now level {level}.'`. No notice if left out. |
| `hidden` | `boolean` | yes |  | Keep the levels from the player: the view gives the stat no `level`, so the thresholds are never shown, and `{ level }` conditions still read them. For a hidden rating such as how much a character trusts you. |

## statOf

Function. Explained in [Stats](/docs/reference/stats#statof).

```ts shape
import { statOf, type Game } from '@ifloom/engine'
function statOf(game: Game, id: string): StatDef | undefined
```

## StatRound

Type. Explained in [Stats](/docs/reference/stats#statround).

How a stat's value is rounded when it is read: see `StatDef.round`.

```ts shape
import type { StatRound } from '@ifloom/engine'
type StatRound = 'none' | 'floor' | 'round' | 'ceil'
```

## Stats

Type. Explained in [Core concepts](/docs/guide/concepts#stats).

Every declared stat's current value, by id.

```ts shape
import type { Stats } from '@ifloom/engine'
type Stats = {
  [key: string]: number
}
```

## StatUi

Type. Explained in [Presentation hints](/docs/reference/ui-hints#sceneui-choiceui-blockui-entityui-statui-and-gameui).

Hints on a stat. Empty here; a UI package augments it.

```ts shape
import type { StatUi } from '@ifloom/engine'
type StatUi = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## statValue

Function. Explained in [Stats](/docs/reference/stats#statvalue).

A stat's value as everything reads it: the player's, or with `of`, an
entity's (`'staff:ana'`). A derived stat is worked out from its formula and
held to its range; a kept stat the save doesn't have yet reads as its
`start`. An entity that isn't there reads 0.

```ts shape
import { statValue, type Game } from '@ifloom/engine'
function statValue(state: GameState, game: Game, id: string, of?: string): number
```

## StatView

Type. Explained in [The view](/docs/reference/view#statview).

A stat as the UI shows it: its value, its range, the value written out, and its hints.

```ts shape
import type { StatView } from '@ifloom/engine'
type StatView = {
  key: StatKey
  label: string
  value: number
  min: number
  max: number
  text: string
  level?: { level: number; next: number | null; progress: number }
  ui?: Ui<StatUi>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `key` | `StatKey` |  |  | The stat's id. |
| `label` | `string` |  |  |  |
| `value` | `number` |  |  | Its value as play reads it: kept or derived, with the plugins' modifiers, rounded and held to its range. |
| `min` | `number` |  |  | The lowest it can go. |
| `max` | `number` |  |  | The highest it can go right now. |
| `text` | `string` |  |  | The value written out with the stat's `format`: `'12 coins'`, `'80%'`. The number itself with no format. |
| `level` | `{ level: number; next: number \| null; progress: number }` | yes |  | Where a stat with `levels` stands: its level, the value the next level starts at (null at the top), and how far it is towards it, 0 to 1. Left out for a stat with no levels. |
| `ui` | `Ui<StatUi>` | yes |  | The stat's presentation hints, as written; left out with none. See `StatUi`. |

## StatWords

Type. Explained in [Stats](/docs/reference/stats#statwords).

A stat's words for a number: the same for every number, or `one` for exactly 1 and `other` for the rest.

```ts shape
import type { StatWords } from '@ifloom/engine'
type StatWords = string | { one: string; other: string }
```

## StoryletFields

Type. Explained in [Scenes](/docs/reference/scenes#storyletfields).

What makes a scene a storylet: the named draws it can be drawn from, how
often, and when. See the `{ scene: { from } }` effect.

```ts shape
import type { StoryletFields } from '@ifloom/engine'
type StoryletFields = {
  drawnFrom?: string[]
  weight?: number
  when?: Condition
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `drawnFrom` | `string[]` | yes |  | The draws this scene can come up in, by name: `['cafe']`. A `{ scene: { from: 'cafe' } }` effect draws one of the scenes that name `'cafe'` here. Separate from `tags`, which only style the scene. |
| `weight` | `number` | yes |  | How likely a draw is to pick it, against the others it could pick. 1 if left out. Needs `drawnFrom`. |
| `when` | `Condition` | yes |  | Only drawn while this holds. It gates draws only: a `scene` command or effect naming the scene opens it regardless. |

## StorylineDef

Type. Explained in [Storylines](/docs/reference/storylines#storylinedef).

A thread of the story, followed by its kv, and closed for a while if need be.

```ts shape
import type { StorylineDef } from '@ifloom/engine'
type StorylineDef = {
  id: string
  name: string
}
```

## storylineOpen

Function. Explained in [Storylines](/docs/reference/storylines#storylineopen).

Is the storyline open: not closed, or closed until a turn that has come?

```ts shape
import { storylineOpen } from '@ifloom/engine'
function storylineOpen(state: GameState, id: string): boolean
```

## StorylineState

Type. Explained in [Storylines](/docs/reference/storylines#storylinestate).

```ts shape
import type { StorylineState } from '@ifloom/engine'
type StorylineState = {
  closedUntil: number | null
  kv: Record<string, KvValue>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `closedUntil` | `number \| null` |  |  | The turn it opens again, or null while it is open. |
| `kv` | `Record<string, KvValue>` |  |  | The storyline's own kv keys, read and written with `of: 'storyline:<id>'`. |

## StringKey

Type. Explained in [Strings](/docs/reference/strings#stringkey-and-strings).

A key of the engine's own strings.

```ts shape
import type { StringKey } from '@ifloom/engine'
type StringKey = keyof typeof STRINGS
```

## stringOf

Function. Explained in [Strings](/docs/reference/strings#stringof).

The words for a key: the game's, else the plugin's default for a `plugin/name`
key, else the engine's, else the key itself so a missing line shows up. Each
`{name}` is replaced from `vars`; one with no value is left as it is.

```ts shape
import { stringOf, type Game } from '@ifloom/engine'
function stringOf(game: Game | undefined, key: StringKey | (string & {}), vars?: Record<string, string | number>): string
```

## STRINGS

Const. Explained in [Strings](/docs/reference/strings#strings).

Every word the engine shows the player, by key, in English.

A game replaces any of them with `game.strings` — or a pack's `strings`, so a
translation can ship as a mod — and the engine says the game's version
everywhere it would have said its own. `{name}` and friends are filled in
from what the engine knows at the time.

Plugins declare their own defaults under their id (`quests/notDoing`), and
the game overrides those the same way.

```ts shape
import { STRINGS } from '@ifloom/engine'
const STRINGS: {
  finishFirst: 'Finish this first.'
  notSupported: 'This game does not do that.'
  noSuchAction: 'There is no such thing to do.'
  notEnough: 'Not enough {stat}.'
  noSuchScene: 'There is no such scene.'
  nothingToChoose: 'There is nothing to choose.'
  notOnOffer: 'That is not on offer.'
  noSuchThing: 'There is no such thing.'
  badArgument: 'That can’t be done: "{arg}" must be {kind}.'
  noSuchInput: 'There is no such thing to fill in.'
  notNow: 'Not now.'
  enterSomething: 'Enter something first.'
  enterNumber: 'Enter a number.'
  tooLong: 'Keep it to {n} characters.'
  between: 'Between {min} and {max}.'
  atLeast: 'At least {min}.'
  atMost: 'At most {max}.'
  notAnOption: 'That is not one of the options.'
  noMinigame: 'Nothing is being played.'
  noPanel: 'Nothing is open.'
  notLive: 'That does nothing now.'
  noTimer: 'Nothing is counting down.'
  tickLength: 'A tick is a number of milliseconds above 0.'
  noSuchSetting: 'There is no such setting.'
  notAGameSetting: 'That setting does not change the game.'
  noProfile: 'This game keeps no settings between plays.'
  onOrOff: 'Choose on or off.'
  inSteps: 'In steps of {step}.'
  lookAround: 'Look around'
  priceSeparator: ' · '
  'minigame.up': 'Up'
  'minigame.down': 'Down'
  'minigame.left': 'Left'
  'minigame.right': 'Right'
  'minigame.space': 'Space'
  you: 'You'
  momentPassed: 'The moment has passed.'
  done: 'Already done.'
  notASave: 'That is not a save file.'
  otherGame: 'That save belongs to another game ({game}).'
  saveTooOld: 'That save is from a version this game cannot read.'
  pluginNewer: 'That save was made with a newer version of {plugin}.'
  gameNewer: 'That save was made with a newer version of this game.'
  pluginUnreadable: 'That save\'s {plugin} is from a version this game cannot read.'
  noSaves: 'This game keeps no saves.'
  emptySlot: 'Nothing is saved there.'
  notSaved: 'The game could not be saved.'
  notLoaded: 'The game could not be loaded.'
  notListed: 'The saves could not be read.'
  notRemoved: 'The save could not be deleted.'
  notExported: 'The save could not be exported.'
  turnLabel: 'Turn {turn}'
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `finishFirst` | `'Finish this first.'` |  |  |  |
| `notSupported` | `'This game does not do that.'` |  |  |  |
| `noSuchAction` | `'There is no such thing to do.'` |  |  |  |
| `notEnough` | `'Not enough {stat}.'` |  |  |  |
| `noSuchScene` | `'There is no such scene.'` |  |  |  |
| `nothingToChoose` | `'There is nothing to choose.'` |  |  |  |
| `notOnOffer` | `'That is not on offer.'` |  |  |  |
| `noSuchThing` | `'There is no such thing.'` |  |  |  |
| `badArgument` | `'That can’t be done: "{arg}" must be {kind}.'` |  |  |  |
| `noSuchInput` | `'There is no such thing to fill in.'` |  |  |  |
| `notNow` | `'Not now.'` |  |  |  |
| `enterSomething` | `'Enter something first.'` |  |  |  |
| `enterNumber` | `'Enter a number.'` |  |  |  |
| `tooLong` | `'Keep it to {n} characters.'` |  |  |  |
| `between` | `'Between {min} and {max}.'` |  |  |  |
| `atLeast` | `'At least {min}.'` |  |  |  |
| `atMost` | `'At most {max}.'` |  |  |  |
| `notAnOption` | `'That is not one of the options.'` |  |  |  |
| `noMinigame` | `'Nothing is being played.'` |  |  |  |
| `noPanel` | `'Nothing is open.'` |  |  |  |
| `notLive` | `'That does nothing now.'` |  |  |  |
| `noTimer` | `'Nothing is counting down.'` |  |  |  |
| `tickLength` | `'A tick is a number of milliseconds above 0.'` |  |  |  |
| `noSuchSetting` | `'There is no such setting.'` |  |  |  |
| `notAGameSetting` | `'That setting does not change the game.'` |  |  |  |
| `noProfile` | `'This game keeps no settings between plays.'` |  |  |  |
| `onOrOff` | `'Choose on or off.'` |  |  |  |
| `inSteps` | `'In steps of {step}.'` |  |  |  |
| `lookAround` | `'Look around'` |  |  |  |
| `priceSeparator` | `' · '` |  |  | Between the parts of a price on a button, its stats and plugins' notes: `2 coins · until evening`. |
| `minigame.up` | `'Up'` |  |  | A minigame input's button, by the input's name: `minigame.<input>`. A game names its own inputs the same way (`'minigame.jump': 'Jump'`); one with no line is its own name with a capital. |
| `minigame.down` | `'Down'` |  |  |  |
| `minigame.left` | `'Left'` |  |  |  |
| `minigame.right` | `'Right'` |  |  |  |
| `minigame.space` | `'Space'` |  |  |  |
| `you` | `'You'` |  |  | The name the player's spoken lines show (`@you: "Hi."`) when the game's `rules.saveName` gives none. A game in another language sets its own. |
| `momentPassed` | `'The moment has passed.'` |  |  |  |
| `done` | `'Already done.'` |  |  | On a button that can be pressed only once, a game or a turn, once it has been. |
| `notASave` | `'That is not a save file.'` |  |  |  |
| `otherGame` | `'That save belongs to another game ({game}).'` |  |  |  |
| `saveTooOld` | `'That save is from a version this game cannot read.'` |  |  |  |
| `pluginNewer` | `'That save was made with a newer version of {plugin}.'` |  |  |  |
| `gameNewer` | `'That save was made with a newer version of this game.'` |  |  |  |
| `pluginUnreadable` | `'That save\'s {plugin} is from a version this game cannot read.'` |  |  |  |
| `noSaves` | `'This game keeps no saves.'` |  |  |  |
| `emptySlot` | `'Nothing is saved there.'` |  |  |  |
| `notSaved` | `'The game could not be saved.'` |  |  |  |
| `notLoaded` | `'The game could not be loaded.'` |  |  |  |
| `notListed` | `'The saves could not be read.'` |  |  |  |
| `notRemoved` | `'The save could not be deleted.'` |  |  |  |
| `notExported` | `'The save could not be exported.'` |  |  |  |
| `turnLabel` | `'Turn {turn}'` |  |  | A save's name when no plugin says when it is. |

## Strings

Type. Explained in [Strings](/docs/reference/strings#stringkey-and-strings).

What a game, pack or plugin gives for strings: any engine key, or a plugin's `id/name`.

```ts shape
import type { Strings } from '@ifloom/engine'
type Strings = {
  you?: string
  done?: string
  finishFirst?: string
  notSupported?: string
  noSuchAction?: string
  notEnough?: string
  noSuchScene?: string
  nothingToChoose?: string
  notOnOffer?: string
  noSuchThing?: string
  badArgument?: string
  noSuchInput?: string
  notNow?: string
  enterSomething?: string
  enterNumber?: string
  tooLong?: string
  between?: string
  atLeast?: string
  atMost?: string
  notAnOption?: string
  noMinigame?: string
  noPanel?: string
  notLive?: string
  noTimer?: string
  tickLength?: string
  noSuchSetting?: string
  notAGameSetting?: string
  noProfile?: string
  onOrOff?: string
  inSteps?: string
  lookAround?: string
  priceSeparator?: string
  'minigame.up'?: string
  'minigame.down'?: string
  'minigame.left'?: string
  'minigame.right'?: string
  'minigame.space'?: string
  momentPassed?: string
  notASave?: string
  otherGame?: string
  saveTooOld?: string
  pluginNewer?: string
  gameNewer?: string
  pluginUnreadable?: string
  noSaves?: string
  emptySlot?: string
  notSaved?: string
  notLoaded?: string
  notListed?: string
  notRemoved?: string
  notExported?: string
  turnLabel?: string
  // …
}
```

It also takes any other key: `[key: string]: string`.

Its fields are the keys of `Partial<Record<StringKey, string>> & Record<string, string>`, so they grow when a game or a plugin adds to those.

## take

Function. Explained in [Entities](/docs/reference/entities#give-take-move-and-holding).

Take some of a thing from the player (whoever they are playing): 1 if left out, never below 0.

```ts shape
import { take } from '@ifloom/engine'
function take(ref: string, n?: number): Effect
```

## text

Function. Explained in [Flowing scenes](/docs/reference/flows#the-builders).

Words as written: a paragraph, or several. The indentation every line
shares is taken off, so the words can sit indented in your code, and
blank lines at the start and the end go. A blank line between lines
starts a new paragraph. The words are read as prose is: `@ava: "…"` is a
spoken line, `[[img:…]]` a picture, `{{key}}` a token, and inline markup
works. Give it an `id` to name it for a translation's `words` table,
`scene.<scene>.text.<id>`; without one it is named by a hash of its words.

```ts shape
import { text } from '@ifloom/engine'
function text(words: string, extras?: BlockExtras & { id?: string }): Block
```

## TextLine

Type. Explained in [Presentation hints](/docs/reference/ui-hints#textline).

A line of words a player reads, with where it is: a prose line, or words written in place. Any `[[ui:…]]` pieces in it are a UI's to check.

```ts shape
import type { TextLine } from '@ifloom/engine'
type TextLine = {
  where: string
  text: string
}
```

## TimerDef

Type. Explained in [Timers](/docs/reference/timers#timerdef).

A timer a game declares: how long it runs, and what happens when it runs out.

```ts shape
import type { TimerDef } from '@ifloom/engine'
type TimerDef = {
  id: string
  label?: string
  ms: number
  effects?: EffectRef[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `label` | `string` | yes |  | What a UI calls it, such as `'The phone'`. None if left out. |
| `ms` | `number` |  |  | How long it runs when started, in milliseconds. |
| `effects` | `EffectRef[]` | yes |  | What happens when it runs out. Stopping it with `to: null` runs none of them. |

## TimerView

Type. Explained in [Timers](/docs/reference/timers#timerview).

A running timer, as a UI draws it. Its effects are never in the view.

```ts shape
import type { TimerView } from '@ifloom/engine'
type TimerView = {
  id: string
  label: string | null
  left: number
  total: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `label` | `string \| null` |  |  | Its `label`, or null. |
| `left` | `number` |  |  | Milliseconds left. |
| `total` | `number` |  |  | Its whole length, for a bar: `left / total` is the share left. |

## Times

Type. Explained in [Game state](/docs/reference/state#times).

How many times something happened, and the turn of the first time and the
last: what `GameState.seen` keeps for each scene and `GameState.chosen` for
each choice.

```ts shape
import type { Times } from '@ifloom/engine'
type Times = {
  n: number
  first: number
  last: number
}
```

## TrackDef

Type. Explained in [Audio](/docs/reference/audio#trackdef).

A sound file the game ships, by id in `game.audio.tracks`.

```ts shape
import type { TrackDef } from '@ifloom/engine'
type TrackDef = {
  src: string
  channel?: string
  loop?: boolean
  volume?: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `src` | `string` |  |  | The file, relative to the game's public folder: `'audio/cafe.ogg'`. See `audioSrc`. |
| `channel` | `string` | yes |  | The channel it plays on. A `sound` effect and `[[sound:id]]` play it there; a background channel can only be given a track whose channel is a background one. `'sfx'` if left out. |
| `loop` | `boolean` | yes |  | Whether it repeats while it is on a background channel. True if left out. |
| `volume` | `number` | yes |  | Its own volume, from 0 to 1. 1 if left out. |

## TraitData

Type. Explained in [Entities](/docs/reference/entities#traitregistry-and-traitdata).

The data a trait takes: what `TraitRegistry` says for an id a plugin declared, and `unknown` for any other.

```ts shape
import type { TraitData } from '@ifloom/engine'
type TraitData<K extends string> = K extends keyof TraitRegistry ? TraitRegistry[K] : unknown
```

## traitOf

Function. Explained in [Entities](/docs/reference/entities#traitof).

The data of one trait on one entity as play reads it, typed as
`TraitRegistry` says for the id: `declaredTrait` for a declared entity;
for one created in play, the trait data it was created with laid over that
of the one it was created `like` (or else its kind's default). Undefined
when it doesn't have the trait.

```ts shape
import { traitOf, type Game } from '@ifloom/engine'
function traitOf<K extends string>(state: GameState, game: Game, ref: string, id: K): TraitData<K> | undefined
```

## TraitRegistry

Type. Explained in [Entities](/docs/reference/entities#traitregistry-and-traitdata).

The traits plugins give meaning to, by trait id, with the data each one
takes. Empty here: a plugin adds its own by augmenting it, which types
`declaredTrait` and the `traits` an entity, a kind or content writes.

```ts fragment
declare module '@ifloom/engine' {
  interface TraitRegistry {
    'laundry/washable': { temp: number; gentle?: boolean }
  }
}
```

```ts shape
import type { TraitRegistry } from '@ifloom/engine'
type TraitRegistry = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## TraitSource

Type. Explained in [Entities](/docs/reference/entities#traitsource).

What a game's traits are worked out from: its kinds, its entities and its `traits` table.

```ts shape
import type { TraitSource } from '@ifloom/engine'
type TraitSource = {
  kinds?: KindDef[]
  entities?: EntityDef[]
  traits?: TraitTable
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `kinds` | `KindDef[]` | yes |  | The kinds of thing the game keeps several of, each with its own stats. |
| `entities` | `EntityDef[]` | yes |  | The things of those kinds there are at the start. More can be created in play. |
| `traits` | `TraitTable` | yes |  | Traits by id and then entity. Given to `loadGame`, rows over what entities declare; on the game it returns, every entity's traits, worked out. Read them with `declaredTrait`. |

## TraitTable

Type. Explained in [Entities](/docs/reference/entities#traittable).

A trait's data on the entities that have it, by trait id and then entity:
`{ 'laundry/washable': { 'clothing:scarf': { temp: 30 } } }`. In
content, rows that give an entity a trait, over what it declares itself;
on a loaded game, every entity's traits, worked out.

```ts shape
import type { TraitTable } from '@ifloom/engine'
type TraitTable = {
  [key: string]: Record<`${string}:${string}`, unknown>
  // …
}
```

Plugins add fields of their own to it, which their pages list.

## translatableFields

Function. Explained in [The words table](/docs/reference/words#translatablefields).

Every field of a game's content a player reads and a translation can give
other words for, each once, by its key in a pack's `words` table, with the
words it has and where it is. Load the game without its translation packs
to list the words to translate: a `{ text }` block with no `id` is named by
a hash of its words, so its key follows the words it has.

```ts fragment
const table = Object.fromEntries(translatableFields(game).map((field) => [field.key, field.text]))
```

```ts shape
import { translatableFields, type Game } from '@ifloom/engine'
function translatableFields(game: Game): WordField[]
```

## TriggerDef

Type. Explained in [Triggers](/docs/reference/triggers#triggerdef).

Effects that happen by themselves: the first time `when` holds after a
command, they apply. A text that arrives the turn after a meeting, a notice
when a debt comes due, a scene that interrupts.

```ts shape
import type { TriggerDef } from '@ifloom/engine'
type TriggerDef = {
  id: string
  when: Condition
  effects: EffectRef[]
  once?: { per: 'game' | 'turn' }
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  |  |
| `when` | `Condition` |  |  | The trigger fires the first time this holds after a command. |
| `effects` | `EffectRef[]` |  |  | What it applies when it fires. |
| `once` | `{ per: 'game' \| 'turn' }` | yes |  | Fire once in the whole game (`{ per: 'game' }`, the default), or at most once a turn (`{ per: 'turn' }`). |

## Ui

Type. Explained in [Presentation hints](/docs/reference/ui-hints#ui-and-the-hint-interfaces).

A `ui` field as content writes it: the hints a UI package declared for that
place, typed, and any others, which the engine carries all the same.

```ts shape
import type { Ui } from '@ifloom/engine'
type Ui<T> = {
  [key: string]: unknown
}
```

## UiField

Type. Explained in [Presentation hints](/docs/reference/ui-hints#uifield).

A `ui` field in a game's content: what it's written on, that thing's id where it has one, where it is (as a problem names it), and the hints as written.

```ts shape
import type { UiField } from '@ifloom/engine'
type UiField = {
  on: UiTarget
  id?: string
  where: string
  ui: unknown
}
```

## UiInContent

Type. Explained in [Presentation hints](/docs/reference/ui-hints#uiincontent-1).

What `uiInContent` finds: every `ui` field and every line of words, in the order the content checker walks them.

```ts shape
import type { UiInContent } from '@ifloom/engine'
type UiInContent = {
  fields: UiField[]
  lines: TextLine[]
}
```

## uiInContent

Function. Explained in [Presentation hints](/docs/reference/ui-hints#uiincontent).

Every `ui` field in a game's content and every line of words that could
hold a UI piece, found by the content checker's own walk: scenes, the
blocks and decisions in their flows, choices, actions, stats, kinds,
entities, the game's, and whatever a plugin's content holds (a place's
room and body). A UI package's checker reads it, so it checks its own
hints without walking the content itself.

```ts shape
import { uiInContent, type Game } from '@ifloom/engine'
function uiInContent(game: Game): UiInContent
```

## UiTarget

Type. Explained in [Presentation hints](/docs/reference/ui-hints#uitarget).

What a `ui` field is written on, as a UI package's checker reads it: a
scene or a place's room (`scene`), a choice, an action or a room's button
(`choice`), a block or a section (`block`), a stat, a kind or an entity
(`entity`), or the game.

```ts shape
import type { UiTarget } from '@ifloom/engine'
type UiTarget = 'scene' | 'choice' | 'block' | 'stat' | 'entity' | 'game'
```

## upgradePack

Function. Explained in [Content, packs and loading](/docs/reference/loader#upgradepack).

A pack brought up to `SCHEMA` and to each of `plugins`' content versions,
step by step, or why it can't be: it was written for a newer engine or a
newer version of a plugin, or for an engine so old there is no step from
it. Pass the game's plugins (`game.plugins`, or the base's), so what each
one reads is carried forward with the rest.

The engine's step from each schema runs after every plugin step keyed by
that schema or below, so a first-party plugin's step meets the pack as the
engine had it then. Then each plugin's later steps run. A pack that records
no version for a plugin is read as written for its schema, or for the
plugin's own version if that is lower. The result records every plugin's
version in `plugins`. A pack with nothing to do comes back as it is.
`context` is what a step needs of the game besides the pack (see
`PackContext`); `loadGame` gives it.

```ts shape
import { upgradePack } from '@ifloom/engine'
function upgradePack(pack: { schema: number; plugins?: Record<string, number> }, plugins: readonly Plugin[], context?: PackContext): Result<Pack>
```

## ValueRef

Type. Explained in [Calls by name](/docs/reference/custom#valueref).

A value named by content, with what it is asked: a stat's ceiling, an
app's badge, an achievement's progress. `{ value: 'messages/unread', with:
{ channel: 'texts' } }`.

```ts shape
import type { ValueRef } from '@ifloom/engine'
type ValueRef = {
  value: string
  with?: PluginArgs
}
```

## VariantMember

Type. Explained in [Prose and markup](/docs/reference/prose#variantmember).

One member of a variants list: a prose key, or a prose key with a weight.
`{ prose: 'cafe.order/late', weight: 3 }` is drawn three times as often as a
member of weight 1. A plain key has weight 1.

```ts shape
import type { VariantMember } from '@ifloom/engine'
type VariantMember = string | { prose: string; weight?: number }
```

## VideoFlags

Type. Explained in [Media](/docs/reference/media#videoflags).

A video's flags as markup and data write them. Each one changes a default.

```ts shape
import type { VideoFlags } from '@ifloom/engine'
type VideoFlags = {
  controls?: boolean
  once?: boolean
  sound?: boolean
  poster?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `controls` | `boolean` | yes |  | Show the player's controls. It then waits to be started instead of playing by itself. |
| `once` | `boolean` | yes |  | Play once instead of looping. |
| `sound` | `boolean` | yes |  | Play with sound instead of muted. |
| `poster` | `string` | yes |  | A still to show before it plays, as a path like any picture's. |

## VideoView

Type. Explained in [Media](/docs/reference/media#videoview).

How a video plays, worked out from its flags.

```ts shape
import type { VideoView } from '@ifloom/engine'
type VideoView = {
  autoplay: boolean
  loop: boolean
  muted: boolean
  controls: boolean
  poster?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `autoplay` | `boolean` |  |  | Start playing as soon as it's shown: true unless it has controls. |
| `loop` | `boolean` |  |  | Play it again when it ends. |
| `muted` | `boolean` |  |  | Without sound: true unless its flags ask for sound. |
| `controls` | `boolean` |  |  | Show the player's play, pause and volume controls. |
| `poster` | `string` | yes |  | A still to show before it plays, through `artSrc`. |

## View

Type. Explained in [The view](/docs/reference/view#view-1).

Everything a UI draws for one state: the core's fields and each feature's.

```ts shape
import type { View } from '@ifloom/engine'
type View = {
  title: string
  when: string | null
  scene: { id: string | null; key: string; title: string; body: string; beats: SceneBeat[]; fresh: number; tags: string[]; speaker: SpeakerView | null; image: string | null; picture: PictureView | null; choices: RenderedChoice[]; ui?: Ui<SceneUi> }
  actions: RenderedChoice[]
  plugins: ViewsIn
  entities: EntitiesView[]
  held: HeldView[]
  turn: number
  notices: NoticesView
  inputs: InputView[]
  settings: SettingView[]
  stats: StatView[]
  statsById: Record<string, StatView>
  minigame: MinigameView | null
  timers: TimerView[]
  audio: AudioView
  panel: OpenPanel | null
  saving: SavingView
  rolls: Roll[]
  changes: ChangeView[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `title` | `string` |  |  | The game's title. |
| `when` | `string \| null` |  |  | Where the game is in time, in plugins' words ("Day 3 · Wednesday morning"), or null if none says. |
| `scene` | `{ id: string \| null; key: string; title: string; body: string; beats: SceneBeat[]; fresh:…` |  |  |  |
| `actions` | `RenderedChoice[]` |  |  | The buttons on offer besides the scene's choices: the game's actions and the plugins' (wait, sleep, travel), each ready to draw. |
| `plugins` | `ViewsIn` |  |  | What each plugin gives the UI, by plugin id: typed for each plugin that declares its view in `ViewRegistry`. |
| `entities` | `EntitiesView[]` |  |  | Each listed kind with its listed entities, in the order the kinds are declared. |
| `held` | `HeldView[]` |  |  | What you hold, in the game's order of its entities: the protagonist's things while one is played, then the player's. |
| `turn` | `number` |  |  | How many turns have passed: 0 on the first. |
| `notices` | `NoticesView` |  |  |  |
| `inputs` | `InputView[]` |  |  | The inputs on offer now, in the order the game declares them, with the value each holds. |
| `settings` | `SettingView[]` |  |  | Every setting the game declares, in order, for a settings screen. |
| `stats` | `StatView[]` |  |  |  |
| `statsById` | `Record<string, StatView>` |  |  | Every declared stat, by id, whether or not it is listed. |
| `minigame` | `MinigameView \| null` |  |  | The minigame being played, or null. |
| `timers` | `TimerView[]` |  |  | The running timers, in the order they started. |
| `audio` | `AudioView` |  |  | What should be playing on each channel, and the sounds that are due. Empty when the game has no audio. |
| `panel` | `OpenPanel \| null` |  |  | The panel open over the story: one the `panel` effect opened, else the open scene's own, else null. |
| `saving` | `SavingView` |  |  | Whether the player can save now, for a Save button. |
| `rolls` | `Roll[]` |  |  | The rolls the last command made, in order. Empty when it made none. |
| `changes` | `ChangeView[]` |  |  | The stats the last command moved that the player can see, the player's first, each with the words that say what moved. See `ChangeView`. |

## view

Function. Explained in [The view](/docs/reference/view#view).

Everything the UI draws, assembled from the state in one pass.

The scene, its choices, the room's buttons, the plugins' views and the audio
come from `screen`, which renders the open scene once; the rest is read from
the state here. `view` only formats: what each choice would apply and the
picks stay on the screen.

`options.profile` hands each plugin's view its profile namespace; the
runner passes it, and without it no view sees the profile.

```ts shape
import { view, type Game } from '@ifloom/engine'
function view(state: GameState, game: Game, options?: ViewOptions): View
```

## ViewOptions

Type. Explained in [The view](/docs/reference/view#viewoptions).

What a screen or a view is drawn with besides the state. `profile` is what
the player's profile holds, by namespace: each plugin's view is handed its
own as `context.profile`. The runner passes it; without it, no view sees
the profile.

```ts shape
import type { ViewOptions } from '@ifloom/engine'
type ViewOptions = {
  profile?: Readonly<Record<string, unknown>>
}
```

## ViewRegistry

Type. Explained in [Writing a plugin](/docs/reference/plugins#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry).

What each plugin puts in the view, by its id, which `view.plugins` reads:
`shop: ShopView`. The game's own `rules.view` is `game`.

```ts shape
import type { ViewRegistry } from '@ifloom/engine'
type ViewRegistry = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## ViewsIn

Type. Explained in [Writing a plugin](/docs/reference/plugins#viewsin).

What the plugins put in the view, by plugin id: typed for each plugin that declares its view in `ViewRegistry`.

```ts shape
import type { ViewsIn } from '@ifloom/engine'
type ViewsIn = {
  [key: string]: unknown
  // …
}
```

Plugins add fields of their own to it, which their pages list.

## weighted

Function. Explained in [Randomness](/docs/reference/random#weighted).

One of these, drawn from these parts with each one's weight: an item of
weight 3 comes up three times as often as one of weight 1. A weight left
out (`undefined`) counts as 1; a weight of 0 or less, or one that isn't a
number, is never drawn. Undefined when nothing can be drawn.

With every weight a whole number the draw is `hash % total`, so a list where
every weight is 1 draws exactly what `drawOne` would from the same parts.

```ts shape
import { weighted } from '@ifloom/engine'
function weighted<T>(items: readonly T[], weightOf: (item: T) => number | undefined, ...parts: (string | number)[]): T | undefined
```

## when

Function. Explained in [Flowing scenes](/docs/reference/flows#the-builders).

Blocks shown only while `condition` holds: a section, which can hold anything a body can.

```ts shape
import { when } from '@ifloom/engine'
function when(condition: Condition, blocks: Block[], extras?: Omit<BlockExtras, 'when'>): Block
```

## whyNot

Function. Explained in [Actions and buttons](/docs/reference/actions#whynot).

Why the player cannot do this right now, or undefined if they can.

The one place availability is decided. The reducer refuses a command with
this line, and the view greys its button out with the same line — so a
button and the rule behind it cannot disagree, and a refusal is always a
sentence the player can be shown.

Checked in the order the player would notice: a lock first (what the
features refuse before anything else), the plugins' guards, then a command
the game handles itself, then what the command needs.

```ts shape
import { whyNot, type Game } from '@ifloom/engine'
function whyNot(state: GameState, game: Game, command: CommandRef): string | undefined
```

## withTrait

Function. Explained in [Entities](/docs/reference/entities#withtrait).

Every entity in the game that has a trait, as references, as play reads
it: declared ones not removed, in content order, then those created in
play (with their kind's trait, their `like`'s or their own).

```ts shape
import { withTrait, type Game } from '@ifloom/engine'
function withTrait(state: GameState, game: Game, id: string): EntityRef[]
```

## WordField

Type. Explained in [The words table](/docs/reference/words#wordfield).

One field of a game's content a translation can give other words for.

```ts shape
import type { WordField } from '@ifloom/engine'
type WordField = {
  key: string
  text: string
  where: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `key` | `string` |  |  | Its key in a pack's `words` table: `action.wait.label`. |
| `text` | `string` |  |  | The words it has, as written, tokens and markup included. |
| `where` | `string` |  |  | Where it is, as a problem names it: `scene cafe.counter`, `quests coffee`. |

## WordPart

Type. Explained in [The words table](/docs/reference/words#wordpart).

One field of a `WordShape`.

```ts shape
import type { WordPart } from '@ifloom/engine'
type WordPart = true | 'blocks' | 'effects' | 'button' | WordShape | readonly [ WordPart ]
```

## WordShape

Type. Explained in [The words table](/docs/reference/words#wordshape).

Which fields of a piece of content are words a translation can replace: a
plugin's `words` gives one for each list of its `data`, and a trait's
`words` one for its data. Each field of the shape is one of these:
- `true`: a field of words, or a record of them (a stat's `{ one, other }`);
- `'blocks'`: a list of blocks, as a scene's body;
- `'effects'`: a list of effects, for the words of the notices they raise;
- `'button'`: a button, as an action is: its label, labels, blocked
  reasons, `once` reason, `irreversible` warning and effects;
- a shape, for an object's own fields;
- a shape in a list, `[shape]`, for a list of entries;
- `{ '*': shape }`, for a record of entries, each named by its key.

```ts shape
import type { WordShape } from '@ifloom/engine'
type WordShape = {
  [key: string]: WordPart
}
```

## writeEntity

Function. Explained in [Entities](/docs/reference/entities#writeentity).

The state with one entity's record replaced. A record for an entity not there adds it, after the rest of its kind.

```ts shape
import { writeEntity } from '@ifloom/engine'
function writeEntity(state: GameState, ref: string, next: EntityState): GameState
```

## YOU

Const. Explained in [Entities](/docs/reference/entities#player-and-you).

Whoever the player is playing now: the protagonist the `you` effect last chose, or the player.

```ts shape
import { YOU } from '@ifloom/engine'
const YOU: 'you'
```
