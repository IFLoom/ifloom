/**
 * The Letter: a linear novel in three chapters, as small as IFLoom gets.
 *
 * No plugins, no places, no characters, no clock. What it uses is what a
 * novel with light tracking needs: a name the player types, one stat, choices
 * the engine remembers on its own (`{ chose }`), a kv key counted up
 * (`{ kind: 'kv', by }`), a chapter as a turn, a migration step for
 * saves from the game's first version, no saving until the reader has typed
 * a name, and endings that start the story over with `newGame`.
 */
import { SCHEMA, loadGame, startingState, type Game, type Pack } from '@ifloom/engine'

const readIt = { kind: 'kv', key: 'readBefore', to: true } as const

export const letter: Pack = {
  id: 'letter',
  schema: SCHEMA,
  stats: [{ id: 'courage', label: 'Courage', start: 1, max: 5 }],
  inputs: [{ id: 'playerName', label: 'Your name', kind: 'text', maxLength: 20, when: { not: { kv: 'playerName' } } }],
  scenes: [
    {
      id: 'ch1.mat',
      title: 'Chapter one: the mat',
      body: [
        { text: 'ch1.mat' },
        // Only in a New Game+, which carries `readBefore` over from a finished read.
        { text: 'ch1.mat.again', when: { kv: 'readBefore' } },
        { text: 'ch1.mat.named', when: { kv: 'playerName' } },
      ],
      choices: [
        {
          id: 'open',
          when: { kv: 'playerName' },
          effects: [{ kind: 'stat', stat: 'courage', by: 1 }, { kind: 'turn' }, { kind: 'scene', scene: 'ch2.stairs' }],
        },
        { id: 'shelf', when: { kv: 'playerName' }, effects: [{ kind: 'turn' }, { kind: 'scene', scene: 'ch2.stairs' }] },
      ],
    },
    {
      id: 'ch2.stairs',
      title: 'Chapter two: the stairs',
      body: [
        { text: 'ch2.stairs' },
        { text: 'ch2.stairs.opened', when: { chose: 'ch1.mat#open' } },
        { text: 'ch2.stairs.shelved', when: { chose: 'ch1.mat#shelf' } },
      ],
      choices: [
        { id: 'truth', effects: [{ kind: 'stat', stat: 'courage', by: 1 }, { kind: 'turn' }, { kind: 'scene', scene: 'ch3.door' }] },
        { id: 'deny', effects: [{ kind: 'kv', key: 'fibs', by: 1 }, { kind: 'turn' }, { kind: 'scene', scene: 'ch3.door' }] },
        // A lie to cover a letter you opened is a second lie.
        {
          id: 'blame',
          when: { chose: 'ch1.mat#open' },
          effects: [{ kind: 'kv', key: 'fibs', by: 2 }, { kind: 'turn' }, { kind: 'scene', scene: 'ch3.door' }],
        },
      ],
    },
    {
      id: 'ch3.door',
      title: 'Chapter three: the door',
      body: [
        { text: 'ch3.door' },
        { text: 'ch3.door.honest', when: { kv: 'fibs', lt: 1 } },
        { text: 'ch3.door.fib', when: { kv: 'fibs', is: 1 } },
        { text: 'ch3.door.tangle', when: { kv: 'fibs', gte: 2 } },
      ],
      choices: [
        // Either ending marks the story as read, for a New Game+ to carry over.
        { id: 'hand', when: { stat: 'courage', gte: 3 }, effects: [readIt, { kind: 'scene', scene: 'end.kept' }] },
        { id: 'post', effects: [readIt, { kind: 'scene', scene: 'end.posted' }] },
      ],
    },
    // Each ending offers the story again: `newGame` starts it over, keeping the reader's settings.
    { id: 'end.kept', title: 'The end', body: [{ text: 'end.kept' }], choices: [{ id: 'again', command: { type: 'newGame' }, effects: [] }] },
    { id: 'end.posted', title: 'The end', body: [{ text: 'end.posted' }], choices: [{ id: 'again', command: { type: 'newGame' }, effects: [] }] },
  ],
  prose: {
    'ch1.mat':
      'The flat still smells of someone else’s cooking. On the mat, under the takeaway menus, is a letter with a stamp from the seaside and a name on it that isn’t yours: J. Hart.',
    'ch1.mat.again': 'You have the oddest feeling you have stood here before, with this exact letter in your hand.',
    'ch1.mat.named': 'You turn it over, {{playerName}}. The flap is barely stuck.',
    'ch1.mat#open': 'Open it',
    'ch1.mat#shelf': 'Put it on the shelf by the door',
    'ch2.stairs': 'Mrs Okafor from downstairs catches you on the landing. “Has anything come for June? Her sister keeps asking.”',
    'ch2.stairs.opened': 'You think of the postcard tucked inside, and the phone number written on it twice.',
    'ch2.stairs.shelved': 'You think of the letter on the shelf, still sealed.',
    'ch2.stairs#truth': 'Tell her about the letter',
    'ch2.stairs#deny': '“Nothing yet.”',
    'ch2.stairs#blame': '“Only something that came open in the post.”',
    'ch3.door': 'On Saturday someone knocks. A woman with June’s chin and a carrier bag of shopping: “I’m her sister. I was told there might be post.”',
    'ch3.door.honest': 'You already told Mrs Okafor everything, and it shows: she smiles before you speak.',
    'ch3.door.fib': 'Mrs Okafor is behind her on the stairs, not quite looking at you.',
    'ch3.door.tangle': 'Mrs Okafor is behind her on the stairs, and she has clearly been talking.',
    'ch3.door#hand': 'Give her the letter yourself',
    'ch3.door#post': 'Say you’ll send it on',
    'end.kept': 'She reads it on your doorstep and laughs, then cries a bit, then asks if you want a biscuit. You do.',
    'end.posted': 'You write the address she gives you on a fresh envelope. It goes in the postbox on the corner, and that is that.',
    'end.kept#again': 'Read it again',
    'end.posted#again': 'Read it again',
  },
}

/** The game: the pack over a base that names only its first scene. */
export function theLetter(): { game: Game; problems: string[] } {
  const { game, problems } = loadGame([letter], {
    id: 'the-letter',
    title: 'The Letter',
    // Version 2 counts `fibs` where version 1 counted `lies`. A version-1 save is carried
    // forward by the step below when it loads, so a reader mid-story keeps their count.
    version: 2,
    migrations: {
      1: (state) => {
        const { lies, ...kv } = state.kv
        return lies === undefined ? state : { ...state, kv: { ...kv, fibs: lies } }
      },
    },
    introScene: 'ch1.mat',
    // Reaching either ending finishes the game, and the title screen then offers New Game+.
    finished: { scene: ['end.kept', 'end.posted'] },
    // A New Game+ keeps only this: that the reader has been through it once.
    carryOver: { kv: ['readBefore'] },
    // No saving on the first page until the reader has typed a name, so every save has one.
    saveable: [{ when: { not: { kv: 'playerName' } }, reason: 'Type your name first.' }],
    // Saves are listed under the name the reader typed.
    saveName: (state) => (typeof state.kv.playerName === 'string' ? state.kv.playerName : null),
  })
  return { game, problems: problems.map((problem) => `${problem.pack} · ${problem.where} · ${problem.what}`) }
}

const built = theLetter()
export default built

/** Where `ifloom playtest` starts: a reader who has already typed a name. */
export const start = (game: Game) => startingState(game, { kv: { playerName: 'Sam' } })
