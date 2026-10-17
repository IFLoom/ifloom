/**
 * Small Town, put together: the content pack over a base that says how the
 * game runs — where it starts, its rules, its plugins.
 */
import { applyEffects, describeProblem, loadGame, startingState, type Game, type Pack } from '@ifloom/engine'
import { achievements } from '@ifloom/plugin-achievements'
import { calendar } from '@ifloom/plugin-calendar'
import { at, places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import { debug } from '@ifloom/plugin-debug'
import { effects } from '@ifloom/plugin-effects'
import { generators } from '@ifloom/plugin-generators'
import { jobs } from '@ifloom/plugin-jobs'
import { quests } from '@ifloom/plugin-quests'
import { shop } from '@ifloom/plugin-shop'
import { wardrobe } from '@ifloom/plugin-wardrobe'
import { phone } from '@ifloom/phone'
import { openApp } from '@ifloom/plugin-devices'
import { custom } from './content/custom.ts'
import { town } from './content/town.ts'

/** The town's calendar: a turn is a day, and a new game starts on the night you move in. */
export const clock = calendar({ start: { day: 0, period: 'night' } })

/** The phone: texts and a social feed, plus the game's own camera, with buttons for each photo. */
const kit = phone({
  sidebar: true,
  apps: [
    {
      id: 'camera',
      name: 'Camera',
      icon: 'camera',
      sections: [
        {
          actions: [
            { id: 'photo-ava', label: 'Photograph Ava', command: { type: 'activity', id: 'photo-ava' } },
            { id: 'photo-sam', label: 'Photograph Sam', command: { type: 'activity', id: 'photo-sam' } },
            { id: 'post', label: 'Post your latest photo', command: { type: 'activity', id: 'post' } },
          ],
        },
      ],
    },
    { id: 'notes', name: 'Notes', icon: 'notes', sections: [{ collection: 'notes' }] },
  ],
})

/**
 * Build the game. `withDebug` adds the debugger; leave it off in a release
 * build. `mods` are the packs of the player's mods, loaded over the town.
 */
export function smallTown({ withDebug = false, mods = [] as Pack[] } = {}): { game: Game; problems: string[] } {
  const { game, problems } = loadGame([town, ...mods], {
    id: 'small-town',
    title: 'Small Town',
    introScene: 'intro',
    startPhase: 'arrival',
    custom,
    collections: kit.collections,
    // The calendar first, so every other plugin sees the new day when one begins.
    plugins: [
      clock,
      // After the calendar, so the header reads "Day 1 · Monday morning · Your flat".
      places({ start: 'flat' }),
      cast(),
      ...kit.plugins,
      quests(),
      effects(),
      achievements(),
      shop(),
      jobs(),
      generators(),
      wardrobe({ slots: [{ id: 'coat', label: 'Coat' }, { id: 'neck', label: 'Neck' }], start: { coat: 'raincoat' } }),
      ...(withDebug ? [debug()] : []),
    ],
    actions: [{ id: 'wait', label: 'Wait a while', command: { type: 'activity', id: 'wait' } }],
    strings: { 'ui.quests': 'To do' },
    rules: {
      // A coffee and a post a day; each new day (a turn, here) resets them.
      resets: { hadCoffee: false, postedToday: false },
      // Energy back to full overnight.
      turn: () => ({ effects: [{ kind: 'setStat', key: 'energy', to: 100 }] }),
      locks: [
        // Moving day only moves through its scene.
        { when: { phase: ['arrival'] }, deny: ['*'], except: ['choose', 'input'], reason: 'Unpack first.' },
        // No phone at work.
        { when: at('office'), deny: ['devices/*'], reason: 'Not at work.' },
      ],
    },
  })
  return { game, problems: problems.map(describeProblem) }
}

/** A command that opens the phone's camera, for tests and walkthroughs. */
export const openCamera = openApp('camera')

/** What `ifloom check` loads: the release build of the game, and its loader's problems. */
export default function release() {
  return smallTown()
}

/** Where `ifloom playtest` and `ifloom snapshot` start: moving day. */
export const start = (game: Game) => startingState(game)

/**
 * The states `ifloom snapshot` renders every scene and place in: moving day,
 * a first morning, and a week in with Ava as a friend, the cat named, the
 * raincoat off, a coffee inside you and people in the park.
 */
export function probes(game: Game) {
  const first = clock.write({ ...start(game), phase: 'open', sceneId: null, turn: 1 }, { day: 1, period: 'morning' })
  return [
    { name: 'moving-day', state: start(game) },
    { name: 'first-morning', state: first },
    {
      name: 'a-week-in',
      // Two of the day's park visitors, made as the park's trigger makes them.
      state: applyEffects({
        ...clock.write(first, { day: 7, period: 'afternoon' }),
        turn: 7,
        seen: { ...first.seen, 'ava.hi': 4 },
        kv: { catName: 'Biscuit' },
        entities: { ...first.entities, character: { ...first.entities.character, ava: { ...first.entities.character.ava, stats: { friendship: 30 } } } },
        stats: { ...first.stats, charm: 5 },
        plugins: {
          ...first.plugins,
          wardrobe: { version: 1, state: { worn: { coat: null, neck: null } } },
          // Still buzzing from the morning's coffee.
          effects: { version: 1, state: { active: [{ id: 'caffeinated', left: [2] }] } },
        },
      }, game, [{ kind: 'custom', name: 'generators/generate', with: { template: 'visitor', count: 2 } }]),
    },
  ]
}
