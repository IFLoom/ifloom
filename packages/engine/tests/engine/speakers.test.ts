import { describe, expect, it } from 'vitest'
import { definePlugin } from '../../src/plugin.ts'
import { startingState } from '../../src/intake.ts'
import { applyEffects } from '../../src/reduce.ts'
import { view } from '../../src/view.ts'
import { speakerOf } from '../../src/speakers.ts'
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
    { id: 'fence', speaker: 'ava', body: [{ text: 'fence' }], choices: [] },
    { id: 'garden', speaker: 'pet:tom', body: [{ text: 'garden' }], choices: [] },
    { id: 'nobody', speaker: 'mystery', body: [{ text: 'fence' }], choices: [] },
  ],
  prose: {
    fence: 'Ava: "Morning."\n\nYou: "Morning, Ava."\n\nSam: "Is it?"\n\nRuth: "Who asked?"',
    garden: 'Tom: "Mrrp."',
  },
}

const open = (scene: string, content: Content = lane, plugins = [] as never[]) => {
  const { game } = loadWhole([{ name: 'base' }, content], { id: 'lane', title: 'Lane', plugins })
  return { game, state: { ...startingState(game), sceneId: scene } }
}

const said = (beats: SceneBeat[]) => beats.flatMap((beat) => (beat.type === 'say' ? [[beat.who, beat.speaker ?? null, beat.text]] : []))

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

  it('put the entity a spoken line is written under on its beat, and the player’s word on the player’s line', () => {
    const { game, state } = open('fence')
    expect(said(view(state, game).scene.beats)).toEqual([
      ['character', 'character:ava', 'Morning.'],
      ['player', null, 'Morning, Ava.'],
      ['character', 'character:sam', 'Is it?'],
      ['character', null, 'Who asked?'],
    ])
  })

  it('read the player’s line in the game’s own word for them, and in the name of whoever they are playing', () => {
    const words: Content = { ...lane, strings: { you: 'Tú' }, prose: { ...lane.prose, fence: 'Tú: "Hola."\n\nYou: "Hi."\n\nSam: "Hola."' } }
    const { game, state } = open('fence', words)
    expect(said(view(state, game).scene.beats)).toEqual([
      ['player', null, 'Hola.'],
      ['character', null, 'Hi.'],
      ['character', 'character:sam', 'Hola.'],
    ])
    const playingSam = applyEffects(state, game, [{ you: 'character:sam' }])
    expect(said(view(playingSam, game).scene.beats)).toEqual([
      ['player', null, 'Hola.'],
      ['character', null, 'Hi.'],
      ['player', 'character:sam', 'Hola.'],
    ])
  })
})

describe('context.beats', () => {
  it('draws blocks as a scene’s body is, for a plugin’s view: words, speakers and styled spans, with the pool picks recorded', () => {
    const board = definePlugin<null, SceneBeat[]>({
      id: 'board',
      version: 1,
      view: (_state, context) => context.beats([{ text: 'board.note' }, { text: 'missing' }, { text: 'board.hidden', when: { kv: 'never' } }], 'board'),
    })
    const content: Content = { ...lane, prose: { ...lane.prose, 'board.note': 'A **lost** cat.\n\nAva: "Not mine."', 'board.hidden': 'Hidden.' } }
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
      { type: 'say', who: 'character', speaker: 'character:ava', text: 'Not mine.' },
    ])
  })
})
