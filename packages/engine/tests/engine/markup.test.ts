import { describe, expect, it } from 'vitest'
import { artSrc, parseBeats } from '../../src/sceneBody.ts'

describe('scene body', () => {
  it('parses text and image markers', () => {
    const beats = parseBeats(['She looks up.', "> Don't stare.", '[[img:character/rosa]]', '[[wide:scene/rosa-coffee|Coffee]]'].join('\n\n'))
    // A `> ` line is narration like any other: a typewriter face is a UI's piece now, `[[ui:mono|…]]`.
    expect(beats.map((beat) => beat.type)).toEqual(['text', 'text', 'image', 'image'])
    expect(beats[2]).toMatchObject({
      type: 'image',
      src: 'art/character/rosa.jpg',
      size: 'inline',
    })
    expect(beats[3]).toMatchObject({
      size: 'wide',
      alt: 'Coffee',
      src: 'art/scene/rosa-coffee.jpg',
    })
  })

  it('reads a part after the path as alt text: turning a picture is a UI hint', () => {
    expect(parseBeats('[[img:scene/blot|rot]]')[0]).toEqual({ type: 'image', src: 'art/scene/blot.jpg', alt: 'rot', size: 'inline' })
  })

  it('splits quoted lines into character and player speech', () => {
    const beats = parseBeats(
      [
        'Headset down.',
        '"You\'ve got the face of someone who got the trust speech."',
        '"That obvious?"',
        '"Everyone gets that face after the trust speech."',
        'You: "I\'ll keep that in mind."',
      ].join('\n\n'),
    )
    expect(beats.map((beat) => beat.type)).toEqual(['text', 'say', 'say', 'say', 'say'])
    expect(beats[1]).toMatchObject({ who: 'character' })
    expect(beats[2]).toMatchObject({ who: 'player' })
    expect(beats[3]).toMatchObject({ who: 'character' })
    expect(beats[4]).toMatchObject({ who: 'player' })
  })

  it('treats Name: "line" as character speech', () => {
    const beats = parseBeats(['She sits on the edge of the chair.', 'You: "Hi. Come in."', 'Rosa: "Hi. Rosa. Sorry."'].join('\n\n'))
    expect(beats.map((beat) => beat.type)).toEqual(['text', 'say', 'say'])
    expect(beats[1]).toMatchObject({ who: 'player', text: 'Hi. Come in.' })
    expect(beats[2]).toMatchObject({ who: 'character', text: 'Hi. Rosa. Sorry.' })
  })

  it('keeps a UI piece one paragraph, blank lines and all', () => {
    const beats = parseBeats(['A reply lands.', '[[ui:mail|Many thanks.\n\nKind regards,\nPat|From: Pat Ellery|Subject: Saturday]]', 'After.'].join('\n\n'))
    expect(beats.map((beat) => beat.type)).toEqual(['text', 'text', 'text'])
    expect(beats[1]).toEqual({ type: 'text', text: '[[ui:mail|Many thanks.\n\nKind regards,\nPat|From: Pat Ellery|Subject: Saturday]]' })
  })

  it('reads a name in any alphabet, and asks who it is', () => {
    const beats = parseBeats(['Zoë: "Hola."', 'Tú: "Hola, Zoë."'].join('\n\n'), undefined, (name) =>
      name === 'Tú' ? { who: 'player' } : { who: 'character', speaker: 'character:zoe' },
    )
    expect(beats).toEqual([
      { type: 'say', who: 'character', speaker: 'character:zoe', text: 'Hola.' },
      { type: 'say', who: 'player', text: 'Hola, Zoë.' },
    ])
  })

  it('normalises art paths', () => {
    expect(artSrc('art/character/rosa.jpg')).toBe('art/character/rosa.jpg')
    expect(artSrc('character/rosa')).toBe('art/character/rosa.jpg')
    expect(artSrc('scene/rosa-banter.webm')).toBe('art/scene/rosa-banter.webm')
    expect(artSrc('scene/rosa-talk.webp')).toBe('art/scene/rosa-talk.webp')
  })
})
