import { describe, expect, it } from 'vitest'
import { artSrc, parseBeats } from '../../src/sceneBody.ts'

describe('scene body', () => {
  it('parses monologue, text, and image markers', () => {
    const beats = parseBeats(['She looks up.', "> Don't stare.", '[[img:character/rosa]]', '[[wide:scene/rosa-coffee|Coffee]]'].join('\n\n'))
    expect(beats.map((beat) => beat.type)).toEqual(['text', 'mono', 'image', 'image'])
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

  it('reads `|rot` as turning the picture, never as its alt text', () => {
    expect(parseBeats('[[img:scene/blot|rot]]')[0]).toEqual({ type: 'image', src: 'art/scene/blot.jpg', alt: undefined, size: 'inline', rotate: true })
  })

  it('parses a rotated blot marker', () => {
    const beats = parseBeats('[[wide:scene/blot.svg|Inkblot|rot]]')
    expect(beats[0]).toMatchObject({
      type: 'image',
      src: 'art/scene/blot.svg',
      alt: 'Inkblot',
      rotate: true,
      size: 'wide',
    })
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

  it('parses a fenced mail card with headers', () => {
    const beats = parseBeats(
      [
        'A reply lands.',
        '[[mail]]\nFrom: Pat Ellery\nTo: Ms. Lane\nSubject: Re: Saturday shift\n\nEllery & Daughters Bakery\nMs. Lane,\n\nMany thanks.\n\nKind regards,\nPat Ellery\n[[/mail]]',
        '> Short notice.',
      ].join('\n\n'),
    )
    expect(beats.map((beat) => beat.type)).toEqual(['text', 'mail', 'mono'])
    expect(beats[1]).toMatchObject({
      type: 'mail',
      headers: [
        { key: 'From', value: 'Pat Ellery' },
        { key: 'To', value: 'Ms. Lane' },
        { key: 'Subject', value: 'Re: Saturday shift' },
      ],
      body: 'Ellery & Daughters Bakery\nMs. Lane,\n\nMany thanks.\n\nKind regards,\nPat Ellery',
    })
  })

  it('parses paper props', () => {
    const beats = parseBeats(
      [
        'Halfway down.',
        '[[clip]]\nNHS copy\nThe long hours.\n\nFile copy\nThe short hours.\n[[/clip]]',
        '[[sticky]]\nSTANDARD.\nDO NOT RECONCILE WITH DIARY.\n[[/sticky]]',
        '[[diary]]\nThursday\n[[/diary]]',
      ].join('\n\n'),
    )
    expect(beats.map((beat) => beat.type)).toEqual(['text', 'prop', 'prop', 'prop'])
    expect(beats[1]).toMatchObject({ face: 'clip' })
    expect(beats[2]).toMatchObject({
      face: 'sticky',
      text: 'STANDARD.\nDO NOT RECONCILE WITH DIARY.',
    })
    expect(beats[3]).toMatchObject({ face: 'diary', text: 'Thursday' })
  })

  it('normalises art paths', () => {
    expect(artSrc('art/character/rosa.jpg')).toBe('art/character/rosa.jpg')
    expect(artSrc('character/rosa')).toBe('art/character/rosa.jpg')
    expect(artSrc('scene/rosa-banter.webm')).toBe('art/scene/rosa-banter.webm')
    expect(artSrc('scene/rosa-talk.webp')).toBe('art/scene/rosa-talk.webp')
  })
})
