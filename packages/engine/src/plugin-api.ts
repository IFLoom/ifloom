/**
 * @ifloom/engine/plugin: what you write a plugin with, beside the main entry.
 *
 * - `definePlugin` and the types of a plugin: its hooks and providers, the
 *   contexts they're given (which the game's own `rules` get too), and what
 *   its references and checks report.
 * - Declaring its calls, data lists and trait kinds once: `defineCalls`,
 *   `arg`, `defineData`, `list` and `defineTraitKind`.
 * - Building its view: `renderAction` for a ready button, `priceView`,
 *   `pictureView`, `panelOf`, `styledBeats`, `parseBeats`, `speakerOf` and
 *   `entityUi`.
 * - A trait's own state on each entity: `traitState` and `setTraitState`.
 * - Locks, the references its content names, `bindCurrent` and `anyOf`, and the steps
 *   that carry its content and commands forward.
 *
 * Everything a game's content and rules use (`Game`, `GameState`, `holds`,
 * `entityName`, the registries a plugin augments) is in `@ifloom/engine`.
 */
export type {
  Asked,
  CallTable,
  CheckTools,
  ContentReferences,
  DefinedPlugin,
  Macro,
  Plugin,
  PluginArgs,
  PluginCommand,
  Receiver,
  PluginContext,
  PluginDef,
  PluginEntry,
  PluginProblem,
  PluginReferences,
  PluginSlice,
  Refusal,
  RoomScene,
  StatModifier,
  TurnContext,
} from './plugin.ts'
export { definePlugin, defineRules } from './plugin.ts'
export type { RulesDef } from './plugin.ts'

// A plugin's calls, data lists and trait kinds, declared once
export type {
  AnyCalls,
  Arg,
  ArgIn,
  ArgOut,
  ArgShape,
  ArgsIn,
  ArgsOut,
  CallArgs,
  CallShapes,
  CallWriter,
  CommandsOf,
  ConditionsOf,
  DataList,
  EffectsOf,
  ListSpec,
  PluginCalls,
  PluginData,
  WrittenAs,
} from './pluginCalls.ts'
export { arg, defineCalls, defineData, list } from './pluginCalls.ts'
export type { TraitEntityDef, TraitKind, TraitKindSpec } from './traitKinds.ts'
export { defineTraitKind } from './traitKinds.ts'
export type { TraitDef, TraitTools } from './entities.ts'

// Cooperating with other plugins by name
export type { CallIn, QueryAnswer, QueryArgs } from './calls.ts'

// Building its view
export { panelOf, pictureView, priceView, renderAction } from './screen.ts'
export { parseBeats, styledBeats } from './sceneBody.ts'
export type { SpeakerFinder } from './sceneBody.ts'
export { speakerOf } from './speakers.ts'
export { anyOf, bindCurrent, entityUi, everyEntity, hasEntity, setTraitState, traitState } from './entities.ts'

// Locks and what its content names
export type { Lock, LockTarget } from './locks.ts'
export { lockOn, lockedOut } from './locks.ts'
export { actionReferences } from './action.ts'
export type { Reference } from './references.ts'

// Carrying its content and commands forward
export type { CallForm, CommandStep, ContentStep, ContentTools, PackContext, RawCall, RawCommand } from './upgrade.ts'
