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

import { checkAudio } from '../src/index.ts'

describe('the sound files', () => {
  const game = () =>
    loadGame(
      [
        {
          id: 'cafe',
          schema: SCHEMA,
          scenes: [{ id: 'door', body: [], choices: [] }],
          audio: {
            tracks: {
              calm: { src: 'music/calm.ogg', channel: 'music' },
              knock: { src: '/audio/knock.mp3' },
              bell: { src: 'bell' },
              radio: { playlist: ['calm'] },
            },
          },
        },
      ],
      { id: 'cafe', title: 'The Café', introScene: 'door' },
    )

  it('reports each track whose file is missing from the public folder, where the page looks for it', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ifloom-public-'))
    mkdirSync(join(dir, 'audio', 'music'), { recursive: true })
    writeFileSync(join(dir, 'audio', 'music', 'calm.ogg'), '')
    writeFileSync(join(dir, 'audio', 'knock.mp3'), '')
    expect(checkAudio(game().game, dir)).toEqual([`track bell: no file ${join(dir, 'audio/bell.ogg')}`])
    expect(checkGame({ default: game() }, dir)).toEqual([`track bell: no file ${join(dir, 'audio/bell.ogg')}`])
    // Without a folder to look in, check reads only the game.
    expect(checkGame({ default: game() })).toEqual([])
  })

  it('reports them missing from a build too', () => {
    const dir = built('<html><script type="module">go()</script></html>')
    expect(checkBuild(dir, game().game)).toHaveLength(3)
    expect(checkBuild(dir)).toEqual([])
  })

  it('leaves sound out of the page with --inline-assets', () => {
    const dir = built('<html><head></head></html>')
    mkdirSync(join(dir, 'audio'), { recursive: true })
    writeFileSync(join(dir, 'audio', 'bell.ogg'), 'x')
    expect(inlineAssets(dir).files).toBe(0)
    expect(existsSync(join(dir, 'audio', 'bell.ogg'))).toBe(true)
  })
})

import { feed } from '@ifloom/plugin-feed'
import { checkMedia } from '../src/index.ts'

describe('the picture and video files', () => {
  const game = () =>
    loadGame(
      [
        {
          id: 'town',
          schema: SCHEMA,
          media: { pools: { door: [{ src: 'door/blue.jpg', tags: ['blue'] }, { src: 'door/red.jpg', tags: ['red'] }] } },
          scenes: [
            {
              id: 'knock',
              stage: {
                layers: [{ id: 'hall', src: 'flat/hall' }, { id: 'rain', src: 'flat/rain', video: true, poster: 'flat/rain-still' }, { pool: 'door' }],
                hotspots: [{ id: 'door', rect: [60, 10, 25, 85], label: 'The front door', choice: 'answer' }],
              },
              body: [{ text: 'knock' }, { media: { src: 'flat/letter.png' } }, { media: { pool: 'door', tags: ['red'] } }],
              choices: [{ id: 'answer', effects: [{ kind: 'scene', id: null }] }],
            },
          ],
          prose: {
            knock: 'Someone knocks.\n\n[[img:flat/cup.svg|A cup]]\n\n[[widevideo:flat/kettle|once|poster=flat/kettle.jpg]]\n\n[[img:@door|blue]]',
            'knock#answer': 'Answer it',
            'post.cafe': 'Cakes.\n\n[[wide:cafe/cakes]]',
          },
          data: {
            feed: { posts: [{ id: 'post.cafe', feed: 'town', from: 'The Café', body: [{ text: 'post.cafe' }], video: 'art/cafe/steam.mp4' }] },
          },
        },
      ],
      { id: 'town', title: 'Town', introScene: 'knock', plugins: [feed({ feeds: [{ id: 'town', name: 'Town' }] })] },
    )

  const touch = (dir: string, ...files: string[]) => {
    for (const file of files) {
      mkdirSync(join(dir, file, '..'), { recursive: true })
      writeFileSync(join(dir, file), '')
    }
  }

  it('reports each one missing from the public folder: pools, stage layers, media blocks, markup and plugin data', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ifloom-public-'))
    touch(dir, 'art/door/blue.jpg', 'art/flat/hall.jpg', 'art/flat/cup.svg', 'art/cafe/cakes.jpg')
    const missing = (file: string) => `: no file ${join(dir, file)}`
    const found = checkMedia(game().game, dir)
    expect(found).toEqual(
      expect.arrayContaining([
        `pool door${missing('art/door/red.jpg')}`,
        expect.stringMatching(/^scenes\[knock\]\.stage\.layers\[1\]: no file .*art\/flat\/rain\.mp4$/),
        expect.stringMatching(/^scenes\[knock\]\.stage\.layers\[1\]: no file .*art\/flat\/rain-still\.jpg$/),
        expect.stringMatching(/^scenes\[knock\]\.body\[1\]\.media: no file .*art\/flat\/letter\.png$/),
        `prose knock${missing('art/flat/kettle.mp4')}`,
        `prose knock${missing('art/flat/kettle.jpg')}`,
        expect.stringMatching(/\.video: no file .*art\/cafe\/steam\.mp4$/),
      ]),
    )
    expect(found).toHaveLength(7)
    // checkGame reads them too, beside the sound.
    expect(checkGame({ default: game() }, dir)).toEqual(found)
  })

  it('finds nothing missing when every file is there', () => {
    const dir = mkdtempSync(join(tmpdir(), 'ifloom-public-'))
    touch(dir, 'art/door/blue.jpg', 'art/door/red.jpg', 'art/flat/hall.jpg', 'art/flat/rain.mp4', 'art/flat/rain-still.jpg', 'art/flat/letter.png')
    touch(dir, 'art/flat/cup.svg', 'art/flat/kettle.mp4', 'art/flat/kettle.jpg', 'art/cafe/cakes.jpg', 'art/cafe/steam.mp4')
    expect(checkMedia(game().game, dir)).toEqual([])
  })

  it('leaves videos beside the page with --inline-assets, and counts the pictures in the page as there', () => {
    const dir = built('<html><head></head></html>')
    touch(dir, 'art/door/blue.jpg', 'art/door/red.jpg', 'art/flat/hall.jpg', 'art/flat/rain.mp4', 'art/flat/rain-still.jpg', 'art/flat/letter.png')
    touch(dir, 'art/flat/cup.svg', 'art/flat/kettle.mp4', 'art/flat/kettle.jpg', 'art/cafe/cakes.jpg', 'art/cafe/steam.mp4')
    expect(inlineAssets(dir)).toMatchObject({ files: 8, videos: 3 })
    expect(existsSync(join(dir, 'art', 'flat', 'rain.mp4'))).toBe(true)
    expect(existsSync(join(dir, 'art', 'flat', 'hall.jpg'))).toBe(false)
    expect(existsSync(join(dir, 'art', 'door'))).toBe(false)
    expect(checkBuild(dir, game().game)).toEqual([])
  })
})
