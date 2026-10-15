import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { SCHEMA, loadGame } from '@ifloom/engine'
import { checkBuild, checkGame } from '../src/index.ts'

function built(html: string): string {
  const dir = mkdtempSync(join(tmpdir(), 'ifloom-build-'))
  writeFileSync(join(dir, 'index.html'), html)
  return dir
}

describe('checkBuild', () => {
  it('passes one file with everything inside', () => {
    expect(checkBuild(built('<html><head><link rel="icon" href="/favicon.ico"></head><script type="module">go()</script></html>'))).toEqual([])
  })

  it('refuses scripts and stylesheets from elsewhere, and module scripts beside it', () => {
    const dir = built(
      '<script src="https://cdn.example/x.js"></script><link rel="stylesheet" href="/style.css"><script type="module" src="./assets/game.js"></script>',
    )
    expect(checkBuild(dir)).toEqual([
      'index.html loads https://cdn.example/x.js, which is not beside it',
      "index.html loads the module script ./assets/game.js, which won't load from disk; build as one file",
      'index.html loads /style.css, which is not beside it',
    ])
  })

  it('says when there is no page at all', () => {
    expect(checkBuild(mkdtempSync(join(tmpdir(), 'ifloom-empty-')))[0]).toMatch(/^no index.html/)
  })
})

import { existsSync, mkdirSync, readFileSync } from 'node:fs'
import { inlineAssets } from '../src/index.ts'

describe('inlineAssets', () => {
  it('puts the art into the page as data URLs under their paths, and removes the folder', () => {
    const dir = built('<html><head><title>x</title></head><body></body></html>')
    mkdirSync(join(dir, 'art', 'place'), { recursive: true })
    writeFileSync(join(dir, 'art', 'place', 'cafe.svg'), '<svg xmlns="http://www.w3.org/2000/svg"/>')
    expect(inlineAssets(dir).files).toBe(1)
    const html = readFileSync(join(dir, 'index.html'), 'utf8')
    const map = JSON.parse(html.match(/window\.__ifloomAssets=(.*?)<\/script>/)![1].replace(/\\u003c/g, '<'))
    expect(Object.keys(map)).toEqual(['art/place/cafe.svg'])
    expect(map['art/place/cafe.svg']).toMatch(/^data:image\/svg\+xml;base64,/)
    expect(html).not.toMatch(/<svg/)
    expect(existsSync(join(dir, 'art'))).toBe(false)
    expect(checkBuild(dir)).toEqual([])
    // Again: nothing left to put in, and the pictures already in stay.
    expect(inlineAssets(dir).files).toBe(0)
    expect(readFileSync(join(dir, 'index.html'), 'utf8')).toBe(html)
  })
})

describe('checkGame', () => {
  it('prints a loader problem in the loader\'s words', () => {
    const loaded = loadGame([{ id: 'town', schema: SCHEMA, scenes: [{ id: 'intro', body: [], choices: [{ id: 'go', effects: [{ kind: 'scene', id: 'nowhere' }] }] }] }], {
      id: 'town',
      title: 'Town',
      introScene: 'intro',
    })
    expect(checkGame({ default: loaded })).toContain('town · scene intro · goes to unknown scene "nowhere"')
  })
})
