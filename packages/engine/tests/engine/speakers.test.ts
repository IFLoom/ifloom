import { describe, expect, it } from 'vitest'
import { definePlugin } from '../../src/plugin.ts'
import { startingState } from '../../src/intake.ts'
import { applyEffects } from '../../src/reduce.ts'
import { view } from '../../src/view.ts'
import { speakerOf } from '../../src/speakers.ts'
import { checkGame } from '../../src/check.ts'
import { say } from '../../src/flow.ts'
import type { Content } from '../../src/loader.ts'
import type { SceneBeat } from '../../src/sceneBody.ts'
import { loadWhole } from '../fixtures/town.ts'

/** A lane with two neighbours, a cat, and a scene where they talk. */
const lane: Content = {
  name: 'lane',
  kinds: [
    { id: 'character', label: 'Neighbour', unique: true, ui: { hue: 120 } },
    { id: 'pet', label: 'Pet', unique: true },
  ],
  entities: [
    { id: 'ava', of: 'character', name: 'Ava', image: 'people/ava' },
    { id: 'sam', of: 'character', name: 'Sam' },
    { id: 'tom', of: 'pet', name: 'Tom' },
  ],
  scenes: [
    { id: 'fence', speaker: 'ava', body: [{ prose: 'fence' }], choices: [] },
    { id: 'garden', speaker: 'pet:tom', body: [{ prose: 'garden' }], choices: [] },
    { id: 'nobody', speaker: 'mystery', body: [{ prose: 'fence' }], choices: [] },
  ],
  prose: {
    fence: '@ava: "Morning."\n\n@you: "Morning, Ava."\n\n@character:sam: "Is it?"\n\nRuth: "Who asked?"',
    garden: '@tom: "Mrrp."',
  },
}

const open = (scene: string, content: Content = lane, plugins = [] as never[]) => {
  const { game } = loadWhole([{ name: 'base' }, content], { id: 'lane', title: 'Lane', plugins })
  return { game, state: { ...startingState(game), sceneId: scene } }
}

const said = (beats: SceneBeat[]) => beats.flatMap((beat) => (beat.type === 'say' ? [[beat.who, beat.speaker ?? null, beat.name ?? null, beat.text]] : []))

describe('speakers', () => {
  it('are entities: a bare id is a character, else the one entity with that id, and a reference is as written', () => {
    const fence = open('fence')
    expect(view(fence.state, fence.game).scene).toMatchObject({
      speaker: { id: 'ava', ref: 'character:ava', name: 'Ava', image: 'art/people/ava.jpg', ui: { hue: 120 } },
      image: 'art/people/ava.jpg',
    })
    const garden = open('garden')
    expect(view(garden.state, garden.game).scene.speaker).toEqual({ id: 'pet:tom', ref: 'pet:tom', name: 'Tom', image: null })
    expect(speakerOf(garden.state, garden.game, 'tom')?.ref).toBe('pet:tom')
    const nobody = open('nobody')
    expect(view(nobody.state, nobody.game).scene).toMatchObject({ speaker: null, image: null })
  })

  it('put the entity a spoken line is written under by id on its beat, with its name, and a label as written', () => {
    const { game, state } = open('fence')
    expect(said(view(state, game).scene.beats)).toEqual([
      ['character', 'character:ava', 'Ava', 'Morning.'],
      ['player', null, 'You', 'Morning, Ava.'],
      ['character', 'character:sam', 'Sam', 'Is it?'],
      ['character', null, 'Ruth', 'Who asked?'],
    ])
    const garden = open('garden')
    expect(said(view(garden.state, garden.game).scene.beats)).toEqual([['character', 'pet:tom', 'Tom', 'Mrrp.']])
  })

  it('show the player’s line under their name, the game’s word for them, or whoever they are playing', () => {
    const words: Content = { ...lane, strings: { you: 'Tú' }, prose: { ...lane.prose, fence: '@you: "Hola."\n\n@player: "Hi."\n\n@sam: "Hola."' } }
    const { game, state } = open('fence', words)
    expect(said(view(state, game).scene.beats)).toEqual([
      ['player', null, 'Tú', 'Hola.'],
      ['player', null, 'Tú', 'Hi.'],
      ['character', 'character:sam', 'Sam', 'Hola.'],
    ])
    const playingSam = applyEffects(state, game, [{ you: 'character:sam' }])
    expect(said(view(playingSam, game).scene.beats)).toEqual([
      ['player', 'character:sam', 'Sam', 'Hola.'],
      ['player', null, 'Tú', 'Hi.'],
      ['player', 'character:sam', 'Sam', 'Hola.'],
    ])
    // The name a save is listed under is the player's name, so a name the player typed shows on their lines.
    const named = { ...game, rules: { ...game.rules, saveName: () => 'Robin' } }
    expect(said(view(state, named).scene.beats).map((line) => line[2])).toEqual(['Robin', 'Robin', 'Sam'])
  })

  it('show an entity’s name as it is now, so a renamed or translated one reads right', () => {
    const translated: Content = { ...lane, entities: lane.entities!.map((entity) => (entity.id === 'ava' ? { ...entity, name: 'Ava-chan' } : entity)) }
    const { game, state } = open('fence', translated)
    expect(said(view(state, game).scene.beats)[0]).toEqual(['character', 'character:ava', 'Ava-chan', 'Morning.'])
  })

  it('are checked: an id that names no entity, or one that more than one kind has', () => {
    const content: Content = {
      ...lane,
      kinds: [...lane.kinds!, { id: 'stray', label: 'Stray', unique: true }],
      entities: [...lane.entities!, { id: 'pip', of: 'pet', name: 'Pip' }, { id: 'pip', of: 'stray', name: 'Pip' }],
      scenes: [{ id: 'garden', body: [{ prose: 'garden' }, say('nobody', 'Hm.'), say('player', 'Hm?')], choices: [] }],
      prose: { garden: '@nobody: "Hm."\n\n@pip: "Mew."\n\n@pet:tom: "Mrrp."\n\n@pet:rex: "Woof."\n\n@you: "Hi."' },
    }
    const { game } = loadWhole([{ name: 'base' }, content], { id: 'lane', title: 'Lane', plugins: [] })
    const problems = checkGame(game)
      .problems.map((problem) => problem.what)
      .filter((what) => what.includes('spoken line'))
    expect(problems).toEqual([
      'a spoken line is under "nobody", which names no entity',
      'a spoken line is under "nobody", which names no entity',
      'a spoken line is under "pip", which more than one kind has: name it as "kind:pip"',
      'a spoken line is under "pet:rex", which names no entity',
    ])
  })
})

describe('context.beats', () => {
  it('draws blocks as a scene’s body is, for a plugin’s view: words, speakers and styled spans, with the pool picks recorded', () => {
    const board = definePlugin<null, SceneBeat[]>({
      id: 'board',
      version: 1,
      view: (_state, context) => context.beats([{ prose: 'board.note' }, { prose: 'missing' }, { prose: 'board.hidden', when: { kv: 'never' } }], 'board'),
    })
    const content: Content = { ...lane, prose: { ...lane.prose, 'board.note': 'A **lost** cat.\n\n@ava: "Not mine."', 'board.hidden': 'Hidden.' } }
    const { game, state } = open('fence', content, [board as never])
    expect(view({ ...state, sceneId: null }, game).plugins.board).toEqual([
      {
        type: 'text',
        text: 'A lost cat.',
        spans: [
          { type: 'text', text: 'A ' },
          { type: 'bold', text: 'lost' },
          { type: 'text', text: ' cat.' },
        ],
      },
      { type: 'say', who: 'character', speaker: 'character:ava', name: 'Ava', text: 'Not mine.' },
    ])
  })
})
