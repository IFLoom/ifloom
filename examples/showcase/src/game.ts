/**
 * Small Town, put together: its content, with a base that says what the game
 * is and holds its code, its plugins and its rules. This file only
 * assembles. What the whole town shares is in `world/`, one file per kind,
 * and the story is in `story/`, one file per place or arc, its prose beside
 * it. The game's own code is in `rules.ts`.
 */
import { loadGame, type Content, type Game, type Pack, type Problem } from '@ifloom/engine'
import { defineGame, probe, type Probe, type ProbeStep } from '@ifloom/cli/game'
import { achievements } from '@ifloom/plugin-achievements'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { debug } from '@ifloom/plugin-debug'
import { statuses } from '@ifloom/plugin-statuses'
import { generators } from '@ifloom/plugin-generators'
import { jobs } from '@ifloom/plugin-jobs'
import { quests } from '@ifloom/plugin-quests'
import { shop } from '@ifloom/plugin-shop'
import { wardrobe } from '@ifloom/plugin-wardrobe'
import { inventory } from '@ifloom/plugin-inventory'
import { unlocks } from '@ifloom/plugin-unlocks'
import { devices } from '@ifloom/plugin-devices'
import { messages } from '@ifloom/plugin-messages'
import { feed } from '@ifloom/plugin-feed'
import { rules } from './rules.ts'
import { stats } from './world/stats.ts'
import { things } from './world/things.ts'
import { people } from './world/cast.ts'
import { settings } from './world/settings.ts'
import { actions } from './world/actions.ts'
import { phone } from './world/phone.ts'
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
  // The phone first: its `photo` kind, for the camera's photos, and the phone with its apps, the texts and the feed.
  phone,
  strings,
  stats,
  things,
  people,
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

/**
 * Build the game. `withDebug` adds the debugger; leave it off in a release
 * build. `unlocked` are the supporter packs the player's codes have opened
 * (from `unlockedPacks`), and `mods` the packs of the player's mods, loaded
 * over the town's content in that order.
 */
export function smallTown({ withDebug = false, unlocked = [] as Pack[], mods = [] as Pack[] } = {}): { game: Game; problems: Problem[] } {
  const { game, problems } = loadGame(
    content,
    {
      id: 'small-town',
      title: 'Small Town',
      // The calendar first, so every other plugin sees the new day when one begins.
      plugins: [
        clock,
        // After the calendar, so the header reads "Day 1 · Monday morning · Your flat".
        places({ start: 'flat' }),
        cast(),
        // The phone is these three, put together in world/phone.ts: devices for its apps, and the texts and the feed they show.
        devices(),
        messages(),
        feed(),
        quests(),
        statuses(),
        achievements(),
        shop(),
        jobs(),
        generators(),
        wardrobe(),
        // Using, dropping and giving away what you hold: the sandwich, the paper.
        inventory(),
        // Cheats and supporter codes, for players: one code opens a cheat and a scene. The debugger below is for the developer.
        unlocks(),
        ...(withDebug ? [debug()] : []),
      ],
      rules,
    },
    // Packs go over the content: what the player's codes opened, then their mods.
    { packs: [...unlocked, ...mods] },
  )
  return { game, problems }
}

/** A command that opens the phone's camera, for tests and walkthroughs. */
export const openCamera = devices.open('camera')

/** A day goes by, and Ava says hello on it: her scene opened and left, as the player does. */
const helloFromAva: ProbeStep[] = [{ turn: true }, { play: { type: 'scene', id: 'ava.hi' } }, { play: { type: 'leave' } }]

/**
 * The states `ifloom snapshot` renders every scene and place in, each made by
 * playing: moving day; the first morning, after unpacking and a night's
 * sleep; and a week in, with Ava's hello seen on four of its days, the cat
 * named, a friendship grown, the raincoat off, a coffee inside you and
 * people in the park.
 */
function probes(game: Game): Probe[] {
  const firstMorning = probe('first-morning', game, [{ play: { type: 'choose', id: 'unpack' } }, { play: calendar.sleep() }])
  const aWeekIn = probe(
    'a-week-in',
    game,
    [
      // Days 2, 3 and 4 with a hello each, a quiet day 5, a hello on day 6, then day 7's afternoon.
      ...helloFromAva,
      ...helloFromAva,
      ...helloFromAva,
      { turn: true },
      ...helloFromAva,
      { turn: true },
      { 'calendar/set': { period: 'afternoon' } },
      // The raincoat off, as the player takes it off.
      { play: { 'wardrobe/takeOff': { id: 'coat' } } },
      { kv: 'catName', to: 'Biscuit' },
      { stat: 'charm', to: 5 },
      { stat: 'friendship', of: 'character:ava', to: 30 },
      // Still buzzing from the morning's coffee.
      statuses.apply('caffeinated'),
      // Two of the day's park visitors, made as the park's trigger makes them.
      { 'generators/generate': { template: 'visitor', count: 2 } },
    ],
    firstMorning,
  )
  return [probe('moving-day', game, []), firstMorning, aWeekIn]
}

/**
 * What the command line reads: the release build of the town, with the
 * supporter content `ifloom check` passes as `unlocked`, read from
 * src/unlocks/; moving day as the start; and the states `ifloom snapshot`
 * renders every scene and place in.
 */
export default defineGame({
  build: ({ unlocked }) => smallTown({ unlocked }),
  probes,
})
