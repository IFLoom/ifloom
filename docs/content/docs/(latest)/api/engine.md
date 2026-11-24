---
title: "@ifloom/engine"
description: "Every export of @ifloom/engine, the main entry for writing and running a game: its signature and its fields."
---
Generated from the source of `@ifloom/engine` and its TSDoc by `npm run api-docs`. Each export links to the page that explains it, where one does.

- Functions: [`actionOf`](#actionof), [`amountOf`](#amountof), [`apply`](#apply), [`applyEffects`](#applyeffects), [`artSrc`](#artsrc), [`audioSrc`](#audiosrc), [`buildEffects`](#buildeffects), [`callOf`](#callof), [`canHold`](#canhold), [`cases`](#cases), [`chance`](#chance), [`checkGame`](#checkgame), [`choice`](#choice-1), [`clampStat`](#clampstat), [`commandOf`](#commandof), [`createRunner`](#createrunner), [`decide`](#decide), [`declaredTrait`](#declaredtrait), [`declaredWithTrait`](#declaredwithtrait), [`describeProblem`](#describeproblem), [`dismiss`](#dismiss), [`draw`](#draw), [`drawOne`](#drawone), [`effectsOf`](#effectsof), [`entitiesOf`](#entitiesof), [`entityDescription`](#entitydescription), [`entityImage`](#entityimage), [`entityKv`](#entitykv), [`entityName`](#entityname), [`entityOf`](#entityof), [`entityTags`](#entitytags), [`explain`](#explain), [`explainText`](#explaintext), [`fillTokens`](#filltokens), [`fold`](#fold), [`give`](#give), [`hash`](#hash), [`heldBy`](#heldby), [`heldCount`](#heldcount), [`holderOf`](#holderof), [`holding`](#holding), [`holds`](#holds), [`image`](#image), [`inlineChoices`](#inlinechoices), [`inlineMarkup`](#inlinemarkup), [`inRange`](#inrange), [`isUnique`](#isunique), [`jump`](#jump), [`lackingLine`](#lackingline), [`loadGame`](#loadgame), [`loadState`](#loadstate), [`mediaType`](#mediatype), [`memoryDriver`](#memorydriver), [`minigame`](#minigame), [`mods`](#mods-1), [`move`](#move), [`need`](#need), [`notify`](#notify), [`panel`](#panel), [`parseRef`](#parseref), [`pluginQuery`](#pluginquery), [`point`](#point), [`profile`](#profile-1), [`proseBeats`](#prosebeats), [`protagonist`](#protagonist), [`reasonOf`](#reasonof), [`replay`](#replay), [`resolveHolder`](#resolveholder), [`saves`](#saves-1), [`say`](#say), [`sceneOf`](#sceneof), [`screen`](#screen-1), [`startingState`](#startingstate), [`statLevel`](#statlevel), [`statOf`](#statof), [`statValue`](#statvalue), [`storylineOpen`](#storylineopen), [`stringOf`](#stringof), [`take`](#take), [`text`](#text), [`traitOf`](#traitof), [`translatableFields`](#translatablefields), [`uiInContent`](#uiincontent-1), [`upgradePack`](#upgradepack), [`view`](#view-1), [`weighted`](#weighted), [`when`](#when), [`whyNot`](#whynot), [`withTrait`](#withtrait), [`writeEntity`](#writeentity)
- Constants: [`PLAYER`](#player), [`SAVE_VERSION`](#save_version), [`SCHEMA`](#schema), [`STRINGS`](#strings), [`YOU`](#you)
- Types: [`ActionCost`](#actioncost), [`ActionDef`](#actiondef), [`Amount`](#amount), [`Applied`](#applied), [`AudioChannelView`](#audiochannelview), [`AudioCue`](#audiocue), [`AudioState`](#audiostate), [`AudioView`](#audioview), [`AutosaveOptions`](#autosaveoptions), [`BacklogEntry`](#backlogentry), [`BacklogOptions`](#backlogoptions), [`BeatSize`](#beatsize), [`Block`](#block), [`Blocked`](#blocked), [`BlockExtras`](#blockextras), [`BlockUi`](#blockui), [`BrokenSave`](#brokensave), [`ButtonDef`](#buttondef), [`CarryOver`](#carryover), [`Change`](#change), [`ChangesDef`](#changesdef), [`ChangeView`](#changeview), [`ChannelDef`](#channeldef), [`Checked`](#checked), [`Choice`](#choice), [`ChoiceUi`](#choiceui), [`Command`](#command), [`CommandCall`](#commandcall), [`CommandLog`](#commandlog), [`CommandRef`](#commandref), [`CommandRegistry`](#commandregistry), [`Condition`](#condition), [`ConditionCall`](#conditioncall), [`ConditionRegistry`](#conditionregistry), [`Content`](#content), [`CreatedEntity`](#createdentity), [`CreateFields`](#createfields), [`CustomContext`](#customcontext), [`DataScene`](#datascene), [`Dice`](#dice), [`Effect`](#effect), [`EffectCall`](#effectcall), [`EffectRef`](#effectref), [`EffectRegistry`](#effectregistry), [`EntitiesView`](#entitiesview), [`EntityDef`](#entitydef), [`EntityRef`](#entityref), [`EntityState`](#entitystate), [`EntityUi`](#entityui), [`EntityView`](#entityview), [`Explanation`](#explanation), [`FileRef`](#fileref), [`FillPart`](#fillpart), [`FlowChoice`](#flowchoice), [`FlowState`](#flowstate), [`FlowStep`](#flowstep), [`Formula`](#formula), [`Game`](#game), [`GameAudio`](#gameaudio), [`GameBase`](#gamebase), [`GameMedia`](#gamemedia), [`GameRules`](#gamerules), [`GameState`](#gamestate), [`GameUi`](#gameui), [`HeldView`](#heldview), [`HelperRegistry`](#helperregistry), [`HelpersIn`](#helpersin), [`HistoryOptions`](#historyoptions), [`Holder`](#holder), [`HotspotDef`](#hotspotdef), [`HotspotView`](#hotspotview), [`InlinePart`](#inlinepart), [`InlineSpan`](#inlinespan), [`InlineUi`](#inlineui), [`InlineUiArgs`](#inlineuiargs), [`InputDef`](#inputdef), [`InputView`](#inputview), [`InstalledMod`](#installedmod), [`KindDef`](#kinddef), [`KvValue`](#kvvalue), [`Loaded`](#loaded), [`LoadedSave`](#loadedsave), [`LoadOptions`](#loadoptions), [`MediaState`](#mediastate), [`MigrationTools`](#migrationtools), [`MinigameDef`](#minigamedef), [`MinigameInput`](#minigameinput), [`MinigameSceneFields`](#minigamescenefields), [`MinigameState`](#minigamestate), [`MinigameStateDef`](#minigamestatedef), [`MinigameTarget`](#minigametarget), [`MinigameTransition`](#minigametransition), [`MinigameView`](#minigameview), [`ModFile`](#modfile), [`Mods`](#mods), [`Notice`](#notice), [`NoticesView`](#noticesview), [`NoticeView`](#noticeview), [`Once`](#once), [`OpenPanel`](#openpanel), [`Pack`](#pack), [`Patch`](#patch), [`Phrase`](#phrase), [`PhraseRow`](#phraserow), [`Phrases`](#phrases), [`PhraseWithArgs`](#phrasewithargs), [`PictureDef`](#picturedef), [`PictureLayer`](#picturelayer), [`PictureLayerView`](#picturelayerview), [`PictureView`](#pictureview), [`Placement`](#placement), [`PlaylistDef`](#playlistdef), [`PluginCall`](#plugincall), [`PoolFile`](#poolfile), [`Price`](#price), [`Probe`](#probe), [`Problem`](#problem), [`Profile`](#profile), [`ProseStore`](#prosestore), [`Query`](#query), [`QueryRegistry`](#queryregistry), [`Range`](#range), [`RawPack`](#rawpack), [`Reason`](#reason), [`RenderedChoice`](#renderedchoice), [`Result`](#result), [`Roll`](#roll), [`RollsState`](#rollsstate), [`Runner`](#runner), [`RunnerOptions`](#runneroptions), [`RunnerSnapshot`](#runnersnapshot), [`RunningTimer`](#runningtimer), [`SaveDriver`](#savedriver), [`SaveExtra`](#saveextra), [`SaveFile`](#savefile), [`SaveListing`](#savelisting), [`SaveMeta`](#savemeta), [`Saves`](#saves), [`SavingView`](#savingview), [`SceneBeat`](#scenebeat), [`SceneMedia`](#scenemedia), [`ScenePanel`](#scenepanel), [`SceneUi`](#sceneui), [`Screen`](#screen), [`ScreenChoice`](#screenchoice), [`ScreenScene`](#screenscene), [`Select`](#select), [`SettingDef`](#settingdef), [`SettingView`](#settingview), [`SpeakerView`](#speakerview), [`StartOptions`](#startoptions), [`StatDef`](#statdef), [`StatKey`](#statkey), [`StatLevels`](#statlevels), [`StatRound`](#statround), [`Stats`](#stats), [`StatUi`](#statui), [`StatView`](#statview), [`StatWords`](#statwords), [`StoryletFields`](#storyletfields), [`StorylineDef`](#storylinedef), [`StorylineState`](#storylinestate), [`StringKey`](#stringkey), [`Strings`](#strings-1), [`TextLine`](#textline), [`TimerDef`](#timerdef), [`TimerView`](#timerview), [`Times`](#times), [`TrackDef`](#trackdef), [`TraitData`](#traitdata), [`TraitRegistry`](#traitregistry), [`TraitSource`](#traitsource), [`TraitTable`](#traittable), [`TriggerDef`](#triggerdef), [`Ui`](#ui), [`UiField`](#uifield), [`UiInContent`](#uiincontent), [`UiTarget`](#uitarget), [`ValueRef`](#valueref), [`VariantMember`](#variantmember), [`VideoFlags`](#videoflags), [`VideoView`](#videoview), [`View`](#view), [`ViewOptions`](#viewoptions), [`ViewRegistry`](#viewregistry), [`ViewsIn`](#viewsin), [`WordField`](#wordfield), [`WordPart`](#wordpart), [`WordShape`](#wordshape)

## ActionCost

Type. Explained in [Actions](/docs/reference/actions#actioncost).

A cost a choice or an action declares in its `cost`, the stats it spends. The engine refuses it while the player has too little of one.

```ts shape
import type { ActionCost } from '@ifloom/engine'
type ActionCost = {
  stats?: Record<string, number>
  reasons?: Record<string, string>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `stats` | `Record<string, number>` | yes |  | The stats the cost spends, by id, in the order the button lists them. |
| `reasons` | `Record<string, string>` | yes |  | The refusal lines by stat id, used in place of the stat's own line when the player has too little. |

## ActionDef

Type. Explained in [Actions](/docs/reference/actions#actiondef).

An action the game declares in `actions`, or one a plugin offers (a location's, an app's). It has the fields of a
`ButtonDef`, the same as a choice.

Taking one with only a `command` sends that command. One with a cost, effects or `once` sends
`{ type: 'action', id }`, which runs its command, pays its cost and applies its effects. The id is the game's own,
or `'<plugin>/<id>'` for a plugin's. An action with no `label` is never rendered as a button, so only a choice's
command, another action or a hotspot runs it.

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
| `id` | `string` |  |  | The choice's or action's id, unique among its scene's choices or among the actions. |
| `label` | `string` | yes |  | The button's words, with tokens filled, such as `'Order a tea'`. A choice with no label shows its id, and an action with none is never rendered as a button. |
| `labels` | `{ when?:` [`Condition`](#condition)`; label: string }[]` | yes |  | The button's words that depend on the state, such as "Not today" before you have bought it and "Right." after. The first entry whose `when` holds wins, and `label` is the fallback. |
| `when` | [`Condition`](#condition) | yes |  | The condition under which the choice or action is offered and can be taken. Always, if left out. |
| `blocked` | [`Blocked[]`](#blocked) | yes |  | The rules that refuse it for now. The first entry whose `when` holds greys the button out with its reason, or leaves it off with `hide`. |
| `cost` | [`ActionCost`](#actioncost) | yes |  | The stats it spends. The engine checks them before it runs, lists them on the button and pays them after its command. |
| `effects` | [`EffectRef[]`](#effectref) | yes |  | The effects it applies after its cost, in order. A plugin's or the game's effect in the short form does computed work. |
| `command` | [`CommandRef`](#commandref) | yes |  | The command the choice or action sends first, a plugin's in the short form or one of the engine's, but never `choose`. The button is refused with that command's reason while the command would be. An example is `{ 'devices/open': { id: 'messages' } }`. The button's price includes what the command spends. |
| `once` | [`Once`](#once) | yes |  | The limit of once a game (`{ per: 'game' }`) or once a turn (`{ per: 'turn' }`), counted in `state.chosen`. Once spent, a choice stays on screen and pays nothing more, and an action is refused, both with `reason`. |
| `tags` | `string[]` | yes |  | The tags a UI can style or filter it by. The engine gives them no meaning. |
| `irreversible` | `string` | yes |  | The warning that it can't be undone, which a UI shows on the button. |
| `ui` | [`Ui`](#ui)`<`[`ChoiceUi`](#choiceui)`>` | yes |  | The ui hints carried to its button in the view. See `ChoiceUi`. |

## actionOf

Function. Explained in [Actions](/docs/reference/actions#actionof).

Returns the action that `{ type: 'action', id }` runs in this state. Returns undefined when there is none.

A plain id names one of the game's `actions`. An id of the form `'<plugin>/<id>'` names a plugin's action, from its
`action` provider, else from the actions it offers now.

```ts shape
import { actionOf, type Game } from '@ifloom/engine'
function actionOf(state: GameState, game: Game, id: string): ActionDef | undefined
```

Uses: [`GameState`](#gamestate), [`Game`](#game), [`ActionDef`](#actiondef).

## Amount

Type. Explained in [Amounts](/docs/reference/amounts#amount).

A number content names that the engine works out when it reads it. Read one with `amountOf`.

An amount is a number, a stat of the player's by id, a stat with `{ stat, of? }`, a kv key's number with
`{ kv, of? }` (a value that is not a number counts as 0), a value by name with `{ value, with? }`, or a count of
entities with `{ count, where?, units? }`, counted as the `count` condition counts. Amounts combine as a `Formula`
does (`sum`, `product`, `min`, `max`, `scale`, `clamp`), with any amount as a part, and `of` names the owner as it
does in conditions.

Effects take one in `by` and `to`, ranges in their bounds, stats in `min` and `max`, and rolls in `plus` and
`against`. So `{ stat: 'coins', gte: { stat: 'rent' } }` holds while the player has at least the rent.

```ts shape
import type { Amount } from '@ifloom/engine'
type Amount = number | StatKey | { stat: StatKey; of?: string } | { kv: string; of?: string } | ValueRef | { count: string | Select; where?: Condition; units?: true } | { sum: Amount[] } | { product: Amount[] } | { min: Amount[] } | { max: Amount[] } | { scale: Amount; by: number } | { clamp: Amount; min?: number; max?: number }
```

Uses: [`StatKey`](#statkey), [`ValueRef`](#valueref), [`Select`](#select), [`Condition`](#condition).

## amountOf

Function. Explained in [Amounts](/docs/reference/amounts#amountof).

Returns an amount worked out in this state. An amount that doesn't read as a finite number gives 0, and so does an
owner that isn't there.

An amount is a number, a stat (the player's by id, or `{ stat, of }`), a kv key's number (`{ kv, of }`), a value by
name (`{ value, with }`), a count of entities (`{ count }`) or a formula of these.

```ts shape
import { amountOf, type Game } from '@ifloom/engine'
function amountOf(state: GameState, game: Game, amount: Amount): number
```

Uses: [`GameState`](#gamestate), [`Game`](#game), [`Amount`](#amount).

## Applied

Type. Explained in [Commands](/docs/reference/commands#applied).

The answer `apply` gives for a command, a `Result` with the state on both sides. When `ok` is false, the command was
refused, `state` is unchanged and `reason` says why.

`newGame` is true when the command was a `newGame` and `state` is the new game's first state.

```ts shape
import type { Applied } from '@ifloom/engine'
type Applied = { ok: true; state: GameState; reason?: never; newGame?: true } | { ok: false; state: GameState; reason: string }
```

Uses: [`GameState`](#gamestate).

## apply

Function. Explained in [Commands](/docs/reference/commands#apply).

Runs a command and returns the next state. A refused command returns the state unchanged, with the reason.

A null state, or a `start` command, returns the game's starting state.

```ts shape
import { apply, type Game } from '@ifloom/engine'
function apply(state: GameState | null, game: Game, ref: CommandRef): Applied
```

Uses: [`GameState`](#gamestate), [`Game`](#game), [`CommandRef`](#commandref), [`Applied`](#applied).

## applyEffects

Function. Explained in [Effects](/docs/reference/effects#applyeffects).

Returns the state after a list of effects, the engine's and plugins' short calls alike
(`{ 'quests/start': { quest: 'bread' } }`). A call to an effect no plugin declares is skipped.

A plugin's `context.apply` runs effects the same way.

```ts shape
import { applyEffects, type Game } from '@ifloom/engine'
function applyEffects(state: GameState, game: Game, effects: readonly EffectRef[]): GameState
```

Uses: [`GameState`](#gamestate), [`Game`](#game), [`EffectRef`](#effectref).

## artSrc

Function. Explained in [Prose and markup](/docs/reference/prose#artsrc).

Returns a picture's or video's path in the game's `art/` folder, relative to the page. A URL (`https:`, `data:`,
`//host/…`) is returned unchanged.

`'photo/ava.svg'` and `'art/photo/ava.svg'` both give `'art/photo/ava.svg'`. A name with no extension gets `.jpg`, or
`.mp4` when `type` is `'video'`.

```ts shape
import { artSrc } from '@ifloom/engine'
function artSrc(path: string, type?: 'image' | 'video'): string
```

## AudioChannelView

Type. Explained in [Audio](/docs/reference/audio#audiochannelview).

An audio channel as the audio player needs it, in `view.audio.channels`.

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
| `mode` | `'background' \| 'cue'` |  |  | The channel's mode. `background` plays a track or playlist until it changes, and `cue` plays one-shot sounds, listed in `cues`. |
| `track` | `string \| null` |  |  | The id of the track or playlist playing. Null for silence, and always null on a cue channel. |
| `src` | `string \| null` |  |  | The file to play, through `audioSrc`, a playlist's first. Null for silence. |
| `loop` | `boolean` |  |  | The channel's loop mark, true when the track repeats. A playlist repeats as a whole unless its order is `'inOrder'`. |
| `volume` | `number` |  |  | The track's own volume, from 0 to 1, or a playlist's first track's. The player multiplies it by the volume setting's value. |
| `volumeSetting` | `string \| null` |  |  | The id of the ui setting that sets the channel's volume. Null when there's none. |
| `crossfade` | `number` |  |  | The milliseconds to fade between tracks. 0 on a cue channel. |
| `duck` | `{ under: string[]; to: number } \| null` |  |  | The channel's ducking, quietening it to `to` (0 to 1) while any channel in `under` plays. Null when it doesn't duck. |
| `playlist` | `{ tracks: string[]; srcs: string[]; volumes: number[]; order: 'inOrder' \| 'loop' \| '…` | yes |  | The playlist's tracks, files, volumes and order, already shuffled when it shuffles. Left out for a single track. |

## AudioCue

Type. Explained in [Audio](/docs/reference/audio#audiocue).

A one-shot sound that is due, in `view.audio.cues`. The audio player plays each key once.

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
| `key` | `string` |  |  | The cue's key, the same for the same sound in the same visit across view calls and reloads. |
| `channel` | `string` |  |  | The cue channel the sound plays on, `sfx` or `voice` unless the game declares others. |
| `track` | `string` |  |  | The track's id in `audio.tracks`. |
| `src` | `string` |  |  | The file to play, through `audioSrc`. |
| `volume` | `number` |  |  | The track's own volume, from 0 to 1. The player multiplies it by the channel's volume setting. |

## audioSrc

Function. Explained in [Audio](/docs/reference/audio#audiosrc).

Returns a sound file's path relative to the page, under `audio/`. A bare name gets `.ogg`.

Like `artSrc`, the path is relative and never starts with `/`.

```ts shape
import { audioSrc } from '@ifloom/engine'
function audioSrc(path: string): string
```

## AudioState

Type. Explained in [Audio](/docs/reference/audio#audiostate).

The audio a save keeps, in `state.audio`. The tracks and channels themselves are read from content.

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
| `channels` | `Record<string, string \| null>` |  |  | The tracks `audio` effects have put on background channels, by channel. Null is silence, and a channel missing here is left to the scene, the plugins and the defaults. |
| `cues` | `{ seq: number; track: string }[]` |  |  | The last 20 `sound` effects, oldest first, each with its number in the running count. |
| `seq` | `number` |  |  | The number of `sound` effects there have been. |
| `shown` | `number` |  |  | The number of times a scene has been entered, all scenes together. Each visit's sounds get keys of their own from it. |
| `started` | `Record<string, { track: string; turn: number }>` |  |  | The track each background channel is playing and the turn it started, for a shuffled playlist's draw. |

## AudioView

Type. Explained in [Audio](/docs/reference/audio#audioview).

The audio as the audio player needs it, in `view.audio`. It's empty when the game has no audio.

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
| `channels` | `Record<string,` [`AudioChannelView`](#audiochannelview)`>` |  |  | Every channel with its track resolved, from the open scene, then an effect, then a plugin, then the game's default. |
| `cues` | [`AudioCue[]`](#audiocue) |  |  | The sounds that are due, from `sound` effects and the open scene's sound and voice beats, in order. |
| `muteSetting` | `string \| null` |  |  | The id of the ui setting that mutes everything while it's on. Null when there's none. |
| `soundSetting` | `string \| null` |  |  | The id of the ui setting that mutes everything while it's off. Null when there's none. |

## AutosaveOptions

Type. Explained in [The runner](/docs/reference/runner#autosaveoptions).

Settings for autosave, when the runner saves on its own. Autosave is off unless `createRunner` is given these.

```ts shape
import type { AutosaveOptions } from '@ifloom/engine'
type AutosaveOptions = {
  slot?: string
  every: 'command' | 'scene' | 'turn'
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `slot` | `string` | yes |  | The slot autosave writes to. `'auto'` if left out. |
| `every` | `'command' \| 'scene' \| 'turn'` |  |  | The moment autosave writes, after every command or only when the scene or the turn changes. It skips a save while the game's `saveable` refuses saving. |

## BacklogEntry

Type. Explained in [The runner](/docs/reference/runner#backlogentry).

One scene of the backlog, as the player saw it. The backlog keeps scenes only, never the room or a minigame.

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
| `turn` | `number` |  |  | The turn the scene was shown in. |
| `when` | `string \| null` |  |  | The time in the game when the scene was shown, from `view.when`, or null when no plugin gives one. |
| `sceneId` | `string` |  |  | The scene's id. |
| `title` | `string` |  |  | The scene's title as it was shown. |
| `beats` | [`SceneBeat[]`](#scenebeat) |  |  | The scene's beats as the player read them. |
| `chose` | `string` | yes |  | The label of the choice the player made in the scene, once they made one. A choice at a decision of a flow shows in `beats` instead. |

## BacklogOptions

Type. Explained in [The runner](/docs/reference/runner#backlogoptions).

Settings for the backlog, the list of scenes the player has seen with the choice made in each. The backlog is off
unless `createRunner` is given these or `true`.

```ts shape
import type { BacklogOptions } from '@ifloom/engine'
type BacklogOptions = {
  limit?: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `limit` | `number` | yes |  | The number of entries the backlog keeps, dropping the oldest. 200 if left out. |

## BeatSize

Type. Explained in [Prose and markup](/docs/reference/prose#beatsize).

The width of an `image` or `video` beat, `inline` in the column with the words or `wide` across it.

```ts shape
import type { BeatSize } from '@ifloom/engine'
type BeatSize = 'inline' | 'wide'
```

## Block

Type. Explained in [Scenes](/docs/reference/scenes#block).

One entry of a scene's body, told apart by its key, such as `{ text }`, `{ say }` or `{ decide }`. A block with a
`when` is left out while it fails.

The body is composed from blocks rather than read whole from one prose key. So a conditional line is one more
block, and each block's words mean one thing.

```ts shape
import type { Block } from '@ifloom/engine'
type Block = ({ text: string; id?: string; when?: Condition } | { prose: string; when?: Condition } | { variants: string; when?: Condition; gate?: Record<string, Condition>; image?: Record<string, string> } | { media: SceneMedia; when?: Condition } | { say: string; speaker: string; voice?: string; id?: string; when?: Condition } | { blocks: Block[]; when?: Condition } | { cases: Block[]; when?: Condition } | { decide: string; choices: FlowChoice[]; when?: Condition } | { point: string; when?: undefined } | { minigame: string; when?: Condition } | { panel: string; with?: PluginArgs; when?: Condition }) & { ui?: Ui<BlockUi> }
```

Uses: [`Condition`](#condition), [`SceneMedia`](#scenemedia), [`FlowChoice`](#flowchoice), [`PluginArgs`](/docs/api/engine-plugin#pluginargs), [`Ui`](#ui), [`BlockUi`](#blockui).

## Blocked

Type. Explained in [Actions](/docs/reference/actions#blocked).

A rule that refuses a choice, an action, a location or an app while its `when` holds. The first entry of a `blocked`
list whose `when` holds gives the `reason` the button shows.

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
| `when` | [`Condition`](#condition) |  |  | The rule's condition, which refuses the choice or action while it holds. |
| `reason` | [`Reason`](#reason) |  |  | The rule's reason, which the player reads on the greyed-out button and as the refusal. |
| `hide` | `boolean` | yes |  | The rule's hide mark. When true, the button is left off the screen while `when` holds, rather than greyed out. |

## BlockExtras

Type. Explained in [Flowing scenes](/docs/reference/flows#blockextras).

The fields any block can have beside its own, a condition and ui hints.

```ts shape
import type { BlockExtras } from '@ifloom/engine'
type BlockExtras = {
  when?: Condition
  ui?: Ui<BlockUi>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `when` | [`Condition`](#condition) | yes |  | The block's condition, which leaves it out while it fails. |
| `ui` | [`Ui`](#ui)`<`[`BlockUi`](#blockui)`>` | yes |  | The block's ui hints. See `BlockUi`. |

## BlockUi

Type. Explained in [Presentation hints](/docs/reference/ui-hints#sceneui-choiceui-blockui-entityui-statui-and-gameui).

The ui hints a block of a scene's body takes in its `ui`, carried on the first beat the block makes. The engine
declares none, and a UI package augments this interface with its own.

```ts shape
import type { BlockUi } from '@ifloom/engine'
type BlockUi = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## BrokenSave

Type. Explained in [Saves](/docs/reference/saves#brokensave).

A save in a slot that can't be read, as `list()` gives it. The listing keeps it so the player can delete it.

```ts shape
import type { BrokenSave } from '@ifloom/engine'
type BrokenSave = {
  slot: string
  broken: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `slot` | `string` |  |  | The broken save's slot. |
| `broken` | `string` |  |  | The reason the save can't be read, in the words `read` would give. |

## buildEffects

Function. Explained in [Calls by name](/docs/reference/custom#buildeffects).

Returns the effects ready for the reducer, without the calls no plugin or game has. The content checker
(`checkGame`) reports each call it leaves out.

Every other effect stays as written. A call runs in its turn, on the state the effects before it left.

```ts shape
import { buildEffects, type Game } from '@ifloom/engine'
function buildEffects(game: Game, refs: readonly EffectRef[]): Effect[]
```

Uses: [`Game`](#game), [`EffectRef`](#effectref), [`Effect`](#effect).

## ButtonDef

Type. Explained in [Actions](/docs/reference/actions#buttondef).

The fields a scene's choice (`Choice`) and an action (`ActionDef`) share, read the same way for both. Taking one
runs its command, then pays its cost, then applies its effects.

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
| `id` | `string` |  |  | The choice's or action's id, unique among its scene's choices or among the actions. |
| `label` | `string` | yes |  | The button's words, with tokens filled, such as `'Order a tea'`. A choice with no label shows its id, and an action with none is never rendered as a button. |
| `labels` | `{ when?:` [`Condition`](#condition)`; label: string }[]` | yes |  | The button's words that depend on the state, such as "Not today" before you have bought it and "Right." after. The first entry whose `when` holds wins, and `label` is the fallback. |
| `when` | [`Condition`](#condition) | yes |  | The condition under which the choice or action is offered and can be taken. Always, if left out. |
| `blocked` | [`Blocked[]`](#blocked) | yes |  | The rules that refuse it for now. The first entry whose `when` holds greys the button out with its reason, or leaves it off with `hide`. |
| `cost` | [`ActionCost`](#actioncost) | yes |  | The stats it spends. The engine checks them before it runs, lists them on the button and pays them after its command. |
| `effects` | [`EffectRef[]`](#effectref) | yes |  | The effects it applies after its cost, in order. A plugin's or the game's effect in the short form does computed work. |
| `command` | [`CommandRef`](#commandref) | yes |  | The command the choice or action sends first, a plugin's in the short form or one of the engine's, but never `choose`. The button is refused with that command's reason while the command would be. An example is `{ 'devices/open': { id: 'messages' } }`. The button's price includes what the command spends. |
| `once` | [`Once`](#once) | yes |  | The limit of once a game (`{ per: 'game' }`) or once a turn (`{ per: 'turn' }`), counted in `state.chosen`. Once spent, a choice stays on screen and pays nothing more, and an action is refused, both with `reason`. |
| `tags` | `string[]` | yes |  | The tags a UI can style or filter it by. The engine gives them no meaning. |
| `irreversible` | `string` | yes |  | The warning that it can't be undone, which a UI shows on the button. |
| `ui` | [`Ui`](#ui)`<`[`ChoiceUi`](#choiceui)`>` | yes |  | The ui hints carried to its button in the view. See `ChoiceUi`. |

## callOf

Function. Explained in [Calls by name](/docs/reference/custom#callof).

Returns the name and arguments of a call in the short form, or undefined for the engine's own conditions and effects.
A plugin's guard or price uses it to read effects.

`{ 'calendar/pass': { by: 2 } }` gives `{ name: 'calendar/pass', with: { by: 2 } }`.

```ts shape
import { callOf } from '@ifloom/engine'
function callOf(entry: object): { name: string; with: Record<string, unknown> } | undefined
```

## canHold

Function. Explained in [Entities](/docs/reference/entities#canhold).

Returns true when `holder` can hold things now. The player always can, and a unique entity can while it is in the game.

```ts shape
import { canHold, type Game } from '@ifloom/engine'
function canHold(state: GameState, game: Game, holder: string): boolean
```

Uses: [`GameState`](#gamestate), [`Game`](#game).

## CarryOver

Type. Explained in [Game state](/docs/reference/state#carryover).

The stats, kv keys and things a New Game+ carries over from the game before, declared in `carryOver`.

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
| `kv` | `string[]` | yes |  | The player's kv keys to carry, by key. |
| `held` | `string[] \| 'all'` | yes |  | The things the player holds to carry, by reference (`'food:apple'`), or `'all'` for every thing the player holds. A thing made in play is carried too. |

## cases

Function. Explained in [Flowing scenes](/docs/reference/flows#cases).

Returns a `{ cases }` block that shows only the first of `blocks` whose own `when` holds, or that has none. Leave the
last without a `when` as the fallback.

A `when` in `extras` leaves the whole block out while it fails.

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

Uses: [`Block`](#block), [`BlockExtras`](#blockextras).

## chance

Function. Explained in [Randomness](/docs/reference/random#chance).

Returns true `numerator` times in `outOf`, drawn from `parts`.

```ts shape
import { chance } from '@ifloom/engine'
function chance(numerator: number, outOf: number, ...parts: (string | number)[]): boolean
```

## Change

Type. Explained in [Changes](/docs/reference/changes#change).

A stat the last command moved, with its old and new values and the change in the stat's own format. `state.changes` keeps these.

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
| `of` | [`EntityRef`](#entityref) | yes |  | The entity the stat is kept on. Left out for the player's stat. |
| `from` | `number` |  |  | The stat's value before the command. |
| `to` | `number` |  |  | The stat's value after the command. |
| `by` | `number` |  |  | The amount the stat moved, `to - from`, above 0 when it went up. |
| `label` | `string` |  |  | The stat's `label`. |
| `text` | `string` |  |  | The change in the stat's `format`, signed, such as `'+30 coins'` or `'-£5'`. |

## ChangesDef

Type. Explained in [Changes](/docs/reference/changes#changesdef).

The stats the game declares in `changes` for `view.changes` to track, by id. An entity stat's id covers that stat on every entity.

```ts shape
import type { ChangesDef } from '@ifloom/engine'
type ChangesDef = {
  stats: string[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `stats` | `string[]` |  |  | The ids of the stats to track. |

## ChangeView

Type. Explained in [Changes](/docs/reference/changes#changeview).

A stat change as the player sees it, in `view.changes`. It adds the words that say what moved to a `Change`.

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
| `of` | [`EntityRef`](#entityref) | yes |  | The entity the stat is kept on. Left out for the player's stat. |
| `from` | `number` |  |  | The stat's value before the command. |
| `to` | `number` |  |  | The stat's value after the command. |
| `by` | `number` |  |  | The amount the stat moved, `to - from`, above 0 when it went up. |
| `label` | `string` |  |  | The stat's `label`. |
| `text` | `string` |  |  | The change in the stat's `format`, signed, such as `'+30 coins'` or `'-£5'`. |
| `name` | `string` | yes |  | The words to show after `text`, so the change says what moved. Left out when the stat's format already says it (`+30 coins`). It's the entity's name for an entity's stat (`+4 Ava`), else the stat's `label` when `text` has no words in it (`+1 Charm`, `+20% Mood`). |

## ChannelDef

Type. Explained in [Audio](/docs/reference/audio#channeldef).

An audio channel the game declares in `audio.channels`, merged over the default channels. It sets whether its
sounds replace each other or overlap, and how they fade.

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
| `mode` | `'background' \| 'cue'` |  |  | The channel's mode. A `background` channel plays one thing until it changes, and a `cue` channel plays each sound once, overlapping. |
| `crossfade` | `number` | yes |  | The milliseconds a background channel takes to fade from one track to the next. 1000 for `music`, 600 for `ambience` and 1000 for others. |
| `volume` | `string` | yes |  | The id of the ui setting, a range, that sets the channel's volume. |
| `duck` | `{ under: string[]; to: number }` | yes |  | The channel's ducking, quietening it to `to` (0 to 1) while any channel in `under` plays. No ducking if left out. |

## Checked

Type. Explained in [Checking content](/docs/reference/checks#checked).

The report `checkGame` returns, with the content's problems, warnings and files.

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
| `problems` | [`Problem[]`](#problem) |  |  | The content's faults, such as a broken reference, a key declared twice, or a call with the wrong arguments. Any problem fails `ifloom check`. |
| `warnings` | [`Problem[]`](#problem) |  |  | The faults that may show in play but aren't problems, such as a token that may be unset with no fallback. A warning fails no check. |
| `files` | [`FileRef[]`](#fileref) |  |  | The files the content names (pictures, videos, sounds) and where, for a build to check they exist. |

## checkGame

Function. Explained in [Checking content](/docs/reference/checks#checkgame).

Returns the `Checked` report of a game's content, its problems, warnings and the files it names. It runs on any
`Game`, hand-built or loaded.

Give `probes` to also render every scene against each state, so the report includes a scene that throws for one
through the game's own conditions or values. A hand-built game's problems name the pack `game`.

```ts shape
import { checkGame, type Game } from '@ifloom/engine'
function checkGame(game: Game, options?: { probes?: readonly Probe[] }): Checked
```

Uses: [`Game`](#game), [`Probe`](#probe), [`Checked`](#checked).

## Choice

Type. Explained in [Scenes](/docs/reference/scenes#choice).

A choice a scene declares in its `choices` or a decision, with the fields of a `ButtonDef`. The player sends it as
`{ type: 'choose', id }`, and `state.chosen` counts it as `<scene>#<id>`.

A spent `once` choice stays on screen with its `once.reason` and pays nothing more.

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
| `id` | `string` |  |  | The choice's or action's id, unique among its scene's choices or among the actions. |
| `label` | `string` | yes |  | The button's words, with tokens filled, such as `'Order a tea'`. A choice with no label shows its id, and an action with none is never rendered as a button. |
| `labels` | `{ when?:` [`Condition`](#condition)`; label: string }[]` | yes |  | The button's words that depend on the state, such as "Not today" before you have bought it and "Right." after. The first entry whose `when` holds wins, and `label` is the fallback. |
| `when` | [`Condition`](#condition) | yes |  | The condition under which the choice or action is offered and can be taken. Always, if left out. |
| `blocked` | [`Blocked[]`](#blocked) | yes |  | The rules that refuse it for now. The first entry whose `when` holds greys the button out with its reason, or leaves it off with `hide`. |
| `cost` | [`ActionCost`](#actioncost) | yes |  | The stats it spends. The engine checks them before it runs, lists them on the button and pays them after its command. |
| `effects` | [`EffectRef[]`](#effectref) | yes |  | The effects it applies after its cost, in order. A plugin's or the game's effect in the short form does computed work. |
| `command` | [`CommandRef`](#commandref) | yes |  | The command the choice or action sends first, a plugin's in the short form or one of the engine's, but never `choose`. The button is refused with that command's reason while the command would be. An example is `{ 'devices/open': { id: 'messages' } }`. The button's price includes what the command spends. |
| `once` | `(`[`Once`](#once) `& { key?: string; })` | yes |  | The limit of once a game (`{ per: 'game' }`) or once a turn (`{ per: 'turn' }`), counted in `state.chosen`. Once spent, a choice stays on screen and pays nothing more, and an action is refused, both with `reason`. The choice's limit of once a game or once a turn. See `Once`. |
| `tags` | `string[]` | yes |  | The tags a UI can style or filter it by. The engine gives them no meaning. |
| `irreversible` | `string` | yes |  | The warning that it can't be undone, which a UI shows on the button. |
| `ui` | [`Ui`](#ui)`<`[`ChoiceUi`](#choiceui)`>` | yes |  | The ui hints carried to its button in the view. See `ChoiceUi`. |

## choice

Function. Explained in [Flowing scenes](/docs/reference/flows#choice).

Returns a choice for a decision or a scene's ending choices, with `label` as its words. Its id is unique within the
scene.

Every other field of a `Choice` goes in `fields`, such as `effects`, `cost`, `blocked`, `once` or `command`, and
`then`, the blocks the flow shows once the player chooses it.

```ts shape
import { choice } from '@ifloom/engine'
function choice(id: string, label: string, fields?: Omit<FlowChoice, 'id' | 'label'>): FlowChoice
```

Uses: [`FlowChoice`](#flowchoice).

## ChoiceUi

Type. Explained in [Presentation hints](/docs/reference/ui-hints#sceneui-choiceui-blockui-entityui-statui-and-gameui).

The ui hints a choice or an action takes in its `ui`. The engine declares none, and a UI package augments this interface with its own.

```ts shape
import type { ChoiceUi } from '@ifloom/engine'
type ChoiceUi = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## clampStat

Function. Explained in [Stats](/docs/reference/stats#clampstat).

Returns `value` held to the stat's declared range. The range is 0 to 100 unless the stat declares one.

```ts shape
import { clampStat, type Game } from '@ifloom/engine'
function clampStat(state: GameState, game: Game, id: string, value: number): number
```

Uses: [`GameState`](#gamestate), [`Game`](#game).

## Command

Type. Explained in [Commands](/docs/reference/commands#command).

A request to change the game, told apart by its `type`, such as `{ type: 'choose', id }`. The reducer applies it or refuses it.

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

Uses: [`KvValue`](#kvvalue).

## CommandCall

Type. Explained in [Writing a plugin](/docs/reference/plugins#conditioncall-effectcall-and-commandcall).

A plugin's or the game's command in the short form, type-checked against `CommandRegistry`.

```ts shape
import type { CommandCall } from '@ifloom/engine'
type CommandCall = CallIn<CommandRegistry>
```

Uses: [`CallIn`](/docs/api/engine-plugin#callin), [`CommandRegistry`](#commandregistry).

## CommandLog

Type. Explained in [The runner](/docs/reference/runner#commandlog).

A record of play, the state it started from and every command since. The engine is deterministic, so `replay` gives
the same state from it every time.

A log makes a bug report a developer can step through, or plays two versions of a game the same way to compare them.

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
| `game` | `string` |  |  | The id of the game the log was played in, so it isn't played against another game. |
| `start` | [`GameState`](#gamestate) |  |  | The state the log's first command was applied to. |
| `commands` | [`Command[]`](#command) |  |  | The log's commands, oldest first, refused ones included. |
| `schema` | `number` | yes |  | The engine's `SCHEMA` the log's commands were written in. A log without one is read as the oldest schema. |
| `plugins` | `Record<string, number>` | yes |  | The `commandVersion` of each plugin the log's commands were written in, by plugin id. |

## commandOf

Function. Explained in [Calls by name](/docs/reference/custom#commandof).

Returns the command the engine runs for `ref`. A short-form call becomes `{ type: 'custom', name, with }`.

```ts shape
import { commandOf } from '@ifloom/engine'
function commandOf(ref: CommandRef): Command
```

Uses: [`CommandRef`](#commandref), [`Command`](#command).

## CommandRef

Type. Explained in [Calls by name](/docs/reference/custom#commandref).

A command in content, a plain command or a plugin's in the short form (`{ 'places/go': { id: 'cafe' } }`), checked against `CommandRegistry`.

```ts shape
import type { CommandRef } from '@ifloom/engine'
type CommandRef = Command | CommandCall
```

Uses: [`Command`](#command), [`CommandCall`](#commandcall).

## CommandRegistry

Type. Explained in [Writing a plugin](/docs/reference/plugins#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry).

The registry of commands plugins and the game add, by full name, with each one's arguments. It works as `ConditionRegistry` does.

```ts shape
import type { CommandRegistry } from '@ifloom/engine'
type CommandRegistry = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## Condition

Type. Explained in [Conditions](/docs/reference/conditions#condition).

A test of the state that holds or doesn't, written as plain data on a block, a choice or a variants member. Each
kind is told apart by its one key, such as `{ stat: 'coins', gte: 3 }`.

A plugin's condition, or the game's own from its `rules`, is a `PluginCall` in the short form
(`{ 'quests/done': { quest: 'bakery' } }`), checked against `ConditionRegistry` when its name is declared there.
Being data, a condition stays serialisable and the content checker can check it.

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

Uses: [`KvValue`](#kvvalue), [`Range`](#range), [`Select`](#select), [`ConditionCall`](#conditioncall).

## ConditionCall

Type. Explained in [Conditions](/docs/reference/conditions#conditioncall).

A plugin's or the game's condition in the short form, type-checked against `ConditionRegistry`.

```ts shape
import type { ConditionCall } from '@ifloom/engine'
type ConditionCall = CallIn<ConditionRegistry>
```

Uses: [`CallIn`](/docs/api/engine-plugin#callin), [`ConditionRegistry`](#conditionregistry).

## ConditionRegistry

Type. Explained in [Writing a plugin](/docs/reference/plugins#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry).

The registry of conditions plugins and the game add, by full name, with each one's arguments, or `true` for none.
A plugin augments it, and a call to a declared name is type-checked against it.

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

Type. Explained in [Content and packs](/docs/reference/content#content).

One file of the game's own content, such as `story/cafe.ts`. Each scene, stat or prose key may be declared only once
across the game's content.

Content has no id or schema, since it is compiled with the engine it runs on.

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
| `name` | `string` | yes |  | The content's name in problems, such as `story.cafe`. `content` if left out. |
| `strings` | `Record<string, string>` | yes |  | The lines that replace the engine's and plugins' strings, by key. |
| `prose` | `Record<string, string>` | yes |  | The prose keys' lines, by key. |
| `words` | `Record<string, string>` | yes |  | The words table, other words for the fields a player reads, by key. A translation is one pack with this table and its own `prose`. Each key names one field, as `translatableFields` lists them (`action.wait.label`, `entity.character:ava.name`, `scene.cafe.counter.text.intro`). `loadGame` lays it over the merged content, a later pack's over an earlier one's, and reports a key that names no field. |
| `variants` | `Record<string,` [`VariantMember[]`](#variantmember)`>` | yes |  | The variants lists' members by list name, in order. Content and packs append to a list. A member is a prose key, or `{ prose: key, weight }` to be drawn more or less often than the rest. |
| `data` | `Record<string, Record<string, readonly` [`PluginEntry[]`](/docs/api/engine-plugin#pluginentry)`>>` | yes |  | The plugins' content, by plugin id and then list, such as `{ quests: { quests: [...] } }`. A pack's entry replaces the one with the same id, as its scenes do. |
| `kinds` | [`KindDef[]`](#kinddef) | yes |  | The pack's kinds. A later pack's kind replaces an earlier one with the same id. |
| `entities` | [`EntityDef[]`](#entitydef) | yes |  | The pack's entities at the start. A later pack's entity replaces an earlier one with the same kind and id. |
| `traits` | [`TraitTable`](#traittable) | yes |  | The pack's traits, by trait id and then entity, over what each entity declares itself, such as `{ 'laundry/washable': { 'clothing:scarf': { temp: 30 } } }`. A later pack's row replaces an earlier one's. |
| `kv` | `Record<string,` [`KvValue`](#kvvalue)`>` | yes |  | The pack's starting kv store, by key. A later pack's value replaces an earlier one's. |
| `resets` | `Record<string,` [`KvValue`](#kvvalue)`>` | yes |  | The pack's keys reset each turn, by key. A later pack's value replaces an earlier one's. |
| `storylines` | [`StorylineDef[]`](#storylinedef) | yes |  | The pack's storylines, merged by id over the content's. |
| `actions` | [`ActionDef[]`](#actiondef) | yes |  | The pack's actions, by id. A later pack's action replaces an earlier one with the same id. |
| `triggers` | [`TriggerDef[]`](#triggerdef) | yes |  | The pack's triggers, merged by id over the content's. |
| `inputs` | [`InputDef[]`](#inputdef) | yes |  | The pack's inputs, merged by id over the content's. |
| `settings` | [`SettingDef[]`](#settingdef) | yes |  | The pack's settings. A later pack's setting replaces an earlier one with the same id. |
| `stats` | [`StatDef[]`](#statdef) | yes |  | The pack's stats. A later pack's stat replaces an earlier one with the same id. |
| `introScene` | `string` | yes |  | The scene open on the first frame. A later pack's replaces an earlier one's. |
| `scenes` | [`DataScene[]`](#datascene) | yes |  | The pack's scenes. A later pack's scene replaces an earlier one with the same id. |
| `minigames` | [`MinigameDef[]`](#minigamedef) | yes |  | The pack's minigames. A later pack's minigame replaces an earlier one with the same id. |
| `timers` | [`TimerDef[]`](#timerdef) | yes |  | The pack's timers. A later pack's timer replaces an earlier one with the same id. |
| `audio` | `Partial<`[`GameAudio`](#gameaudio)`>` | yes |  | The pack's tracks, channels and defaults, over the content's. A later pack's track or channel replaces an earlier one with the same id, and its `mute`, `sound` and `default` entries win too. |
| `media` | [`GameMedia`](#gamemedia) | yes |  | The pack's pools of pictures and videos. A later pack's pool replaces an earlier one with the same id, files and all. |
| `ui` | [`Ui`](#ui)`<`[`GameUi`](#gameui)`>` | yes |  | The pack's ui hints for the whole game, merged hint by hint. A later pack's hint replaces an earlier one's, and the rest stay. |
| `saveable` | [`Blocked[]`](#blocked) | yes |  | The pack's reasons to refuse saving, added after the content's. An entry with the `id` of an earlier one replaces it. |
| `locks` | [`Lock[]`](/docs/api/engine-plugin#lock) | yes |  | The pack's locks, added after the content's. A lock with the `id` of an earlier one replaces it. |
| `phrases` | [`Phrases`](#phrases) | yes |  | The pack's phrases, words that change with the state, printed in a line as `{{name}}`. Each is a plain string or a list of `{ when?, text }` rows tried in order, and an object is a group. A later pack's phrase replaces an earlier one with the same full name, and a pack can add phrases to a group. |
| `changes` | [`ChangesDef`](#changesdef) | yes |  | The pack's tracked stats, by id, such as `{ stats: ['coins', 'trust'] }`. The engine adds every file's and pack's lists together. |
| `finished` | [`Condition`](#condition) | yes |  | The pack's condition for the game being finished. It replaces the content's, and the runner records the first time it holds in the profile's `core:finished`. |
| `carryOver` | [`CarryOver`](#carryover) | yes |  | The pack's rules for a New Game+. They replace the content's `carryOver` whole. |

## CreatedEntity

Type. Explained in [Effects](/docs/reference/effects#createdentity).

The fields a `create` effect gives a new entity in its `with`. Each one left out is read from the entity it's made
`like`, else from its kind.

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
| `id` | `string` | yes |  | The entity's id within its kind. The next free number (`#1`, `#2`) if left out. |
| `name` | `string` | yes |  | The entity's name. The `like` entity's if left out. |
| `description` | `string` | yes |  | The entity's description, with tokens filled when it's read. The `like` entity's if left out. |
| `image` | `string` | yes |  | The entity's picture, through `artSrc`. The `like` entity's if left out. |
| `tags` | `string[]` | yes |  | The entity's own tags, after its kind's and its `like` entity's. |
| `traits` | `Record<string, unknown>` | yes |  | The entity's trait data, by trait id, over its `like` entity's or its kind's. |
| `stats` | `Record<string, number>` | yes |  | The entity's starting stats, over its `like` entity's. |
| `kv` | `Record<string,` [`KvValue`](#kvvalue)`>` | yes |  | The entity's starting kv keys, over its `like` entity's. |

## CreateFields

Type. Explained in [Effects](/docs/reference/effects#createfields).

The fields a `create` effect takes besides its kind.

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
| `like` | `string` | yes |  | The entity of the same kind the new one reads what it isn't given from. |
| `with` | [`CreatedEntity`](#createdentity) | yes |  | The new entity's fields, its id, name, description, picture, tags, traits, stats and kv. |
| `at` | [`Placement`](#placement) | yes |  | The new entity's holder, or how many each holder holds. Nobody holds it if left out. |

## createRunner

Function. Explained in [The runner](/docs/reference/runner#createrunner).

Returns a `Runner` that plays a game from a start state. Undo, the backlog, saving, autosave and the profile are
off unless `RunnerOptions` turns them on.

The runner wraps `apply` with undo and redo, a backlog, a command log, saving, loading and autosave, and tells
listeners when the state changes.

```ts shape
import { createRunner, type Game } from '@ifloom/engine'
function createRunner(game: Game, start: GameState, options?: RunnerOptions): Runner
```

Uses: [`Game`](#game), [`GameState`](#gamestate), [`RunnerOptions`](#runneroptions), [`Runner`](#runner).

## CustomContext

Type. Explained in [Calls by name](/docs/reference/custom#customcontext).

The context every plugin or game function gets beside the state, with the game, queries, values and seeded draws.
`PluginContext` extends it.

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
| `game` | [`Game`](#game) |  |  | The context's loaded game. |
| `query` | [`Query`](#query) |  |  | The context's query function, which asks a plugin or the game by full name (`query('places/here')`). |
| `value` | `(name: string, args?:` [`PluginArgs`](/docs/api/engine-plugin#pluginargs)`) => string \| number \| undefined` |  |  | The context's value function, which returns a value by full name, a plugin's (`messages/unread`) or the game's, asked with `args`. It returns undefined when no plugin or game has that value. |
| `roll` | `(max: number, name: string) => number` |  |  | The context's roll function, which returns a whole number from 0 to `max - 1`, drawn from the save's seed, the turn and `name`. The same save and turn always draw the same number. |

## DataScene

Type. Explained in [Scenes](/docs/reference/scenes#datascene).

A scene the game declares in `scenes`, with its body and its choices. Its id is unique across the game.

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
| `drawnFrom` | `string[]` | yes |  | The sets the scene can be drawn from, by name, such as `['cafe']`. A `{ scene: { from: 'cafe' } }` effect draws one of the scenes that name `'cafe'` here. It's separate from `tags`, which only style the scene. |
| `weight` | `number` | yes |  | The scene's weight in a draw, against the other scenes it could be drawn with. 1 if left out, and it needs `drawnFrom`. |
| `when` | [`Condition`](#condition) | yes |  | The storylet's condition. The scene can be drawn only while it holds, but a `scene` command or effect that names the scene opens it regardless. |
| `minigame` | `string` | yes |  | The id of the minigame that starts when the scene is entered. The scene shows again once it ends. |
| `id` | `string` |  |  | The scene's id, unique across the game, such as `'cafe.counter'`. |
| `title` | `string` | yes |  | The scene's title, in `view.scene.title`. The room's title, else the game's, if left out. |
| `speaker` | `string` | yes |  | The scene's speaker, by entity id or reference (`'ava'`, `'character:ava'`), in `view.scene.speaker` and `view.scene.image`. |
| `tags` | `string[]` | yes |  | The tags a UI can style the scene by, such as `['letter']` or `['flashback']`. The engine gives them no meaning. |
| `panel` | [`ScenePanel`](#scenepanel) | yes |  | The panel held open for as long as the scene is, such as `{ panel: 'counter', with: { vendor: 'cafe' } }`. It is `view.panel`, as one the `panel` effect opens is, with the scene's id in `scene`. See `ScenePanel`. |
| `audio` | `Record<string, string \| null>` | yes |  | The tracks that play on background channels while the scene is open, by channel, such as `{ ambience: 'rain' }`. Null silences one. |
| `picture` | [`PictureDef`](#picturedef) | yes |  | The scene's layered picture with hotspots, in `view.scene.picture`. See `PictureDef`. |
| `ui` | [`Ui`](#ui)`<`[`SceneUi`](#sceneui)`>` | yes |  | The scene's ui hints, carried to `view.scene.ui`. See `SceneUi`. |
| `body` | [`Block[]`](#block) |  |  | The scene's body, its blocks from top to bottom. See `Block`. |
| `choices` | [`Choice[]`](#choice) |  |  | The scene's ending choices, offered under the body once the flow ends. A flowing scene's other choices are in its decisions. |

## decide

Function. Explained in [Flowing scenes](/docs/reference/flows#decide).

Returns a decision, where the flow waits until the player chooses one of `choices`. Its id is unique within the
scene.

The chosen choice's `then` comes next, then the blocks after the decision.

```ts shape
import { decide } from '@ifloom/engine'
function decide(id: string, choices: FlowChoice[], extras?: BlockExtras): Block
```

Uses: [`FlowChoice`](#flowchoice), [`BlockExtras`](#blockextras), [`Block`](#block).

## declaredTrait

Function. Explained in [Entities](/docs/reference/entities#declaredtrait).

Returns the data of one trait on one entity from content alone, typed by `TraitRegistry`, or undefined when it lacks
the trait. Use it for a check, or anywhere with no state.

A row in a content `traits` table wins, then the entity's own `traits`, each laid over its kind's default. An entity
made in play gets its kind's default here, and `traitOf` adds the data it was made with. It doesn't ask whether the
entity is still in the game.

```ts shape
import { declaredTrait } from '@ifloom/engine'
function declaredTrait<K extends string>(game: TraitSource, ref: string, id: K): TraitData<K> | undefined
```

Uses: [`TraitSource`](#traitsource), [`TraitData`](#traitdata).

## declaredWithTrait

Function. Explained in [Entities](/docs/reference/entities#declaredwithtrait).

Returns every declared entity that has a trait, as references in content order. It reads content alone, as `declaredTrait` does.

```ts shape
import { declaredWithTrait } from '@ifloom/engine'
function declaredWithTrait(game: TraitSource, id: string): EntityRef[]
```

Uses: [`TraitSource`](#traitsource), [`EntityRef`](#entityref).

## describeProblem

Function. Explained in [Checking content](/docs/reference/checks#problem-and-describeproblem).

Returns a `Problem` as one line, `pack · where · what`.

```ts shape
import { describeProblem } from '@ifloom/engine'
function describeProblem(problem: Problem): string
```

Uses: [`Problem`](#problem).

## Dice

Type. Explained in [Dice rolls](/docs/reference/rolls#dice).

Dice a `roll` effect throws, in notation (`'2d6+1'`, `'1d20'`, `'d100'`) or as a count of dice and their sides. A count of 1 if left out.

```ts shape
import type { Dice } from '@ifloom/engine'
type Dice = string | { count?: number; sides: number }
```

## dismiss

Function. Explained in [Commands](/docs/reference/commands#dismiss).

Returns the state with the notice `id` marked seen, or every notice when `id` is left out.

```ts shape
import { dismiss } from '@ifloom/engine'
function dismiss(state: GameState, id?: string): GameState
```

Uses: [`GameState`](#gamestate).

## draw

Function. Explained in [Randomness](/docs/reference/random#draw).

Returns a whole number from 0 up to but not including `max`, drawn from `parts`. Returns 0 when `max` is 0 or less.

```ts shape
import { draw } from '@ifloom/engine'
function draw(max: number, ...parts: (string | number)[]): number
```

## drawOne

Function. Explained in [Randomness](/docs/reference/random#drawone).

Returns one entry of `items`, drawn from `parts`. Every entry is equally likely.

```ts shape
import { drawOne } from '@ifloom/engine'
function drawOne<T>(items: readonly T[], ...parts: (string | number)[]): T
```

## Effect

Type. Explained in [Effects](/docs/reference/effects#effect).

A change to the state, told apart by its one key as a condition is (`{ stat: 'coins', by: -2 }`, `{ scene: null }`).
It runs in its turn, on the state the effects before it left.

A plugin's effect, or the game's own, is a `PluginCall` in the short form, such as
`{ 'quests/start': { quest: 'bakery' } }` or `{ 'game/payRent': {} }`.

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

Uses: [`KvValue`](#kvvalue), [`Amount`](#amount), [`Dice`](#dice), [`CreateFields`](#createfields), [`Select`](#select), [`Condition`](#condition), [`PluginArgs`](/docs/api/engine-plugin#pluginargs), [`EffectCall`](#effectcall).

## EffectCall

Type. Explained in [Effects](/docs/reference/effects#effectcall).

A plugin's or the game's effect in the short form, type-checked against `EffectRegistry`.

```ts shape
import type { EffectCall } from '@ifloom/engine'
type EffectCall = CallIn<EffectRegistry>
```

Uses: [`CallIn`](/docs/api/engine-plugin#callin), [`EffectRegistry`](#effectregistry).

## EffectRef

Type. Explained in [Calls by name](/docs/reference/custom#effectref).

An effect in content, one of the engine's or a plugin's or the game's in the short form. It is the same type as `Effect`.

```ts shape
import type { EffectRef } from '@ifloom/engine'
type EffectRef = Effect
```

Uses: [`Effect`](#effect).

## EffectRegistry

Type. Explained in [Writing a plugin](/docs/reference/plugins#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry).

The registry of effects plugins and the game add, by full name, with each one's arguments. It works as `ConditionRegistry` does.

```ts shape
import type { EffectRegistry } from '@ifloom/engine'
type EffectRegistry = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## effectsOf

Function. Explained in [Actions](/docs/reference/actions#effectsof).

Returns the effects a command would apply, worked out before it runs. Plugins' guards and prices, and locks on an
effect, read them.

An action gives its cost as stat effects, then its effects. A choice gives its effects, and a plugin command gives
its `effectsOf`. Any other command gives none.

```ts shape
import { effectsOf, type Game } from '@ifloom/engine'
function effectsOf(state: GameState, game: Game, command: CommandRef): Effect[]
```

Uses: [`GameState`](#gamestate), [`Game`](#game), [`CommandRef`](#commandref), [`Effect`](#effect).

## entitiesOf

Function. Explained in [Entities](/docs/reference/entities#entitiesof).

Returns every entity of a kind in the game, as references. Declared ones come first in content order, then those
made in play in the order they were made.

```ts shape
import { entitiesOf, type Game } from '@ifloom/engine'
function entitiesOf(state: GameState, game: Game, kind: string): EntityRef[]
```

Uses: [`GameState`](#gamestate), [`Game`](#game), [`EntityRef`](#entityref).

## EntitiesView

Type. Explained in [The view](/docs/reference/view#entitiesview-and-entityview).

A listed kind as the player sees it, in `view.entities`, with its listed entities.

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
| `id` | `string` |  |  | The kind's id, such as `'character'`. |
| `label` | `string` |  |  | The kind's label for one entity, such as `'Character'`. |
| `plural` | `string` |  |  | The kind's label for several, for a heading, such as `'Characters'`. Its `label` when the kind gives none. |
| `unique` | `boolean` |  |  | The kind's `unique` mark, true when each entity is one particular thing that can hold others. |
| `entries` | [`EntityView[]`](#entityview) |  |  | The kind's listed, visible entities, declared ones first, then those created in play. |

## EntityDef

Type. Explained in [Entities](/docs/reference/entities#entitydef).

An entity the game declares in `entities`, there from the start of the game. Its id is unique within its kind.

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
| `id` | `string` |  |  | The entity's id, unique within its kind. |
| `of` | `string` |  |  | The id of the entity's kind. |
| `name` | `string` |  |  | The entity's name, as the player reads it, such as "Ana". The engine fills its tokens when it reads it. |
| `description` | `string` | yes |  | The entity's description, a line or two the player reads, with its tokens filled as the name's are. |
| `image` | `string` | yes |  | The entity's picture, a path in the game's `art/` folder or a URL, read through `artSrc`. |
| `tags` | `string[]` | yes |  | The entity's tags, after its kind's, which a UI or a plugin can sort or filter it by. |
| `visible` | [`Condition`](#condition) | yes |  | The entity's visibility condition, asked with `'$'` as it, which narrows its kind's `listed`. Always visible if left out. |
| `stats` | `Record<string, number>` | yes |  | The entity's starting stats, where they differ from each stat's `start`. |
| `kv` | `Record<string,` [`KvValue`](#kvvalue)`>` | yes |  | The entity's starting kv keys. |
| `at` | [`Placement`](#placement) | yes |  | The entity's starting holder, such as `'player'` or a unique entity like `'character:ava'`, or a count for each holder (`{ player: 2, 'place:larder': 6 }`). Held by no one if left out. |
| `traits` | `{ [K in keyof` [`TraitRegistry`](#traitregistry)`]?: Partial<`[`TraitRegistry`](#traitregistry)`[K]> } & Record<string, unknown>` | yes |  | The entity's traits, by trait id, such as `{ 'laundry/washable': { temp: 30 } }`. They go over its kind's and under a content `traits` row for the entity, and an object merges with its kind's field by field. |
| `ui` | [`Ui`](#ui)`<`[`EntityUi`](#entityui)`>` | yes |  | The entity's ui hints, laid over its kind's field by field and carried to the view. See `EntityUi`. |

## entityDescription

Function. Explained in [Entities](/docs/reference/entities#entitydescription).

Returns an entity's description with its tokens filled, or undefined when it has none.

```ts shape
import { entityDescription, type Game } from '@ifloom/engine'
function entityDescription(state: GameState, game: Game, ref: string): string | undefined
```

Uses: [`GameState`](#gamestate), [`Game`](#game).

## entityImage

Function. Explained in [Entities](/docs/reference/entities#entityimage).

Returns an entity's picture before `artSrc`, the one it was made with, else its definition's, else its `like`'s.

```ts shape
import { entityImage, type Game } from '@ifloom/engine'
function entityImage(state: GameState, game: Game, ref: string): string | undefined
```

Uses: [`GameState`](#gamestate), [`Game`](#game).

## entityKv

Function. Explained in [Entities](/docs/reference/entities#entitykv).

Returns an entity's kv store, the keys of its `like` and then its definition's, with the keys play set laid over
them.

```ts shape
import { entityKv, type Game } from '@ifloom/engine'
function entityKv(state: GameState, game: Game, ref: string): Record<string, KvValue>
```

Uses: [`GameState`](#gamestate), [`Game`](#game), [`KvValue`](#kvvalue).

## entityName

Function. Explained in [Entities](/docs/reference/entities#entityname).

Returns an entity's name with its tokens filled, the name it was created with or else its definition's. Returns the
entity's id when it has neither.

```ts shape
import { entityName, type Game } from '@ifloom/engine'
function entityName(state: GameState, game: Game, ref: string): string
```

Uses: [`GameState`](#gamestate), [`Game`](#game).

## entityOf

Function. Explained in [Entities](/docs/reference/entities#entityof).

Returns the save's record of an entity, or `{}` for a declared one play hasn't changed. Returns undefined when the
entity isn't in the game.

```ts shape
import { entityOf, type Game } from '@ifloom/engine'
function entityOf(state: GameState, game: Game, ref: string): EntityState | undefined
```

Uses: [`GameState`](#gamestate), [`Game`](#game), [`EntityState`](#entitystate).

## EntityRef

Type. Explained in [Common types](/docs/reference/common#entityref).

A reference to an entity, its kind and its id joined by `:`, such as `'staff:ana'`. A bare id or a typo with no `:`
fails to compile where a reference is wanted.

Inside an `each` or a `count`'s `where`, content writes `'$'` for the entity being looked at, in fields typed as
plain strings.

```ts shape
import type { EntityRef } from '@ifloom/engine'
type EntityRef = `${string}:${string}`
```

## EntityState

Type. Explained in [Entities](/docs/reference/entities#entitystate).

The state a save keeps for one entity, only the fields play changed. A declared entity has no record until play
changes it, and reads every other field from content.

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
| `name` | `string` | yes |  | The name the entity was made with in play. A declared entity's name is read from content. |
| `description` | `string` | yes |  | The description the entity was made with in play. |
| `image` | `string` | yes |  | The picture the entity was made with in play. |
| `like` | [`EntityRef`](#entityref) | yes |  | The entity the entity was made like. The fields it doesn't have itself (name, description, picture, tags, stats, kv and traits) are read from that one. |
| `tags` | `string[]` | yes |  | The tags the entity was made with, after its kind's and its `like`'s. |
| `traitData` | `Record<string, unknown>` | yes |  | The trait data the entity was made with, by trait id, over its `like`'s or its kind's. Its traits' state is in `traits`. |
| `stats` | [`Stats`](#stats) | yes |  | The entity's stats changed in play, by id. Others are read from its definition, then from the stat's `start`. |
| `kv` | `Record<string,` [`KvValue`](#kvvalue)`>` | yes |  | The entity's kv keys set in play. Others are read from its definition. |
| `traits` | `Record<string, unknown>` | yes |  | The state of the entity's traits that keep one, by trait id, once play changed it. See `traitState`. |

## entityTags

Function. Explained in [Entities](/docs/reference/entities#entitytags).

Returns an entity's tags, its kind's, then its `like`'s, then its own, each once.

```ts shape
import { entityTags, type Game } from '@ifloom/engine'
function entityTags(state: GameState, game: Game, ref: string): string[]
```

Uses: [`GameState`](#gamestate), [`Game`](#game).

## EntityUi

Type. Explained in [Presentation hints](/docs/reference/ui-hints#sceneui-choiceui-blockui-entityui-statui-and-gameui).

The ui hints a kind takes for each of its entities, and an entity takes over its kind's. The engine declares none,
and a UI package augments this interface with its own.

```ts shape
import type { EntityUi } from '@ifloom/engine'
type EntityUi = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## EntityView

Type. Explained in [The view](/docs/reference/view#entitiesview-and-entityview).

An entity as the player sees it, in an `EntitiesView`'s `entries`.

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
| `id` | `string` |  |  | The entity's id within its kind. |
| `ref` | `string` |  |  | The entity's reference, such as `'staff:ana'`. |
| `name` | `string` |  |  | The entity's name, with its prose tokens filled in. |
| `description` | `string \| null` |  |  | The entity's description, with its tokens filled in. Null if it has none. |
| `image` | `string \| null` |  |  | The entity's picture, as a path through `artSrc`. Null if it has none. |
| `tags` | `string[]` |  |  | The entity's tags, its kind's first and then its own. |
| `flags` | `Record<string, boolean>` |  |  | The answer to each of the kind's `flags` for this entity, by name. Empty when the kind declares none. |
| `stats` | [`StatView[]`](#statview) |  |  | The kind's listed stats the player can see on this entity, in the order the game declares them. |
| `kv` | `Record<string,` [`KvValue`](#kvvalue)`>` |  |  | The entity's kv store as it reads now, its declared keys with play's changes over them. |
| `ui` | [`Ui`](#ui)`<`[`EntityUi`](#entityui)`>` | yes |  | The entity's ui hints (a `EntityUi`), its own over its kind's, kept as written. Left out if it has none. |

## explain

Function. Explained in [Conditions](/docs/reference/conditions#explain).

Returns the `Explanation` of a condition against a state, part by part. An undefined condition always holds.

```ts shape
import { explain, type Game } from '@ifloom/engine'
function explain(state: GameState, game: Game, condition: Condition | undefined): Explanation
```

Uses: [`GameState`](#gamestate), [`Game`](#game), [`Condition`](#condition), [`Explanation`](#explanation).

## explainText

Function. Explained in [Conditions](/docs/reference/conditions#explaintext).

Returns an `Explanation` as indented lines with ✓ or ✗ on each, for a log or a debug panel.

```ts shape
import { explainText } from '@ifloom/engine'
function explainText(explanation: Explanation, depth?: number): string
```

Uses: [`Explanation`](#explanation).

## Explanation

Type. Explained in [Conditions](/docs/reference/conditions#explanation).

A condition's tree with each part marked as holding or not, returned by `explain`. Each leaf says what it read and
what it wanted.

It answers the question authors ask most, why a choice is refused or missing.

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
| `holds` | `boolean` |  |  | True when this part of the condition holds. |
| `why` | `string` |  |  | The part's one line, saying what it checked and what it found. |
| `parts` | [`Explanation[]`](#explanation) | yes |  | The parts of an `all`, `any` or `not`, each explained. |

## FileRef

Type. Explained in [Checking content](/docs/reference/checks#fileref).

A file the game names, with the place that names it. Its `path` is the one the page asks for, after `artSrc` or `audioSrc`.

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
| `path` | `string` |  |  | The file's path, as the page asks for it. |
| `type` | `'picture' \| 'video' \| 'audio'` |  |  | The file's type. |
| `where` | `string` |  |  | The place the content names the file, written as a `Problem`'s `where` is. |

## FillPart

Type. Explained in [Saves](/docs/reference/saves#fillpart).

A part of the state `MigrationTools.fill` can fill, named by the feature that fills it.

The parts are the player's stats (start values), kv keys (the content's starting kv and per-turn resets) and play
settings (defaults).

```ts shape
import type { FillPart } from '@ifloom/engine'
type FillPart =
  | 'kv'
  | 'settings'
  | 'stats'
```

## fillTokens

Function. Explained in [Prose and markup](/docs/reference/prose#filltokens).

Returns `text` with its `{{…}}` tokens filled for this state. An unset bare name prints nothing, and any other token
that names nothing stays as written, so the missing name shows on screen.

The tokens are these:

- `{{name}}` reads one of the game's phrases (content's `phrases`, with `.` between groups: `{{outfit.verdict}}`),
  then a value in `rules.values`, then a kv key such as `{{playerName}}`.
- `{{plugin/name}}` reads a plugin's value, with any arguments after the name (`{{messages/unread channel=texts}}`).
- `{{kv:key of=storyline:baker}}` reads a key in another kv store.
- `{{v:game/name}}` and `{{v:plugin/name}}` are the older way to write a value, and still work.

A token can end in `|` and the words shown while it is unset, as in `{{flatmateName|Your flatmate}}`. A token is
unset when its kv key is missing or not text or a number, no row of its phrase holds, no one has its value, or its
value is `''`. The fallback is shown as written, with no tokens filled. The engine never reads a token's printed
words for tokens again, but it fills a phrase's own words when it prints the phrase.

```ts shape
import { fillTokens, type Game } from '@ifloom/engine'
function fillTokens(state: GameState, game: Game, text: string): string
```

Uses: [`GameState`](#gamestate), [`Game`](#game).

## FlowChoice

Type. Explained in [Flowing scenes](/docs/reference/flows#flowchoice).

A choice at a decision, a `Choice` with the blocks the flow shows once the player chooses it.

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
| `id` | `string` |  |  | The choice's or action's id, unique among its scene's choices or among the actions. |
| `label` | `string` | yes |  | The button's words, with tokens filled, such as `'Order a tea'`. A choice with no label shows its id, and an action with none is never rendered as a button. |
| `labels` | `{ when?:` [`Condition`](#condition)`; label: string }[]` | yes |  | The button's words that depend on the state, such as "Not today" before you have bought it and "Right." after. The first entry whose `when` holds wins, and `label` is the fallback. |
| `when` | [`Condition`](#condition) | yes |  | The condition under which the choice or action is offered and can be taken. Always, if left out. |
| `blocked` | [`Blocked[]`](#blocked) | yes |  | The rules that refuse it for now. The first entry whose `when` holds greys the button out with its reason, or leaves it off with `hide`. |
| `cost` | [`ActionCost`](#actioncost) | yes |  | The stats it spends. The engine checks them before it runs, lists them on the button and pays them after its command. |
| `effects` | [`EffectRef[]`](#effectref) | yes |  | The effects it applies after its cost, in order. A plugin's or the game's effect in the short form does computed work. |
| `command` | [`CommandRef`](#commandref) | yes |  | The command the choice or action sends first, a plugin's in the short form or one of the engine's, but never `choose`. The button is refused with that command's reason while the command would be. An example is `{ 'devices/open': { id: 'messages' } }`. The button's price includes what the command spends. |
| `once` | `(`[`Once`](#once) `& { key?: string; })` | yes |  | The limit of once a game (`{ per: 'game' }`) or once a turn (`{ per: 'turn' }`), counted in `state.chosen`. Once spent, a choice stays on screen and pays nothing more, and an action is refused, both with `reason`. The choice's limit of once a game or once a turn. See `Once`. |
| `tags` | `string[]` | yes |  | The tags a UI can style or filter it by. The engine gives them no meaning. |
| `irreversible` | `string` | yes |  | The warning that it can't be undone, which a UI shows on the button. |
| `ui` | [`Ui`](#ui)`<`[`ChoiceUi`](#choiceui)`>` | yes |  | The ui hints carried to its button in the view. See `ChoiceUi`. |
| `then` | [`Block[]`](#block) | yes |  | The blocks shown once the choice is chosen. The flow then carries on after the decision, or from its `{ point }` effect's point. |

## FlowState

Type. Explained in [Flowing scenes](/docs/reference/flows#flowstate).

The visit a save keeps for the open scene, with its path so far and the wait the flow stands at. The scene's body is read from content.

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
| `scene` | `string` |  |  | The id of the scene the visit is of. |
| `path` | [`FlowStep[]`](#flowstep) |  |  | The visit's steps in order, the choices made, the points jumped to and the minigames and panels done with. The view replays them to render the visit. |
| `waiting` | `{ minigame: string } \| { panel: string } \| null` |  |  | The minigame being played or the panel open where the flow stands, until it's done. Null while the flow waits on neither. |

## FlowStep

Type. Explained in [Flowing scenes](/docs/reference/flows#flowstep).

A step of a visit's path in `state.flow`, kept in the order the steps came.

`{ chose }` is a choice at a decision or among the ending choices, `{ point }` a jump a choice made, and
`{ minigame }` or `{ panel }` a wait done with.

```ts shape
import type { FlowStep } from '@ifloom/engine'
type FlowStep = { chose: string } | { point: string } | { minigame: string } | { panel: string }
```

## fold

Function. Explained in [Flowing scenes](/docs/reference/flows#fold).

Returns a fold, a section the player can open and shut under `label`, such as a letter to read. A UI without the
`fold` hint shows the blocks open.

A fold is presentation only, a section with the React UI's `fold` hint, and keeps no state.

```ts shape
import { fold } from '@ifloom/engine'
function fold(label: string, blocks: Block[], extras?: BlockExtras): Block
```

Uses: [`Block`](#block), [`BlockExtras`](#blockextras).

## Formula

Type. Explained in [Stats](/docs/reference/stats#formula).

A formula a derived stat declares in its `derive`, to work the stat out from other stats. A number is itself, and a
string is another stat's value.

For a stat with `of`, a string names the same entity's stat.

The other forms combine formulas:

- `{ sum: [...] }`, `{ product: [...] }`, `{ min: [...] }` and `{ max: [...] }` combine a list.
- `{ scale: f, by: n }` is f times n.
- `{ clamp: f, min?, max? }` holds f between the two.

```ts shape
import type { Formula } from '@ifloom/engine'
type Formula = number | string | { sum: Formula[] } | { product: Formula[] } | { min: Formula[] } | { max: Formula[] } | { scale: Formula; by: number } | { clamp: Formula; min?: number; max?: number }
```

## Game

Type. Explained in [The game](/docs/reference/game#game).

A loaded game, the core's fields and each feature's. `loadGame` makes it from the base, the content and the packs.

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
| `id` | `string` |  |  | The game's id. Saves and packs record it, so a save from another game is refused. |
| `title` | `string` |  |  | The game's title, which a title page shows. |
| `version` | `number` | yes |  | The game's own version, a whole number from 1. Saves record it, and `rules.migrations` carry an older save forward. 1 if left out. Declaring it also stops the engine filling new stats, settings and entities into old saves by itself, so your migration steps fill them with `tools.fill()`. |
| `packs` | `string[]` | yes |  | The ids of the packs the game was loaded with, in order. Saves record them, and the game's own content has no id. |
| `prose` | [`ProseStore`](#prosestore) | yes |  | The game's prose keys and variants lists, with their weights. `loadGame` makes it from the content's `prose`. |
| `rules` | [`GameRules`](#gamerules) | yes |  | The game's own code, its hooks, providers and the calls content makes as `game/<name>`. See `GameRules`. |
| `strings` | `Record<string, string>` | yes |  | The game's lines in place of the engine's and plugins' strings, by key, such as `{ finishFirst: 'Not yet.', 'quests/notDoing': 'Not on your list.' }`. Packs can add theirs, and a later pack's line wins. |
| `plugins` | `readonly` [`Plugin`](/docs/api/engine-plugin#plugin)`<any>[]` | yes |  | The plugins the game is built with, in the order their hooks run. |
| `data` | `Record<string, Record<string, readonly` [`PluginEntry[]`](/docs/api/engine-plugin#pluginentry)`>>` | yes |  | The plugins' content, by plugin id and then list, such as `data.quests.quests`. `loadGame` merges packs' entries by id, as it does scenes. |
| `kinds` | [`KindDef[]`](#kinddef) | yes |  | The game's kinds, the sorts of entity it keeps, each with its own stats. |
| `entities` | [`EntityDef[]`](#entitydef) | yes |  | The game's entities at the start. Play can create more. |
| `traits` | [`TraitTable`](#traittable) | yes |  | The game's traits, by trait id and then entity. In content given to `loadGame` they're rows over what entities declare. On the game `loadGame` returns, they're every entity's traits, worked out. Read them with `declaredTrait`. |
| `kv` | `Record<string,` [`KvValue`](#kvvalue)`>` | yes |  | The kv store a new game starts with, such as the stretch it opens in, `{ phase: 'arrival' }`. |
| `resets` | `Record<string,` [`KvValue`](#kvvalue)`>` | yes |  | The keys the engine puts back at the start of each turn, with the value each goes back to. Use them to count something once a turn. |
| `storylines` | [`StorylineDef[]`](#storylinedef) | yes |  | The game's storylines, threads of story each with its own kv store, which a `closeStoryline` effect rests for some turns. None if left out. |
| `actions` | [`ActionDef[]`](#actiondef) | yes |  | The game's actions, by id. None if left out. An action with a `label` is a button in the room while no scene is open, and one with no label is done only by `{ type: 'action', id }`. |
| `triggers` | [`TriggerDef[]`](#triggerdef) | yes |  | The game's triggers, effects that run by themselves the first time a condition holds. They fire in this order. |
| `inputs` | [`InputDef[]`](#inputdef) | yes |  | The game's inputs, the fields the player fills in, each writing a kv key. |
| `settings` | [`SettingDef[]`](#settingdef) | yes |  | The game's settings, which the player changes from a settings page. None if left out. |
| `stats` | [`StatDef[]`](#statdef) | yes |  | The game's stats. The engine has none of its own. |
| `introScene` | `string` | yes |  | The scene open on the first frame. The game opens on the room if left out. |
| `scenes` | [`DataScene[]`](#datascene) |  |  | The game's scenes, as data. |
| `minigames` | [`MinigameDef[]`](#minigamedef) | yes |  | The game's minigames. None if left out. |
| `timers` | [`TimerDef[]`](#timerdef) | yes |  | The game's timers. None if left out. |
| `audio` | [`GameAudio`](#gameaudio) | yes |  | The game's tracks and channels. No audio if left out. |
| `media` | [`GameMedia`](#gamemedia) | yes |  | The game's pools of pictures and videos. None if left out. |
| `ui` | [`Ui`](#ui)`<`[`GameUi`](#gameui)`>` | yes |  | The game's ui hints, such as how every screen comes in. The engine carries them to the view as written and gives them no meaning. |
| `saveable` | [`Blocked[]`](#blocked) | yes |  | The game's reasons to refuse saving, as `blocked` entries refused while their `when` holds. The first entry that holds gives the reason, and saving is always allowed if left out. |
| `locks` | [`Lock[]`](/docs/api/engine-plugin#lock) | yes |  | The game's locks, checked in order. The first one that stops a command gives the reason. |
| `phrases` | `Record<string,` [`PhraseRow[]`](#phraserow) `\|` [`PhraseWithArgs`](#phrasewithargs)`>` | yes |  | The game's phrases, by full dotted name (`outfit.verdict`), each as its rows or its rows with the arguments it takes. None if left out. |
| `changes` | [`ChangesDef`](#changesdef) | yes |  | The stats the engine tracks changes of, from the content and every pack together. Nothing is tracked if left out. |
| `carryOver` | [`CarryOver`](#carryover) | yes |  | The game's rules for a New Game+, the parts of the last game a new one keeps. `startingState`'s `carry` applies them. |
| `finished` | [`Condition`](#condition) | yes |  | The game's condition for being finished. The runner records the first time it holds in the profile's `core:finished`, so a title page can offer New Game+. |

## GameAudio

Type. Explained in [Audio](/docs/reference/audio#gameaudio).

The audio the game declares in `audio`, its tracks, the channels they play on and the settings that set their volume.

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
| `tracks` | `Record<string,` [`TrackDef`](#trackdef) `\|` [`PlaylistDef`](#playlistdef)`>` |  |  | The game's tracks and playlists, by id, each a file with its volume or a list of tracks to play in turn. |
| `channels` | `Record<string,` [`ChannelDef`](#channeldef)`>` | yes |  | The game's channels, merged over the defaults, `music` and `ambience` (background) and `sfx` and `voice` (cue). |
| `mute` | `string` | yes |  | The id of the ui setting, a toggle, that mutes everything while it's on, such as a "Mute" box. |
| `sound` | `string` | yes |  | The id of the ui setting, a toggle, that plays sound only while it's on, such as a "Sound" box. It's the reverse of `mute`. |
| `default` | `Record<string, string>` | yes |  | The track each background channel plays when nothing else sets one, by channel. |

## GameBase

Type. Explained in [Content and packs](/docs/reference/content#gamebase).

The base `loadGame` takes beside the content, the game's `id`, `title`, `version`, `plugins` and `rules`. Anything a
mod could change goes in the content or a pack instead.

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
| `id` | `string` |  |  | The game's id. Saves and packs record it, so a save from another game is refused. |
| `title` | `string` |  |  | The game's title, which a title page shows. |
| `version` | `number` | yes |  | The game's own version, a whole number from 1. Saves record it, and `rules.migrations` carry an older save forward. 1 if left out. Declaring it also stops the engine filling new stats, settings and entities into old saves by itself, so your migration steps fill them with `tools.fill()`. |
| `plugins` | `readonly` [`Plugin`](/docs/api/engine-plugin#plugin)`<any>[]` | yes |  | The plugins the game is built with, in the order their hooks run. |
| `rules` | [`GameRules`](#gamerules) | yes |  | The game's own code, its hooks, providers and the calls content makes as `game/<name>`. See `GameRules`. |

## GameMedia

Type. Explained in [Media](/docs/reference/media#gamemedia).

The media the game declares in `media`, pools of pictures and videos by id.

```ts shape
import type { GameMedia } from '@ifloom/engine'
type GameMedia = {
  pools?: Record<string, PoolFile[]>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `pools` | `Record<string,` [`PoolFile[]`](#poolfile)`>` | yes |  | The game's pools, named lists of files content draws from, as in `[[img:@door\|night]]` or `{ pool: 'door', tags: ['night'] }`. |

## GameRules

Type. Explained in [Rules and hooks](/docs/reference/rules#gamerules).

The game's own code, a plain object with the members a plugin has. Content calls its members with `game` as the
plugin id, such as the condition `{ 'game/tired': true }`.

The engine runs it as the plugin `game`, before every other plugin, with the same context (`PluginContext`, and
`TurnContext` for the turn hooks). Its `slice`, `get` and `set` read and write the game's own state when it has a
`start`. Every member is optional and means what a plugin's does (see `Plugin`), except `migrations`, which carry
the whole save from one version of the game to the next.

A plugin's id, versions, content, strings, calls and data are the game's own content, so `GameRules` leaves them
out. Locks and per-turn resets are content too, in `locks` and `resets`.

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
| `conditions` | `Record<string, (state:` [`GameState`](#gamestate)`, args:` [`PluginArgs`](/docs/api/engine-plugin#pluginargs)`, context:` [`PluginContext`](/docs/api/engine-plugin#plugincontext)`<S>) => boolean>` | yes |  | The plugin's conditions content can test, by name without the prefix. |
| `effects` | `Record<string, (state:` [`GameState`](#gamestate)`, args:` [`PluginArgs`](/docs/api/engine-plugin#pluginargs)`, context:` [`PluginContext`](/docs/api/engine-plugin#plugincontext)`<S>) =>…` | yes |  | The plugin's effects content can apply, by name without the prefix. Each takes the state the effects before it left and returns the next one, so two in one list compose. Prices and guards can't see what an effect does until it runs. An effect that only stands for other effects belongs in `macros` instead. |
| `view` | `((state:` [`GameState`](#gamestate)`, context:` [`PluginContext`](/docs/api/engine-plugin#plugincontext)`<S>) => unknown)` | yes |  | Returns the plugin's view, which a UI reads at `view.plugins[id]`. Declare its type `V` in `ViewRegistry` under the plugin's id, and every view types `view.plugins[id]` as `V`. |
| `references` | [`PluginReferences`](/docs/api/engine-plugin#pluginreferences) | yes |  | The references the plugin's calls and content make, which the content checker resolves as it resolves the engine's own. See `PluginReferences`. |
| `commands` | `Record<string,` [`PluginCommand`](/docs/api/engine-plugin#plugincommand)`<S,` [`PluginArgs`](/docs/api/engine-plugin#pluginargs)`>>` | yes |  | The plugin's commands a choice or action can send, by name without the prefix. |
| `traits` | `readonly` [`TraitDef`](/docs/api/engine-plugin#traitdef)`<any, any>[]` | yes |  | The traits the plugin gives meaning to, each id the plugin's id, `/` and a name. A trait is data only, and the plugin's code decides what it does. Content writes them on a kind, an entity or content's `traits` table, and the plugin reads them with `traitOf` or `declaredTrait`. |
| `actions` | `((state:` [`GameState`](#gamestate)`, context:` [`PluginContext`](/docs/api/engine-plugin#plugincontext)`<S>) => readonly` [`ButtonDef[]`](#buttondef) `\| undefined)` | yes |  | Returns the actions offered while no scene is open, such as a location's things to do. The view lists them before the game's own `actions`, rendered the same way. |
| `audio` | `((state:` [`GameState`](#gamestate)`, context:` [`PluginContext`](/docs/api/engine-plugin#plugincontext)`<S>) => Record<string, string \| null> \|…` | yes |  | Returns the tracks the plugin plays on background channels, by channel, such as a location's ambience. Null silences a channel, and the first plugin that names a channel wins it. A plugin's track is below an open scene's and an `audio` effect's, and above the game's default. A channel left out is the next plugin's, then the default's. |
| `scene` | `((state:` [`GameState`](#gamestate)`, context:` [`PluginContext`](/docs/api/engine-plugin#plugincontext)`<S>) =>` [`RoomScene`](/docs/api/engine-plugin#roomscene) `\| undefined)` | yes |  | Returns the `RoomScene` the screen shows while no scene is open, such as a location's description or a dashboard's heading. The first plugin that answers fills it. With none, the room shows the game's title and its actions. |
| `action` | `((state:` [`GameState`](#gamestate)`, id: string, context:` [`PluginContext`](/docs/api/engine-plugin#plugincontext)`<S>) =>` [`ButtonDef`](#buttondef) `\| undefined)` | yes |  | Returns one of the plugin's actions that isn't among its `actions` now, by id without the prefix, such as an app's. Undefined when there is none. `{ type: 'action', id: '<plugin>/<id>' }` runs it, as for an action with a cost or effects. Without this provider, the engine looks the id up among the plugin's `actions`. |
| `label` | `((state:` [`GameState`](#gamestate)`, context:` [`PluginContext`](/docs/api/engine-plugin#plugincontext)`<S>) => string \| undefined)` | yes |  | Returns a few words on the time or place in the game for a header or a save, such as "Day 3 · Wednesday morning". |
| `start` | `((game:` [`Game`](#game)`) => S)` | yes |  | Returns the plugin's state in a new game. A plugin with no state leaves it out. |
| `values` | `Record<string, (state:` [`GameState`](#gamestate)`, args:` [`PluginArgs`](/docs/api/engine-plugin#pluginargs)`, context:` [`PluginContext`](/docs/api/engine-plugin#plugincontext)`<S>) => string…` | yes |  | The plugin's values, words and numbers content reads by name with arguments, as a condition is asked. Prose prints one as `{{id/name channel=texts}}`, and an `Amount` reads one as `{ value: 'id/name', with }`. |
| `macros` | `Record<string,` [`Macro`](/docs/api/engine-plugin#macro)`<S,` [`PluginArgs`](/docs/api/engine-plugin#pluginargs)`>>` | yes |  | The plugin's macros, effects that stand for other effects, by name without the prefix. A name is an effect's or a macro's, never both. Content calls one as any effect. It returns the effects it stands for, worked out from the state, so a button's price and the guards see what it would do. See `Macro`. |
| `queries` | `Record<string, (state:` [`GameState`](#gamestate)`, args:` [`PluginArgs`](/docs/api/engine-plugin#pluginargs)`, context:` [`PluginContext`](/docs/api/engine-plugin#plugincontext)`<S>) => unknown>` | yes |  | The plugin's queries, answers other plugins ask for by name without importing it, such as `context.query('calendar/whenNext', { when })`. A query answers what a condition's yes or no can't, such as a location, a time or a list. |
| `statModifiers` | `((state:` [`GameState`](#gamestate)`, context:` [`PluginContext`](/docs/api/engine-plugin#plugincontext)`<S>) => readonly` [`StatModifier[]`](/docs/api/engine-plugin#statmodifier) `\| undefined)` | yes |  | Returns the changes to what the player's stats read now, worked out from the plugin's state, such as a timed boost. It must not read stats itself, or it reads itself. Nothing is written into the state. Every reading of the stat (conditions, derived stats, costs, the view) sees the changed value, and `stat` effects still write the kept value underneath. |
| `onTurn` | `((state:` [`GameState`](#gamestate)`, context:` [`TurnContext`](/docs/api/engine-plugin#turncontext)`<S>) =>` [`GameState`](#gamestate)`)` | yes |  | The hook run at the end of a turn, once the counter has moved on and `resets` are back. It returns the next state, and the hooks run in order, the game's first. `context.before` is the state as the turn ended, and a `turn` effect applied through `context.apply` does nothing. |
| `onTurnDone` | `((state:` [`GameState`](#gamestate)`, context:` [`TurnContext`](/docs/api/engine-plugin#turncontext)`<S>) =>` [`GameState`](#gamestate)`)` | yes |  | The hook run once every `onTurn` has run, so it sees their changes, such as the calendar's new day. It returns the next state and runs in the same order and context as `onTurn`. |
| `onStat` | `((before:` [`GameState`](#gamestate)`, after:` [`GameState`](#gamestate)`, stat: string, by: number, context:` [`PluginContext`](/docs/api/engine-plugin#plugincontext)`<…` | yes |  | The hook run when a `stat` effect changes one of the player's stats. `before` is the state before it, `after` the state with it, and `by` how far it moved. Return `before` to undo the change, `after` to keep it, or `after` with more changes. The hooks run in order, the game's first, each seeing what the one before returned. |
| `onCommand` | `((before:` [`GameState`](#gamestate)`, after:` [`GameState`](#gamestate)`, context:` [`PluginContext`](/docs/api/engine-plugin#plugincontext)`<S>) =>` [`GameState`](#gamestate)`)` | yes |  | The hook run after every command that took, with the state before and the state after. It returns the next state, and its context is the state after. |
| `guard` | `((state:` [`GameState`](#gamestate)`, asked:` [`Asked`](/docs/api/engine-plugin#asked)`, context:` [`PluginContext`](/docs/api/engine-plugin#plugincontext)`<S>) =>` [`Refusal`](/docs/api/engine-plugin#refusal) `\| undefined)` | yes |  | Returns a `Refusal` for a command, given the effects it would apply, or undefined to let it through. The engine asks it after the locks, of every command but the ones that ignore locks. |
| `price` | `((state:` [`GameState`](#gamestate)`, effects: readonly` [`Effect[]`](#effect)`, context:` [`PluginContext`](/docs/api/engine-plugin#plugincontext)`<S>) => string[] \|…` | yes |  | Returns the plugin's words for what a button costs that the engine can't say, such as `['until evening']`. The engine asks it with the effects the button would apply. |
| `saveName` | `((state:` [`GameState`](#gamestate)`, context:` [`PluginContext`](/docs/api/engine-plugin#plugincontext)`<S>) => string \| undefined)` | yes |  | Returns the name a save is listed under, such as the name the player typed. It is kept as `SaveMeta.playerName` and shown for `@you`'s lines. The first that answers names it, the game's first. With none, saves have no player name. |
| `profile` | `((state:` [`GameState`](#gamestate)`, previous:` [`GameState`](#gamestate)`, stored: unknown, context:` [`PluginContext`](/docs/api/engine-plugin#plugincontext)`<S>) =>…` | yes |  | Returns the value the plugin keeps in the player's profile, which outlives saves and new games, such as earned achievements. Return undefined to leave the stored value. The runner asks it after every command that took, with the state after, the state before and the value the plugin's profile namespace (its id) holds now. Only a runner with a `profile` asks, and `apply` never does. |
| `check` | `(game:` [`Game`](#game)`, tools:` [`CheckTools`](/docs/api/engine-plugin#checktools)`) =>` [`PluginProblem[]`](/docs/api/engine-plugin#pluginproblem) | yes |  | Returns the problems the plugin's own rules find that a reference can't express, such as two entries with one id or an exit to nowhere. The content checker runs it after the references. `tools` words problems with anything else the plugin names as the checker does. |
| `migrations` | `Record<number, (state:` [`GameState`](#gamestate)`, tools:` [`MigrationTools`](#migrationtools)`) =>` [`GameState`](#gamestate)`>` | yes |  | The game's save migrations, keyed by the game `version` each upgrades from, so step 1 takes a version-1 save to version 2. A version with no step is carried forward unchanged. They run on the whole state when an older save loads, after the engine's and plugins' own migrations. |

## GameState

Type. Explained in [Game state](/docs/reference/state#gamestate).

The state a save keeps, the core's fields and each feature's. Definitions are read from content, so the save holds
only what play changed.

Each field declares its new-game value and load default once, in `FIELDS` or in its feature's `state`.

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
| `version` | `typeof SAVE_VERSION` |  |  | The save format's version, `SAVE_VERSION`. `loadState` carries an older save forward. |
| `seed` | `number` |  |  | The save's random seed, fixed when the game starts. Every seeded draw (variants, pools, rolls, storylets) mixes it in, so two games draw differently. |
| `plugins` | `Record<string,` [`PluginSlice`](/docs/api/engine-plugin#pluginslice)`>` |  |  | The plugins' own state, by plugin id. |
| `gameVersion` | `number` | yes |  | The game's own version (`game.version`) the save was made with. It is set only when the game declares a version, and a save without it counts as version 1. |
| `entities` | `Record<string, Record<string,` [`EntityState`](#entitystate)`>>` |  |  | The changes play has made to the game's entities, by kind and id, such as `entities.staff.ana`. A declared entity has no record until something changes it. An entity created in play has a record from the start. |
| `created` | `Record<string, number>` |  |  | The number of entities of each kind created in play, for the next one's id. |
| `removed` | `string[]` |  |  | The references of declared entities removed in play. A `create` with the same id brings one back. |
| `held` | `Record<string, Record<string, number>>` |  |  | The counts play has changed, by holder and then thing, such as `held.player['food:apple']`. A count stays once written, 0 included. A count play hasn't changed is read from the entity's `at` in content. |
| `you` | [`EntityRef`](#entityref) `\| null` |  |  | The protagonist the player is playing, which `'you'` names. Null while the player plays themselves. |
| `turn` | `number` |  |  | The number of turns that have passed, the engine's one clock. It starts at 0. The game decides how long a turn is (a day, an hour, a week or a chapter). The engine dates `seen`, `fired` and notices in turns. |
| `kv` | `Record<string,` [`KvValue`](#kvvalue)`>` |  |  | The player's kv store, keys with a true/false, number or text value. |
| `storylines` | `Record<string,` [`StorylineState`](#storylinestate)`>` |  |  | The storylines a save keeps, by id, each with its kv store and the turn it stays closed until. |
| `notices` | [`Notice[]`](#notice) |  |  | The notices the game has raised, oldest first. The state keeps the last 50. |
| `fired` | `Record<string, number>` |  |  | The turn each trigger last fired on, by trigger id. |
| `settings` | `Record<string,` [`KvValue`](#kvvalue)`>` |  |  | The value of each `play` setting the game declares, by id. |
| `stats` | [`Stats`](#stats) |  |  | The player's stats, by id. An entity's stats are kept on the entity. |
| `sceneId` | `string \| null` |  |  | The id of the open scene. Null while no scene is open and the room shows. |
| `seen` | `Record<string,` [`Times`](#times)`>` |  |  | The scenes the player has entered, by id, with a count and the first and last turn of each. Content can gate a chain of scenes on it without a kv key per link. Entering the scene that's already open, such as a hub rendered again after a choice, doesn't count. |
| `chosen` | `Record<string,` [`Times`](#times)`>` |  |  | The choices the player has chosen, by `scene#choice`, with a count and the first and last turn of each. Content can gate on an earlier decision with it, and a choice's `once` reads it. |
| `minigame` | [`MinigameState`](#minigamestate) `\| null` |  |  | The minigame being played, or null. |
| `flow` | [`FlowState`](#flowstate) `\| null` |  |  | The open scene's visit, each choice, jump and wait passed in order, and the wait the flow stands at. It starts again each time a scene is entered. Null while no scene is open, and for a visit with nothing to keep yet. |
| `timers` | `Record<string,` [`RunningTimer`](#runningtimer)`>` |  |  | The running timers, by id, in the order they started. |
| `audio` | [`AudioState`](#audiostate) |  |  | The audio a save keeps, the tracks effects put on channels, the last sounds and the count of scenes entered. |
| `media` | [`MediaState`](#mediastate) |  |  | The file each pool request was given, so a revisit and a reload show the same one. |
| `panel` | [`OpenPanel`](#openpanel) `\| null` |  |  | The panel the `panel` effect opened over the story, or null. |
| `rolls` | [`RollsState`](#rollsstate) |  |  | The rolls this save has made. |
| `changes` | [`Change[]`](#change) |  |  | The stats the last command moved, in the order the game declares them, the player's first. A `tick` that moved nothing keeps the list from before it. |

## GameUi

Type. Explained in [Presentation hints](/docs/reference/ui-hints#sceneui-choiceui-blockui-entityui-statui-and-gameui).

The ui hints the whole game takes in its `ui`. The engine declares none, and a UI package augments this interface with its own.

```ts shape
import type { GameUi } from '@ifloom/engine'
type GameUi = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## give

Function. Explained in [Entities](/docs/reference/entities#give-take-move-and-holding).

Returns the effect that gives `you` `n` of a thing, 1 if left out. A unique thing someone else holds is taken from
them.

```ts fragment
effects: [give('food:apple', 2)]
```

```ts shape
import { give } from '@ifloom/engine'
function give(ref: string, n?: number): Effect
```

Uses: [`Effect`](#effect).

## hash

Function. Explained in [Randomness](/docs/reference/random#hash).

Returns a 32-bit unsigned hash of `text`. Texts that differ in one character give unrelated numbers.

```ts shape
import { hash } from '@ifloom/engine'
function hash(text: string): number
```

## heldBy

Function. Explained in [Entities](/docs/reference/entities#heldby).

Returns the things a holder holds, `'you'` if left out, each with its count. They come in the game's entity order,
declared ones in content order and then those made in play.

```ts shape
import { heldBy, type Game } from '@ifloom/engine'
function heldBy(state: GameState, game: Game, at?: string): { ref: EntityRef; count: number }[]
```

Uses: [`GameState`](#gamestate), [`Game`](#game), [`EntityRef`](#entityref).

## heldCount

Function. Explained in [Entities](/docs/reference/entities#heldcount).

Returns the count of a thing a holder holds, `'you'` if left out. Returns 0 for a thing not held there or not in the game.

```ts shape
import { heldCount, type Game } from '@ifloom/engine'
function heldCount(state: GameState, game: Game, ref: string, at?: string): number
```

Uses: [`GameState`](#gamestate), [`Game`](#game).

## HeldView

Type. Explained in [The view](/docs/reference/view#heldview).

A thing you hold as the player sees it, in `view.held`. Only things whose `visible` holds are listed.

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
| `ref` | [`EntityRef`](#entityref) |  |  | The thing's entity reference, such as `'food:apple'`. |
| `name` | `string` |  |  | The thing's name, with its prose tokens filled in. |
| `description` | `string \| null` |  |  | The thing's description, with its tokens filled in. Null if it has none. |
| `image` | `string \| null` |  |  | The thing's picture, as a path through `artSrc`. Null if it has none. |
| `tags` | `string[]` |  |  | The thing's tags, its kind's first and then its own. |
| `count` | `number` |  |  | The number of the thing held. |
| `at` | [`Holder`](#holder) |  |  | The thing's holder, the protagonist being played or `'player'`. |
| `ui` | [`Ui`](#ui)`<`[`EntityUi`](#entityui)`>` | yes |  | The thing's presentation hints (a `EntityUi`), its own over its kind's, kept as written. Left out if it has none. |

## HelperRegistry

Type. Explained in [The runner](/docs/reference/runner#helperregistry).

The registry of helper reports, by helper id, that a helper augments to type its own. It is empty until a helper
augments it, as `startUnlocks` from `@ifloom/plugin-unlocks` does for `unlocks`.

A helper types its report here as a plugin types its view in `ViewRegistry`.

```ts shape
import type { HelperRegistry } from '@ifloom/engine'
type HelperRegistry = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## HelpersIn

Type. Explained in [The runner](/docs/reference/runner#helpersin).

The helpers' reports, by helper id. Each report a helper declares in `HelperRegistry` is typed, and the rest are `unknown`.

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

Settings for undo and redo. Undo is off unless `createRunner` is given these or `true`, and never steps back past a
barrier these set.

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
| `depth` | `number` | yes |  | The number of steps back undo reaches. 50 if left out. |
| `stopAtIrreversible` | `boolean` | yes |  | The setting that stops undo at a choice marked `irreversible`. On unless set to false. |
| `stopAtNewTurn` | `boolean` | yes |  | The setting that stops undo at the start of a new turn. Off if left out. |
| `stopWhen` | [`Condition`](#condition) | yes |  | A condition that stops undo at any state where it holds, tested after each command. |

## Holder

Type. Explained in [Entities](/docs/reference/entities#holder-and-placement).

A holder of things, `'player'`, a unique entity (`'character:ava'`) or `'you'`. `'you'` is whoever the player is
playing now, the player unless a `you` effect switched to a protagonist.

```ts shape
import type { Holder } from '@ifloom/engine'
type Holder = EntityRef | typeof PLAYER | typeof YOU
```

Uses: [`EntityRef`](#entityref).

## holderOf

Function. Explained in [Entities](/docs/reference/entities#holderof).

Returns the holder of a thing when one holder has it, as always for a unique thing. Returns undefined when no one holds it.

```ts shape
import { holderOf, type Game } from '@ifloom/engine'
function holderOf(state: GameState, game: Game, ref: string): Holder | undefined
```

Uses: [`GameState`](#gamestate), [`Game`](#game), [`Holder`](#holder).

## holding

Function. Explained in [Entities](/docs/reference/entities#give-take-move-and-holding).

Returns the condition that holds while `you` hold at least `n` of a thing, 1 if left out.

```ts shape
import { holding } from '@ifloom/engine'
function holding(ref: string, n?: number): Condition
```

Uses: [`Condition`](#condition).

## holds

Function. Explained in [Conditions](/docs/reference/conditions#holds).

Returns true when `condition` holds in this state. An undefined condition always holds.

The engine finds a condition's kind by its one key. A condition with no known key, or with two, never holds, and
the content checker reports it. A range bound that is an `Amount` is worked out first, so the kind reads a
number.

```ts shape
import { holds, type Game } from '@ifloom/engine'
function holds(state: GameState, game: Game, condition: Condition | undefined): boolean
```

Uses: [`GameState`](#gamestate), [`Game`](#game), [`Condition`](#condition).

## HotspotDef

Type. Explained in [Media](/docs/reference/media#hotspotdef).

A hotspot on a picture, a clickable area the UI renders as a button. It either sends `command` or chooses the open
scene's choice `choice`.

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
| `id` | `string` |  |  | The hotspot's id. |
| `rect` | `[ number, number, number, number ]` |  |  | The hotspot's area, in percent of the picture, as `[x, y, width, height]` from the top left. |
| `label` | `string` |  |  | The hotspot's label, which a screen reader reads and the tooltip shows. |
| `command` | [`CommandRef`](#commandref) | yes |  | The command the hotspot sends, written as an action's `command`. |
| `choice` | `string` | yes |  | The id of the open scene's choice the hotspot chooses. |
| `when` | [`Condition`](#condition) | yes |  | The hotspot's condition. The hotspot shows only while it holds. |
| `layer` | `string` | yes |  | The id of the layer the hotspot goes with. The hotspot shows only while that layer does. |

## HotspotView

Type. Explained in [Media](/docs/reference/media#hotspotview).

A hotspot as the player sees it, in a `PictureView`'s `hotspots`. The UI renders it as a button over the picture.

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
| `id` | `string` |  |  | The hotspot's id. |
| `rect` | `[ number, number, number, number ]` |  |  | The hotspot's area, in percent of the picture, as `[x, y, width, height]` from the top left. |
| `label` | `string` |  |  | The hotspot's label. |
| `command` | [`Command`](#command) |  |  | The command pressing the hotspot sends, its own `command` or the command that chooses its `choice`. |
| `disabled` | `string` | yes |  | The reason the hotspot can't be pressed now, as on a button's `disabled`. Left out when it can. |
| `warning` | `string` | yes |  | The warning a plugin gives against pressing the hotspot, as on a button's `warning`. |
| `layer` | `string` | yes |  | The id of the layer the hotspot goes with. Left out for a hotspot on the whole picture. |

## image

Function. Explained in [Flowing scenes](/docs/reference/flows#image).

Returns a `{ media }` block, a picture or a video at this place in the flow, such as `image('cafe/cup', { alt: 'A cup of tea' })`.

```ts shape
import { image } from '@ifloom/engine'
function image(src: string, media?: Omit<SceneMedia, 'src'> & BlockExtras): Block
```

Uses: [`SceneMedia`](#scenemedia), [`BlockExtras`](#blockextras), [`Block`](#block).

## inlineChoices

Function. Explained in [The view](/docs/reference/view#inlinechoices).

Returns the choices and actions that a scene's or a room's beats hold inline, in the order they come.

```ts shape
import { inlineChoices } from '@ifloom/engine'
function inlineChoices(beats: readonly SceneBeat[]): RenderedChoice[]
```

Uses: [`SceneBeat`](#scenebeat), [`RenderedChoice`](#renderedchoice).

## inlineMarkup

Function. Explained in [Prose and markup](/docs/reference/prose#inlinemarkup).

Returns a line of prose cut at its inline markup (`[[act:…]]`, `[[tip:…]]`, `[[ui:…]]`, `**bold**`, `*italic*`).
Returns null when it has none.

Broken markup stays in the words as written, so it shows on screen, and the content checker reports it. Broken
markup is markup with no id or key, a tooltip or UI piece with no words, a UI piece whose name isn't an id or that
has an empty argument, or stars that don't close. A `\*` is a star shown unchanged, and bold and italics inside or
around inline markup are not read.

```ts shape
import { inlineMarkup } from '@ifloom/engine'
function inlineMarkup(text: string): InlinePart[] | null
```

Uses: [`InlinePart`](#inlinepart).

## InlinePart

Type. Explained in [Prose and markup](/docs/reference/prose#inlinepart).

One piece of a line of prose as `inlineMarkup` reads it, told apart by its `type`. Each marked piece keeps its
source in `markup`.

```ts shape
import type { InlinePart } from '@ifloom/engine'
type InlinePart = { type: 'text'; text: string } | { type: 'act'; id: string; text?: string; markup: string } | { type: 'tip'; key: string; text: string; markup: string } | { type: 'ui'; name: string; text: string; args: string[]; markup: string } | { type: 'bold'; text: string; markup: string } | { type: 'italic'; text: string; markup: string }
```

## InlineSpan

Type. Explained in [Prose and markup](/docs/reference/prose#inlinespan).

One piece of a paragraph that holds inline markup, in a beat's `spans`, in order. Each piece is told apart by its
`type`.

```ts shape
import type { InlineSpan } from '@ifloom/engine'
type InlineSpan = { type: 'text'; text: string } | { type: 'action'; text: string; choice: RenderedChoice } | { type: 'tip'; text: string; tip: string } | { type: 'bold'; text: string } | { type: 'italic'; text: string } | { type: 'ui'; name: string; text: string; args: string[] }
```

Uses: [`RenderedChoice`](#renderedchoice).

## InlineUi

Type. Explained in [Presentation hints](/docs/reference/ui-hints#inlineui).

The UI pieces a UI renders inside a line of prose from `[[ui:name|words|arg|…]]`, by name. Each name maps to the
arguments it takes after the words, as a tuple of text.

The engine declares none, and a UI package augments this interface with its own:

```ts fragment
declare module '@ifloom/engine' {
  interface InlineUi { modal: [key: string, title?: string] }
}
```

The engine never reads it. The view's `{ type: 'ui' }` span has `name: string` and `args: string[]`, so a name no
UI declared still comes through, and this interface only types a UI's components.

```ts shape
import type { InlineUi } from '@ifloom/engine'
type InlineUi = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## InlineUiArgs

Type. Explained in [Presentation hints](/docs/reference/ui-hints#inlineuiargs).

The arguments of the UI piece named `N`, as a UI package declared them in `InlineUi`. Any text when no package declared `N`.

```ts shape
import type { InlineUiArgs } from '@ifloom/engine'
type InlineUiArgs<N extends string> = N extends keyof InlineUi ? InlineUi[N] : readonly string[]
```

Uses: [`InlineUi`](#inlineui).

## InputDef

Type. Explained in [Inputs](/docs/reference/inputs#inputdef).

An input the game declares in `inputs`, a field the player fills in, such as a pet's name. The `input` command writes
its value to a kv key and refuses one the declaration doesn't allow.

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
| `id` | `string` |  |  | The input's id, which the `input` command names. |
| `label` | `string` |  |  | The input's label, the name of the field the player fills in. |
| `type` | `'text' \| 'number' \| 'choice'` |  |  | The input's type, `text` (typed words), `number` or `choice` (one of `options`). |
| `key` | `string` | yes |  | The kv key the input writes. The input's id if left out. |
| `when` | [`Condition`](#condition) | yes |  | The input's condition. The input is on offer only while it holds. |
| `maxLength` | `number` | yes |  | The most characters a `text` input takes, after trimming. 40 if left out. |
| `min` | `number` | yes |  | The lowest number a `number` input takes, included. No bound if left out. |
| `max` | `number` | yes |  | The highest number a `number` input takes, included. No bound if left out. |
| `options` | `{ value:` [`KvValue`](#kvvalue)`; label: string }[]` | yes |  | The values a `choice` input offers, each with the label the player reads. |

## InputView

Type. Explained in [The view](/docs/reference/view#inputview).

An input as the player sees it, in `view.inputs`. Only inputs whose `when` holds are listed.

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
| `id` | `string` |  |  | The input's id, which the `input` command names. |
| `label` | `string` |  |  | The input's label, the name of the field. |
| `type` | [`InputDef`](#inputdef)`['type']` |  |  | The input's type, `text`, `number` or `choice`. |
| `maxLength` | `number \| null` |  |  | The most characters a `text` input takes, after trimming, 40 unless the input sets it. Null for a number or a choice. |
| `min` | `number \| null` |  |  | The lowest number the input takes. Null with no bound, and for text or a choice. |
| `max` | `number \| null` |  |  | The highest number the input takes. Null with no bound, and for text or a choice. |
| `options` | `{ value:` [`KvValue`](#kvvalue)`; label: string }[]` |  |  | The values a `choice` input offers, each with its label. Empty for text or a number. |
| `value` | [`KvValue`](#kvvalue) `\| null` |  |  | The value the input's kv key holds now. Null when it's unset. |

## inRange

Function. Explained in [Conditions](/docs/reference/conditions#inrange).

Returns true when `value` is in the range, with each bound worked out in this state first. A range with no bounds
holds above 0.

So `{ gte: { stat: 'rent' } }` compares the value with the rent.

```ts shape
import { inRange, type Game } from '@ifloom/engine'
function inRange(state: GameState, game: Game, value: number, range: Range): boolean
```

Uses: [`GameState`](#gamestate), [`Game`](#game), [`Range`](#range).

## InstalledMod

Type. Explained in [Mods](/docs/reference/mods#installedmod).

A mod the player has added, as the mod store keeps it.

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
| `id` | `string` |  |  | The mod's id. |
| `name` | `string` |  |  | The mod's name, for a mods page. |
| `version` | `string` | yes |  | The mod's own version, as its author writes it. |
| `description` | `string` | yes |  | The mod's description, a line for a mods page. |
| `enabled` | `boolean` |  |  | True when the mod is on. A mod that is off stays installed and is left out of the game. |
| `pack` | [`Pack`](#pack) |  |  | The pack the mod adds, as the file wrote it, with its id set to `mod:<id>`. `loadGame` upgrades it. |

## isUnique

Function. Explained in [Entities](/docs/reference/entities#isunique).

Returns true when the entity's kind is `unique`, so each entity is one particular thing that can hold others.

```ts shape
import { isUnique, type Game } from '@ifloom/engine'
function isUnique(game: Pick<Game, 'kinds' | 'plugins'>, ref: string): boolean
```

Uses: [`Game`](#game).

## jump

Function. Explained in [Flowing scenes](/docs/reference/flows#jump).

Returns the jump effect `{ point: id }`, which carries the flow on from a point instead of after the choice's
decision, once its `then` is done. A flow loops only this way, through a choice.

```ts shape
import { jump } from '@ifloom/engine'
function jump(id: string): { point: string }
```

## KindDef

Type. Explained in [Entities](/docs/reference/entities#kinddef).

A kind of entity the game declares in `kinds`, such as the staff of a café or the dishes on its menu. Each entity of
the kind has its own stats and kv keys.

So a stat declared with `of: 'staff'` belongs to each member of staff, not to the player.

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
| `id` | `string` |  |  | The kind's id, the part before the `:` in each of its entity references. |
| `label` | `string` |  |  | The kind's label for one entity, as the player reads it, such as "Member of staff". |
| `plural` | `string` | yes |  | The kind's label for more than one, such as "Staff". The `label` if left out. |
| `unique` | `boolean` | yes |  | The kind's unique mark. True when each entity is one particular thing that can hold others, such as a person, and false when its things stack, such as dishes. |
| `listed` | `boolean \|` [`Condition`](#condition) | yes |  | The kind's listing rule for the view, `true`, `false` or a condition asked of each entity with `'$'` as it. A game's kinds are listed if left out, and a plugin's are not. |
| `tags` | `string[]` | yes |  | The tags every entity of the kind has, before its own `tags`. |
| `flags` | `Record<string,` [`Condition`](#condition)`>` | yes |  | The kind's flags, named conditions asked of each listed entity with `'$'` as it, such as `{ met: { 'cast/met': { character: '$' } } }`. The view answers them in each entity's `flags`. |
| `traits` | `{ [K in keyof` [`TraitRegistry`](#traitregistry)`]?: Partial<`[`TraitRegistry`](#traitregistry)`[K]> } & Record<string, unknown>` | yes |  | The default traits of every entity of the kind, by trait id. An entity's own object for a trait is laid over this one field by field, and any other value replaces it whole. |
| `ui` | [`Ui`](#ui)`<`[`EntityUi`](#entityui)`>` | yes |  | The ui hints of every entity of the kind, under each entity's own. See `EntityUi`. |

## KvValue

Type. Explained in [Common types](/docs/reference/common#kvvalue).

A value in the kv store, which is true or false, a number or text.

```ts shape
import type { KvValue } from '@ifloom/engine'
type KvValue = boolean | number | string
```

## lackingLine

Function. Explained in [Stats](/docs/reference/stats#lackingline).

Returns the refusal for a cost the player can't cover, from the stat's `lacking`, else "Not enough" and the label.

```ts shape
import { lackingLine, type Game } from '@ifloom/engine'
function lackingLine(game: Game, id: string, amount: number): string
```

Uses: [`Game`](#game).

## Loaded

Type. Explained in [Content and packs](/docs/reference/content#loaded).

The result of `loadGame`, the merged game with its prose, its variants and the problems found.

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
| `game` | [`Game`](#game) |  |  | The loaded game, ready to run. |
| `prose` | `Record<string, string>` |  |  | The game's prose keys' lines, merged from the content and the packs. |
| `variants` | `Record<string, string[]>` |  |  | The game's variants lists by name, each with its members' prose keys. |
| `problems` | [`Problem[]`](#problem) |  |  | The problems with the content and the packs, each naming the one it came from. Empty when there are none. |

## LoadedSave

Type. Explained in [Saves](/docs/reference/saves#loadedsave).

A save read back, with its state carried forward to this game through `loadState`.

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
| `meta` | [`SaveMeta`](#savemeta) |  |  | The save's `SaveMeta`. |
| `state` | [`GameState`](#gamestate) |  |  | The save's state, carried forward to this game's version through `loadState`. |
| `missingPacks` | `string[]` |  |  | The ids of the mods the save was made with that the game wasn't loaded with, such as a mod since turned off. |
| `missingPlugins` | `string[]` |  |  | The ids of the plugins the save was made with that this game does not have. The save keeps their state, unused. |

## loadGame

Function. Explained in [Content and packs](/docs/reference/content#loadgame).

Returns the game merged from the base, the content and then the packs in order, with every problem found. Each
problem names the content or pack that brought it.

The content checker (`checkGame`) checks the merged game. `loadGame` adds where each problem came from, and the
problems with the content and packs themselves, such as a key declared twice or a key they can't hold. So a mod
author reads "mod:spicier · scene allie.talk · choice kiss · unknown scene 'allie.snog'", not a stack trace.

```ts shape
import { loadGame } from '@ifloom/engine'
function loadGame(content: readonly Content[], base: GameBase, options?: LoadOptions): Loaded
```

Uses: [`Content`](#content), [`GameBase`](#gamebase), [`LoadOptions`](#loadoptions), [`Loaded`](#loaded).

## LoadOptions

Type. Explained in [Content and packs](/docs/reference/content#loadoptions).

Settings for `loadGame`. A game loaded without them has no packs.

```ts shape
import type { LoadOptions } from '@ifloom/engine'
type LoadOptions = {
  packs?: readonly Pack[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `packs` | `readonly` [`Pack[]`](#pack) | yes |  | The packs to load over the content, in order, each over the ones before, such as mods and unlocked content. |

## loadState

Function. Explained in [Saves](/docs/reference/saves#loadstate).

Returns a state from a save, a command log or a test made ready to play in this game. Returns a failed `Result`
with a reason the player can read when it can't be.

It runs the engine's own steps and each field's load default, then the plugins' migrations, then the game's
migrations, and last fills in the values the game declares and the save lacks.

```ts shape
import { loadState, type Game } from '@ifloom/engine'
function loadState(raw: unknown, game: Game): Result<GameState>
```

Uses: [`Game`](#game), [`Result`](#result), [`GameState`](#gamestate).

## MediaState

Type. Explained in [Media](/docs/reference/media#mediastate).

The media a save keeps, in `state.media`. The pools themselves are read from content.

```ts shape
import type { MediaState } from '@ifloom/engine'
type MediaState = {
  picks: Record<string, string>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `picks` | `Record<string, string>` |  |  | The file each pool request was given, by the key `pickKey` returns. |

## mediaType

Function. Explained in [Prose and markup](/docs/reference/prose#mediatype).

Returns `'video'` for a file with a video extension (`.mp4`, `.webm`), else `'image'`.

```ts shape
import { mediaType } from '@ifloom/engine'
function mediaType(src: string): 'image' | 'video'
```

## memoryDriver

Function. Explained in [Saves](/docs/reference/saves#memorydriver).

Returns a `SaveDriver` that keeps saves in memory, gone when the page is. Use it for tests and previews.

```ts shape
import { memoryDriver } from '@ifloom/engine'
function memoryDriver(): SaveDriver
```

Uses: [`SaveDriver`](#savedriver).

## MigrationTools

Type. Explained in [Saves](/docs/reference/saves#migrationtools).

The tools a step of `rules.migrations` or a plugin's `migrations` gets beside the state.

```ts shape
import type { MigrationTools, Game } from '@ifloom/engine'
type MigrationTools = {
  game: Game
  fill: (parts?: FillPart[]) => GameState
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `game` | [`Game`](#game) |  |  | The game the save is loading into, for a step that reads its content, such as the entity an old id now names. |
| `fill` | `(parts?:` [`FillPart[]`](#fillpart)`) =>` [`GameState`](#gamestate) |  |  | Returns the state the step was given, with the values the game declares and the save lacks filled in. It fills the parts asked for, or every part if left out. A migration fills nothing unless its step calls this. See `FillPart`. |

## minigame

Function. Explained in [Commands](/docs/reference/commands#minigame).

Returns a `{ minigame }` block, a minigame played at this place in the flow. The flow waits until it ends, then carries on.

```ts shape
import { minigame } from '@ifloom/engine'
function minigame(id: string, extras?: BlockExtras): Block
```

Uses: [`BlockExtras`](#blockextras), [`Block`](#block).

## MinigameDef

Type. Explained in [Minigames](/docs/reference/minigames#minigamedef).

A minigame the game declares in `minigames`, a small state machine played with named inputs and timed by ticks. Every key it uses must be in its `kv`.

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
| `id` | `string` |  |  | The minigame's id, which the `minigame` effect and a scene's `minigame` name. |
| `title` | `string` | yes |  | The minigame's title. |
| `start` | `string` |  |  | The id of the state the minigame starts in. |
| `kv` | `Record<string, number>` | yes |  | The minigame's kv store, with each key's starting number, such as `{ score: 0 }`. Content reads and writes the keys with `of: 'minigame'`. |
| `keys` | `Record<string, string[]>` | yes |  | The keys a UI maps to each input, by input name, such as `{ up: ['ArrowUp', 'w'] }`. Key names are those `KeyboardEvent.key` gives, and a UI picks its own if left out. |
| `states` | `Record<string,` [`MinigameStateDef`](#minigamestatedef)`>` |  |  | The minigame's states, by name. |

## MinigameInput

Type. Explained in [Minigames](/docs/reference/minigames#minigameinput).

An input of the running minigame as the player sees it, in `view.minigame.inputs`. It has what a `RenderedChoice` needs, so a UI renders it as any button.

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
| `id` | `string` |  |  | The input's name, as the minigame's `on` names it, such as `'up'`. |
| `label` | `string` |  |  | The input's label, from its `on` entry, else the `minigame.<input>` string (`Up`, `Space`), else its name with a capital. |
| `command` | `{ type: 'minigame'; input: string }` |  |  | The command pressing the input sends. |

## MinigameSceneFields

Type. Explained in [Minigames](/docs/reference/minigames#minigamescenefields).

The scene field that starts a minigame.

```ts shape
import type { MinigameSceneFields } from '@ifloom/engine'
type MinigameSceneFields = {
  minigame?: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `minigame` | `string` | yes |  | The id of the minigame that starts when the scene is entered. The scene shows again once it ends. |

## MinigameState

Type. Explained in [Minigames](/docs/reference/minigames#minigamestate).

The running minigame a save keeps, in `state.minigame`. Its states are read from content.

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
| `id` | `string` |  |  | The minigame's id. |
| `state` | `string` |  |  | The name of the state the minigame is in. |
| `elapsed` | `number` |  |  | The milliseconds of ticks since the minigame entered that state. |
| `kv` | `Record<string, number>` |  |  | The minigame's kv store, as play has left it. |
| `steps` | `number` |  |  | The number of transitions the minigame has taken, part of its random draws' seed. |

## MinigameStateDef

Type. Explained in [Minigames](/docs/reference/minigames#minigamestatedef).

A state of a minigame, in its `states`. It can wait (`after`), listen to inputs (`on`), move on by itself (`always`) or end the minigame (`final`).

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
| `label` | `string` | yes |  | The words the player reads while the minigame is in this state, with tokens filled. |
| `after` | `{ ms: number } &` [`MinigameTransition`](#minigametransition) | yes |  | The state's timer. Once `ms` milliseconds of ticks have passed in the state, the engine takes the transition, and one that stays put starts the timer again. The `tick` that runs down the game's named timers runs it down too, in the order they run out. |
| `on` | `({ input: string; when?:` [`Condition`](#condition)`; label?: string } &` [`MinigameTransition`](#minigametransition)`)[]` | yes |  | The state's inputs. For each input, the first entry whose `when` holds is taken, and an input with no such entry isn't live. `label` is the input's words for its button in this state, with tokens filled, such as a quiz's answer. The first live entry with one gives it. Without one the button reads the `minigame.<input>` string, else the input's name. |
| `always` | `({ when?:` [`Condition`](#condition) `} &` [`MinigameTransition`](#minigametransition)`)[]` | yes |  | The state's automatic transitions, the first whose `when` holds taken on entering the state. Use them for a state that only decides where to go next, such as a win. |
| `final` | `{ effects?:` [`EffectRef[]`](#effectref)`; copy?: Record<string, string> }` | yes |  | The state's ending. Entering the state ends the minigame. `copy` writes keys of the minigame's kv store to the player's (`{ score: 'arrows.best' }`). Then the minigame closes and `effects` run. |

## MinigameTarget

Type. Explained in [Minigames](/docs/reference/minigames#minigametarget).

A state a transition can go to at random, as its id or as its id with a weight. The weight is 1 if left out.

```ts shape
import type { MinigameTarget } from '@ifloom/engine'
type MinigameTarget = string | { state: string; weight?: number }
```

## MinigameTransition

Type. Explained in [Minigames](/docs/reference/minigames#minigametransition).

A minigame transition, the state it goes to and the effects it runs on the way. With no `go` or `to` it stays in its state.

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
| `go` | `string` | yes |  | The id of the state the transition goes to. |
| `to` | [`MinigameTarget[]`](#minigametarget) | yes |  | The states the transition draws one from at random, by weight, when there's no `go`. The draw is seeded by the save. |
| `effects` | [`EffectRef[]`](#effectref) | yes |  | The effects the transition runs before it moves. Any effect works, such as a `kv` effect with `of: 'minigame'` or a `turn`. |

## MinigameView

Type. Explained in [Minigames](/docs/reference/minigames#minigameview).

The running minigame as the player sees it, in `view.minigame`.

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
| `id` | `string` |  |  | The minigame's id. |
| `title` | `string \| null` |  |  | The minigame's title, or null. |
| `state` | `string` |  |  | The name of the state the minigame is in. |
| `label` | `string \| null` |  |  | The state's `label`, with tokens filled, or null. `view.scene.body` has it rendered. |
| `timeLeft` | `number \| null` |  |  | The milliseconds left on the state's timer. Null when the state has no timer. |
| `timeTotal` | `number \| null` |  |  | The whole length of the state's timer in milliseconds. Null when the state has no timer. |
| `inputs` | [`MinigameInput[]`](#minigameinput) |  |  | The inputs that are live now, in the order the state lists them. |
| `kv` | `Record<string, number>` |  |  | The minigame's kv store now. |
| `keys` | `Record<string, string[]>` |  |  | The keys the game maps to each input, by input name. Empty when it maps none. |

## ModFile

Type. Explained in [Mods](/docs/reference/mods#modfile).

A mod as a JSON file, with the game it is for and the pack it adds. A mod is data only, so no code runs that the game
didn't ship.

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
| `ifloomMod` | `1` |  |  | The file's format, 1. |
| `id` | `string` |  |  | The mod's id. Its pack is loaded as `mod:<id>`. |
| `name` | `string` |  |  | The mod's name, for a mods page. |
| `version` | `string` | yes |  | The mod's own version, as its author writes it, such as `'1.2'`. |
| `game` | `string` |  |  | The id of the game the mod was made for. |
| `description` | `string` | yes |  | The mod's description, a line for a mods page. |
| `pack` | [`Pack`](#pack) |  |  | The `Pack` the mod adds, laid over the game's content. |

## Mods

Type. Explained in [The showcase: Small Town](/docs/guide/showcase#mods).

One game's mod store, returned by `mods`. No call rejects, and a driver's failure answers with a reason and the
driver's error as its `cause`.

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
| `list` | `() => Promise<`[`Result`](#result)`<`[`InstalledMod[]`](#installedmod)`>>` |  |  | Returns the installed mods, on or off, in name order. A mod stored unreadably is left out. |
| `add` | `(text: string) => Promise<`[`Result`](#result)`<`[`InstalledMod`](#installedmod)`>>` |  |  | Adds a mod from a file's text, turned on, replacing one with the same id. It returns the mod, or the reason it can't be added. |
| `remove` | `(id: string) => Promise<`[`Result`](#result)`<void>>` |  |  | Removes a mod, and does nothing if it isn't installed. |
| `setEnabled` | `(id: string, enabled: boolean) => Promise<`[`Result`](#result)`<void>>` |  |  | Turns a mod on or off, and does nothing if it isn't installed. |
| `packs` | `() => Promise<`[`Result`](#result)`<`[`Pack[]`](#pack)`>>` |  |  | Returns the packs of the mods that are on, in name order, to pass to `loadGame` as `packs`. |

## mods

Function. Explained in [Mods](/docs/reference/mods#mods).

Returns the `Mods` store of a game, kept by a driver. In a browser, an IndexedDB driver keeps mods across reloads
with no server.

```ts shape
import { mods } from '@ifloom/engine'
function mods(gameId: string, driver: SaveDriver): Mods
```

Uses: [`SaveDriver`](#savedriver), [`Mods`](#mods).

## move

Function. Explained in [Effects](/docs/reference/effects#move).

Returns the effect that moves a thing to another holder. It moves all there is unless `by` says otherwise.

Without `from`, a stack moves from `you` and a unique thing moves from wherever it is.

```ts fragment
effects: [move('gift:scarf', 'character:ava')]
```

```ts shape
import { move } from '@ifloom/engine'
function move(ref: string, to: string, options?: { from?: Holder; by?: number }): Effect
```

Uses: [`Holder`](#holder), [`Effect`](#effect).

## need

Function. Explained in [Actions](/docs/reference/actions#need).

Returns a `blocked` entry written the other way round, refused with `reason` unless `when` holds. For example
`need('Not on an empty stomach.', { stat: 'energy', gte: 2 })`.

```ts shape
import { need } from '@ifloom/engine'
function need(reason: Reason, when: Condition): Blocked
```

Uses: [`Reason`](#reason), [`Condition`](#condition), [`Blocked`](#blocked).

## Notice

Type. Explained in [Notices](/docs/reference/notices#notice).

A message the game gives the player outside a scene, such as a quest moving on or the rent falling due. The `notify`
effect raises one, and the `dismiss` command marks it seen.

A UI shows a notice as a badge or a toast.

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
| `id` | `string` |  |  | The notice's id. A notice raised with the id of an earlier one replaces it. |
| `title` | `string` |  |  | The notice's short line, kept as written. |
| `text` | `string` | yes |  | The notice's longer words, kept as written. The view fills their tokens. |
| `image` | `string` | yes |  | The notice's picture, as a path in the game's `art/` folder (`'notes/bins.jpg'`) or a URL. |
| `tag` | `string` | yes |  | The notice's subject, for grouping badges, such as `'messages'` or `'quests'`. |
| `turn` | `number` |  |  | The turn the notice was raised on. |
| `seen` | `boolean` |  |  | The notice's seen mark, true once the player has dismissed it. |

## NoticesView

Type. Explained in [The view](/docs/reference/view#noticesview-and-noticeview).

The notices as the player sees them, in `view.notices`. Only notices the player hasn't dismissed are listed.

```ts shape
import type { NoticesView } from '@ifloom/engine'
type NoticesView = {
  unseen: NoticeView[]
  byTag: Record<string, number>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `unseen` | [`NoticeView[]`](#noticeview) |  |  | The notices the player hasn't dismissed, newest first. |
| `byTag` | `Record<string, number>` |  |  | The number of unseen notices for each tag, for badges. Untagged notices count under `''`. |

## NoticeView

Type. Explained in [The view](/docs/reference/view#noticesview-and-noticeview).

A notice as the player sees it, in `view.notices.unseen`.

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
| `id` | `string` |  |  | The notice's id, which the `dismiss` command takes. |
| `title` | `string` |  |  | The notice's short line, kept as written. |
| `text` | `string` |  |  | The notice's longer words, with their tokens filled in. Empty if it has none. |
| `image` | `string \| null` |  |  | The notice's picture, as a path through `artSrc`. Null if it has none. |
| `tag` | `string \| null` |  |  | The notice's subject, for grouping badges, such as `'messages'`. Null if it has none. |
| `turn` | `number` |  |  | The turn the notice was raised on. |

## notify

Function. Explained in [Effects](/docs/reference/effects#notify).

Returns the state with a notice raised. A notice with the id of an earlier one replaces it, unseen, as the newest.

```ts shape
import { notify, type Notice } from '@ifloom/engine'
function notify(state: GameState, notice: Omit<Notice, 'id' | 'turn' | 'seen'> & { id?: string }): GameState
```

Uses: [`GameState`](#gamestate), [`Notice`](#notice).

## Once

Type. Explained in [Actions](/docs/reference/actions#once).

A limit of once a game or once a turn on a choice, an action or a plugin's entry, such as a cheat. The engine counts
a choice's or an action's uses in `state.chosen`.

```ts shape
import type { Once } from '@ifloom/engine'
type Once = {
  per: 'game' | 'turn'
  reason?: Reason
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `per` | `'game' \| 'turn'` |  |  | The limit's span, `'game'` for once in the whole game or `'turn'` for once a turn. |
| `reason` | [`Reason`](#reason) | yes |  | The reason the player reads once the limit is spent. For a choice or an action, the engine's `done` string ("Already done.") if left out. |

## OpenPanel

Type. Explained in [Panels](/docs/reference/panels#openpanel).

The open panel, a named piece of UI over the story, with the arguments it was opened with. `state.panel` and `view.panel` hold it.

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
| `panel` | `string` |  |  | The panel's name, which the UI renders it by, such as `'shop'`, `'jobs'` or one of the game's own. |
| `with` | [`PluginArgs`](/docs/api/engine-plugin#pluginargs) |  |  | The panel's arguments, such as `{ vendor: 'cafe' }`. Empty if the effect gave none. |
| `scene` | `string` | yes |  | The scene that holds the panel open, for a scene's own `panel`, which stays open as long as the scene does. It's left out for a panel the `panel` effect opened. `closePanel` doesn't close a panel a scene holds open. |

## Pack

Type. Explained in [Content and packs](/docs/reference/content#pack).

Content from outside the game's code, such as a mod, unlocked supporter content or a JSON export. It goes over the
game's content and the packs before it, replacing what they declare by id.

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
| `id` | `string` |  |  | The pack's id, which saves record. A mod's is `mod:<id>`. |
| `schema` | `number` |  |  | The schema the pack was written against. `loadGame` upgrades an older one and refuses a newer one. |
| `plugins` | `Record<string, number>` | yes |  | The version of each plugin's content the pack was written for, by plugin id (`{ shop: 13 }`), numbered as `Plugin.contentVersion` is. That plugin's own steps upgrade an older one as it loads. A plugin left out is read as written for the pack's `schema`, or for the plugin's own version if that is lower. |
| `strings` | `Record<string, string>` | yes |  | The lines that replace the engine's and plugins' strings, by key. |
| `prose` | `Record<string, string>` | yes |  | The prose keys' lines, by key. |
| `words` | `Record<string, string>` | yes |  | The words table, other words for the fields a player reads, by key. A translation is one pack with this table and its own `prose`. Each key names one field, as `translatableFields` lists them (`action.wait.label`, `entity.character:ava.name`, `scene.cafe.counter.text.intro`). `loadGame` lays it over the merged content, a later pack's over an earlier one's, and reports a key that names no field. |
| `variants` | `Record<string,` [`VariantMember[]`](#variantmember)`>` | yes |  | The variants lists' members by list name, in order. Content and packs append to a list. A member is a prose key, or `{ prose: key, weight }` to be drawn more or less often than the rest. |
| `data` | `Record<string, Record<string, readonly` [`PluginEntry[]`](/docs/api/engine-plugin#pluginentry)`>>` | yes |  | The plugins' content, by plugin id and then list, such as `{ quests: { quests: [...] } }`. A pack's entry replaces the one with the same id, as its scenes do. |
| `kinds` | [`KindDef[]`](#kinddef) | yes |  | The pack's kinds. A later pack's kind replaces an earlier one with the same id. |
| `entities` | [`EntityDef[]`](#entitydef) | yes |  | The pack's entities at the start. A later pack's entity replaces an earlier one with the same kind and id. |
| `traits` | [`TraitTable`](#traittable) | yes |  | The pack's traits, by trait id and then entity, over what each entity declares itself, such as `{ 'laundry/washable': { 'clothing:scarf': { temp: 30 } } }`. A later pack's row replaces an earlier one's. |
| `kv` | `Record<string,` [`KvValue`](#kvvalue)`>` | yes |  | The pack's starting kv store, by key. A later pack's value replaces an earlier one's. |
| `resets` | `Record<string,` [`KvValue`](#kvvalue)`>` | yes |  | The pack's keys reset each turn, by key. A later pack's value replaces an earlier one's. |
| `storylines` | [`StorylineDef[]`](#storylinedef) | yes |  | The pack's storylines, merged by id over the content's. |
| `actions` | [`ActionDef[]`](#actiondef) | yes |  | The pack's actions, by id. A later pack's action replaces an earlier one with the same id. |
| `triggers` | [`TriggerDef[]`](#triggerdef) | yes |  | The pack's triggers, merged by id over the content's. |
| `inputs` | [`InputDef[]`](#inputdef) | yes |  | The pack's inputs, merged by id over the content's. |
| `settings` | [`SettingDef[]`](#settingdef) | yes |  | The pack's settings. A later pack's setting replaces an earlier one with the same id. |
| `stats` | [`StatDef[]`](#statdef) | yes |  | The pack's stats. A later pack's stat replaces an earlier one with the same id. |
| `scenes` | [`DataScene[]`](#datascene) | yes |  | The pack's scenes. A later pack's scene replaces an earlier one with the same id. |
| `patches` | [`Patch[]`](#patch) | yes |  | The pack's patches to the choices of scenes declared before it. |
| `introScene` | `string` | yes |  | The scene open on the first frame. A later pack's replaces an earlier one's. |
| `minigames` | [`MinigameDef[]`](#minigamedef) | yes |  | The pack's minigames. A later pack's minigame replaces an earlier one with the same id. |
| `timers` | [`TimerDef[]`](#timerdef) | yes |  | The pack's timers. A later pack's timer replaces an earlier one with the same id. |
| `audio` | `Partial<`[`GameAudio`](#gameaudio)`>` | yes |  | The pack's tracks, channels and defaults, over the content's. A later pack's track or channel replaces an earlier one with the same id, and its `mute`, `sound` and `default` entries win too. |
| `media` | [`GameMedia`](#gamemedia) | yes |  | The pack's pools of pictures and videos. A later pack's pool replaces an earlier one with the same id, files and all. |
| `ui` | [`Ui`](#ui)`<`[`GameUi`](#gameui)`>` | yes |  | The pack's ui hints for the whole game, merged hint by hint. A later pack's hint replaces an earlier one's, and the rest stay. |
| `saveable` | [`Blocked[]`](#blocked) | yes |  | The pack's reasons to refuse saving, added after the content's. An entry with the `id` of an earlier one replaces it. |
| `locks` | [`Lock[]`](/docs/api/engine-plugin#lock) | yes |  | The pack's locks, added after the content's. A lock with the `id` of an earlier one replaces it. |
| `phrases` | [`Phrases`](#phrases) | yes |  | The pack's phrases, words that change with the state, printed in a line as `{{name}}`. Each is a plain string or a list of `{ when?, text }` rows tried in order, and an object is a group. A later pack's phrase replaces an earlier one with the same full name, and a pack can add phrases to a group. |
| `changes` | [`ChangesDef`](#changesdef) | yes |  | The pack's tracked stats, by id, such as `{ stats: ['coins', 'trust'] }`. The engine adds every file's and pack's lists together. |
| `finished` | [`Condition`](#condition) | yes |  | The pack's condition for the game being finished. It replaces the content's, and the runner records the first time it holds in the profile's `core:finished`. |
| `carryOver` | [`CarryOver`](#carryover) | yes |  | The pack's rules for a New Game+. They replace the content's `carryOver` whole. |

## panel

Function. Explained in [Effects](/docs/reference/effects#panel).

Returns a `{ panel }` block, a panel opened at this place in the flow with `args` as its `with`. The flow waits until the player closes it.

```ts shape
import { panel } from '@ifloom/engine'
function panel(name: string, args?: PluginArgs, extras?: BlockExtras): Block
```

Uses: [`PluginArgs`](/docs/api/engine-plugin#pluginargs), [`BlockExtras`](#blockextras), [`Block`](#block).

## parseRef

Function. Explained in [Entities](/docs/reference/entities#parseref).

Returns an entity reference such as `'staff:ana'` split into its kind and id, or undefined when the string isn't one.

```ts shape
import { parseRef } from '@ifloom/engine'
function parseRef(ref: string): { kind: string; id: string } | undefined
```

## Patch

Type. Explained in [Content and packs](/docs/reference/content#patch).

A patch a pack declares in `patches`, a change to one choice of a scene an earlier pack or the content declared.
It adds, drops or replaces the choice.

`addChoice` puts the choice before the choice `before` names, or last when `before` is left out or not found.
`dropChoice` names the choice to drop, and `replaceChoice` takes the place of the choice with its id.

```ts shape
import type { Patch } from '@ifloom/engine'
type Patch = { scene: string; addChoice: DataScene['choices'][number]; before?: string } | { scene: string; dropChoice: string } | { scene: string; replaceChoice: DataScene['choices'][number] }
```

Uses: [`DataScene`](#datascene).

## Phrase

Type. Explained in [Phrases](/docs/reference/phrases#phrase-phraserow-and-phrasewithargs).

A phrase the game declares in `phrases`, words for the middle of a sentence that change with the state. It's a list
of rows tried in order, a plain string, or rows with their arguments.

```ts shape
import type { Phrase } from '@ifloom/engine'
type Phrase = string | PhraseRow[] | PhraseWithArgs
```

Uses: [`PhraseRow`](#phraserow), [`PhraseWithArgs`](#phrasewithargs).

## PhraseRow

Type. Explained in [Phrases](/docs/reference/phrases#phrase-phraserow-and-phrasewithargs).

A row of a phrase, its words shown while `when` holds. A row with no `when` always holds, and the view fills the tokens in its words.

```ts shape
import type { PhraseRow } from '@ifloom/engine'
type PhraseRow = {
  when?: Condition
  text: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `when` | [`Condition`](#condition) | yes |  | The row's condition. The row's words show while it holds, and always when it's left out. |
| `text` | `string` |  |  | The row's words, with tokens the view fills. |

## Phrases

Type. Explained in [Phrases](/docs/reference/phrases#phrases).

The phrases the game declares in `phrases`, by name. Each entry is a phrase or a group of more phrases, nested as
deep as you like.

`{ outfit: { verdict: [...] }, weather: 'grey' }` declares `outfit.verdict` and `weather`.

```ts shape
import type { Phrases } from '@ifloom/engine'
type Phrases = {
  [key: string]: Phrase | Phrases
}
```

## PhraseWithArgs

Type. Explained in [Phrases](/docs/reference/phrases#phrase-phraserow-and-phrasewithargs).

A phrase that takes arguments, with their names in `args` and its rows. A token passes each argument as
`name=value`.

In a row's `when`, a string that is exactly `$<arg>` becomes the value the token passed, as an entity reference
when it names one. In a row's `text`, `$<arg>` becomes that entity's name, or the value as passed.

```ts shape
import type { PhraseWithArgs } from '@ifloom/engine'
type PhraseWithArgs = {
  args: string[]
  rows: PhraseRow[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `args` | `string[]` |  |  | The names of the arguments the phrase takes. |
| `rows` | [`PhraseRow[]`](#phraserow) |  |  | The phrase's rows, tried in order. |

## PictureDef

Type. Explained in [Media](/docs/reference/media#picturedef).

A picture a scene or a location declares in its `picture`, layers with hotspots on them.

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
| `layers` | [`PictureLayer[]`](#picturelayer) |  |  | The picture's layers, bottom first. |
| `hotspots` | [`HotspotDef[]`](#hotspotdef) | yes |  | The picture's hotspots, each a button the UI renders over the picture. |
| `aspect` | `string` | yes |  | The picture's width over height, in CSS form, such as `'16/9'`. The UI's own if left out. |

## PictureLayer

Type. Explained in [Media](/docs/reference/media#picturelayer).

A layer of a picture, a file or a pool's pick, shown while `when` holds. Give `src` or `pool`, not both.

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
| `id` | `string` | yes |  | The layer's id, which a hotspot's `layer` names. |
| `src` | `string` | yes |  | The layer's file, in the game's `art/` folder or a URL. |
| `pool` | `string` | yes |  | The pool in `media.pools` the layer's file is drawn from. The save keeps the pick. |
| `tags` | `string[]` | yes |  | The tags the pool's pick should have, most important first. |
| `when` | [`Condition`](#condition) | yes |  | The layer's condition. The layer shows only while it holds. |
| `video` | `boolean` | yes |  | The layer's video mark, true to show it as a video. A `.mp4` or `.webm` file is a video anyway. |
| `controls` | `boolean` | yes |  | The controls flag, which shows the player's controls, so the video waits to be started instead of playing by itself. |
| `once` | `boolean` | yes |  | The once flag, which plays the video once instead of looping. |
| `sound` | `boolean` | yes |  | The sound flag, which plays the video with sound instead of muted. |
| `poster` | `string` | yes |  | The still shown before the video plays, as a path like any picture's. |

## PictureLayerView

Type. Explained in [Media](/docs/reference/media#picturelayerview).

A picture layer as the player sees it, in a `PictureView`'s `layers`.

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
| `id` | `string \| null` |  |  | The layer's id, or null. |
| `src` | `string` |  |  | The layer's file, through `artSrc`, with a pool's pick resolved. |
| `video` | [`VideoView`](#videoview) | yes |  | The layer's playback settings when it's a video. Left out for a still picture. |

## PictureView

Type. Explained in [Media](/docs/reference/media#pictureview).

A picture as the player sees it, in `view.scene.picture` or a location's `picture`. It lists the layers shown now,
bottom first, and the hotspots on them.

```ts shape
import type { PictureView } from '@ifloom/engine'
type PictureView = {
  aspect: string | null
  layers: PictureLayerView[]
  hotspots: HotspotView[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `aspect` | `string \| null` |  |  | The picture's width over height, such as `'16/9'`. Null when the picture doesn't set it. |
| `layers` | [`PictureLayerView[]`](#picturelayerview) |  |  | The layers whose `when` holds, bottom first. |
| `hotspots` | [`HotspotView[]`](#hotspotview) |  |  | The hotspots whose `when` holds and whose layer shows. |

## Placement

Type. Explained in [Entities](/docs/reference/entities#holder-and-placement).

A thing's placement, one holder for one of it or a count for each holder.

```ts shape
import type { Placement } from '@ifloom/engine'
type Placement = Holder | Partial<Record<Holder, number>>
```

Uses: [`Holder`](#holder).

## PLAYER

Const. Explained in [Entities](/docs/reference/entities#player-and-you).

The holder id of the player, whose things stay theirs whoever they are playing.

```ts shape
import { PLAYER } from '@ifloom/engine'
const PLAYER: 'player'
```

## PlaylistDef

Type. Explained in [Audio](/docs/reference/audio#playlistdef).

A playlist the game declares in `audio.tracks`, background tracks played one after another. Its order is `'loop'` if left out.

```ts shape
import type { PlaylistDef } from '@ifloom/engine'
type PlaylistDef = {
  playlist: (string | { track: string; weight?: number })[]
  order?: 'inOrder' | 'loop' | 'shuffle'
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `playlist` | `(string \| { track: string; weight?: number })[]` |  |  | The playlist's track ids, each on a background channel. In a shuffled playlist a track can carry a weight, `{ track: 'rain', weight: 3 }`, which makes it likely to come earlier. A plain id has weight 1. |
| `order` | `'inOrder' \| 'loop' \| 'shuffle'` | yes |  | The playlist's order. `'inOrder'` plays the list once, `'loop'` plays it over and over, and `'shuffle'` plays it over and over in an order drawn from the save's seed. `'loop'` if left out. With weights, the shuffle draws the first track by weight, then the next from those left, and so on, so a heavier track tends to play sooner. |

## PluginCall

Type. Explained in [Calls by name](/docs/reference/custom#plugincall).

A plugin's or the game's condition, effect or command in the short form, with its full name as the only key. The value
is its arguments as an object, or `true` for none.

`{ 'quests/done': { quest: 'bakery' } }` and `{ 'calendar/weekend': true }` are calls. Any other value, such as a
list, a string or a number, is a problem the content checker reports, and the engine asks the call with no
arguments.

```ts shape
import type { PluginCall } from '@ifloom/engine'
type PluginCall = {
  [key: `${string}/${string}`]: true | PluginArgs
}
```

## pluginQuery

Function. Explained in [Writing a plugin](/docs/reference/plugins#pluginquery).

Returns a plugin's query by full name, ready to ask, or undefined when the game doesn't have it.

As with `context.query`, a name declared in `QueryRegistry` takes its arguments and answers its type. Any other name
takes any arguments, with the answer's type given.

```ts shape
import { pluginQuery, type Game } from '@ifloom/engine'
function pluginQuery<K extends keyof QueryRegistry>(game: Game | undefined, name: K): ((state: GameState, ...args: QueryArgs<K>) => QueryAnswer<K>) | undefined
function pluginQuery<T = unknown>(game: Game | undefined, name: string): ((state: GameState, args?: PluginArgs) => T) | undefined
```

Uses: [`QueryRegistry`](#queryregistry), [`Game`](#game), [`GameState`](#gamestate), [`QueryArgs`](/docs/api/engine-plugin#queryargs), [`QueryAnswer`](/docs/api/engine-plugin#queryanswer), [`PluginArgs`](/docs/api/engine-plugin#pluginargs).

## point

Function. Explained in [Effects](/docs/reference/effects#point).

Returns a point, a place in the flow a choice's `jump(id)` goes to, anywhere in a scene's body, a section or a choice's `then`.

```ts shape
import { point } from '@ifloom/engine'
function point(id: string): Block
```

Uses: [`Block`](#block).

## PoolFile

Type. Explained in [Media](/docs/reference/media#poolfile).

A file in a pool in `media.pools`, with its path, its tags and its weight against the other files that fit. The weight is 1 if left out.

```ts shape
import type { PoolFile } from '@ifloom/engine'
type PoolFile = {
  src: string
  tags?: string[]
  weight?: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `src` | `string` |  |  | The file's path, in the game's `art/` folder or a URL. |
| `tags` | `string[]` | yes |  | The file's tags, which a request's tags match. |
| `weight` | `number` | yes |  | The file's weight in a draw, against the other files that fit. 1 if left out. |

## Price

Type. Explained in [The view](/docs/reference/view#price).

The cost of a choice or action, shown on its button before the player presses it. It lists costs only, since a payout
printed on a choice tells the player which one is right.

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
| `stats` | `{ id: string; amount: number; text: string }[]` | yes |  | The stats the price spends, in the order the button lists them, each with its amount and its words in `text`. |
| `notes` | `string[]` | yes |  | The plugins' words for what else it costs, such as "until evening". |
| `text` | `string` |  |  | The whole price as one line for the player, such as `2 coins · until evening`. It joins each stat's `text`, then the notes, with the `priceSeparator` string. |

## Probe

Type. Explained in [Checking content](/docs/reference/checks#probe).

A state the content checker renders every scene against, named for the problems it finds. Make one with `probe`, by playing.

```ts shape
import type { Probe } from '@ifloom/engine'
type Probe = {
  name: string
  state: GameState
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `name` | `string` |  |  | The probe's name, which the problems it finds carry, such as `'evening, after the café'`. |
| `state` | [`GameState`](#gamestate) |  |  | The state to render every scene against. |

## Problem

Type. Explained in [Checking content](/docs/reference/checks#problem-and-describeproblem).

A fault the content checker finds in a game's content, with the pack it came from and the place in it.

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
| `pack` | `string` |  |  | The name or id of the content or pack the problem came from. It is `game` for a hand-built game. |
| `where` | `string` |  |  | The place in the content the problem is, such as `scene cafe.counter` or `finished`. |
| `what` | `string` |  |  | The fault, such as `unknown storyline "tides"`. |

## Profile

Type. Explained in [The profile](/docs/reference/profile#profile-1).

The player's record that outlives a save, such as settings, whether they have finished the game, and plugins' records
like achievements. It is one JSON object of namespaces, kept at `<game id>.profile` in a save driver.

The engine uses two namespaces, `core:settings` (each setting's stored value, by id) and `core:finished` (`{ at }`,
when the game was first finished). A UI uses `ui:` names, such as the React UI's gate, `ui:gate`. A plugin uses its
own bare id, which can't hold a `:`, so the prefixes are reserved.

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
| `get` | `<T = unknown>(namespace: string) => Promise<T \| undefined>` |  |  | Returns the value a namespace holds, or undefined if it holds none. |
| `set` | `(namespace: string, value: unknown) => Promise<void>` |  |  | Stores a value in a namespace. Undefined clears it. |
| `update` | `<T = unknown>(namespace: string, change: (current: T \| undefined) => T \| undefined) =>…` |  |  | Changes a namespace from the value it holds now, with no other write in between, and returns the value it holds afterwards. Return undefined, or the same value, from `change` to leave it. |
| `subscribe` | `(listener: (namespace: string, value: unknown) => void) => () => void` |  |  | Calls a listener with the namespace and new value of every write, and returns a function that stops it. |

## profile

Function. Explained in [The profile](/docs/reference/profile#profile).

Returns the `Profile` of a game, kept by a driver. Reads and writes run one at a time, in order.

It reads only the game's `id`, so a profile can be opened before the game is built, as in
`profile({ id: 'small-town' }, driver)`.

```ts shape
import { profile, type Game } from '@ifloom/engine'
function profile(game: Pick<Game, 'id'>, driver: SaveDriver): Profile
```

Uses: [`Game`](#game), [`SaveDriver`](#savedriver), [`Profile`](#profile).

## proseBeats

Function. Explained in [Prose and markup](/docs/reference/prose#prosebeats).

Returns the prose key's line rendered as beats, the way a scene's body is rendered. Returns null when the game has
no line by that key.

The engine fills its tokens for this save, cuts it into paragraphs and spoken lines, names each speaker from their
entity and puts its inline markup (bold, italics, UI pieces) in `spans`. A UI calls it to show a line away from
the scene, such as in a dialog an inline piece opens.

```ts shape
import { proseBeats, type Game } from '@ifloom/engine'
function proseBeats(state: GameState, game: Game, key: string): SceneBeat[] | null
```

Uses: [`GameState`](#gamestate), [`Game`](#game), [`SceneBeat`](#scenebeat).

## ProseStore

Type. Explained in [Prose and markup](/docs/reference/prose#prosestore).

The store of prose keys and variants lists that scenes read. `loadGame` makes it from the content's `prose`.

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
| `line` | `(key: string, state?:` [`GameState`](#gamestate)`) => string \| undefined` |  |  | The store's function that returns a prose key's line, with its tokens filled for `state`. |
| `variants` | `(name: string) => string[]` |  |  | The store's function that returns a variants list's members by its name, in declaration order. |
| `weight` | `(name: string, key: string) => number` | yes |  | The store's function that returns a member's weight in a variants list. Every member weighs 1 if left out. |
| `keys` | `() => string[]` | yes |  | The store's function that lists every prose key, so the content checker can read all the prose's markup. The checker reads only the keys content names if left out. |

## protagonist

Function. Explained in [Entities](/docs/reference/entities#protagonist-and-resolveholder).

Returns the holder `'you'` stands for now, the protagonist the `you` effect chose or else `'player'`.

```ts shape
import { protagonist } from '@ifloom/engine'
function protagonist(state: GameState): Holder
```

Uses: [`GameState`](#gamestate), [`Holder`](#holder).

## Query

Type. Explained in [Writing a plugin](/docs/reference/plugins#query).

A function that asks a plugin or the game a query by full name. It returns undefined when the game has no such query.

A name declared in `QueryRegistry` takes its declared arguments and returns its declared answer. Any other name
takes any arguments, and you give the answer's type, as in `query<number>('loyalty/stampsLeft')`.

```ts shape
import type { Query } from '@ifloom/engine'
type Query = { <K extends keyof QueryRegistry>(name: K, ...args: QueryArgs<K>): QueryAnswer<K> | undefined; <T = unknown>(name: string, args?: PluginArgs): T | undefined }
```

Uses: [`QueryRegistry`](#queryregistry), [`QueryArgs`](/docs/api/engine-plugin#queryargs), [`QueryAnswer`](/docs/api/engine-plugin#queryanswer), [`PluginArgs`](/docs/api/engine-plugin#pluginargs).

## QueryRegistry

Type. Explained in [Writing a plugin](/docs/reference/plugins#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry).

The registry of queries plugins and the game answer, by full name, each typed as a function from its arguments to
its answer (`'loyalty/stampsLeft': () => number`). `context.query` and `pluginQuery` read it.

It extends `PartnerQueries`, the queries first-party plugins ask each other, so those are typed in every program.

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
| `calendar/now` | `() => { day: number; period: string }` |  |  | Returns the calendar's day, from 0, and its period. |
| `calendar/periods` | `() => string[]` |  |  | Returns the calendar's periods, in order. |
| `calendar/bedtime` | `() => boolean` |  |  | Returns true at a time the player could go to bed. |
| `places/here` | `() => string \| null` |  |  | Returns the id of the location the player is at, or null when they are at none. |
| `places/holder` | `() =>` [`EntityRef`](#entityref) `\| null` |  |  | Returns the entity of the location the player is at, which holds the things put down there, or null when they are at none. |
| `places/known` | `(args: { location: string }) => boolean` |  |  | Returns true when the game has the location. |
| `cast/portrait` | `(args: { character: string }) => string \| undefined` |  |  | Returns a character's face, their person's `portrait`, or undefined for none. |
| `cast/contacts` | `() =>` [`CastContact[]`](/docs/api/engine-plugin#castcontact) |  |  | Returns the characters the player has met who can be called. |
| `cast/sender` | `(args: { from: string }) =>` [`SenderView`](/docs/api/engine-plugin#senderview) |  |  | Returns the `SenderView` of the entity a message or a post is from, with a person's `portrait` as the face. |

## Range

Type. Explained in [Common types](/docs/reference/common#range).

The bounds a condition compares a number with, so `{ gte: 3 }` holds for 3 or more. Each bound is an `Amount`, such
as `{ gte: { stat: 'rent' } }`.

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
| `gte` | [`Amount`](#amount) | yes |  | The range's lower bound, which the number must reach or pass. |
| `gt` | [`Amount`](#amount) | yes |  | The range's lower bound, which the number must pass. |
| `lte` | [`Amount`](#amount) | yes |  | The range's upper bound, which the number must not pass. |
| `lt` | [`Amount`](#amount) | yes |  | The range's upper bound, which the number must stay below. |

## RawPack

Type. Explained in [Writing a plugin](/docs/reference/plugins#rawpack).

A pack as it arrived, in the shape of the schema it records, which may be older than `SCHEMA`.

```ts shape
import type { RawPack } from '@ifloom/engine'
type RawPack = {
  schema: number
}
```

It also takes any other key: `[key: string]: unknown`.

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `schema` | `number` |  |  | The content schema the pack was written for. |

## Reason

Type. Explained in [Actions](/docs/reference/actions#reason).

The words a player reads when something is refused, written in place (`'Closed.'`) or as a strings key
(`{ string: 'shop/closed' }`). Read one with `reasonOf`.

A key lets a game reword a reason once for every place that uses it.

```ts shape
import type { Reason } from '@ifloom/engine'
type Reason = string | { string: string }
```

## reasonOf

Function. Explained in [Strings](/docs/reference/strings#reasonof).

Returns a refusal's words for a `Reason`. A string is returned as written, and `{ string: 'shop/closed' }` is
read with `stringOf`.

```ts shape
import { reasonOf, type Game } from '@ifloom/engine'
function reasonOf(game: Game | undefined, reason: string | { string: string }): string
```

Uses: [`Game`](#game).

## RenderedChoice

Type. Explained in [The view](/docs/reference/view#renderedchoice).

A choice or action ready to render as a button, in `view.scene.choices`, `view.actions` or a plugin's view. A UI sends
its `command` when the player presses it.

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
| `id` | `string` |  |  | The choice's or action's id. |
| `label` | `string` |  |  | The button's label, with tokens filled. |
| `price` | [`Price`](#price) | yes |  | The button's price for this state, with its words in `text`. Left out when it's free. |
| `disabled` | `string` | yes |  | The reason the player can't press the button now, in the player's words. Left out when they can. |
| `tags` | `string[]` | yes |  | The choice's or action's tags, for a UI to style or filter it by. |
| `irreversible` | `string` | yes |  | The warning that the choice or action can't be undone, for a UI to show on its button. |
| `ui` | [`Ui`](#ui)`<`[`ChoiceUi`](#choiceui)`>` | yes |  | The choice's or action's `ui` hints, unchanged from content. Left out with none, and typed by `ChoiceUi`. |
| `warning` | `string` | yes |  | The reason a plugin's guard gives for refusing the button softly, such as running past dawn. The player can press it, but the reducer refuses it, so a UI shows the warning instead. |
| `command` | [`Command`](#command) |  |  | The command a UI sends when the player presses the button, as `runner.apply(choice.command)`. |

## replay

Function. Explained in [The runner](/docs/reference/runner#replay).

Returns the state a `CommandLog` ends in, played back against a game. A log that can't be read, such as one from
a newer engine, gives the reason.

The log's start comes in through `loadState`. The engine's command steps and each plugin's `commandMigrations` carry
its commands forward from the versions the log records, so a log from an older engine, plugin or game still plays.
A command that is refused is skipped, as it was when it was played.

```ts shape
import { replay, type Game } from '@ifloom/engine'
function replay(game: Game, log: CommandLog): Result<GameState>
```

Uses: [`Game`](#game), [`CommandLog`](#commandlog), [`Result`](#result), [`GameState`](#gamestate).

## resolveHolder

Function. Explained in [Entities](/docs/reference/entities#protagonist-and-resolveholder).

Returns the holder a holder id stands for now, so `'you'` becomes the protagonist or the player. Any other id is returned unchanged.

```ts shape
import { resolveHolder } from '@ifloom/engine'
function resolveHolder(state: GameState, holder: string): string
```

Uses: [`GameState`](#gamestate).

## Result

Type. Explained in [Common types](/docs/reference/common#result).

The answer of a call that can fail in a way its caller should expect, such as a save that won't read. A function
that returns a `Result` never throws for those failures.

`ok` tells success from failure. On success `value` holds the answer. On failure `reason` says why, in words a
player can read, and `cause` holds the error behind it when one was thrown (a save driver's, say), for a log.

```ts shape
import type { Result } from '@ifloom/engine'
type Result<T> = { ok: true; value: T; reason?: never; cause?: never } | { ok: false; reason: string; cause?: unknown; value?: never }
```

## Roll

Type. Explained in [Dice rolls](/docs/reference/rolls#roll).

A roll the `roll` effect made, with the face each die showed, the total and the outcome against a target. `view.rolls` lists the last command's.

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
| `key` | `string` |  |  | The kv key the roll stored its total under. |
| `dice` | `string` |  |  | The dice thrown, in notation without the added number, such as `'2d6'`. |
| `faces` | `number[]` |  |  | The face each die showed, in order. |
| `plus` | `number` |  |  | The number added to the faces, the notation's own `+1` and the effect's `plus` together. 0 when nothing was added. |
| `total` | `number` |  |  | The roll's total, the faces added up plus `plus`. |
| `against` | `number` | yes |  | The target the total had to reach. Left out when the effect gave none. |
| `passed` | `boolean` | yes |  | The roll's outcome, true when the total reached `against`. Left out when there's no target. |
| `critical` | `'max' \| 'min'` | yes |  | The roll's critical mark, `'max'` when every die showed its highest face and `'min'` when every die showed 1. |

## RollsState

Type. Explained in [Dice rolls](/docs/reference/rolls#rollsstate).

The rolls a save keeps, with the count of rolls made, the last command's rolls and the latest roll under each key.

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
| `made` | `number` |  |  | The number of rolls this save has made. It's part of each new roll's seed. |
| `last` | [`Roll[]`](#roll) |  |  | The rolls the last command made, in order. |
| `latest` | `Record<string,` [`Roll`](#roll)`>` |  |  | The latest roll under each key, which the `roll` condition reads. |

## Runner

Type. Explained in [The runner](/docs/reference/runner#runner).

The object a UI drives a game through, returned by `createRunner` or by `browserRunner` from `@ifloom/browser`. A call
that can fail in a way a UI should expect answers with a `Result` and never throws.

A refused command, an empty slot and a setting with no profile to keep it are such failures.

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
| `game` | [`Game`](#game) |  |  | The game this runner plays. |
| `state` | [`GameState`](#gamestate) |  |  | The state in play. |
| `view` | `() =>` [`View`](#view) |  |  | Returns the view of the state in play. It returns the same object for the same state, so a UI, the audio player and the backlog can all read it. Each plugin's view reads that plugin's profile namespace. When a namespace changes, the runner builds that plugin's view again into a new view object and tells listeners, though the state is the same. |
| `apply` | `(ref:` [`CommandRef`](#commandref)`) =>` [`Result`](#result)`<`[`GameState`](#gamestate)`>` |  |  | Runs a command and returns the next state. A refused command leaves the state as it was and returns the reason. The runner logs a `tick` like any command, but undo steps over it, it adds nothing to the backlog, and it autosaves only when it changes the scene or the turn. A `newGame`, sent on its own or by a choice, starts a new game as `newGame()` does, with the profile's play settings as last read. |
| `undo` | `() => boolean` |  |  | Steps back one command. Returns false when there is nothing to undo. |
| `redo` | `() => boolean` |  |  | Steps forward one command after an undo. Returns false when there is nothing to redo. |
| `log` | `() =>` [`CommandLog`](#commandlog) |  |  | Returns the `CommandLog` of this game, its start state and every command since, for `replay`. |
| `played` | `() => number` |  |  | Returns the time played, in milliseconds. It counts on from the time a loaded save recorded. |
| `saves` | [`Saves`](#saves) `\| undefined` |  |  | The save store this runner writes to, for a menu that reads, exports or imports saves. It is undefined without `saves`. Its writes and removals show in the snapshot's `saves`. Like the store, it never rejects. When the driver fails, each call answers why and tells `onSaveError`. |
| `offers` | `{ undo: boolean; backlog: boolean }` |  |  | The features a menu should offer, `undo` true when history is on and `backlog` true when the backlog is on. |
| `save` | `(slot: string, name?: string \| undefined) => Promise<`[`Result`](#result)`<`[`SaveMeta`](#savemeta)`>>` |  |  | Saves the state in play to a slot and returns the save's `SaveMeta`. It fails with the reason when there are no `saves`, the game's `saveable` refuses saving now, or the driver fails. `view().saving` says beforehand whether a save would be refused. |
| `restore` | `(loaded:` [`LoadedSave`](#loadedsave)`) => void` |  |  | Puts a save in play that did not come from a slot, such as one the player imported from a file (`saves.importText`). It starts a fresh history, backlog and log, as `load` does. |
| `load` | `(slot: string) => Promise<`[`Result`](#result)`<`[`LoadedSave`](#loadedsave)`>>` |  |  | Loads a slot into play and returns the save. The runner starts a fresh history, backlog and log from it, and the time played it recorded. It fails with the reason when there are no `saves`, the slot is empty, this game can't read the save, or the driver fails. A driver's failure is told to `onSaveError` too. |
| `settled` | `() => Promise<void>` |  |  | Returns a promise that settles once every autosave and profile write so far is written. It also waits for the first listing of the saves and the first read of the profile. |
| `profile` | [`Profile`](#profile) `\| undefined` |  |  | The profile this runner writes settings and `finished` to, which a UI can use for namespaces of its own. It is undefined without `profile`. It never rejects. A read the driver fails answers undefined, and a write it fails is dropped, each told to `onSaveError`. |
| `setSetting` | `(id: string, to:` [`KvValue`](#kvvalue)`) =>` [`Result`](#result)`<`[`KvValue`](#kvvalue)`>` |  |  | Changes a setting of either kind and returns the value set. A value its declaration refuses, or a `ui` setting without a profile, fails with the reason. The runner sends a `play` setting as the `setting` command, so it changes the game in play, and the profile keeps it for the next new game. It writes a `ui` setting to the profile only. Listeners are told either way. |
| `newGame` | `(start?:` [`StartOptions`](#startoptions) `\| undefined) => Promise<`[`GameState`](#gamestate)`>` |  |  | Starts a new game in place and returns its first state. The history, backlog, log and time played start fresh. Play settings not given are the player's, from the profile, or from the game in play without one. The seed is random unless given. For New Game+, pass `carry: runner.state`. |
| `snapshot` | `() =>` [`RunnerSnapshot`](#runnersnapshot) |  |  | Returns the `RunnerSnapshot`, one value with all a UI renders. The same object comes back until any part of it changes. |
| `subscribe` | `(listener: (snapshot:` [`RunnerSnapshot`](#runnersnapshot)`) => void) => () => void` |  |  | Calls a listener with each new snapshot and returns a function that stops it. A new snapshot comes with a change of state, of a setting, of the profile a view reads, of the saves, or of a helper's report. |
| `setHelper` | `<K extends string>(id: K, value: (K extends 'unlocks' ?` [`HelperRegistry`](#helperregistry)`[K] : unknown) \|…` |  |  | Sets a helper's report under its id in the snapshot's `helpers`, and tells listeners when it changes. Undefined removes the report. `startUnlocks` reports this way whether it is checking a code. |

## RunnerOptions

Type. Explained in [The runner](/docs/reference/runner#runneroptions).

Settings for `createRunner`. Undo, the backlog, saving, autosave and the profile are each off when left out.

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
| `saves` | [`Saves`](#saves) | yes |  | The save store that `save`, `load` and autosave write to. Without it, `save` and `load` refuse and autosave does nothing. |
| `history` | [`HistoryOptions`](#historyoptions) `\| boolean` | yes |  | The undo and redo settings, `true` for 50 steps back or a `HistoryOptions`. Undo is off if left out. |
| `backlog` | [`BacklogOptions`](#backlogoptions) `\| boolean` | yes |  | The backlog settings, `true` for 200 entries or a `BacklogOptions`. The backlog is off if left out. |
| `autosave` | [`AutosaveOptions`](#autosaveoptions) | yes |  | The autosave policy, which writes a slot of its own (`'auto'`) as the game goes on. It needs `saves`, and autosave is off if left out. |
| `now` | `() => number` | yes |  | The clock that times play, in milliseconds. `Date.now` if left out, and tests pass their own. |
| `onSaveError` | `(error: unknown) => void` | yes |  | The function the runner tells each error a save driver or the profile throws. Without it, the runner drops the error. It hears about an autosave, `save`, `load`, any call through `runner.saves` or `runner.profile`, the first listing of the saves and a profile write. The writes queued after a failed one still run. |
| `profile` | [`Profile`](#profile) | yes |  | The profile that keeps what outlives a save, such as settings, `finished` and plugins' namespaces. Without one, the runner writes nothing there and refuses to change a `ui` setting. |

## RunnerSnapshot

Type. Explained in [The runner](/docs/reference/runner#runnersnapshot).

One value with all a UI renders from the runner, including the view, the settings, the backlog and the saves. It's a
new object whenever a part changes, and the same object until then.

`runner.snapshot()` returns it, and `runner.subscribe` passes each new one to its listeners. A UI that keeps it whole
(Vue's `shallowRef`, React's `useSyncExternalStore`, a Svelte store) renders again exactly when something changed.

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
| `state` | [`GameState`](#gamestate) |  |  | The state in play, the same as `runner.state`. |
| `view` | [`View`](#view) |  |  | The view of the state in play, the same as `runner.view()`. |
| `settings` | `Readonly<Record<string,` [`KvValue`](#kvvalue)`>>` |  |  | The value of each setting the game declares, by setting id. A stored value that no longer fits its setting reads as the default. A `play` setting's value comes from the game in play. A `ui` setting's value comes from the profile, or is its default without a profile or until the profile has been read (`settled`). |
| `backlog` | `readonly` [`BacklogEntry[]`](#backlogentry) |  |  | The backlog's entries, oldest first. It is empty unless the backlog is on. |
| `canUndo` | `boolean` |  |  | True when `undo` has a step to go back to. |
| `canRedo` | `boolean` |  |  | True when `redo` has a step to go forward to. |
| `saves` | `readonly` [`SaveListing[]`](#savelisting) |  |  | The saves in the runner's `saves`, newest first, then any that can't be read. It is empty without `saves`. The runner lists them once when it starts (`settled` waits for it). It keeps the list up to date as it saves and as `runner.saves` writes and removes. |
| `helpers` | [`HelpersIn`](#helpersin) |  |  | The reports of the helpers started beside the runner, by helper id, such as `unlocks`. A helper sets its report with `setHelper`. |
| `pressed` | [`RenderedChoice`](#renderedchoice) `\| null` |  |  | The choice or action that led to the screen on show, as it was offered. A UI reads its `ui` hints to play the transition it asks for. The runner sets it when a command it runs changes the screen (`view.scene.key`), from the choices, inline actions and actions of the view the command was sent from, and keeps it while the screen stays. It is null after a tick, a command no choice or action offered, an undo, a redo, a load or a new game. |
| `fresh` | `boolean` |  |  | True when the state on show came from a command the runner just ran, and false after an undo, a redo, a load or a new game. A UI animates what the player just did, such as the dice of `view.rolls`, only while it's true. |

## RunningTimer

Type. Explained in [Timers](/docs/reference/timers#runningtimer).

A running timer a save keeps, with the milliseconds left and its whole length. Its effects are read from content when it runs out.

```ts shape
import type { RunningTimer } from '@ifloom/engine'
type RunningTimer = {
  left: number
  total: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `left` | `number` |  |  | The milliseconds the timer has left. At 0 it runs out on the next tick. |
| `total` | `number` |  |  | The timer's whole length in milliseconds, the length it started with, raised when time added goes past it. |

## SAVE_VERSION

Const. Explained in [Saves](/docs/reference/saves#save_version).

The save format's version. Only a change to the shape of a field saves already have bumps it, with a step in
`STEPS` that reshapes older saves.

An added field doesn't bump it. The field declares a load default in `FIELDS` or in its feature's `state`, and an
older save gets that default when it loads.

```ts shape
import { SAVE_VERSION } from '@ifloom/engine'
const SAVE_VERSION: 24
```

## SaveDriver

Type. Explained in [Saves](/docs/reference/saves#savedriver).

A store of text by key that the save store and the profile write to. Every driver is asynchronous, even over
synchronous storage, so a game can swap one for another.

The save store talks to a driver and nothing else, so a game chooses where its saves are kept. `@ifloom/browser` has
drivers for localStorage and IndexedDB, `memoryDriver` keeps them in memory, and a game can write its own, such as a
desktop wrapper's file system or a sync service.

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
| `name` | `string` |  |  | The driver's name, such as "localStorage" or "indexedDB", for diagnostics and the debug panel. |
| `get` | `(key: string) => Promise<string \| null>` |  |  | Returns the text stored under a key, or null if there's none. |
| `set` | `(key: string, value: string) => Promise<void>` |  |  | Stores text under a key, replacing what was there. |
| `remove` | `(key: string) => Promise<void>` |  |  | Deletes a key, and does nothing if it isn't there. |
| `keys` | `(prefix: string) => Promise<string[]>` |  |  | Returns every key that starts with a prefix. |

## SaveExtra

Type. Explained in [Saves](/docs/reference/saves#saveextra).

Settings for `Saves.write` besides the state.

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
| `name` | `string` | yes |  | The player's name for the save. The plugins' `when` words, else the turn, if left out. |
| `played` | `number` | yes |  | The time played, in milliseconds. 0 if left out. |
| `savedAt` | `number` | yes |  | The time the save was written, in epoch milliseconds. Now if left out. |

## SaveFile

Type. Explained in [Saves](/docs/reference/saves#savefile).

A save as a driver stores it, the state with its `SaveMeta`. `ifloom` is this envelope's format, 1, apart from
the state's own `version` (`SAVE_VERSION`), which `loadState` carries forward.

```ts shape
import type { SaveFile } from '@ifloom/engine'
type SaveFile = {
  ifloom: 1
  meta: SaveMeta
  state: GameState
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `ifloom` | `1` |  |  | The envelope's format, 1. |
| `meta` | [`SaveMeta`](#savemeta) |  |  | The save's `SaveMeta`. |
| `state` | [`GameState`](#gamestate) |  |  | The saved state, in the shape of the version that wrote it. |

## SaveListing

Type. Explained in [Saves](/docs/reference/saves#savelisting).

One entry of a game's saves from `list()`, a `SaveMeta` or a `BrokenSave`. Tell them apart with `'broken' in entry`.

```ts shape
import type { SaveListing } from '@ifloom/engine'
type SaveListing = SaveMeta | BrokenSave
```

Uses: [`SaveMeta`](#savemeta), [`BrokenSave`](#brokensave).

## SaveMeta

Type. Explained in [Saves](/docs/reference/saves#savemeta).

The facts a save records about itself, for a load page. `list()` and `write` return it.

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
| `game` | `string` |  |  | The id of the game the save belongs to. Reading or importing another game's save is refused. |
| `slot` | `string` |  |  | The save's slot, such as `'1'`, `'auto'` or a name of the game's own. |
| `name` | `string` |  |  | The save's name, the player's, else the plugins' `when` words, else the turn. |
| `savedAt` | `number` |  |  | The time the save was written, in epoch milliseconds. |
| `played` | `number` |  |  | The time played when the save was written, in milliseconds, as the runner counted it. |
| `turn` | `number` |  |  | The number of turns that had passed when the save was written. |
| `when` | `string \| null` |  |  | The time and place in the game in the plugins' words, such as "Day 3 · Wednesday morning · The café", or null when no plugin gives one. |
| `playerName` | `string \| null` |  |  | The player's name for the save's game, such as the name the player typed, or null. It comes from the first `saveName` that answers, the game's `rules.saveName` first, then each plugin's. |
| `packs` | `string[]` |  |  | The ids of the packs the game was loaded with. A mod among them that is missing on load is reported in `missingPacks`. |
| `plugins` | `Record<string, number>` |  |  | The version of each plugin the game was built with, by plugin id. |
| `gameVersion` | `number` |  |  | The game's own version (`game.version`) the save was made with. 1 for a game that declares none. |

## Saves

Type. Explained in [Writing a plugin](/docs/reference/plugins#saves).

One game's save store, returned by `saves`. No call rejects, and a driver's failure answers with a reason a player can
read and the driver's error as its `cause`.

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
| `driver` | [`SaveDriver`](#savedriver) |  |  | The driver that keeps the saves. |
| `write` | `(slot: string, state:` [`GameState`](#gamestate)`, extra?:` [`SaveExtra`](#saveextra) `\| undefined) => Promise<`[`Result`](#result)`<…` |  |  | Writes a state to a slot and returns the save's `SaveMeta`. It fails with the `notSaved` string if the driver fails. |
| `read` | `(slot: string) => Promise<`[`Result`](#result)`<`[`LoadedSave`](#loadedsave) `\| null>>` |  |  | Returns the save in a slot, carried forward and checked against this game, or null when the slot is empty. A failure gives the reason the save can't be read, or the `notLoaded` string if the driver fails. |
| `list` | `() => Promise<`[`Result`](#result)`<`[`SaveListing[]`](#savelisting)`>>` |  |  | Returns the game's saves, newest first, then any that can't be read as `BrokenSave`s, by slot. It fails with the `notListed` string if the driver fails. Tell the two apart with `'broken' in entry`. A broken save can still be removed. |
| `remove` | `(slot: string) => Promise<`[`Result`](#result)`<void>>` |  |  | Deletes the save in a slot, and does nothing if the slot is empty. It fails with the `notRemoved` string if the driver fails. |
| `exportSlot` | `(slot: string) => Promise<`[`Result`](#result)`<string \| null>>` |  |  | Returns a slot's save as text a player can keep as a file, or null if the slot is empty. It fails with the `notExported` string if the driver fails. |
| `importText` | `(text: string) =>` [`Result`](#result)`<`[`LoadedSave`](#loadedsave)`>` |  |  | Returns the save in text from a file the player chose, checked against this game. A text that isn't this game's save fails with the reason. |

## saves

Function. Explained in [Saves](/docs/reference/saves#saves).

Returns the `Saves` store of a game, kept by a driver. The game chooses its slots' names, such as `'auto'`,
`'quick'` or `'1'`.

Each key starts with the game's id, because every game opened from disk shares one storage origin in Chromium, and
itch.io serves many games from shared domains. The format's version is inside the save (`loadState`), never in the
key, so a new version never orphans an old save.

```ts shape
import { saves, type Game } from '@ifloom/engine'
function saves(game: Game, driver: SaveDriver): Saves
```

Uses: [`Game`](#game), [`SaveDriver`](#savedriver), [`Saves`](#saves).

## SavingView

Type. Explained in [The view](/docs/reference/view#savingview).

The player's leave to save as the player sees it, in `view.saving`. A UI greys out or hides its Save button from it.

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
| `allowed` | `boolean` |  |  | The leave to save, false while one of the game's `saveable` entries holds. |
| `reason` | `string \| null` |  |  | The reason of the first `saveable` entry that holds. Null when saving is allowed. |
| `visible` | `boolean` |  |  | The Save button's visibility, false while the entry that holds has `hide`. A UI then leaves Save off the screen rather than greying it out. |

## say

Function. Explained in [Flowing scenes](/docs/reference/flows#say).

Returns a `{ say }` block, a spoken line under the id of who says it. Its beat is a `say` beat with that speaker and
their name.

`who` names the speaker as `@id: "…"` does in prose, an entity by reference or bare id (`'ava'` is `character:ava`),
`'you'` for whoever the player is playing, or `'player'`.

```ts shape
import { say } from '@ifloom/engine'
function say(who: string, words: string, extras?: BlockExtras & { id?: string; voice?: string }): Block
```

Uses: [`BlockExtras`](#blockextras), [`Block`](#block).

## SceneBeat

Type. Explained in [Prose and markup](/docs/reference/prose#scenebeat).

One piece of a rendered body, in `view.scene.beats`, told apart by its `type`. Any beat can carry `ui`, the ui hints
of the block it starts.

```ts shape
import type { SceneBeat } from '@ifloom/engine'
type SceneBeat = ({ type: 'text'; text: string; spans?: InlineSpan[] } | { type: 'say'; who: 'character' | 'player'; speaker?: EntityRef; name?: string; text: string; voice?: string; spans?: InlineSpan[] } | { type: 'image'; src: string; alt?: string; size: BeatSize } | { type: 'video'; src: string; poster?: string; alt?: string; size: BeatSize; autoplay: boolean; loop: boolean; muted: boolean; controls: boolean } | { type: 'sound'; track: string } | { type: 'chose'; label: string }) & { ui?: Ui<BlockUi>; section?: Ui<BlockUi> }
```

Uses: [`InlineSpan`](#inlinespan), [`EntityRef`](#entityref), [`BeatSize`](#beatsize), [`Ui`](#ui), [`BlockUi`](#blockui).

## SceneMedia

Type. Explained in [Scenes](/docs/reference/scenes#scenemedia).

A picture or a video in a scene's body, written as a `{ media }` block. Give a file as `src`, or have a pool draw
one with `pool` and `tags`.

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
| `src` | `string` | yes |  | The media's file, a path in the game's `art/` folder or a URL. |
| `pool` | `string` | yes |  | The pool in `game.media.pools` that draws the file. |
| `tags` | `string[]` | yes |  | The tags the pool's pick should have, most important first. See `poolCandidates`. |
| `alt` | `string` | yes |  | The media's alternative text, for a screen reader. |
| `size` | `'inline' \| 'wide'` | yes |  | The media's size, `'inline'` or `'wide'`. `'inline'` if left out. |
| `at` | `'lead' \| 'end'` | yes |  | The media's position. `lead` opens the scene, as an establishing picture does, and `end` follows the body. A block with none sits where it is in the body, in order with the prose. |
| `video` | `boolean` | yes |  | The video mark, which renders the file as a video. A `.mp4` or `.webm` file is a video without it. |
| `controls` | `boolean` | yes |  | The controls flag, which shows the player's controls, so the video waits to be started instead of playing by itself. |
| `once` | `boolean` | yes |  | The once flag, which plays the video once instead of looping. |
| `sound` | `boolean` | yes |  | The sound flag, which plays the video with sound instead of muted. |
| `poster` | `string` | yes |  | The still shown before the video plays, as a path like any picture's. |

## sceneOf

Function. Explained in [The game](/docs/reference/game#sceneof).

Returns the scene with this id from the game's content, or undefined when there is none.

```ts shape
import { sceneOf, type Game } from '@ifloom/engine'
function sceneOf(game: Game, id: string): DataScene | undefined
```

Uses: [`Game`](#game), [`DataScene`](#datascene).

## ScenePanel

Type. Explained in [Panels](/docs/reference/panels#scenepanel).

A panel a scene declares in its `panel`, held open for as long as the scene is open. `with` is empty if left out.

```ts shape
import type { ScenePanel } from '@ifloom/engine'
type ScenePanel = {
  panel: string
  with?: PluginArgs
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `panel` | `string` |  |  | The panel's name, which the UI renders it by. |
| `with` | [`PluginArgs`](/docs/api/engine-plugin#pluginargs) | yes |  | The panel's arguments, such as `{ vendor: 'cafe' }`. Empty if left out. |

## SceneUi

Type. Explained in [Presentation hints](/docs/reference/ui-hints#sceneui-choiceui-blockui-entityui-statui-and-gameui).

The ui hints a scene or a room scene takes in its `ui`, for the UI that renders it. The engine declares none, and
a UI package augments this interface with its own.

```ts shape
import type { SceneUi } from '@ifloom/engine'
type SceneUi = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## SCHEMA

Const. Explained in [Content and packs](/docs/reference/content#schema).

The content schema this engine reads. `PACK_STEPS` upgrade a pack of an older schema, and a newer one is refused.

```ts shape
import { SCHEMA } from '@ifloom/engine'
const SCHEMA: 30
```

## Screen

Type. Explained in [The view](/docs/reference/view#screen-1).

One state rendered once by `screen`, with what each choice would apply, the pool picks and the audio tracks.

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
| `scene` | [`ScreenScene`](#screenscene) |  |  | The open scene as rendered, or the room when none is open. While a minigame is played, the minigame's key, title and words replace theirs, without their `ui`. `view.minigame` holds the running minigame's state. |
| `choices` | [`ScreenChoice[]`](#screenchoice) |  |  | The open scene's visible choices, each with its effects, availability and price. It is empty for the room and while a minigame is played. |
| `actions` | [`ScreenChoice[]`](#screenchoice) |  |  | The room's actions while no scene is open and no lock stops everything. The `actions` providers' come first (the game's rules', then each plugin's), then the game's own `actions`. |
| `picture` | [`PictureView`](#pictureview) `\| null` |  |  | The open scene's layered picture and its hotspots, or null. |
| `plugins` | `Record<string, unknown>` |  |  | The plugins' views, by plugin id. |
| `picks` | `Record<string, string>` |  |  | The pool picks this screen made that the save doesn't hold yet, by pick key. The reducer records them. |
| `audio` | [`AudioView`](#audioview) `& { tracks: Record<string, string \| null> }` |  |  | The audio that should be playing, as in `view.audio`, with `tracks` added. `tracks` gives the track each background channel resolved to (null for silence), and the reducer records them as started. |

## screen

Function. Explained in [The view](/docs/reference/view#screen).

Returns the `Screen` for a state, the open scene or the room rendered once. Use it when you need what `view`
leaves out, such as each choice's effects.

The screen holds the choices, actions, picture, plugins' views, pool picks and audio of that one render.

Every choice's availability and effects come from that one render of the scene. `view` formats a screen for a UI.

```ts shape
import { screen, type Game } from '@ifloom/engine'
function screen(state: GameState, game: Game, options?: ViewOptions): Screen
```

Uses: [`GameState`](#gamestate), [`Game`](#game), [`ViewOptions`](#viewoptions), [`Screen`](#screen).

## ScreenChoice

Type. Explained in [The view](/docs/reference/view#screenchoice).

A choice or action on a `Screen`, with the effects pressing its button would apply. The view leaves the effects out.

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
| `id` | `string` |  |  | The choice's or action's id. |
| `label` | `string` |  |  | The button's label, with tokens filled. |
| `price` | [`Price`](#price) | yes |  | The button's price for this state, with its words in `text`. Left out when it's free. |
| `disabled` | `string` | yes |  | The reason the player can't press the button now, in the player's words. Left out when they can. |
| `tags` | `string[]` | yes |  | The choice's or action's tags, for a UI to style or filter it by. |
| `irreversible` | `string` | yes |  | The warning that the choice or action can't be undone, for a UI to show on its button. |
| `ui` | [`Ui`](#ui)`<`[`ChoiceUi`](#choiceui)`>` | yes |  | The choice's or action's `ui` hints, unchanged from content. Left out with none, and typed by `ChoiceUi`. |
| `warning` | `string` | yes |  | The reason a plugin's guard gives for refusing the button softly, such as running past dawn. The player can press it, but the reducer refuses it, so a UI shows the warning instead. |
| `command` | [`Command`](#command) |  |  | The command a UI sends when the player presses the button, as `runner.apply(choice.command)`. |
| `effects` | [`Effect[]`](#effect) |  |  | The effects pressing the button would apply, such as a choice's effects or an action's cost and effects. |

## ScreenScene

Type. Explained in [The view](/docs/reference/view#screenscene).

The scene on a `Screen`, or the room when none is open, without its choices and picture.

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
| `key` | `string` |  |  | The screen's key, which changes when the screen does and only then. It is `scene:<id>` while a scene is open, `minigame:<id>` while a minigame is played, `room:<id>` for a plugin's room scene and `room` without one. |
| `title` | `string` |  |  | The screen's title, the scene's or the room's. |
| `body` | `string` |  |  | The body as markup text. A UI renders `beats`, which are this text parsed. |
| `beats` | [`SceneBeat[]`](#scenebeat) |  |  | The body parsed into beats, such as paragraphs, speech, pictures and past choices, ready to render. |
| `fresh` | `number` |  |  | The index of the first beat the flow's last step added, from its `chose` beat on, so a UI can animate only those. It's 0 for the room and before the visit's first step. |
| `tags` | `string[]` |  |  | The scene's tags, for a UI to style it by. |
| `speaker` | [`SpeakerView`](#speakerview) `\| null` |  |  | The scene's `speaker`, read from their entity. Null without one, or when it names no entity. |
| `image` | `string \| null` |  |  | The speaker's picture to show with the scene, or null without one. |
| `ui` | [`Ui`](#ui)`<`[`SceneUi`](#sceneui)`>` | yes |  | The scene's `ui` hints, or the room scene's when no scene is open, unchanged from content. Left out with none, and typed by `SceneUi`. |

## Select

Type. Explained in [Entities](/docs/reference/entities#select).

A selection of entities that a `count` or an `each` reads. Every entity in the game when it sets nothing.

It narrows to those `of` a kind, those a holder holds (`at`), those with a tag or a trait, and those `where` holds
for, with `'$'` as each one.

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
| `of` | `string` | yes |  | The kind the entities are of. |
| `at` | `string` | yes |  | The holder whose things are selected, `'you'`, `'player'` or a unique entity. |
| `tag` | `string` | yes |  | The tag the entities have, their kind's or their own. |
| `trait` | `string` | yes |  | The id of a trait the entities carry. |
| `where` | [`Condition`](#condition) | yes |  | The condition each entity must meet, with `'$'` as that entity. |

## SettingDef

Type. Explained in [Settings](/docs/reference/settings#settingdef).

A setting the game declares in `settings`, which the player changes on a settings page. A `play` setting is saved
with the state, and a `ui` setting is kept only in the profile.

Its `type` sets the rest of its fields. A `toggle` has a true/false `default`. A `choice` has `options`, each a
`value` with its `label`, and one value as its `default`. A `range` has `min`, `max`, an optional `step` and a
number as its `default`.

```ts shape
import type { SettingDef } from '@ifloom/engine'
type SettingDef = { id: string; label: string; affects?: 'play' | 'ui' } & ({ type: 'toggle'; default: boolean } | { type: 'choice'; options: { value: string; label: string }[]; default: string } | { type: 'range'; min: number; max: number; step?: number; default: number })
```

## SettingView

Type. Explained in [The view](/docs/reference/view#settingview).

A setting as the player sees it on a settings page, in `view.settings`.

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
| `id` | `string` |  |  | The setting's id. |
| `label` | `string` |  |  | The setting's label. |
| `type` | `'toggle' \| 'choice' \| 'range'` |  |  | The setting's type, a `toggle` (on or off), a `choice` among `options`, or a `range` from `min` to `max`. |
| `affects` | `'play' \| 'ui'` |  |  | The setting's reach. A `play` setting is kept in the save and changes the game, and a `ui` setting is kept in the profile and changes only how the game is shown. |
| `options` | `{ value: string; label: string }[]` | yes |  | The options of a `choice` setting, each a value with its label. |
| `min` | `number` | yes |  | The lowest value of a `range` setting. |
| `max` | `number` | yes |  | The highest value of a `range` setting. |
| `step` | `number` | yes |  | The step of a `range` setting. Left out when the setting gives none, which means 1. |
| `default` | [`KvValue`](#kvvalue) |  |  | The setting's default, its value until the player changes it. |
| `value` | [`KvValue`](#kvvalue) `\| null` |  |  | The value of a `play` setting in this game. Null for a `ui` setting, which the UI reads from the profile. |

## SpeakerView

Type. Explained in [The view](/docs/reference/view#speakerview).

A speaker or sender as the player sees them, in `view.scene.speaker` and in plugins' views.

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
| `id` | `string` |  |  | The speaker's id in the content, a bare id (`'ava'`) or a reference (`'character:ava'`). |
| `ref` | [`EntityRef`](#entityref) |  |  | The speaker's entity. |
| `name` | `string` |  |  | The speaker's name, read from their entity with its tokens filled. |
| `image` | `string \| null` |  |  | The speaker's picture, from their entity through `artSrc`, or null when the entity has none. |
| `ui` | [`Ui`](#ui)`<`[`EntityUi`](#entityui)`>` | yes |  | The speaker's entity's ui hints (see `EntityUi`). Left out when the entity has none. |

## startingState

Function. Explained in [Commands](/docs/reference/commands#startingstate).

Returns the state of a new game, with every field at its start value. With `carry`, the New Game+'s carried values
go over it.

Features then work out the fields that read the whole state, such as the audio the opening screen starts playing.

```ts shape
import { startingState, type Game } from '@ifloom/engine'
function startingState(game: Game, options?: StartOptions): GameState
```

Uses: [`Game`](#game), [`StartOptions`](#startoptions), [`GameState`](#gamestate).

## StartOptions

Type. Explained in [Commands](/docs/reference/commands#startoptions).

Settings for `startingState`. A new game left without them gets a seed hashed from the game's id.

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
| `seed` | `number` | yes |  | The new game's random seed. Hashed from the game's id if left out, so tests draw the same. |
| `kv` | `Record<string,` [`KvValue`](#kvvalue)`>` | yes |  | The kv keys written before the first scene, such as a name from a title page or a difficulty. |
| `settings` | `Record<string, unknown>` | yes |  | The player's stored values for the game's `play` settings, usually the profile's `core:settings`. A missing or invalid value starts at its default, and an undeclared id is ignored. |
| `carry` | [`GameState`](#gamestate) | yes |  | The state a finished game ended on, for a New Game+. The engine copies the stats, kv keys and things the game's `carryOver` lists from it. |

## StatDef

Type. Explained in [Stats](/docs/reference/stats#statdef).

A stat the game declares in `stats`, a number it keeps for the player or for each entity of a kind. The engine
has no stats of its own.

Charisma, money, energy and a reputation are stats.

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
| `id` | `string` |  |  | The stat's id. |
| `of` | `string` | yes |  | The kind of entity the stat is kept on, such as `'staff'` for every member of staff. The player's stat if left out. |
| `label` | `string` |  |  | The stat's label, such as "Charisma" or "Money". |
| `start` | `number` | yes |  | The stat's value in a new game. 0 if left out. |
| `min` | [`Amount`](#amount) | yes |  | The stat's lowest value. 0 if left out, and an `Amount`, so a floor can move with the game (`{ stat: 'debtLimit' }`). |
| `max` | [`Amount`](#amount) | yes |  | The stat's highest value. 100 if left out, and an `Amount`, so a ceiling can move with the game. It can read another stat (`{ stat: 'fitness' }`) or a value by name (`{ value: 'game/energyMax' }`, with `with` for its arguments). A ceiling that reads the stat itself reads 100. |
| `visible` | [`Condition`](#condition) | yes |  | The stat's condition. The player can see the stat only while it holds, and always if left out. |
| `listed` | `boolean` | yes |  | The stat's listed mark, false to leave it out of `view.stats` for a game that shows it its own way, as a gauge or a purse. True if left out. |
| `spendable` | `boolean` | yes |  | The stat's spendable mark, true for a stat spent on things, such as money, energy or time. A choice's or action's price is made of spendable stats. |
| `lacking` | [`StatWords`](#statwords) | yes |  | The refusal when a cost needs more than the player has, with `{n}` for the amount. Without it the engine says "Not enough" and the label. It's one line (`'Not enough on you.'`, `'Need {n} energy.'`) or one for 1 and one for any other amount, as `format` takes. |
| `format` | [`StatWords`](#statwords) | yes |  | The stat's value written for the player, with `{n}` for the number, such as `'£{n}'` or `'{n} energy'`. The bare number if left out. For words that change with the number, give one for 1 and one for any other, `{ one: '{n} coin', other: '{n} coins' }`. |
| `derive` | [`Formula`](#formula) | yes |  | The formula the stat is worked out from instead of being kept, such as `{ sum: ['strength', 'agility'] }`. A derived stat is read like any stat and never written, and the loader reports a `stat` effect on one. |
| `levels` | [`StatLevels`](#statlevels) | yes |  | The levels the stat passes as it grows. None if left out. |
| `round` | [`StatRound`](#statround) | yes |  | The stat's rounding when it's read, `'floor'`, `'round'` or `'ceil'` to a whole number, or `'none'`. `'none'` if left out. It applies last, after `derive` and any plugin's modifiers, and the value is then held to the range. The kept value underneath is never rounded. |
| `ui` | [`Ui`](#ui)`<`[`StatUi`](#statui)`>` | yes |  | The stat's ui hints, carried to its view as written. |

## StatKey

Type. Explained in [Common types](/docs/reference/common#statkey).

A stat's id. The game declares each stat with a `StatDef`.

```ts shape
import type { StatKey } from '@ifloom/engine'
type StatKey = string
```

## statLevel

Function. Explained in [Stats](/docs/reference/stats#statlevel).

Returns the level a stat with `levels` has reached, with the value the next level starts at and the progress
towards it. Returns undefined for a stat with no levels.

`next` is null at the top level. `progress` runs from 0 at this level's start to 1 at the next one's, and is 1 at
the top.

```ts shape
import { statLevel, type Game } from '@ifloom/engine'
function statLevel(state: GameState, game: Game, id: string, of?: string): { level: number; next: number | null; progress: number } | undefined
```

Uses: [`GameState`](#gamestate), [`Game`](#game).

## StatLevels

Type. Explained in [Stats](/docs/reference/stats#statlevels).

The levels a stat declares in its `levels`, thresholds it passes as it grows. It can raise a notice when the player's stat passes one.

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
| `at` | `number[]` |  |  | The value each level starts at, lowest first. A value below the first is level 0. |
| `notice` | `string` | yes |  | The notice raised, tagged `level`, when a command takes the player's stat up a level, such as `'{label} is now level {level}.'`. The engine fills `{label}` and `{level}`, and raises no notice if left out. |
| `hidden` | `boolean` | yes |  | The levels' hidden mark, true to keep them from the player. The view then gives the stat no `level`, and `{ level }` conditions still read them. Use it for a hidden rating, such as how much a character trusts you. |

## statOf

Function. Explained in [Stats](/docs/reference/stats#statof).

Returns the stat the game declares with this id. Undefined when there's none.

```ts shape
import { statOf, type Game } from '@ifloom/engine'
function statOf(game: Game, id: string): StatDef | undefined
```

Uses: [`Game`](#game), [`StatDef`](#statdef).

## StatRound

Type. Explained in [Stats](/docs/reference/stats#statround).

The rounding a stat declares in its `round`, applied when the stat is read.

```ts shape
import type { StatRound } from '@ifloom/engine'
type StatRound = 'none' | 'floor' | 'round' | 'ceil'
```

## Stats

Type. Explained in [Entities, things and traits](/docs/explanation/entities-and-traits#stats-the-kv-store-and-storylines).

The current values of the stats the save keeps, by stat id.

```ts shape
import type { Stats } from '@ifloom/engine'
type Stats = {
  [key: string]: number
}
```

## StatUi

Type. Explained in [Presentation hints](/docs/reference/ui-hints#sceneui-choiceui-blockui-entityui-statui-and-gameui).

The ui hints a stat takes in its `ui`. The engine declares none, and a UI package augments this interface with its own.

```ts shape
import type { StatUi } from '@ifloom/engine'
type StatUi = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## statValue

Function. Explained in [Stats](/docs/reference/stats#statvalue).

Returns a stat's value, the player's or, with `of`, an entity's (`'staff:ana'`). An entity that isn't there reads 0.

A derived stat is worked out from its formula and held to its range. A kept stat the save doesn't have yet reads as
its `start`.

```ts shape
import { statValue, type Game } from '@ifloom/engine'
function statValue(state: GameState, game: Game, id: string, of?: string): number
```

Uses: [`GameState`](#gamestate), [`Game`](#game).

## StatView

Type. Explained in [The view](/docs/reference/view#statview).

A stat as the player sees it, in `view.stats` and `view.statsById`, with its value, its range, the value written out and its hints.

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
| `key` | [`StatKey`](#statkey) |  |  | The stat's id. |
| `label` | `string` |  |  | The stat's label. |
| `value` | `number` |  |  | The stat's value as play reads it, kept or derived, with the plugins' modifiers, rounded and held to its range. |
| `min` | `number` |  |  | The stat's lowest value now. |
| `max` | `number` |  |  | The stat's highest value now. |
| `text` | `string` |  |  | The stat's value written with its `format`, such as `'12 coins'` or `'80%'`. The bare number with no format. |
| `level` | `{ level: number; next: number \| null; progress: number }` | yes |  | The stat's place in its `levels`, with its level, the value the next level starts at (null at the top) and its progress towards it, from 0 to 1. It's left out for a stat with no levels or hidden ones. |
| `ui` | [`Ui`](#ui)`<`[`StatUi`](#statui)`>` | yes |  | The stat's ui hints, kept as written. Left out if it has none. |

## StatWords

Type. Explained in [Stats](/docs/reference/stats#statwords).

A stat's words for a number, with `{n}` for it. It's one line for every number, or `one` for exactly 1 and `other` for the rest.

```ts shape
import type { StatWords } from '@ifloom/engine'
type StatWords = string | { one: string; other: string }
```

## StoryletFields

Type. Explained in [Storylets](/docs/reference/storylets#storyletfields).

The fields that make a scene a storylet, a scene the `{ scene: { from } }` effect draws at random from a named set.
They name the sets, the scene's weight and when it can be drawn.

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
| `drawnFrom` | `string[]` | yes |  | The sets the scene can be drawn from, by name, such as `['cafe']`. A `{ scene: { from: 'cafe' } }` effect draws one of the scenes that name `'cafe'` here. It's separate from `tags`, which only style the scene. |
| `weight` | `number` | yes |  | The scene's weight in a draw, against the other scenes it could be drawn with. 1 if left out, and it needs `drawnFrom`. |
| `when` | [`Condition`](#condition) | yes |  | The storylet's condition. The scene can be drawn only while it holds, but a `scene` command or effect that names the scene opens it regardless. |

## StorylineDef

Type. Explained in [Storylines](/docs/reference/storylines#storylinedef).

A storyline the game declares in `storylines`, a thread of the story with its own kv keys. A storyline can close
until a later turn.

```ts shape
import type { StorylineDef } from '@ifloom/engine'
type StorylineDef = {
  id: string
  name: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `id` | `string` |  |  | The storyline's id, read as `storyline:<id>` in a kv effect's `of`. |
| `name` | `string` |  |  | The storyline's name, as the player reads it. |

## storylineOpen

Function. Explained in [Storylines](/docs/reference/storylines#storylineopen).

Returns true when the storyline is open. A storyline closed until a turn opens again once that turn comes.

```ts shape
import { storylineOpen } from '@ifloom/engine'
function storylineOpen(state: GameState, id: string): boolean
```

Uses: [`GameState`](#gamestate).

## StorylineState

Type. Explained in [Storylines](/docs/reference/storylines#storylinestate).

The state a save keeps for one storyline. Its definition is read from content.

```ts shape
import type { StorylineState } from '@ifloom/engine'
type StorylineState = {
  closedUntil: number | null
  kv: Record<string, KvValue>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `closedUntil` | `number \| null` |  |  | The storyline's turn to open again, or null while it is open. |
| `kv` | `Record<string,` [`KvValue`](#kvvalue)`>` |  |  | The storyline's own kv keys, read and written with `of: 'storyline:<id>'`. |

## StringKey

Type. Explained in [Strings](/docs/reference/strings#stringkey-and-strings).

A key of the engine's own lines in `STRINGS`.

```ts shape
import type { StringKey } from '@ifloom/engine'
type StringKey = keyof typeof STRINGS
```

## stringOf

Function. Explained in [Strings](/docs/reference/strings#stringof).

Returns the line for a key with each `{name}` token filled from `vars`. Returns the key itself when no table has
it, so a missing line shows.

The engine looks in the game's strings, then the plugin's defaults for a `<plugin>/<name>` key, then its own. A
token with no value in `vars` stays as written.

```ts shape
import { stringOf, type Game } from '@ifloom/engine'
function stringOf(game: Game | undefined, key: StringKey | (string & {}), vars?: Record<string, string | number>): string
```

Uses: [`Game`](#game), [`StringKey`](#stringkey).

## STRINGS

Const. Explained in [Strings](/docs/reference/strings#strings).

The engine's own lines for the player, in English, by key. A game replaces any of them in its content's or a pack's
`strings`, so a translation can ship as a mod.

The engine fills each `{name}` token from the values it has when it shows the line. Plugins declare their own
defaults under their id (`quests/notDoing`), and a game replaces those the same way.

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
| `finishFirst` | `'Finish this first.'` |  |  | The refusal of a command that can't run while a scene or minigame is open. |
| `notSupported` | `'This game does not do that.'` |  |  | The refusal of a command no feature, plugin or rule of the game handles. |
| `noSuchAction` | `'There is no such thing to do.'` |  |  | The refusal of an action or a game command the game doesn't declare. |
| `notEnough` | `'Not enough {stat}.'` |  |  | The refusal of a choice or action the player can't pay for, with `{stat}` the stat's label. |
| `noSuchScene` | `'There is no such scene.'` |  |  | The refusal of entering a scene the game doesn't declare. |
| `nothingToChoose` | `'There is nothing to choose.'` |  |  | The refusal of a choice while no scene is open. |
| `notOnOffer` | `'That is not on offer.'` |  |  | The refusal of a choice or action that isn't offered now. |
| `noSuchThing` | `'There is no such thing.'` |  |  | The refusal of a command that names an entity the game doesn't have. |
| `badArgument` | `'That can’t be done: "{arg}" must be {kind}.'` |  |  | The refusal of a plugin command whose argument `{arg}` isn't a `{kind}`. |
| `noSuchInput` | `'There is no such thing to fill in.'` |  |  | The refusal of the `input` command for an input the game doesn't declare. |
| `notNow` | `'Not now.'` |  |  | The refusal of the `input` command while the input's `when` doesn't hold. |
| `enterSomething` | `'Enter something first.'` |  |  | The refusal of an empty value for a text input. |
| `enterNumber` | `'Enter a number.'` |  |  | The refusal of a value that isn't a number for a number input or a number setting. |
| `tooLong` | `'Keep it to {n} characters.'` |  |  | The refusal of a text value longer than `{n}` characters. |
| `between` | `'Between {min} and {max}.'` |  |  | The refusal of a number outside an input's or a range setting's `{min}` and `{max}`. |
| `atLeast` | `'At least {min}.'` |  |  | The refusal of a number below the input's `{min}`. |
| `atMost` | `'At most {max}.'` |  |  | The refusal of a number above the input's `{max}`. |
| `notAnOption` | `'That is not one of the options.'` |  |  | The refusal of a value that isn't one of an input's or a setting's options. |
| `noMinigame` | `'Nothing is being played.'` |  |  | The refusal of a minigame command while no minigame runs. |
| `noPanel` | `'Nothing is open.'` |  |  | The refusal of `closePanel` while no panel is open. |
| `notLive` | `'That does nothing now.'` |  |  | The refusal of a minigame input that does nothing in the minigame's current state. |
| `noTimer` | `'Nothing is counting down.'` |  |  | The refusal of the `tick` command while no timer or minigame clock runs. |
| `tickLength` | `'A tick is a number of milliseconds above 0.'` |  |  | The refusal of a `tick` whose `ms` isn't a number above 0. |
| `noSuchSetting` | `'There is no such setting.'` |  |  | The refusal of a setting the game doesn't declare. |
| `notAGameSetting` | `'That setting does not change the game.'` |  |  | The refusal of a `ui` setting sent as a command, since only a `play` setting changes the state. |
| `noProfile` | `'This game keeps no settings between plays.'` |  |  | The refusal of a setting change when the runner keeps no profile. |
| `onOrOff` | `'Choose on or off.'` |  |  | The refusal of a value other than true or false for a toggle setting. |
| `inSteps` | `'In steps of {step}.'` |  |  | The refusal of a range setting's value that isn't a whole number of `{step}`s. |
| `lookAround` | `'Look around'` |  |  | The label of the button that leaves a scene the game no longer declares. |
| `priceSeparator` | `' · '` |  |  | The separator between the parts of a price on a button, such as `2 coins · until evening`. |
| `minigame.up` | `'Up'` |  |  | The label of a minigame input's button, keyed `minigame.<input>`. An input with no line shows its own name with a capital. A game labels its own inputs the same way, as in `'minigame.jump': 'Jump'`. |
| `minigame.down` | `'Down'` |  |  | The label of the minigame input `down`. |
| `minigame.left` | `'Left'` |  |  | The label of the minigame input `left`. |
| `minigame.right` | `'Right'` |  |  | The label of the minigame input `right`. |
| `minigame.space` | `'Space'` |  |  | The label of the minigame input `space`. |
| `you` | `'You'` |  |  | The name the player's spoken lines (`@you: "Hi."`) show when no `saveName` gives one. A game in another language sets its own. |
| `momentPassed` | `'The moment has passed.'` |  |  | The text shown for an open scene the game no longer declares, such as after a mod is removed. |
| `done` | `'Already done.'` |  |  | The reason on a choice or action with `once`, after the player has taken it that game or turn. |
| `notASave` | `'That is not a save file.'` |  |  | The refusal of an imported file or a state that isn't a save. |
| `otherGame` | `'That save belongs to another game ({game}).'` |  |  | The refusal of a save made by another game, with `{game}` that game's id. |
| `saveTooOld` | `'That save is from a version this game cannot read.'` |  |  | The refusal of a save from an engine version too old for the engine's steps to carry forward. |
| `pluginNewer` | `'That save was made with a newer version of {plugin}.'` |  |  | The refusal of a save made with a newer version of the plugin `{plugin}`. |
| `gameNewer` | `'That save was made with a newer version of this game.'` |  |  | The refusal of a save made with a newer version of the game. |
| `pluginUnreadable` | `'That save\'s {plugin} is from a version this game cannot read.'` |  |  | The refusal of a save whose state for the plugin `{plugin}` its migrations can't carry forward. |
| `noSaves` | `'This game keeps no saves.'` |  |  | The refusal of a save or load when the runner keeps no saves. |
| `emptySlot` | `'Nothing is saved there.'` |  |  | The refusal of loading a slot that holds no save. |
| `notSaved` | `'The game could not be saved.'` |  |  | The reason a save failed to write. |
| `notLoaded` | `'The game could not be loaded.'` |  |  | The reason a save failed to read. |
| `notListed` | `'The saves could not be read.'` |  |  | The reason the saves failed to list. |
| `notRemoved` | `'The save could not be deleted.'` |  |  | The reason a save failed to delete. |
| `notExported` | `'The save could not be exported.'` |  |  | The reason a save failed to export. |
| `turnLabel` | `'Turn {turn}'` |  |  | The save's name when no plugin's `saveName` gives one. |

## Strings

Type. Explained in [Strings](/docs/reference/strings#stringkey-and-strings).

A table of lines a game, pack or plugin gives by key. A key is an engine key or a plugin's `<id>/<name>`.

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

Returns the effect that takes `n` of a thing from `you`, 1 if left out. The count never goes below 0.

```ts shape
import { take } from '@ifloom/engine'
function take(ref: string, n?: number): Effect
```

Uses: [`Effect`](#effect).

## text

Function. Explained in [Flowing scenes](/docs/reference/flows#text).

Returns a `{ text }` block of words in place, one paragraph or several. A blank line between lines starts a new
paragraph.

It strips the indentation every line shares and the blank lines at either end, so the words can sit indented in your
code. The words are read as prose is, so `@ava: "…"` is a spoken line, `[[img:…]]` a picture and `{{key}}` a token.
An `id` keys the block in a translation's words table as `scene.<scene>.text.<id>`, and a hash of its words keys it
without one.

```ts shape
import { text } from '@ifloom/engine'
function text(words: string, extras?: BlockExtras & { id?: string }): Block
```

Uses: [`BlockExtras`](#blockextras), [`Block`](#block).

## TextLine

Type. Explained in [Presentation hints](/docs/reference/ui-hints#textline).

A line of words a player reads, a prose line or words in place. A UI checks the `[[ui:…]]` pieces in it.

```ts shape
import type { TextLine } from '@ifloom/engine'
type TextLine = {
  where: string
  text: string
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `where` | `string` |  |  | The place the line is, written as a `Problem`'s `where` is. |
| `text` | `string` |  |  | The line's words, markup and all. |

## TimerDef

Type. Explained in [Timers](/docs/reference/timers#timerdef).

A timer the game declares in `timers`, a named countdown in real time. The `timer` effect starts it, and its `effects` run when it runs out.

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
| `id` | `string` |  |  | The timer's id, which the `timer` effect and condition name. |
| `label` | `string` | yes |  | The timer's label, such as `'The phone'`. None if left out. |
| `ms` | `number` |  |  | The timer's length when started, in milliseconds. |
| `effects` | [`EffectRef[]`](#effectref) | yes |  | The timer's effects, which run when it runs out. Stopping it with `to: null` runs none of them. |

## TimerView

Type. Explained in [Timers](/docs/reference/timers#timerview).

A running timer as the player sees it, in `view.timers`. The view never lists its effects.

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
| `id` | `string` |  |  | The timer's id. |
| `label` | `string \| null` |  |  | The timer's `label`, or null. |
| `left` | `number` |  |  | The milliseconds the timer has left. |
| `total` | `number` |  |  | The timer's whole length in milliseconds, for a bar. `left / total` is the share left. |

## Times

Type. Explained in [Game state](/docs/reference/state#times).

A count of times something happened, with the turns of the first and the last. `GameState.seen` keeps one per scene and `GameState.chosen` one per choice.

```ts shape
import type { Times } from '@ifloom/engine'
type Times = {
  n: number
  first: number
  last: number
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `n` | `number` |  |  | The number of times it happened. |
| `first` | `number` |  |  | The turn it first happened on. |
| `last` | `number` |  |  | The turn it last happened on. |

## TrackDef

Type. Explained in [Audio](/docs/reference/audio#trackdef).

A track the game declares in `audio.tracks`, a sound file it ships. It plays on the `'sfx'` channel unless `channel` says otherwise.

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
| `src` | `string` |  |  | The track's file, under the game's `audio/` folder, such as `'audio/cafe.ogg'`. `audioSrc` turns it into a path. |
| `channel` | `string` | yes |  | The channel the track plays on. `'sfx'` if left out. A `sound` effect and `[[sound:id]]` play it there, and a background channel takes only a track whose channel is a background one. |
| `loop` | `boolean` | yes |  | The track's loop mark, true to repeat it while it's on a background channel. True if left out. |
| `volume` | `number` | yes |  | The track's own volume, from 0 to 1. 1 if left out. |

## TraitData

Type. Explained in [Entities](/docs/reference/entities#traitregistry-and-traitdata).

The data trait `K` takes, as `TraitRegistry` declares it, or `unknown` for an undeclared id.

```ts shape
import type { TraitData } from '@ifloom/engine'
type TraitData<K extends string> = K extends keyof TraitRegistry ? TraitRegistry[K] : unknown
```

Uses: [`TraitRegistry`](#traitregistry).

## traitOf

Function. Explained in [Entities](/docs/reference/entities#traitof).

Returns the data of one trait on one entity in play, typed by `TraitRegistry`, or undefined when it lacks the trait.

A declared entity reads as `declaredTrait` does. An entity made in play reads the trait data it was made with, laid
over its `like`'s, or else over its kind's default.

```ts shape
import { traitOf, type Game } from '@ifloom/engine'
function traitOf<K extends string>(state: GameState, game: Game, ref: string, id: K): TraitData<K> | undefined
```

Uses: [`GameState`](#gamestate), [`Game`](#game), [`TraitData`](#traitdata).

## TraitRegistry

Type. Explained in [Entities](/docs/reference/entities#traitregistry-and-traitdata).

The registry of the traits plugins declare, by trait id, with the data each takes. A plugin augments it to type
`declaredTrait` and the `traits` field of entities, kinds and `traits` tables.

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

The parts of a game its traits are worked out from, its kinds, its entities and its `traits` table.

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
| `kinds` | [`KindDef[]`](#kinddef) | yes |  | The game's kinds, the sorts of entity it keeps, each with its own stats. |
| `entities` | [`EntityDef[]`](#entitydef) | yes |  | The game's entities at the start. Play can create more. |
| `traits` | [`TraitTable`](#traittable) | yes |  | The game's traits, by trait id and then entity. In content given to `loadGame` they're rows over what entities declare. On the game `loadGame` returns, they're every entity's traits, worked out. Read them with `declaredTrait`. |

## TraitTable

Type. Explained in [Entities](/docs/reference/entities#traittable).

A table of trait data by trait id and then entity, such as `{ 'laundry/washable': { 'clothing:scarf': { temp: 30 } } }`.

In content, its rows give entities a trait over the entity's own. On a loaded game, it holds every entity's traits,
worked out.

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

Returns every field of the game's content a player reads and a translation can reword, each once, by its words-table
key. Load the game without its translation packs to list the words to translate.

A `{ text }` block with no `id` is keyed by a hash of its words, so its key changes when its words do.

```ts fragment
const table = Object.fromEntries(translatableFields(game).map((field) => [field.key, field.text]))
```

```ts shape
import { translatableFields, type Game } from '@ifloom/engine'
function translatableFields(game: Game): WordField[]
```

Uses: [`Game`](#game), [`WordField`](#wordfield).

## TriggerDef

Type. Explained in [Triggers](/docs/reference/triggers#triggerdef).

A trigger the game declares in `triggers`, effects that run by themselves. They run the first time `when` holds
after a command.

Use one for a text that arrives the turn after a meeting, a notice when a debt comes due, or a scene that
interrupts.

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
| `id` | `string` |  |  | The trigger's id, which `state.fired` records. |
| `when` | [`Condition`](#condition) |  |  | The trigger's condition. The trigger fires the first time it holds after a command. |
| `effects` | [`EffectRef[]`](#effectref) |  |  | The trigger's effects, which run when it fires. |
| `once` | `{ per: 'game' \| 'turn' }` | yes |  | The trigger's limit, once in the whole game (`{ per: 'game' }`) or at most once a turn (`{ per: 'turn' }`). `{ per: 'game' }` if left out. |

## Ui

Type. Explained in [Presentation hints](/docs/reference/ui-hints#ui-and-the-hint-interfaces).

A `ui` field of ui hints, typed by the hints a UI package declared for that target. It also takes undeclared hints,
which the engine carries all the same.

```ts shape
import type { Ui } from '@ifloom/engine'
type Ui<T> = {
  [key: string]: unknown
}
```

## UiField

Type. Explained in [Presentation hints](/docs/reference/ui-hints#uifield).

A `ui` field in a game's content, with the thing it's written on and the place it is.

```ts shape
import type { UiField } from '@ifloom/engine'
type UiField = {
  on: UiTarget
  id?: string
  where: string
  ui: unknown
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `on` | [`UiTarget`](#uitarget) |  |  | The sort of thing the field is written on, such as a scene, a choice or a stat. |
| `id` | `string` | yes |  | The id of the thing the field is written on, where it has one. |
| `where` | `string` |  |  | The place the field is, written as a `Problem`'s `where` is. |
| `ui` | `unknown` |  |  | The field's hints, unchanged from content. |

## UiInContent

Type. Explained in [Presentation hints](/docs/reference/ui-hints#uiincontent-1).

The `ui` fields and lines of words `uiInContent` finds, in the order the content checker walks them.

```ts shape
import type { UiInContent } from '@ifloom/engine'
type UiInContent = {
  fields: UiField[]
  lines: TextLine[]
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `fields` | [`UiField[]`](#uifield) |  |  | The `ui` fields in the content. |
| `lines` | [`TextLine[]`](#textline) |  |  | The lines of words that could hold a UI piece. |

## uiInContent

Function. Explained in [Presentation hints](/docs/reference/ui-hints#uiincontent).

Returns the `UiInContent` of a game, every `ui` field and every line that could hold a UI piece. A UI package's
checker reads it to check its own hints.

The content checker's own walk finds them, in scenes, the blocks and decisions of their flows, choices, actions,
stats, kinds, entities, the game's own and plugins' content, such as a location's room and body.

```ts shape
import { uiInContent, type Game } from '@ifloom/engine'
function uiInContent(game: Game): UiInContent
```

Uses: [`Game`](#game), [`UiInContent`](#uiincontent).

## UiTarget

Type. Explained in [Presentation hints](/docs/reference/ui-hints#uitarget).

The target a `ui` field is written on, which a UI package's checker reads.

It's a scene or room scene (`scene`), a choice or action (`choice`), a block or section (`block`), a stat, a kind or
entity (`entity`), or the game.

```ts shape
import type { UiTarget } from '@ifloom/engine'
type UiTarget = 'scene' | 'choice' | 'block' | 'stat' | 'entity' | 'game'
```

## upgradePack

Function. Explained in [Content and packs](/docs/reference/content#upgradepack).

Returns the pack upgraded to `SCHEMA` and to each plugin's content version. Returns a failed `Result` when the pack
was written for a newer engine or plugin, or for a schema older than any step.

Pass the game's plugins (`game.plugins`, or the base's), so each one's content is carried forward too. The engine's
step from each schema runs after every plugin step keyed by that schema or below, so a first-party plugin's step
meets the pack as the engine had it then. Each plugin's later steps run after.

A pack that records no version for a plugin is read as written for its schema, or for the plugin's own version if
that is lower. The result records every plugin's version in `plugins`, and a pack with nothing to upgrade comes back
unchanged. `loadGame` passes `context` (see `PackContext`).

```ts shape
import { upgradePack } from '@ifloom/engine'
function upgradePack(pack: { schema: number; plugins?: Record<string, number> }, plugins: readonly Plugin[], context?: PackContext): Result<Pack>
```

Uses: [`Plugin`](/docs/api/engine-plugin#plugin), [`PackContext`](/docs/api/engine-plugin#packcontext), [`Result`](#result), [`Pack`](#pack).

## ValueRef

Type. Explained in [Calls by name](/docs/reference/custom#valueref).

A reference to a value by full name, with the arguments it is asked with. It sets a stat's ceiling, an app's badge
or an achievement's progress, as in `{ value: 'messages/unread', with: { channel: 'texts' } }`.

```ts shape
import type { ValueRef } from '@ifloom/engine'
type ValueRef = {
  value: string
  with?: PluginArgs
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `value` | `string` |  |  | The value's full name, a plugin's (`messages/unread`) or the game's (`game/…`). |
| `with` | [`PluginArgs`](/docs/api/engine-plugin#pluginargs) | yes |  | The arguments the value is asked with. None if left out. |

## VariantMember

Type. Explained in [Prose and markup](/docs/reference/prose#variantmember).

A member of a variants list, a prose key or a prose key with a weight. A plain key has weight 1, so
`{ prose: 'cafe.order/late', weight: 3 }` is drawn three times as often.

```ts shape
import type { VariantMember } from '@ifloom/engine'
type VariantMember = string | { prose: string; weight?: number }
```

## VideoFlags

Type. Explained in [Media](/docs/reference/media#videoflags).

The flags a video's markup or `{ media }` block can set, each changing one default.

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
| `controls` | `boolean` | yes |  | The controls flag, which shows the player's controls, so the video waits to be started instead of playing by itself. |
| `once` | `boolean` | yes |  | The once flag, which plays the video once instead of looping. |
| `sound` | `boolean` | yes |  | The sound flag, which plays the video with sound instead of muted. |
| `poster` | `string` | yes |  | The still shown before the video plays, as a path like any picture's. |

## VideoView

Type. Explained in [Media](/docs/reference/media#videoview).

A video's playback settings as the player sees them, worked out from its `VideoFlags`.

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
| `autoplay` | `boolean` |  |  | The video's autoplay mark, which starts it as soon as it is shown. True unless it shows controls. |
| `loop` | `boolean` |  |  | The video's loop mark, which plays it again when it ends. True unless its flags ask to play once. |
| `muted` | `boolean` |  |  | The video's muted mark. True unless its flags ask for sound. |
| `controls` | `boolean` |  |  | The video's controls mark, which shows the player's play, pause and volume controls. |
| `poster` | `string` | yes |  | The still shown before the video plays, through `artSrc`. |

## View

Type. Explained in [The view](/docs/reference/view#view-1).

One state as a UI renders it, returned by `view`. It holds the core's fields and each feature's.

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
| `when` | `string \| null` |  |  | The time in the game in the plugins' words, such as "Day 3 · Wednesday morning", or null when no plugin gives one. |
| `scene` | `{ id: string \| null; key: string; title: string; body: string; beats:` [`SceneBeat[]`](#scenebeat)`; fresh:…` |  |  | The open scene as the player sees it, or the room when none is open, or the minigame while one is played. |
| `actions` | [`RenderedChoice[]`](#renderedchoice) |  |  | The actions on offer besides the scene's choices, ready to render. The `actions` providers' come first, such as wait, sleep and travel, then the game's own `actions`. |
| `plugins` | [`ViewsIn`](#viewsin) |  |  | The plugins' views, by plugin id. Each plugin that declares its view in `ViewRegistry` has it typed. |
| `entities` | [`EntitiesView[]`](#entitiesview) |  |  | Each listed kind with its listed, visible entities, in the order the kinds are declared. A kind whose `listed` is false is left out, and a listed kind with no entities shows empty. |
| `held` | [`HeldView[]`](#heldview) |  |  | The things you hold, in the game's order of its entities. The protagonist's come first while one is played, then the player's. |
| `turn` | `number` |  |  | The number of turns that have passed, 0 on the first. |
| `notices` | [`NoticesView`](#noticesview) |  |  | The notices the player hasn't dismissed, with a count for each tag. |
| `inputs` | [`InputView[]`](#inputview) |  |  | The inputs on offer now, in the order the game declares them, each with its value. |
| `settings` | [`SettingView[]`](#settingview) |  |  | Every setting the game declares, in order, for a settings page. |
| `stats` | [`StatView[]`](#statview) |  |  | The player's listed stats the player can see now, in the order the game declares them. |
| `statsById` | `Record<string,` [`StatView`](#statview)`>` |  |  | Every one of the player's stats, by id, listed and visible or not. |
| `minigame` | [`MinigameView`](#minigameview) `\| null` |  |  | The minigame being played, or null. |
| `timers` | [`TimerView[]`](#timerview) |  |  | The running timers, in the order they started. |
| `audio` | [`AudioView`](#audioview) |  |  | The audio each channel should play and the sounds that are due. Empty when the game has no audio. |
| `panel` | [`OpenPanel`](#openpanel) `\| null` |  |  | The panel open over the story. It's the one the `panel` effect opened, else the open scene's own, else null. |
| `saving` | [`SavingView`](#savingview) |  |  | The player's leave to save now, with the reason when it's refused. |
| `rolls` | [`Roll[]`](#roll) |  |  | The rolls the last command made, in order. Empty when it made none. |
| `changes` | [`ChangeView[]`](#changeview) |  |  | The stats the last command moved that the player can see, the player's first, each with the words that say what moved. |

## view

Function. Explained in [The view](/docs/reference/view#view).

Returns the `View` of a state, the value a UI renders. Without `options.profile`, no plugin's view reads the
profile.

The scene, its choices, the room's actions, the plugins' views and the audio come from `screen`, which renders the
open scene once, and the rest comes from the state. `view` only formats, so each choice's effects and the pool picks
stay on the screen.

```ts shape
import { view, type Game } from '@ifloom/engine'
function view(state: GameState, game: Game, options?: ViewOptions): View
```

Uses: [`GameState`](#gamestate), [`Game`](#game), [`ViewOptions`](#viewoptions), [`View`](#view).

## ViewOptions

Type. Explained in [The view](/docs/reference/view#viewoptions).

Settings for `screen` and `view` besides the state. Without `profile`, no plugin's view reads the profile.

```ts shape
import type { ViewOptions } from '@ifloom/engine'
type ViewOptions = {
  profile?: Readonly<Record<string, unknown>>
}
```

| Field | Type | Optional | Default | Description |
|---|---|---|---|---|
| `profile` | `Readonly<Record<string, unknown>>` | yes |  | The player's profile, by namespace. Each plugin's view reads its own namespace as `context.profile`, and the runner passes this. |

## ViewRegistry

Type. Explained in [Writing a plugin](/docs/reference/plugins#conditionregistry-effectregistry-commandregistry-queryregistry-and-viewregistry).

The registry of each plugin's view by plugin id (`shop: ShopView`), which types `view.plugins`. The game's own
`rules.view` is under `game`.

```ts shape
import type { ViewRegistry } from '@ifloom/engine'
type ViewRegistry = {

  // …
}
```

Plugins add fields of their own to it, which their pages list.

## ViewsIn

Type. Explained in [Writing a plugin](/docs/reference/plugins#viewsin).

The plugins' views by plugin id, in `view.plugins`. Each plugin that declares its view in `ViewRegistry` is typed.

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

Returns one entry of `items`, drawn from `parts` by each entry's weight. Returns undefined when no entry can be drawn.

An entry of weight 3 comes up three times as often as one of weight 1. A weight left out counts as 1. An entry
whose weight is 0 or less, or not a number, is never drawn.

```ts shape
import { weighted } from '@ifloom/engine'
function weighted<T>(items: readonly T[], weightOf: (item: T) => number | undefined, ...parts: (string | number)[]): T | undefined
```

## when

Function. Explained in [Flowing scenes](/docs/reference/flows#when).

Returns a section of blocks shown only while `condition` holds. A section can hold any block a body can.

```ts shape
import { when } from '@ifloom/engine'
function when(condition: Condition, blocks: Block[], extras?: Omit<BlockExtras, 'when'>): Block
```

Uses: [`Condition`](#condition), [`Block`](#block), [`BlockExtras`](#blockextras).

## whyNot

Function. Explained in [Actions](/docs/reference/actions#whynot).

Returns the reason the player can't send this command now, or undefined when they can.

The reducer refuses a command with this reason, and the view greys out its button with the same words. So a button
and the rule behind it can't disagree, and every refusal is a sentence the player can read.

The engine checks in the order the player would notice: the core's refusals such as a lock first, then the plugins'
guards, then the command's own needs.

```ts shape
import { whyNot, type Game } from '@ifloom/engine'
function whyNot(state: GameState, game: Game, command: CommandRef): string | undefined
```

Uses: [`GameState`](#gamestate), [`Game`](#game), [`CommandRef`](#commandref).

## withTrait

Function. Explained in [Entities](/docs/reference/entities#withtrait).

Returns every entity in the game that has a trait, as references. Declared ones not removed come first in content
order, then those made in play with their kind's, their `like`'s or their own trait.

```ts shape
import { withTrait, type Game } from '@ifloom/engine'
function withTrait(state: GameState, game: Game, id: string): EntityRef[]
```

Uses: [`GameState`](#gamestate), [`Game`](#game), [`EntityRef`](#entityref).

## WordField

Type. Explained in [The words table](/docs/reference/words#wordfield).

A field of the game's content a player reads and a translation can reword, as `translatableFields` lists it.

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
| `key` | `string` |  |  | The field's key in a pack's words table, such as `action.wait.label`. |
| `text` | `string` |  |  | The field's words from content, tokens and markup included. |
| `where` | `string` |  |  | The field's place as a problem names it, such as `scene cafe.counter` or `quests coffee`. |

## WordPart

Type. Explained in [The words table](/docs/reference/words#wordpart).

One field's part in a `WordShape`, telling how the walk reads that field.

```ts shape
import type { WordPart } from '@ifloom/engine'
type WordPart = true | 'blocks' | 'effects' | 'button' | WordShape | readonly [ WordPart ]
```

Uses: [`WordShape`](#wordshape).

## WordShape

Type. Explained in [The words table](/docs/reference/words#wordshape).

A map of the fields of an entry that hold words a translation can replace. A plugin's `defineData` declares one for
each `data` list, and a trait's `words` declares one for its data.

Each field of the shape is one of these:
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

Returns the state with one entity's record replaced. A record for an entity not yet there is added after the rest of its kind.

```ts shape
import { writeEntity } from '@ifloom/engine'
function writeEntity(state: GameState, ref: string, next: EntityState): GameState
```

Uses: [`GameState`](#gamestate), [`EntityState`](#entitystate).

## YOU

Const. Explained in [Entities](/docs/reference/entities#player-and-you).

The holder id of whoever the player is playing now, the protagonist the `you` effect last chose or else the player.

```ts shape
import { YOU } from '@ifloom/engine'
const YOU: 'you'
```
