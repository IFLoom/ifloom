import { mkdtempSync, writeFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { describe, expect, it } from 'vitest'
import { loadGame, type Game } from '@ifloom/engine'
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
  it("prints a loader problem in the loader's words", () => {
    const loaded = loadGame([{ name: 'town', scenes: [{ id: 'intro', body: [], choices: [{ id: 'go', effects: [{ kind: 'scene', scene: 'nowhere' }] }] }] }], {
      id: 'town',
      title: 'Town',
      introScene: 'intro',
    })
    expect(checkGame({ default: loaded })).toContain('town · scene intro · goes to unknown scene "nowhere"')
  })

  it('prints a hand-built game’s problems once, in the same words, with the pack "game"', () => {
    const game: Game = {
      id: 'town',
      title: 'Town',
      activities: [],
      storylines: [],
      scenes: [{ id: 'intro', body: [], choices: [{ id: 'go', effects: [{ kind: 'scene', scene: 'nowhere' }] }] }],
    }
    expect(checkGame({ default: game })).toEqual(['game · scene intro · no prose for "intro#go"', 'game · scene intro · goes to unknown scene "nowhere"'])
    // A loaded game's problems come from its loader, and aren't found a second time.
    const loaded = loadGame([{ name: 'town', scenes: game.scenes }], { id: 'town', title: 'Town' })
    expect(checkGame({ default: loaded })).toEqual(['town · scene intro · no prose for "intro#go"', 'town · scene intro · goes to unknown scene "nowhere"'])
  })
})

import { feed } from '@ifloom/plugin-feed'
import { checkGame as checkContent } from '@ifloom/engine'
import { checkFiles } from '../src/index.ts'

describe('the files a game names', () => {
  // One of every kind: sound, a picture, a video, a poster, a pool's file, markup and plugin data.
  const game = () =>
    loadGame(
      [
        {
          name: 'town',
          audio: {
            tracks: {
              calm: { src: 'music/calm.ogg', channel: 'music' },
              knock: { src: '/audio/knock.mp3' },
              bell: { src: 'bell' },
              radio: { playlist: ['calm'] },
            },
          },
          media: {
            pools: {
              door: [
                { src: 'door/blue.jpg', tags: ['blue'] },
                { src: 'door/red.jpg', tags: ['red'] },
              ],
            },
          },
          scenes: [
            {
              id: 'knock',
              stage: {
                layers: [{ id: 'hall', src: 'flat/hall' }, { id: 'rain', src: 'flat/rain', video: true, poster: 'flat/rain-still' }, { pool: 'door' }],
                hotspots: [{ id: 'door', rect: [60, 10, 25, 85], label: 'The front door', choice: 'answer' }],
              },
              body: [{ text: 'knock' }, { media: { src: 'flat/letter.png' } }, { media: { pool: 'door', tags: ['red'] } }],
              choices: [{ id: 'answer', effects: [{ kind: 'scene', scene: null }] }],
            },
          ],
          prose: {
            knock: 'Someone knocks.\n\n[[img:flat/cup.svg|A cup]]\n\n[[widevideo:flat/kettle|once|poster=flat/kettle.jpg]]\n\n[[img:@door|blue]]',
            'knock#answer': 'Answer it',
            'post.cafe': 'Cakes.\n\n[[wide:cafe/cakes]]',
          },
          data: {
            feed: {
              feeds: [{ id: 'town', name: 'Town' }],
              posts: [{ id: 'post.cafe', feed: 'town', from: 'The Café', body: [{ text: 'post.cafe' }], video: 'art/cafe/steam.mp4' }],
            },
          },
        },
      ],
      { id: 'town', title: 'Town', introScene: 'knock', plugins: [feed()] },
    )
  const files = () => checkContent(game().game).files

  const ALL = [
    'audio/music/calm.ogg',
    'audio/knock.mp3',
    'audio/bell.ogg',
    'art/door/blue.jpg',
    'art/door/red.jpg',
    'art/flat/hall.jpg',
    'art/flat/rain.mp4',
    'art/flat/rain-still.jpg',
    'art/flat/letter.png',
    'art/flat/cup.svg',
    'art/flat/kettle.mp4',
    'art/flat/kettle.jpg',
    'art/cafe/cakes.jpg',
    'art/cafe/steam.mp4',
  ]

  const touch = (dir: string, ...names: string[]) => {
    for (const file of names) {
      mkdirSync(join(dir, file, '..'), { recursive: true })
      writeFileSync(join(dir, file), '')
    }
  }
  /** A public folder with every file but these. */
  const without = (...gone: string[]) => {
    const dir = mkdtempSync(join(tmpdir(), 'ifloom-public-'))
    touch(dir, ...ALL.filter((file) => !gone.includes(file)))
    return dir
  }

  it('finds nothing missing when every file is there', () => {
    expect(checkFiles(files(), without())).toEqual([])
  })

  it('reports a missing sound, picture, video, poster and pool file, each where it is named', () => {
    const dir = without(
      'audio/bell.ogg',
      'art/flat/letter.png',
      'art/flat/rain.mp4',
      'art/flat/rain-still.jpg',
      'art/door/red.jpg',
      'art/cafe/steam.mp4',
      'art/flat/kettle.jpg',
    )
    expect(checkFiles(files(), dir)).toEqual([
      `scene knock: no file ${join(dir, 'art/flat/letter.png')}`,
      `scene knock: no file ${join(dir, 'art/flat/rain.mp4')}`,
      `scene knock: no file ${join(dir, 'art/flat/rain-still.jpg')}`,
      `track bell: no file ${join(dir, 'audio/bell.ogg')}`,
      `pool door: no file ${join(dir, 'art/door/red.jpg')}`,
      `posts post.cafe: no file ${join(dir, 'art/cafe/steam.mp4')}`,
      `prose knock: no file ${join(dir, 'art/flat/kettle.jpg')}`,
    ])
  })

  it('is what ifloom check adds, given the public folder', () => {
    const dir = without('audio/bell.ogg')
    expect(checkGame({ default: game() }, dir)).toEqual([`track bell: no file ${join(dir, 'audio/bell.ogg')}`])
    // Without a folder to look in, check reads only the game.
    expect(checkGame({ default: game() })).toEqual([])
  })

  it('reports them missing from a build too', () => {
    const dir = built('<html><script type="module">go()</script></html>')
    expect(checkBuild(dir, files())).toHaveLength(ALL.length)
    expect(checkBuild(dir)).toEqual([])
  })

  it('leaves videos and sound beside the page with --inline-assets, and counts the pictures in the page as there', () => {
    const dir = built('<html><head></head></html>')
    touch(dir, ...ALL)
    expect(inlineAssets(dir)).toMatchObject({ files: 8, videos: 3 })
    expect(existsSync(join(dir, 'art', 'flat', 'rain.mp4'))).toBe(true)
    expect(existsSync(join(dir, 'audio', 'bell.ogg'))).toBe(true)
    expect(existsSync(join(dir, 'art', 'flat', 'hall.jpg'))).toBe(false)
    expect(existsSync(join(dir, 'art', 'door'))).toBe(false)
    expect(checkBuild(dir, files())).toEqual([])
  })

  it('counts an inlined picture as there, but not one left out of the page', () => {
    const dir = without('art/flat/cup.svg', 'art/flat/hall.jpg')
    expect(checkFiles(files(), dir, new Set(['art/flat/cup.svg']))).toEqual([`scene knock: no file ${join(dir, 'art/flat/hall.jpg')}`])
  })
})
