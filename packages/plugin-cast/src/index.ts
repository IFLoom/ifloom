/**
 * A cast: the people of a game. Where each one is, by a schedule of
 * conditions; who is in the room with the player; talking to them and calling
 * them; and what the game keeps about each — a friendship, a debt, a grudge —
 * as stats the game declares on their kind of entity.
 *
 * The engine knows no characters. A person is an entity that carries the
 * `cast/person` trait, written with `person({ ... })` in content's
 * `entities`: their name, `desc` and `image` are the entity's, and their
 * schedule, talk and call are the trait's. The plugin brings the kind
 * `character`, which `person()` uses, so a stat declared `of: 'character'` is
 * theirs: `{ stat: 'friendship', of: 'character:ava', gte: 25 }`. Inside a
 * person's own conditions, `'$'` is them.
 *
 * With the places plugin, a person is here when their schedule puts them
 * where the player is. Without it, nobody is ever here, but calls still work.
 */
import {
  artSrc,
  bindCurrent,
  definePlugin,
  entityDesc,
  entityImage,
  entityName,
  entityOf,
  entityTrait,
  entityUi,
  fillTokens,
  holds,
  lockedOut,
  parseRef,
  pluginQuery,
  renderAction,
  say,
  startingState,
  storylineOpen,
  whyNot,
  withTrait,
  type CommandRef,
  type Condition,
  type DefinedPlugin,
  type EntityDef,
  type EntityUi,
  type EntityRef,
  type Game,
  type GameState,
  type PluginContext,
  type PluginProblem,
  type Reference,
  type RenderedChoice,
  type TraitDef,
  type Ui,
} from '@ifloom/engine'
import { CONTENT_VERSION, contentMigrations, COMMAND_VERSION, commandMigrations } from './upgrade.ts'

/** One way a conversation can open: the scene, while `when` holds, with its button's label. */
export type TalkOption = { scene: string; when?: Condition; label?: string }

/** What the `cast/person` trait holds: what makes an entity someone the player can meet, find and talk to. */
export type Person = {
  /** Prose tokens are filled in, as in the entity's name. The name if left out. */
  fullName?: string
  /** For prose that needs them: `{ they: 'she', them: 'her', … }`. The engine gives them no meaning. */
  pronouns?: Record<string, string>
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
}

declare module '@ifloom/engine' {
  interface Traits {
    'cast/person': Person
  }
}

/**
 * What `person()` takes: an entity's fields (its `of` is `'character'` if
 * left out; its `desc` is the line under their name, "Runs the café", and
 * its `image` their portrait) and the `cast/person` trait's, side by side.
 */
export type PersonDef = Omit<EntityDef, 'of'> & Person & { of?: string }

export type CastOptions = {
  /** The kind the plugin brings for its people, and the kind a bare id names (`'ava'` is `'character:ava'`). `character` if left out. */
  kind?: string
  /** What one of them is called, for the kind's label. `Person` if left out. */
  label?: string
  /** For more than one. `People` if left out. */
  plural?: string
}

/** One person as the UI draws them. */
export type PersonView = {
  /** Their id, as `talk('ava')` names them; the whole reference for a person of another kind than the cast's. */
  id: string
  /** As content names them: `'character:ava'`. */
  ref: EntityRef
  name: string
  fullName: string
  /** Their entity's `desc`, tokens filled: "Runs the café". */
  desc: string | null
  /** Their entity's presentation hints, as written (the React UI's `hue`, say); left out with none. */
  ui?: Ui<EntityUi>
  /** The portrait's path: the entity's `image`, else `<kind>/<id>`. Typed as every plugin's portrait is, though the cast always gives one. */
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
const PERSON = 'cast/person'
const KIND = 'character'

/** Where they are when nowhere on the map. */
export const OFFSTAGE = 'offstage'

/**
 * Everyone the game has with the `cast/person` trait, as references. Given
 * only the game, the people content declares, in its order; given a state
 * too, everyone in the game now, those made in play included.
 */
export function peopleOf(game: Game, state?: GameState): EntityRef[] {
  return withTrait(game, PERSON, state)
}

/** The `cast/person` trait of someone in the game, read through what they were made `like`; undefined for anyone else. */
export function personOf(state: GameState, game: Game, ref: EntityRef): Person | undefined {
  return entityOf(state, game, ref) ? entityTrait(state, game, ref, PERSON) : undefined
}

/** Someone's presentation hints, as a view's `ui` field: left out with none. */
function uiOf(state: GameState, game: Game, ref: EntityRef): { ui?: Ui<EntityUi> } {
  const ui = entityUi(state, game, ref)
  return ui ? { ui } : {}
}

/** One or several, as a list: `character: 'ava'` or `character: ['ava', 'sam']`. */
function ids(value: unknown): string[] {
  return (Array.isArray(value) ? value : value === undefined ? [] : [value]).map(String)
}

const PERSON_FIELDS = ['fullName', 'pronouns', 'home', 'schedule', 'talk', 'call', 'storyline', 'met'] as const

const talkOptions = (person: Person): TalkOption[] => (typeof person.talk === 'string' ? [{ scene: person.talk }] : (person.talk ?? []))

/** Build the plugin. It asks the places plugin where the player is, by name, wherever each is listed. */
export function cast(options: CastOptions = {}): DefinedPlugin<null, CastView> {
  const kind = options.kind ?? KIND
  /** Who a call names: a bare id is one of the cast's kind, a reference (what `'$'` becomes) is as written. */
  const refOf = (id: string): EntityRef => (id.includes(':') || id === '$' ? id : `${kind}:${id}`)
  const who = (value: unknown) => ids(value).map(refOf)
  /** How the plugin names someone back: their id for one of its kind, else the whole reference. */
  const short = (ref: EntityRef) => (parseRef(ref)?.kind === kind ? parseRef(ref)!.id : ref)

  type One = { ref: EntityRef; person: Person }
  const one = (state: GameState, game: Game, ref: EntityRef | undefined): One | undefined => {
    const person = ref === undefined ? undefined : personOf(state, game, ref)
    return person && ref !== undefined ? { ref, person } : undefined
  }
  const everyone = (state: GameState, game: Game): One[] => peopleOf(game, state).flatMap((ref) => one(state, game, ref) ?? [])

  const holdsFor = (state: GameState, game: Game, them: One, when: Condition | undefined) => holds(state, bindCurrent(when, them.ref), game)

  function locationOf(state: GameState, game: Game, them: One): string {
    for (const block of them.person.schedule ?? []) if (holdsFor(state, game, them, block.when)) return block.location
    return them.person.home ?? OFFSTAGE
  }
  const playerAt = (context: PluginContext<null>) => context.query<string | null>('places/here') ?? null
  const isHere = (state: GameState, context: PluginContext<null>, them: One) => {
    const at = playerAt(context)
    return at !== null && locationOf(state, context.game, them) === at
  }
  const talkOption = (state: GameState, game: Game, them: One) => talkOptions(them.person).find((option) => holdsFor(state, game, them, option.when))
  const closed = (state: GameState, them: One) => them.person.storyline !== undefined && !storylineOpen(state, them.person.storyline)
  const met = (state: GameState, game: Game, them: One) =>
    them.person.met !== undefined
      ? holdsFor(state, game, them, them.person.met)
      : [...talkOptions(them.person).map((option) => option.scene), them.person.call?.scene].some((scene) => scene && (state.seen?.[scene]?.n ?? 0) > 0)
  const portraitOf = (state: GameState, game: Game, ref: EntityRef) => {
    const parts = parseRef(ref)!
    return artSrc(entityImage(state, game, ref) ?? `${parts.kind}/${parts.id}`)
  }
  /** A name as this save shows it: its tokens filled, so `'{{partnerName}}'` is what the player typed. */
  const nameOf = (state: GameState, game: Game, them: One) => entityName(state, game, them.ref)
  const fullNameOf = (state: GameState, game: Game, them: One) =>
    them.person.fullName !== undefined ? fillTokens(them.person.fullName, state, game) : nameOf(state, game, them)
  /** Their entity's `desc`, tokens filled: "Runs the café". */
  const descOf = (state: GameState, game: Game, them: One) => entityDesc(state, game, them.ref) ?? null

  function talkBlocked(state: GameState, context: PluginContext<null>, ref: EntityRef | undefined): string | undefined {
    const { game } = context
    if (state.sceneId) return say(game, 'finishFirst')
    const them = one(state, game, ref)
    if (!them) return say(game, `${ID}/noSuchPerson`)
    if (!isHere(state, context, them)) return say(game, `${ID}/notHere`, { name: nameOf(state, game, them) })
    if (closed(state, them)) return say(game, `${ID}/notTaking`, { name: nameOf(state, game, them) })
    if (!talkOption(state, game, them)) return say(game, `${ID}/nothingToSay`, { name: nameOf(state, game, them) })
    return undefined
  }

  function callBlocked(state: GameState, game: Game, ref: EntityRef | undefined): string | undefined {
    if (state.sceneId) return say(game, 'finishFirst')
    const them = one(state, game, ref)
    if (!them) return say(game, `${ID}/noSuchPerson`)
    const call = them.person.call
    if (!call) return say(game, `${ID}/cannotCall`, { name: nameOf(state, game, them) })
    if (closed(state, them)) return say(game, `${ID}/notTaking`, { name: nameOf(state, game, them) })
    if (!holdsFor(state, game, them, call.when)) return call.busy ?? say(game, `${ID}/notPickingUp`, { name: nameOf(state, game, them) })
    return undefined
  }

  function viewOf(state: GameState, context: PluginContext<null>, them: One): PersonView {
    const { game } = context
    const option = talkOption(state, game, them)
    const id = short(them.ref)
    return {
      id,
      ref: them.ref,
      name: nameOf(state, game, them),
      fullName: fullNameOf(state, game, them),
      desc: descOf(state, game, them),
      ...uiOf(state, game, them.ref),
      portrait: portraitOf(state, game, them.ref),
      here: isHere(state, context, them),
      closed: closed(state, them),
      met: met(state, game, them),
      actions: them.person.talk ? [renderAction(state, game, { id: `talk-${id}`, label: option?.label ?? say(game, `${ID}/talk`), command: talk(id) })] : [],
    }
  }

  const personTrait: TraitDef<'cast/person'> = {
    id: PERSON,
    check: (data, { game }) => {
      const problems: string[] = []
      if (data?.call && !data.call.scene && !talkOptions(data).length)
        problems.push('can be called, but a call opens no scene: give call a scene, or them a talk')
      // Places are the places plugin's, asked by name; without it there is no map to check against.
      const askPlaces = pluginQuery(game, 'places/known')
      if (askPlaces) {
        const blank = startingState(game)
        for (const place of [data?.home, ...(data?.schedule ?? []).map((block) => block.location)]) {
          if (place !== undefined && place !== OFFSTAGE && !askPlaces(blank, { location: place })) problems.push(`unknown location "${place}"`)
        }
      }
      return problems
    },
    // Inside their own conditions, `'$'` is them.
    references: (data, { ref }) => {
      const options = talkOptions(data ?? {})
      return [
        { within: 'talk', refs: options.map((option) => ({ scene: option.scene, as: 'open' as const })) },
        { within: 'call', refs: data?.call?.scene ? [{ scene: data.call.scene, as: 'open' as const }] : [] },
        ...(data?.storyline !== undefined ? [{ storyline: data.storyline }] : []),
        ...[...(data?.schedule ?? []).map((block) => block.when), ...options.map((option) => option.when), data?.call?.when, data?.met].map(
          (when): Reference => ({ when: bindCurrent(when, ref) }),
        ),
      ]
    },
  }

  return definePlugin<null, CastView>({
    id: ID,
    version: 1,
    contentVersion: CONTENT_VERSION,
    contentMigrations,
    commandVersion: COMMAND_VERSION,
    commandMigrations,
    // Where the player is comes from places; a schedule may ask the calendar.
    cooperates: ['places', 'calendar'],
    traits: [personTrait],
    strings: {
      talk: 'Talk',
      noSuchPerson: 'There is no such person.',
      notHere: '{name} is not here.',
      notTaking: '{name} is not taking this right now.',
      nothingToSay: '{name} has nothing to say just now.',
      cannotCall: 'You cannot reach {name} from here.',
      notPickingUp: '{name} does not pick up.',
    },
    // Each of the cast's kind is one particular person, listed in the view once the player has met them.
    kinds: [{ id: kind, label: options.label ?? 'Person', plural: options.plural ?? 'People', unique: true, listed: { [`${ID}/met`]: { character: '$' } } }],
    conditions: {
      /** `{ 'cast/here': { character: 'ava' } }`: in the room with the player; with a list, any of them. */
      here: (state, args, context) =>
        who(args.character).some((ref) => {
          const them = one(state, context.game, ref)
          return them ? isHere(state, context, them) : false
        }),
      /** `{ 'cast/at': { character: 'ava', at: ['park'] } }`: where someone is, whoever else is there. */
      at: (state, args, { game }) => {
        const them = one(state, game, who(args.character)[0])
        return them ? ids(args.at).includes(locationOf(state, game, them)) : false
      },
      /** `{ 'cast/met': { character: 'ava' } }`: the player has met them; with a list, any of them. */
      met: (state, args, { game }) =>
        who(args.character).some((ref) => {
          const them = one(state, game, ref)
          return them ? met(state, game, them) : false
        }),
    },
    commands: {
      /** `{ 'cast/talk': { id } }`: start a conversation with someone here. */
      talk: {
        whyNot: (state, args, context) => talkBlocked(state, context, who(args.id)[0]),
        run: (state, args, { game }) => {
          const them = one(state, game, who(args.id)[0])!
          return { ...state, sceneId: talkOption(state, game, them)!.scene }
        },
      },
      /** `{ 'cast/call': { id } }`: reach someone from anywhere. */
      call: {
        whyNot: (state, args, { game }) => callBlocked(state, game, who(args.id)[0]),
        run: (state, args, { game }) => {
          const them = one(state, game, who(args.id)[0])!
          return { ...state, sceneId: them.person.call?.scene ?? talkOption(state, game, them)?.scene ?? talkOptions(them.person)[0]?.scene ?? null }
        },
      },
    },
    queries: {
      /** `{ id, name, portrait, ui }` of someone (`{ character }`), or undefined. */
      person: (state, args, { game }) => {
        const them = one(state, game, who(args.character)[0])
        return them
          ? { id: short(them.ref), name: nameOf(state, game, them), portrait: portraitOf(state, game, them.ref), ...uiOf(state, game, them.ref) }
          : undefined
      },
      /** The ids of everyone in the room. */
      present: (state, _args, context) =>
        everyone(state, context.game)
          .filter((them) => isHere(state, context, them))
          .map((them) => short(them.ref)),
      /** Where someone is (`{ character }`). */
      where: (state, args, { game }) => {
        const them = one(state, game, who(args.character)[0])
        return them ? locationOf(state, game, them) : undefined
      },
      /** Everyone met who can be called, each with the call command and why it can't go through now. */
      contacts: (state, _args, { game }) =>
        everyone(state, game)
          .filter((them) => them.person.call && met(state, game, them))
          .map((them) => ({
            id: short(them.ref),
            name: nameOf(state, game, them),
            desc: descOf(state, game, them),
            portrait: portraitOf(state, game, them.ref),
            command: call(short(them.ref)),
            disabled: whyNot(state, game, call(short(them.ref))),
          })),
    },
    speaker: (id, state, { game }) => {
      const them = one(state, game, refOf(id))
      return them ? { id, name: nameOf(state, game, them), portrait: portraitOf(state, game, them.ref), ...uiOf(state, game, them.ref) } : undefined
    },
    view: (state, context): CastView => {
      const { game } = context
      const idle = !state.sceneId && !lockedOut(state, game)
      const all = everyone(state, game)
      return {
        present: idle ? all.filter((them) => isHere(state, context, them)).map((them) => viewOf(state, context, them)) : [],
        people: all.filter((them) => met(state, game, them)).map((them) => viewOf(state, context, them)),
      }
    },
    references: {
      // The people a call names: a condition's `character`, a command's `id`. `'$'` and `'character:*'` (what it is checked as) name nobody in particular.
      calls: (kindOf, _name, args) => (kindOf === 'conditions' ? who(args.character) : who(args.id)).map((entity): Reference => ({ entity })),
    },
    check: (game) => {
      const problems: PluginProblem[] = []
      // Characters were a list in the plugin's content; now each is an entity with the person trait.
      for (const entry of (game.data?.[ID] as { characters?: { id?: string }[] } | undefined)?.characters ?? []) {
        problems.push({
          list: 'characters',
          id: String(entry?.id ?? ''),
          what: `characters are entities now: write them in entities with person({ id, name, ... })`,
        })
      }
      return problems
    },
  })
}

/**
 * A person, for content's `entities`: an entity of the kind `character`
 * (or `of`) carrying the `cast/person` trait, with the entity's fields and
 * the trait's written side by side.
 *
 * ```ts
 * entities: [person({ id: 'ava', name: 'Ava', desc: 'Runs the café', home: 'park', talk: 'ava.hi' })]
 * ```
 */
export function person(def: PersonDef): EntityDef {
  const { of, traits, ...rest } = def
  const entity: Record<string, unknown> = {}
  const trait: Record<string, unknown> = {}
  for (const [field, value] of Object.entries(rest)) {
    if (value === undefined) continue
    if ((PERSON_FIELDS as readonly string[]).includes(field)) trait[field] = value
    else entity[field] = value
  }
  return { ...(entity as Omit<EntityDef, 'of'>), of: of ?? KIND, traits: { ...traits, [PERSON]: trait as Person } }
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
/** How content names a character's entity, for `of`, `at` and `entity`: `character('ava')` is `'character:ava'`. */
export const character = (who: string, kind = KIND): EntityRef => `${kind}:${who}`
