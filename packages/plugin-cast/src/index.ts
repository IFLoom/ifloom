/**
 * A cast: the people of a game. Where each one is, by a schedule of
 * conditions; who is in the room with the player; talking to them and calling
 * them; and what the game keeps about each — a friendship, a debt, a grudge —
 * as stats the game declares on the cast's kind of entity.
 *
 * The engine knows no characters. Each one here is an entity of the kind
 * `character`, so a stat declared `of: 'character'` is theirs, read and
 * written as any entity's: `{ stat: 'friendship', of: 'character:ava', gte: 25 }`.
 * Characters are content — `data.cast.characters` in a pack — so a mod can add
 * someone. Inside a character's own conditions, `'$'` is that character.
 *
 * With the places plugin, a character is here when their schedule puts them
 * where the player is. Without it, nobody is ever here, but calls still work.
 */
import {
  anyOf,
  artSrc,
  bindCurrent,
  definePlugin,
  fillTokens,
  holds,
  lockedOut,
  pluginQuery,
  renderAction,
  say,
  startingState,
  storylineOpen,
  whyNot,
  type CommandRef,
  type Condition,
  type DefinedPlugin,
  type Game,
  type GameState,
  type KvValue,
  type PluginContext,
  type PluginProblem,
  type RenderedChoice,
} from '@ifloom/engine'

/** One way a conversation can open: the scene, while `when` holds, with its button's label. */
export type TalkOption = { scene: string; when?: Condition; label?: string }

/** A character, as content declares it in `data.cast.characters`. */
export type CharacterDef = {
  id: string
  /** Prose tokens fill in every save: `'{{partnerName}}'` shows the name the player typed. */
  name: string
  fullName?: string
  /** A word or two about them: "Runs the café". */
  role?: string
  /** For prose that needs them: `{ they: 'she', them: 'her', … }`. The engine gives them no meaning. */
  pronouns?: Record<string, string>
  /** A colour for their lines, as a hue from 0 to 360. */
  hue?: number
  /** Their picture, through `artSrc`. `art/character/<id>.jpg` if left out. */
  portrait?: string
  tags?: string[]
  /** Where they are when no schedule entry holds. Offstage — nowhere — if left out. */
  home?: string
  /** Where they are while each `when` holds; the first that holds wins. `'$'` is them. */
  schedule?: { location: string; when?: Condition }[]
  /** The scene talking to them opens, or the first of several whose `when` holds. Can't be talked to if left out. */
  talk?: string | TalkOption[]
  /** Whether they can be reached from anywhere, and the scene a call opens (their talk scene if left out). */
  call?: { scene?: string; when?: Condition; busy?: string }
  /** Their storyline: while it is closed, they will not talk or pick up. */
  storyline?: string
  /** Whether the player has met them. Having seen one of their talk or call scenes, if left out. */
  met?: Condition
  /** Their stats at the start, where they differ from each stat's own `start`. */
  stats?: Record<string, number>
  /** Their kv keys at the start. */
  kv?: Record<string, KvValue>
}

export type CastOptions = {
  /** The kind the cast's entities are. `character` if left out. */
  kind?: string
  /** What one of them is called, for the kind's label. `Person` if left out. */
  label?: string
  /** For more than one. `People` if left out. */
  plural?: string
}

/** One character as the UI draws them. */
export type PersonView = {
  id: string
  /** As content names them: `'character:ava'`. */
  ref: string
  name: string
  fullName: string
  role: string | null
  hue: number | null
  /** The portrait's path: the character's `portrait`, else `character/<id>`. Typed as every plugin's portrait is, though the cast always gives one. */
  portrait: string | null
  /** In the room with the player. */
  here: boolean
  /** Their storyline is closed for now. */
  closed: boolean
  met: boolean
  /** The talk button, greyed out with its reason when it is. */
  actions: RenderedChoice[]
}

/** What the UI reads at `view.plugins.cast`. */
export type CastView = {
  /** Who is in the room, while no scene is open. */
  present: PersonView[]
  /** Everyone the player has met. */
  people: PersonView[]
}

const ID = 'cast'

/** The game's characters: its packs' `data.cast.characters`. */
export function charactersOf(game: Game): CharacterDef[] {
  return (game.data?.[ID]?.characters ?? []) as unknown as CharacterDef[]
}

/** The character with this id, if the game has them. */
export function characterById(game: Game, id: string | undefined): CharacterDef | undefined {
  return id === undefined ? undefined : charactersOf(game).find((character) => character.id === id)
}

/** Where they are when nowhere on the map. */
export const OFFSTAGE = 'offstage'

/** One or several, as a list: `character: 'ava'` or `character: ['ava', 'sam']`. */
function ids(value: unknown): string[] {
  return (Array.isArray(value) ? value : value === undefined ? [] : [value]).map(String)
}

/** Build the plugin. It asks the places plugin where the player is, by name, wherever each is listed. */
export function cast(options: CastOptions = {}): DefinedPlugin<null, CastView> {
  const kind = options.kind ?? 'character'
  const refOf = (id: string) => `${kind}:${id}`
  /** A character's own condition, with `'$'` as them. */
  const theirs = (def: CharacterDef, when: Condition | undefined) => bindCurrent(when, refOf(def.id))
  const holdsFor = (state: GameState, game: Game, def: CharacterDef, when: Condition | undefined) => holds(state, theirs(def, when), game)

  function locationOf(state: GameState, game: Game, def: CharacterDef): string {
    for (const block of def.schedule ?? []) if (holdsFor(state, game, def, block.when)) return block.location
    return def.home ?? OFFSTAGE
  }
  const playerAt = (context: PluginContext<null>) => context.query<string | null>('places/here') ?? null
  const isHere = (state: GameState, context: PluginContext<null>, def: CharacterDef) => {
    const at = playerAt(context)
    return at !== null && locationOf(state, context.game, def) === at
  }
  const talkOptions = (def: CharacterDef): TalkOption[] => (typeof def.talk === 'string' ? [{ scene: def.talk }] : (def.talk ?? []))
  const talkOption = (state: GameState, game: Game, def: CharacterDef) => talkOptions(def).find((option) => holdsFor(state, game, def, option.when))
  const closed = (state: GameState, def: CharacterDef) => def.storyline !== undefined && !storylineOpen(state, def.storyline)
  const met = (state: GameState, game: Game, def: CharacterDef) =>
    def.met !== undefined
      ? holdsFor(state, game, def, def.met)
      : [...talkOptions(def).map((option) => option.scene), def.call?.scene].some((scene) => scene && (state.seen?.[scene] ?? 0) > 0)
  const portraitOf = (def: CharacterDef) => artSrc(def.portrait ?? `character/${def.id}`)
  /** A name as this save shows it: its tokens filled, so `'{{partnerName}}'` is what the player typed. */
  const nameOf = (state: GameState, game: Game, def: CharacterDef) => fillTokens(def.name, state, game)
  const fullNameOf = (state: GameState, game: Game, def: CharacterDef) => fillTokens(def.fullName ?? def.name, state, game)

  function talkBlocked(state: GameState, context: PluginContext<null>, who: string): string | undefined {
    const { game } = context
    if (state.sceneId) return say(game, 'finishFirst')
    const def = characterById(game, who)
    if (!def) return say(game, `${ID}/noSuchPerson`)
    if (!isHere(state, context, def)) return say(game, `${ID}/notHere`, { name: nameOf(state, game, def) })
    if (closed(state, def)) return say(game, `${ID}/notTaking`, { name: nameOf(state, game, def) })
    if (!talkOption(state, game, def)) return say(game, `${ID}/nothingToSay`, { name: nameOf(state, game, def) })
    return undefined
  }

  function callBlocked(state: GameState, game: Game, who: string): string | undefined {
    if (state.sceneId) return say(game, 'finishFirst')
    const def = characterById(game, who)
    if (!def) return say(game, `${ID}/noSuchPerson`)
    if (!def.call) return say(game, `${ID}/cannotCall`, { name: nameOf(state, game, def) })
    if (closed(state, def)) return say(game, `${ID}/notTaking`, { name: nameOf(state, game, def) })
    if (!holdsFor(state, game, def, def.call.when)) return def.call.busy ?? say(game, `${ID}/notPickingUp`, { name: nameOf(state, game, def) })
    return undefined
  }

  function personOf(state: GameState, context: PluginContext<null>, def: CharacterDef): PersonView {
    const { game } = context
    const option = talkOption(state, game, def)
    return {
      id: def.id,
      ref: refOf(def.id),
      name: nameOf(state, game, def),
      fullName: fullNameOf(state, game, def),
      role: def.role ?? null,
      hue: def.hue ?? null,
      portrait: portraitOf(def),
      here: isHere(state, context, def),
      closed: closed(state, def),
      met: met(state, game, def),
      actions: def.talk ? [renderAction(state, game, { id: `talk-${def.id}`, label: option?.label ?? say(game, `${ID}/talk`), command: talk(def.id) })] : [],
    }
  }

  return definePlugin<null, CastView>({
    id: ID,
    version: 1,
    // Where the player is comes from places; a schedule may ask the calendar.
    cooperates: ['places', 'calendar'],
    strings: {
      talk: 'Talk',
      noSuchPerson: 'There is no such person.',
      notHere: '{name} is not here.',
      notTaking: '{name} is not taking this right now.',
      nothingToSay: '{name} has nothing to say just now.',
      cannotCall: 'You cannot reach {name} from here.',
      notPickingUp: '{name} does not pick up.',
    },
    kinds: [{ id: kind, label: options.label ?? 'Person', plural: options.plural ?? 'People' }],
    entities: (game) => charactersOf(game).map((def) => ({ id: def.id, of: kind, name: def.name, stats: def.stats, kv: def.kv })),
    conditions: {
      /** `{ 'cast/here': { character: 'ava' } }`: in the room with the player; with a list, any of them. */
      here: (state, args, context) =>
        ids(args.character).some((id) => {
          const def = characterById(context.game, id)
          return def ? isHere(state, context, def) : false
        }),
      /** `{ 'cast/at': { character: 'ava', at: ['park'] } }`: where someone is, whoever else is there. */
      at: (state, args, { game }) => {
        const def = characterById(game, ids(args.character)[0])
        return def ? ids(args.at).includes(locationOf(state, game, def)) : false
      },
      /** `{ 'cast/met': { character: 'ava' } }`: the player has met them; with a list, any of them. */
      met: (state, args, { game }) =>
        ids(args.character).some((id) => {
          const def = characterById(game, id)
          return def ? met(state, game, def) : false
        }),
    },
    commands: {
      /** `{ 'cast/talk': { id } }`: start a conversation with someone here. */
      talk: {
        whyNot: (state, args, context) => talkBlocked(state, context, ids(args.id)[0]),
        run: (state, args, { game }) => {
          const def = characterById(game, ids(args.id)[0])!
          return { ...state, sceneId: talkOption(state, game, def)!.scene }
        },
      },
      /** `{ 'cast/call': { id } }`: reach someone from anywhere. */
      call: {
        whyNot: (state, args, { game }) => callBlocked(state, game, ids(args.id)[0]),
        run: (state, args, { game }) => {
          const def = characterById(game, ids(args.id)[0])!
          return { ...state, sceneId: def.call?.scene ?? talkOption(state, game, def)?.scene ?? talkOptions(def)[0]?.scene ?? null }
        },
      },
    },
    queries: {
      /** `{ id, name, hue, portrait }` of someone (`{ character }`), or undefined. */
      person: (state, args, { game }) => {
        const def = characterById(game, ids(args.character)[0])
        return def ? { id: def.id, name: nameOf(state, game, def), hue: def.hue ?? null, portrait: portraitOf(def) } : undefined
      },
      /** The ids of everyone in the room. */
      present: (state, _args, context) =>
        charactersOf(context.game)
          .filter((def) => isHere(state, context, def))
          .map((def) => def.id),
      /** Where someone is (`{ character }`). */
      where: (state, args, { game }) => {
        const def = characterById(game, ids(args.character)[0])
        return def ? locationOf(state, game, def) : undefined
      },
      /** Everyone met who can be called, each with the call command and why it can't go through now. */
      contacts: (state, _args, { game }) =>
        charactersOf(game)
          .filter((def) => def.call && met(state, game, def))
          .map((def) => ({
            id: def.id,
            name: nameOf(state, game, def),
            role: def.role ?? null,
            portrait: portraitOf(def),
            command: call(def.id),
            disabled: whyNot(state, game, call(def.id)),
          })),
    },
    speaker: (id, state, { game }) => {
      const def = characterById(game, id)
      return def ? { id: def.id, name: nameOf(state, game, def), hue: def.hue ?? null, portrait: portraitOf(def) } : undefined
    },
    view: (state, context): CastView => {
      const { game } = context
      const idle = !state.sceneId && !lockedOut(state, game)
      const everyone = charactersOf(game)
      return {
        present: idle ? everyone.filter((def) => isHere(state, context, def)).map((def) => personOf(state, context, def)) : [],
        people: everyone.filter((def) => met(state, game, def)).map((def) => personOf(state, context, def)),
      }
    },
    references: {
      // The people a call names: a condition's `character`, a command's `id`.
      calls: (kindOf, _name, args) => {
        const named = kindOf === 'conditions' ? ids(args.character) : ids(args.id)
        return named.map((id) => ({ entry: id, plugin: ID, list: 'characters', noun: 'character' }))
      },
      content: (game) => {
        // Inside a character's own conditions, `'$'` is them.
        const one = anyOf(kind)
        return charactersOf(game).map((def) => ({
          list: 'characters',
          id: def.id,
          refs: [
            { within: 'talk', refs: talkOptions(def).map((option) => ({ scene: option.scene, as: 'open' as const })) },
            { within: 'call', refs: def.call?.scene ? [{ scene: def.call.scene, as: 'open' as const }] : [] },
            ...(def.storyline !== undefined ? [{ storyline: def.storyline }] : []),
            ...[...(def.schedule ?? []).map((block) => block.when), ...talkOptions(def).map((option) => option.when), def.call?.when, def.met].map((when) => ({
              when: bindCurrent(when, one),
            })),
            // Only a portrait the game gives: the one left out is the UI's to fall back from.
            ...(def.portrait !== undefined ? [{ picture: def.portrait }] : []),
          ],
        }))
      },
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      const sayOf = (id: string, what: string) => problems.push({ list: 'characters', id, what })
      // Places are the places plugin's, asked by name; without it there is no map to check against.
      const askPlaces = pluginQuery(game, 'places/known')
      const blank = askPlaces ? startingState(game) : undefined
      const known = askPlaces ? (id: string) => Boolean(askPlaces(blank!, { location: id })) : undefined
      for (const def of charactersOf(game)) {
        if (def.call && !def.call.scene && !talkOptions(def).length)
          sayOf(def.id, 'can be called, but a call opens no scene: give call a scene, or them a talk')
        if (known) {
          for (const place of [def.home, ...(def.schedule ?? []).map((block) => block.location)]) {
            if (place !== undefined && place !== OFFSTAGE && !known(place)) sayOf(def.id, `unknown location "${place}"`)
          }
        }
      }
      return problems
    },
  })
}

/** The command that starts a conversation. */
export const talk = (who: string): CommandRef => ({ [`${ID}/talk`]: { id: who } })
/** The command that calls someone. */
export const call = (who: string): CommandRef => ({ [`${ID}/call`]: { id: who } })
/** True while any of these is in the room. */
export const here = (...who: string[]): Condition => ({ [`${ID}/here`]: { character: who } })
/** True while this one is in one of these places. */
export const isAt = (who: string, ...places: string[]): Condition => ({ [`${ID}/at`]: { character: who, at: places } })
/** True once the player has met any of these. */
export const hasMet = (...who: string[]): Condition => ({ [`${ID}/met`]: { character: who } })
/** How content names someone, for `of`: `person('ava')` is `'character:ava'`. */
export const person = (who: string, kind = 'character'): string => `${kind}:${who}`
