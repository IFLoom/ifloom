/**
 * A cast: the people of a game. Where each one is, by a schedule of
 * conditions; who is in the room with the player; talking to them and calling
 * them; and what the game keeps about each — a friendship, a debt, a grudge —
 * as stats the game declares on their kind of entity.
 *
 * The engine knows no characters. A person is an entity that carries the
 * `cast/person` trait, written with `cast.person({ ... })` in content's
 * `entities`: their name, `description` and `image` are the entity's, and their
 * schedule, talk and call are the trait's. The plugin brings the kind
 * `character`, which `cast.person()` uses, so a stat declared `of: 'character'` is
 * theirs: `{ stat: 'friendship', of: 'character:ava', gte: 25 }`. Inside a
 * person's own conditions, `'$'` is them.
 *
 * With the places plugin, a person is here when their schedule puts them
 * where the player is. Without it, nobody is ever here, but calls still work.
 */
import {
  artSrc,
  entityDescription,
  entityImage,
  entityName,
  fillTokens,
  holds,
  parseRef,
  pluginQuery,
  startingState,
  storylineOpen,
  stringOf,
  whyNot,
  type CommandRef,
  type Condition,
  type EntityDef,
  type EntityRef,
  type EntityUi,
  type Game,
  type GameState,
  type RenderedChoice,
  type Ui,
} from '@ifloom/engine'
import {
  arg,
  bindCurrent,
  defineCalls,
  definePlugin,
  defineTraitKind,
  entityUi,
  lockedOut,
  renderAction,
  speakerOf,
  type CommandsOf,
  type ConditionsOf,
  type DefinedPlugin,
  type PluginContext,
  type Reference,
  type TraitDef,
} from '@ifloom/engine/plugin'

/** A way a conversation with a person can open, one entry of a person's `talk`. The first entry whose `when` holds opens. */
export type TalkOption = {
  /** The id of the scene the conversation opens. */
  scene: string
  /** The option's condition, with `'$'` as the person. The option always holds if left out. */
  when?: Condition
  /** The talk button's label for this option. The `cast/talk` string ("Talk") if left out. */
  label?: string
}

/**
 * The data the `cast/person` trait holds, which makes an entity a person the player can meet, find and talk to.
 * `cast.person({ ... })` writes it beside the entity's own fields.
 */
export type Person = {
  /** The person's full name, with prose tokens filled in. The entity's name if left out. */
  fullName?: string
  /** The person's pronouns for prose, such as `{ they: 'she', them: 'her' }`. The engine gives them no meaning. */
  pronouns?: Record<string, string>
  /** The id of the location the person is at when no schedule entry holds. `AWAY`, which is no location, if left out. */
  home?: string
  /** The person's schedule, each entry a location and its condition. The first entry whose `when` holds places them, with `'$'` as the person. */
  schedule?: { location: string; when?: Condition }[]
  /**
   * The scene that talking to the person opens, or several options of which the first whose `when` holds opens. The
   * person can't be talked to if left out.
   */
  talk?: string | TalkOption[]
  /**
   * The settings for calling the person from anywhere. The person can't be called if left out.
   *
   * `scene` is the scene a call opens, the talk scene if left out. `when` is the condition for picking up, and `busy`
   * is the reason shown while it doesn't hold.
   */
  call?: { scene?: string; when?: Condition; busy?: string }
  /** The person's storyline. While it is closed, the person won't talk or pick up. */
  storyline?: string
  /** The condition for the player having met the person. Having seen one of their talk or call scenes if left out. */
  met?: Condition
  /**
   * The person's face for avatars, a path in the game's `art/` folder. The entity's `image` if left out.
   *
   * A UI shows it where it renders the person small, such as in a thread, a post or a contact.
   */
  portrait?: string
}

declare module '@ifloom/engine' {
  interface TraitRegistry {
    'cast/person': Person
  }
}

/**
 * A person the game declares in `entities` with `cast.person({ ... })`. It holds an entity's fields and the
 * `cast/person` trait's side by side.
 *
 * The entity's `description` is the line under the person's name, such as "Runs the café", and its `image` is their
 * picture.
 */
export type PersonDef = Omit<EntityDef, 'of'> &
  Person & {
    /** The person's kind. The cast's own kind (`character`, or the `kind` option) if left out. */
    of?: string
  }

/** Settings for `cast()`. Every field is optional and has the default its comment gives. */
export type CastOptions = {
  /** The kind the plugin brings for its people, which a bare id names (`'ava'` is `'character:ava'`). `character` if left out. */
  kind?: string
}

/** A person as the player sees them, in `view.plugins.cast`. Names and descriptions have their prose tokens filled in. */
export type PersonView = {
  /** The person's id, as `cast.talk('ava')` names them. It's the whole reference for a person of a kind other than the cast's. */
  id: string
  /** The person's entity reference, such as `'character:ava'`. */
  ref: EntityRef
  /** The person's name from their entity. */
  name: string
  /** The person's full name, or their name when they have none. */
  fullName: string
  /** The person's entity `description`, such as "Runs the café", or null when there is none. */
  description: string | null
  /** The person's entity presentation hints, such as the React UI's `hue`. Left out when there are none. */
  ui?: Ui<EntityUi>
  /**
   * The person's picture's path, through `artSrc`. It's the entity's `image`, else `<kind>/<id>`.
   *
   * The type allows null, as every plugin's picture does, though the cast always gives a path.
   */
  image: string | null
  /** The person's face for avatars, through `artSrc`. It's the trait's `portrait`, else their `image`. */
  portrait: string | null
  /** True when the person's schedule puts them at the location the player is at (`places/here`). */
  here: boolean
  /** True while the person's storyline is closed. */
  closed: boolean
  /** True when the player has met the person, by their `met` condition, else by having seen one of their talk or call scenes. */
  met: boolean
  /** The person's talk action, refused with its reason when it can't run. Empty when the person has no `talk`. */
  actions: RenderedChoice[]
}

/** The cast as the player sees it, in `view.plugins.cast`. */
export type CastView = {
  /** The people at the location the player is at. Empty while a scene is open or a lock that denies everything is on. */
  present: PersonView[]
  /** The people the player has met, in the order of `peopleOf`. */
  people: PersonView[]
}

/** The sender of a message or a post, as the `cast/sender` query answers. */
export type SenderView = {
  /** The sender's name. */
  name: string
  /** The sender's picture, or null. */
  image: string | null
  /** The sender's face for a small avatar, a person's `portrait`, or null. */
  portrait: string | null
}

/** A character the player can call, as the `cast/contacts` query answers. */
export type CastContact = {
  /** The character's id, as the cast names them, such as `'ava'`. */
  id: string
  /** The character's name. */
  name: string
  /** The character's description, a line about them, or null. */
  description: string | null
  /** The character's picture, through `artSrc`, or null. */
  image: string | null
  /** The character's face for a small avatar, or null. */
  portrait: string | null
  /** The cast's `cast/call` command for the character, in the short form. */
  command: CommandRef
  /** The reason the call can't go through now, or undefined when it can. */
  disabled: string | undefined
}

/**
 * What content writes for each of the plugin's calls (from `CALLS`), its
 * queries' answers and its view, so a call with a misspelled argument fails
 * to compile.
 */
declare module '@ifloom/engine' {
  interface ConditionRegistry extends ConditionsOf<typeof CALLS> {}
  interface CommandRegistry extends CommandsOf<typeof CALLS> {}
  interface QueryRegistry {
    /** Returns a character's face, their person's `portrait`, or undefined for none. */
    'cast/portrait': (args: { character: string }) => string | undefined
    /** Returns the characters the player has met who can be called. */
    'cast/contacts': () => CastContact[]
    /** Returns the {@link SenderView} of the entity a message or a post is from, with a person's `portrait` as the face. */
    'cast/sender': (args: { from: string }) => SenderView
    'cast/present': () => string[]
    'cast/where': (args: { character: string }) => string | undefined
  }
  interface ViewRegistry {
    cast: CastView
  }
}

const ID = 'cast'
const KIND = 'character'
/** Every field of the `cast/person` trait, which `cast.person()` puts in the trait. */
const PERSON_FIELDS = {
  fullName: true,
  pronouns: true,
  home: true,
  schedule: true,
  talk: true,
  call: true,
  storyline: true,
  met: true,
  portrait: true,
} as const
/** The people: entities carrying the `cast/person` trait, a bare id naming one of the `character` kind. A cast with another kind makes its own. */
const PEOPLE = defineTraitKind({ kind: KIND, trait: 'cast/person', fields: PERSON_FIELDS })
const PERSON = PEOPLE.trait

/** The plugin's calls, and what each takes. Each names someone by id (one of the cast's kind) or by reference. */
const CALLS = defineCalls(ID, {
  conditions: {
    /** In the room with the player; with a list, any of them. */
    here: { character: arg.strings() },
    /** Where someone is, whoever else is there: in one of these places. */
    at: { character: arg.string(), at: arg.strings() },
    /** The player has met them; with a list, any of them. */
    met: { character: arg.strings() },
  },
  commands: {
    /** Start a conversation with someone here. */
    talk: { id: arg.string() },
    /** Reach someone from anywhere. */
    call: { id: arg.string() },
  },
})

/** The location id a person is at when they are at no location, `'away'`. A person without `home` is here when no schedule entry holds. */
export const AWAY = 'away'

/**
 * Returns the entity references of every person in the game now, the entities carrying the `cast/person` trait.
 * Content's people come first in declared order, then those made in play.
 */
export function peopleOf(state: GameState, game: Game): EntityRef[] {
  return PEOPLE.all(state, game)
}

/**
 * Returns the `cast/person` trait of the entity `ref`, or undefined when it isn't a person. It reads through an entity
 * made in play `like` another.
 */
export function personOf(state: GameState, game: Game, ref: EntityRef): Person | undefined {
  return PEOPLE.get(state, game, ref)
}

/** Someone's presentation hints, as a view's `ui` field: left out with none. */
function uiOf(state: GameState, game: Game, ref: EntityRef): { ui?: Ui<EntityUi> } {
  const ui = entityUi(state, game, ref)
  return ui ? { ui } : {}
}

const talkOptions = (person: Person): TalkOption[] => (typeof person.talk === 'string' ? [{ scene: person.talk }] : (person.talk ?? []))

/** Build the plugin. It asks the places plugin where the player is, by name, wherever each is listed. */
function castPlugin(options: CastOptions = {}): DefinedPlugin<null, CastView> {
  const kind = options.kind ?? KIND
  const people = kind === KIND ? PEOPLE : defineTraitKind({ kind, trait: PERSON, fields: PERSON_FIELDS })
  /** Who a call names: a bare id is one of the cast's kind, a reference (and `'$'`, which becomes one) is as written. */
  const refOf = (id: string): EntityRef => (id === '$' ? (id as EntityRef) : people.ref(id))
  const who = (ids: readonly string[]) => ids.map(refOf)
  /** How the plugin names someone back: their id for one of its kind, else the whole reference. */
  const short = (ref: EntityRef) => people.id(ref)

  type One = { ref: EntityRef; person: Person }
  const one = (state: GameState, game: Game, ref: EntityRef | undefined): One | undefined => {
    const person = ref === undefined ? undefined : personOf(state, game, ref)
    return person && ref !== undefined ? { ref, person } : undefined
  }
  const everyone = (state: GameState, game: Game): One[] => peopleOf(state, game).flatMap((ref) => one(state, game, ref) ?? [])

  const holdsFor = (state: GameState, game: Game, them: One, when: Condition | undefined) => holds(state, game, bindCurrent(when, them.ref))

  function placeOf(state: GameState, game: Game, them: One): string {
    for (const block of them.person.schedule ?? []) if (holdsFor(state, game, them, block.when)) return block.location
    return them.person.home ?? AWAY
  }
  const playerAt = (context: PluginContext<null>) => context.query<string | null>('places/here') ?? null
  const isHere = (state: GameState, context: PluginContext<null>, them: One) => {
    const at = playerAt(context)
    return at !== null && placeOf(state, context.game, them) === at
  }
  const talkOption = (state: GameState, game: Game, them: One) => talkOptions(them.person).find((option) => holdsFor(state, game, them, option.when))
  const closed = (state: GameState, them: One) => them.person.storyline !== undefined && !storylineOpen(state, them.person.storyline)
  const met = (state: GameState, game: Game, them: One) =>
    them.person.met !== undefined
      ? holdsFor(state, game, them, them.person.met)
      : [...talkOptions(them.person).map((option) => option.scene), them.person.call?.scene].some((scene) => scene && (state.seen?.[scene]?.n ?? 0) > 0)
  const imageOf = (state: GameState, game: Game, ref: EntityRef) => {
    const parts = parseRef(ref)!
    return artSrc(entityImage(state, game, ref) ?? `${parts.kind}/${parts.id}`)
  }
  const portraitOf = (state: GameState, game: Game, them: One) =>
    them.person.portrait !== undefined ? artSrc(them.person.portrait) : imageOf(state, game, them.ref)
  /** A name as this save shows it: its tokens filled, so `'{{partnerName}}'` is what the player typed. */
  const nameOf = (state: GameState, game: Game, them: One) => entityName(state, game, them.ref)
  const fullNameOf = (state: GameState, game: Game, them: One) =>
    them.person.fullName !== undefined ? fillTokens(state, game, them.person.fullName) : nameOf(state, game, them)
  /** Their entity's `description`, tokens filled: "Runs the café". */
  const descriptionOf = (state: GameState, game: Game, them: One) => entityDescription(state, game, them.ref) ?? null

  function talkBlocked(state: GameState, context: PluginContext<null>, ref: EntityRef | undefined): string | undefined {
    const { game } = context
    if (state.sceneId) return stringOf(game, 'finishFirst')
    const them = one(state, game, ref)
    if (!them) return stringOf(game, `${ID}/noSuchPerson`)
    if (!isHere(state, context, them)) return stringOf(game, `${ID}/notHere`, { name: nameOf(state, game, them) })
    if (closed(state, them)) return stringOf(game, `${ID}/notTaking`, { name: nameOf(state, game, them) })
    if (!talkOption(state, game, them)) return stringOf(game, `${ID}/nothingToSay`, { name: nameOf(state, game, them) })
    return undefined
  }

  function callBlocked(state: GameState, game: Game, ref: EntityRef | undefined): string | undefined {
    if (state.sceneId) return stringOf(game, 'finishFirst')
    const them = one(state, game, ref)
    if (!them) return stringOf(game, `${ID}/noSuchPerson`)
    const call = them.person.call
    if (!call) return stringOf(game, `${ID}/cannotCall`, { name: nameOf(state, game, them) })
    if (closed(state, them)) return stringOf(game, `${ID}/notTaking`, { name: nameOf(state, game, them) })
    if (!holdsFor(state, game, them, call.when)) return call.busy ?? stringOf(game, `${ID}/notPickingUp`, { name: nameOf(state, game, them) })
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
      description: descriptionOf(state, game, them),
      ...uiOf(state, game, them.ref),
      image: imageOf(state, game, them.ref),
      portrait: portraitOf(state, game, them),
      here: isHere(state, context, them),
      closed: closed(state, them),
      met: met(state, game, them),
      actions: them.person.talk
        ? [renderAction(state, game, { id: `talk-${id}`, label: option?.label ?? stringOf(game, `${ID}/talk`), command: talk(id) })]
        : [],
    }
  }

  const personTrait: TraitDef<'cast/person'> = {
    id: PERSON,
    words: { fullName: true, pronouns: true, talk: [{ label: true }], call: { busy: true } },
    check: (data, { game }) => {
      const problems: string[] = []
      if (data?.call && !data.call.scene && !talkOptions(data).length)
        problems.push('can be called, but a call opens no scene: give call a scene, or them a talk')
      // Places are the places plugin's, asked by name; without it there is no map to check against.
      const askPlaces = pluginQuery<boolean>(game, 'places/known')
      if (askPlaces) {
        const blank = startingState(game)
        for (const place of [data?.home, ...(data?.schedule ?? []).map((block) => block.location)]) {
          if (place !== undefined && place !== AWAY && !askPlaces(blank, { location: place })) problems.push(`unknown location "${place}"`)
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
        ...(data?.portrait !== undefined ? [{ picture: data.portrait }] : []),
        ...[...(data?.schedule ?? []).map((block) => block.when), ...options.map((option) => option.when), data?.call?.when, data?.met].map(
          (when): Reference => ({ when: bindCurrent(when, ref) }),
        ),
      ]
    },
  }

  return definePlugin<null, CastView, typeof CALLS>({
    id: ID,
    version: 1,
    calls: CALLS,
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
    // Each of the cast's kind is one particular person, listed in the view once the player has met them. A game
    // that calls them something else redeclares the kind with its own label and plural, and keeps the rest.
    content: {
      kinds: [{ id: kind, label: 'Person', plural: 'People', unique: true, listed: { [`${ID}/met`]: { character: '$' } } }],
    },
    conditions: {
      /** `{ 'cast/here': { character: 'ava' } }`: in the room with the player; with a list, any of them. */
      here: (state, { character }, context) =>
        who(character).some((ref) => {
          const them = one(state, context.game, ref)
          return them ? isHere(state, context, them) : false
        }),
      /** `{ 'cast/at': { character: 'ava', at: ['park'] } }`: where someone is, whoever else is there. */
      at: (state, { character, at }, { game }) => {
        const them = one(state, game, refOf(character))
        // A place by its id, or by its reference (`location:park`), as a phrase's argument passes it.
        return them ? at.some((place) => (parseRef(place)?.id ?? place) === placeOf(state, game, them)) : false
      },
      /** `{ 'cast/met': { character: 'ava' } }`: the player has met them; with a list, any of them. */
      met: (state, { character }, { game }) =>
        who(character).some((ref) => {
          const them = one(state, game, ref)
          return them ? met(state, game, them) : false
        }),
    },
    values: {
      /** `{{cast/name character=ava}}`: someone's name as the player reads it; `''` for anyone not in the cast. */
      name: (state, args, { game }) => {
        const them = typeof args.character === 'string' ? one(state, game, refOf(args.character)) : undefined
        return them ? nameOf(state, game, them) : ''
      },
    },
    commands: {
      /** `{ 'cast/talk': { id } }`: start a conversation with someone here. */
      talk: {
        whyNot: (state, { id }, context) => talkBlocked(state, context, refOf(id)),
        run: (state, { id }, { game }) => {
          const them = one(state, game, refOf(id))!
          return { ...state, sceneId: talkOption(state, game, them)!.scene }
        },
      },
      /** `{ 'cast/call': { id } }`: reach someone from anywhere. */
      call: {
        whyNot: (state, { id }, { game }) => callBlocked(state, game, refOf(id)),
        run: (state, { id }, { game }) => {
          const them = one(state, game, refOf(id))!
          return { ...state, sceneId: them.person.call?.scene ?? talkOption(state, game, them)?.scene ?? talkOptions(them.person)[0]?.scene ?? null }
        },
      },
    },
    queries: {
      /** The ids of everyone in the room. */
      present: (state, _args, context) =>
        everyone(state, context.game)
          .filter((them) => isHere(state, context, them))
          .map((them) => short(them.ref)),
      /** Where someone is (`{ character }`). */
      where: (state, args, { game }) => {
        const them = one(state, game, refOf(String(args.character ?? '')))
        return them ? placeOf(state, game, them) : undefined
      },
      /** Someone's face for avatars (`{ character }`): the trait's `portrait`, else their picture, through `artSrc`; undefined for anyone not in the cast. */
      portrait: (state, args, { game }) => {
        const them = one(state, game, refOf(String(args.character ?? '')))
        return them ? portraitOf(state, game, them) : undefined
      },
      /**
       * Who a message or a post is from, as their entity is (`speakerOf`): its
       * name and picture, and a person's portrait as the face, else the picture.
       * An id that names no entity is the name as written, with no picture.
       */
      sender: (state, args, { game }) => {
        const from = String(args.from ?? '')
        const known = from ? speakerOf(state, game, from) : null
        if (!known) return { name: from, image: null, portrait: null }
        const them = one(state, game, known.ref)
        return { name: known.name, image: known.image, portrait: (them ? portraitOf(state, game, them) : undefined) ?? known.image }
      },
      /** Everyone met who can be called, each with the call command and why it can't go through now. */
      contacts: (state, _args, { game }) =>
        everyone(state, game)
          .filter((them) => them.person.call && met(state, game, them))
          .map((them) => ({
            id: short(them.ref),
            name: nameOf(state, game, them),
            description: descriptionOf(state, game, them),
            image: imageOf(state, game, them.ref),
            portrait: portraitOf(state, game, them),
            command: call(short(them.ref)),
            disabled: whyNot(state, game, call(short(them.ref))),
          })),
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
      // The people a call names, as entities of the kind this cast's options give, which its declaration can't know.
      // A condition's `character`, a command's `id`. `'$'` and `'character:*'` (what it is checked as) name nobody in particular.
      calls: (table, _name, args) =>
        who(CALLS.conditions.met.read({ character: table === 'conditions' ? args.character : args.id }).character).map((entity): Reference => ({ entity })),
    },
  })
}

/**
 * A person, for content's `entities`: an entity of the kind `character`
 * (or `of`) carrying the `cast/person` trait, with the entity's fields and
 * the trait's written side by side.
 *
 * ```ts
 * entities: [cast.person({ id: 'ava', name: 'Ava', description: 'Runs the café', home: 'park', talk: 'ava.hi' })]
 * ```
 */
function person(def: PersonDef): EntityDef {
  return PEOPLE.define(def)
}

/** The command that starts a conversation. */
const talk = (who: string): CommandRef => CALLS.commands.talk({ id: who })
/** The command that calls someone. */
const call = (who: string): CommandRef => CALLS.commands.call({ id: who })
/** True while any of these is in the room. */
const here = (...who: string[]): Condition => CALLS.conditions.here({ character: who })
/** True while this one is in one of these places. */
const isAt = (who: string, ...places: string[]): Condition => CALLS.conditions.at({ character: who, at: places })
/** True once the player has met any of these. */
const hasMet = (...who: string[]): Condition => CALLS.conditions.met({ character: who })
/** How content names a character's entity, for `of`, `at` and `entity`: `cast.character('ava')` is `'character:ava'`. */
const character = (who: string, kind = KIND): EntityRef => (kind === KIND ? PEOPLE.ref(who) : (`${kind}:${who}` as EntityRef))

/**
 * Returns the cast plugin, for the game's `plugins`. It cooperates with places, which says where the player is, and
 * with the calendar, which a schedule can ask.
 *
 * Its helpers write people and calls, such as `cast.person({ ... })`, `cast.talk('ava')` and `cast.call('ava')`.
 */
export const cast = Object.assign(castPlugin, {
  /**
   * Returns an entity of the kind `character` (or `of`) carrying the `cast/person` trait, for content's `entities`.
   * It takes a {@link PersonDef}, the entity's fields and the trait's side by side.
   */
  person,
  /** Returns the entity reference of a person, such as `'character:ava'` for `cast.character('ava')`. Pass `kind` for a cast of another kind. */
  character,
  /** Returns the `cast/talk` command, which opens the person's talk scene while they are here. */
  talk,
  /** Returns the `cast/call` command, which opens the person's call scene from anywhere. */
  call,
  /** Returns the `cast/here` condition, which holds while any of the people named is at the player's location. */
  here,
  /** Returns the `cast/at` condition, which holds while the person is at any of the locations named. */
  at: isAt,
  /** Returns the `cast/met` condition, which holds once the player has met any of the people named. */
  met: hasMet,
})
