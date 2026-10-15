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
  holds,
  lockedOut,
  pluginQuery,
  renderAction,
  say,
  startingState,
  storylineOpen,
  whyNot,
  type Command,
  type Condition,
  type DefinedPlugin,
  type FlagValue,
  type Game,
  type GameState,
  type PluginArgs,
  type PluginContext,
  type PluginProblem,
  type RenderedChoice,
} from '@ifloom/engine'

/** One way a conversation can open: the scene, while `when` holds, with its button's label. */
export type TalkOption = { scene: string; when?: Condition; label?: string }

/** A character, as content declares it in `data.cast.characters`. */
export type CharacterDef = {
  id: string
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
  /** Their variables at the start. */
  flags?: Record<string, FlagValue>
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
  portrait: string
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

/** A list from arguments: `{ 'cast/here': ['ava'] }` arrives as `{ value: ['ava'] }`. */
function ids(args: PluginArgs, key = 'value'): string[] {
  // Who is asked about may be written `value`, `who` or `id`; places only as `at`.
  const value = key === 'at' ? args.at : (args[key] ?? args.who ?? args.id)
  return (Array.isArray(value) ? value : value === undefined ? [] : [value]).map(String)
}

/** Build the plugin. It asks the places plugin where the player is, by name, wherever each is listed. */
export function cast(options: CastOptions = {}): DefinedPlugin<null> {
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

  function talkBlocked(state: GameState, context: PluginContext<null>, who: string): string | undefined {
    const { game } = context
    if (state.sceneId) return say(game, 'finishFirst')
    const def = characterById(game, who)
    if (!def) return say(game, `${ID}/noSuchPerson`)
    if (!isHere(state, context, def)) return say(game, `${ID}/notHere`, { name: def.name })
    if (closed(state, def)) return say(game, `${ID}/notTaking`, { name: def.name })
    if (!talkOption(state, game, def)) return say(game, `${ID}/nothingToSay`, { name: def.name })
    return undefined
  }

  function callBlocked(state: GameState, game: Game, who: string): string | undefined {
    if (state.sceneId) return say(game, 'finishFirst')
    const def = characterById(game, who)
    if (!def) return say(game, `${ID}/noSuchPerson`)
    if (!def.call) return say(game, `${ID}/cannotCall`, { name: def.name })
    if (closed(state, def)) return say(game, `${ID}/notTaking`, { name: def.name })
    if (!holdsFor(state, game, def, def.call.when)) return def.call.busy ?? say(game, `${ID}/notPickingUp`, { name: def.name })
    return undefined
  }

  function personOf(state: GameState, context: PluginContext<null>, def: CharacterDef): PersonView {
    const { game } = context
    const option = talkOption(state, game, def)
    return {
      id: def.id,
      ref: refOf(def.id),
      name: def.name,
      fullName: def.fullName ?? def.name,
      role: def.role ?? null,
      hue: def.hue ?? null,
      portrait: portraitOf(def),
      here: isHere(state, context, def),
      closed: closed(state, def),
      met: met(state, game, def),
      actions: def.talk
        ? [renderAction(state, game, { id: `talk-${def.id}`, label: option?.label ?? say(game, `${ID}/talk`), command: talk(def.id) })]
        : [],
    }
  }

  return definePlugin<null>({
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
    entities: (game) =>
      charactersOf(game).map((def) => ({ id: def.id, of: kind, name: def.name, stats: def.stats, flags: def.flags })),
    conditions: {
      /** `{ 'cast/here': 'ava' }`: in the room with the player; with a list, any of them. */
      here: (state, args, context) => ids(args).some((id) => {
        const def = characterById(context.game, id)
        return def ? isHere(state, context, def) : false
      }),
      /** `{ 'cast/at': { who: 'ava', at: ['park'] } }`: where someone is, whoever else is there. */
      at: (state, args, { game }) => {
        const def = characterById(game, ids(args, 'who')[0])
        return def ? ids(args, 'at').includes(locationOf(state, game, def)) : false
      },
      /** `{ 'cast/met': 'ava' }`: the player has met them. */
      met: (state, args, { game }) => ids(args).some((id) => {
        const def = characterById(game, id)
        return def ? met(state, game, def) : false
      }),
    },
    commands: {
      /** `{ type: 'custom', name: 'cast/talk', with: { who } }`: start a conversation with someone here. */
      talk: {
        whyNot: (state, args, context) => talkBlocked(state, context, ids(args, 'who')[0]),
        run: (state, args, { game }) => {
          const def = characterById(game, ids(args, 'who')[0])!
          return { ...state, sceneId: talkOption(state, game, def)!.scene }
        },
      },
      /** `{ type: 'custom', name: 'cast/call', with: { who } }`: reach someone from anywhere. */
      call: {
        whyNot: (state, args, { game }) => callBlocked(state, game, ids(args, 'who')[0]),
        run: (state, args, { game }) => {
          const def = characterById(game, ids(args, 'who')[0])!
          return { ...state, sceneId: def.call?.scene ?? talkOption(state, game, def)?.scene ?? talkOptions(def)[0]?.scene ?? null }
        },
      },
    },
    queries: {
      /** `{ id, name, hue, portrait }` of someone, or undefined. */
      person: (_state, args, { game }) => {
        const def = characterById(game, ids(args)[0])
        return def ? { id: def.id, name: def.name, hue: def.hue ?? null, portrait: portraitOf(def) } : undefined
      },
      /** The ids of everyone in the room. */
      present: (state, _args, context) => charactersOf(context.game).filter((def) => isHere(state, context, def)).map((def) => def.id),
      /** Where someone is. */
      where: (state, args, { game }) => {
        const def = characterById(game, ids(args)[0])
        return def ? locationOf(state, game, def) : undefined
      },
      /** Everyone met who can be called, each with the call command and why it can't go through now. */
      contacts: (state, _args, { game }) =>
        charactersOf(game)
          .filter((def) => def.call && met(state, game, def))
          .map((def) => ({ id: def.id, name: def.name, role: def.role ?? null, portrait: portraitOf(def), command: call(def.id), disabled: whyNot(state, game, call(def.id)) })),
    },
    speaker: (id, _state, { game }) => {
      const def = characterById(game, id)
      return def ? { id: def.id, name: def.name, hue: def.hue ?? null, portrait: portraitOf(def) } : undefined
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
    argProblems: (kindOf, name, args, game) => {
      const named = kindOf === 'conditions' ? (name === 'at' ? ids(args, 'who') : ids(args)) : ids(args, 'who')
      return named.filter((id) => !characterById(game, id)).map((id) => `unknown character "${id}"`)
    },
    check: (game, { conditionProblems }) => {
      const problems: PluginProblem[] = []
      const sayOf = (id: string, what: string) => problems.push({ list: 'characters', id, what })
      const scenes = new Set(game.scenes.map((scene) => scene.id))
      const storylines = new Set(game.storylines.map((storyline) => storyline.id))
      // Places are the places plugin's, asked by name; without it there is no map to check against.
      const askPlaces = pluginQuery(game, 'places/known')
      const blank = askPlaces ? startingState(game) : undefined
      const known = askPlaces ? (id: string) => Boolean(askPlaces(blank!, { value: id })) : undefined
      const one = anyOf(kind)
      for (const def of charactersOf(game)) {
        for (const option of talkOptions(def)) if (!scenes.has(option.scene)) sayOf(def.id, `talks in unknown scene "${option.scene}"`)
        if (def.call?.scene && !scenes.has(def.call.scene)) sayOf(def.id, `calls open unknown scene "${def.call.scene}"`)
        if (def.call && !def.call.scene && !talkOptions(def).length) sayOf(def.id, 'can be called, but a call opens no scene: give call a scene, or them a talk')
        if (def.storyline !== undefined && !storylines.has(def.storyline)) sayOf(def.id, `unknown storyline "${def.storyline}"`)
        const conditions = [
          ...(def.schedule ?? []).map((block) => block.when),
          ...talkOptions(def).map((option) => option.when),
          def.call?.when,
          def.met,
        ]
        for (const when of conditions) for (const what of conditionProblems(bindCurrent(when, one))) sayOf(def.id, what)
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
export const talk = (who: string): Command => ({ type: 'custom', name: `${ID}/talk`, with: { who } })
/** The command that calls someone. */
export const call = (who: string): Command => ({ type: 'custom', name: `${ID}/call`, with: { who } })
/** True while any of these is in the room. */
export const here = (...who: string[]): Condition => ({ [`${ID}/here`]: who })
/** True while this one is in one of these places. */
export const isAt = (who: string, ...places: string[]): Condition => ({ [`${ID}/at`]: { who, at: places } })
/** True once the player has met any of these. */
export const hasMet = (...who: string[]): Condition => ({ [`${ID}/met`]: who })
/** How content names someone, for `of`: `person('ava')` is `'character:ava'`. */
export const person = (who: string, kind = 'character'): string => `${kind}:${who}`
