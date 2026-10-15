/** The built showcase is one HTML file that loads nothing from anywhere but beside it. */
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { checkBuild, checkGame } from '@ifloom/cli'
import * as module from '../src/game.ts'

describe('ifloom check and build', () => {
  it('finds nothing wrong with the showcase', () => {
    expect(checkGame(module)).toEqual([])
  })

  it.skipIf(!existsSync(new URL('../dist/index.html', import.meta.url)))('a built showcase opens from disk', () => {
    expect(checkBuild(new URL('../dist', import.meta.url).pathname)).toEqual([])
  })
})

import { readFileSync } from 'node:fs'
import { snapshot } from '@ifloom/cli'
import { probes, smallTown } from '../src/game.ts'

describe('ifloom snapshot', () => {
  // Every scene and place in every probe state reads as recorded. A change you
  // meant: `npm run snapshot -- --update`, and read the diff before committing.
  it('every scene and place reads as it did', () => {
    const { game } = smallTown()
    expect(snapshot(game, probes(game))).toBe(readFileSync(new URL('../snapshots/scenes.txt', import.meta.url), 'utf8'))
  })
})
