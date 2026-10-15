/** The built game is one HTML file that loads nothing from anywhere but beside it. */
import { existsSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { checkBuild, checkGame } from '@ifloom/cli'
import * as module from '../src/game.ts'

describe('ifloom check and build', () => {
  it('finds nothing wrong with the game', () => {
    expect(checkGame(module)).toEqual([])
  })

  it.skipIf(!existsSync(new URL('../dist/index.html', import.meta.url)))('a built game opens from disk', () => {
    expect(checkBuild(new URL('../dist', import.meta.url).pathname)).toEqual([])
  })
})
