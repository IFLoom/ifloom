import { loadGame, type Content, type Pack } from '@ifloom/engine'
import { unlocks } from '@ifloom/plugin-unlocks'

/** The code is FIXTURE-CODE-1234, from .env; this is its hash, with few rounds for a quick test. */
const town: Content = {
  scenes: [{ id: 'intro', title: 'The square', body: [{ text: 'intro' }], choices: [] }],
  prose: { intro: 'A small square with a fountain.' },
  data: {
    unlocks: {
      unlocks: [{ id: 'supporter', label: 'Supporter edition', iterations: 1000, hash: 'a1df77b1dbeebae57eba5218fdd1bd1266f6ad8b38b251dd08a6123543dee57c' }],
    },
  },
}

export function build({ unlocked = [] as Pack[] } = {}) {
  return loadGame([town], { id: 'locked-fixture', title: 'Locked', introScene: 'intro', plugins: [unlocks()] }, { packs: unlocked })
}

export default build
