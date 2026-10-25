/**
 * Small Town, put together: its content, with a base that says how the game
 * runs, with where it starts, its rules and its plugins. This file only
 * assembles. What the whole town shares is in `world/`, one file per kind,
 * and the story is in `story/`, one file per place or arc, its prose beside
 * it. The game's own code is in `rules.ts`.
 */
import { applyEffects, describeProblem, loadGame, startingState, type Content, type Game, type Pack } from '@ifloom/engine'
import { achievements } from '@ifloom/plugin-achievements'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { cheats } from '@ifloom/plugin-cheats'
import { debug } from '@ifloom/plugin-debug'
import { statuses } from '@ifloom/plugin-statuses'
import { generators } from '@ifloom/plugin-generators'
import { jobs } from '@ifloom/plugin-jobs'
import { quests } from '@ifloom/plugin-quests'
import { shop } from '@ifloom/plugin-shop'
import { wardrobe } from '@ifloom/plugin-wardrobe'
import { inventory } from '@ifloom/plugin-inventory'
import { unlocks } from '@ifloom/plugin-unlocks'
import { phone } from '@ifloom/phone'
import { openApp } from '@ifloom/plugin-devices'
import { rules } from './rules.ts'
import { stats } from './world/stats.ts'
import { things } from './world/things.ts'
import { cast as castContent } from './world/cast.ts'
import { settings } from './world/settings.ts'
import { actions } from './world/actions.ts'
import { camera, notes } from './world/phone.ts'
import { achievements as achievementsContent } from './world/achievements.ts'
import { cheats as cheatsContent } from './world/cheats.ts'
import { strings } from './world/strings.ts'
import { movingDay } from './story/moving-day.ts'
import { ava } from './story/ava.ts'
import { flat } from './story/flat.ts'
import { highStreet } from './story/high-street.ts'
import { cafe } from './story/cafe.ts'
import { park } from './story/park.ts'
import { office } from './story/office.ts'
import { sam } from './story/sam.ts'

/**
 * The town's content: what it all shares, then the story by arc and place.
 * Lists keep this order, so triggers fire in it, and the quest log, the job
 * board and the places list show things in it.
 */
export const content: Content[] = [
  strings,
  stats,
  things,
  castContent,
  settings,
  actions,
  achievementsContent,
  cheatsContent,
  movingDay,
  ava,
  flat,
  highStreet,
  cafe,
  park,
  office,
  sam,
]

/** The town's calendar: a turn is a day, and a new game starts on the night you move in. */
export const clock = calendar({ start: { day: 0, period: 'night' } })

/** The phone: texts and a social feed, plus the game's own camera, with buttons for each photo. */
export const kit = phone({ sidebar: true, apps: [camera, notes] })

/**
 * Build the game. `withDebug` adds the debugger; leave it off in a release
 * build. `unlocked` are the supporter packs the player's codes have opened
 * (from `unlockedPacks`), and `mods` the packs of the player's mods, loaded
 * over the town's content in that order.
 */
export function smallTown({ withDebug = false, unlocked = [] as Pack[], mods = [] as Pack[] } = {}): { game: Game; problems: string[] } {
  const { game, problems } = loadGame(
    // The phone's content before the town's: its `photo` kind, for the camera's photos, and the phone, its apps,
    // the texts and the feed, so the town's content or a mod can add an app.
    [kit.content, ...content],
    {
      id: 'small-town',
      title: 'Small Town',
      // The calendar first, so every other plugin sees the new day when one begins.
      plugins: [
        clock,
        // After the calendar, so the header reads "Day 1 · Monday morning · Your flat".
        places({ start: 'flat' }),
        cast(),
        ...kit.plugins,
        quests(),
        statuses(),
        achievements(),
        shop(),
        jobs(),
        generators(),
        wardrobe(),
        // Using, dropping and giving away what you hold: the sandwich, the paper.
        inventory(),
        // Cheats are for players; the debugger below is for the developer.
        cheats(),
        // Supporter codes: one opens a cheat and a scene.
        unlocks(),
        ...(withDebug ? [debug()] : []),
      ],
      rules,
    },
    // Packs go over the content: what the player's codes opened, then their mods.
    { packs: [...unlocked, ...mods] },
  )
  return { game, problems: problems.map(describeProblem) }
}

/** A command that opens the phone's camera, for tests and walkthroughs. */
export const openCamera = openApp('camera')

/**
 * What `ifloom check` loads: the release build of the game, and its loader's
 * problems. It passes the supporter content as `unlocked`, read from
 * src/unlocks/, to check the game with it too.
 */
export default function release({ unlocked = [] as Pack[] } = {}) {
  return smallTown({ unlocked })
}

/** Where `ifloom playtest` and `ifloom snapshot` start: moving day. */
export const start = (game: Game) => startingState(game)

/**
 * The states `ifloom snapshot` renders every scene and place in: moving day,
 * a first morning, and a week in with Ava as a friend, the cat named, the
 * raincoat off, a coffee inside you and people in the park.
 */
export function probes(game: Game) {
  const first = clock.write({ ...start(game), kv: { ...start(game).kv, phase: 'open' }, sceneId: null, turn: 1 }, { day: 1, period: 'morning' })
  return [
    { name: 'moving-day', state: start(game) },
    { name: 'first-morning', state: first },
    {
      name: 'a-week-in',
      // Two of the day's park visitors, made as the park's trigger makes them.
      state: applyEffects(
        {
          ...clock.write(first, { day: 7, period: 'afternoon' }),
          turn: 7,
          seen: { ...first.seen, 'ava.hi': { n: 4, first: 2, last: 6 } },
          kv: { catName: 'Biscuit' },
          // Only what play changed is saved: Ava's friendship.
          entities: { ...first.entities, character: { ava: { stats: { friendship: 30 } } } },
          stats: { ...first.stats, charm: 5 },
          plugins: {
            ...first.plugins,
            wardrobe: { version: 3, state: { worn: { player: { coat: null, neck: null } } } },
            // Still buzzing from the morning's coffee.
            statuses: { version: 1, state: { active: [{ id: 'caffeinated', left: [2] }] } },
          },
        },
        game,
        [{ kind: 'custom', name: 'generators/generate', with: { template: 'visitor', count: 2 } }],
      ),
    },
  ]
}
