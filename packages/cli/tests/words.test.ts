import { describe, expect, it } from 'vitest'
import { loadGame, text } from '@ifloom/engine'
import { wordsJson, wordsText } from '../src/words.ts'

describe('ifloom words', () => {
  const { game } = loadGame(
    [
      {
        name: 'cafe',
        introScene: 'counter',
        scenes: [
          {
            id: 'counter',
            title: 'The counter',
            body: [text('Ava looks up from the till.', { id: 'intro' })],
            choices: [{ id: 'leave', label: 'Leave', effects: [{ scene: null }] }],
          },
        ],
        actions: [{ id: 'wait', label: 'Wait a while', effects: [] }],
      },
    ],
    { id: 'cafe', title: 'Café' },
  )

  it('lists every field a player reads, with its words and where it is', () => {
    expect(wordsText(game).split('\n')).toEqual([
      'scene.counter.title: "The counter"  (scene counter)',
      'scene.counter.text.intro: "Ava looks up from the till."  (scene counter)',
      'scene.counter.choice.leave.label: "Leave"  (scene counter)',
      'action.wait.label: "Wait a while"  (action wait)',
      '4 fields to translate.',
    ])
  })

  it('writes them as a words table to translate from', () => {
    expect(JSON.parse(wordsJson(game))).toEqual({
      'scene.counter.title': 'The counter',
      'scene.counter.text.intro': 'Ava looks up from the till.',
      'scene.counter.choice.leave.label': 'Leave',
      'action.wait.label': 'Wait a while',
    })
  })
})
