/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'
import { KIT_LAYOUT, KIT_LOOKS, KIT_PARTS } from '../../src/index.ts'

const CORE = import.meta.glob('../../src/**/*.{ts,tsx}', { query: '?raw', import: 'default', eager: true }) as Record<string, string>
const UIS = import.meta.glob('../../../plugin-*/src/react/**/*.tsx', { query: '?raw', import: 'default', eager: true }) as Record<string, string>

/** Every word of the React UI's own source, as Tailwind's scanner might take a class from it. */
const CORE_TOKENS = new Set(Object.values(CORE).flatMap((source) => source.split(/[\s'"`{}()]+/)))

/** The parts the plugins' UIs add, from each one's `PartNames`. */
const PLUGIN_PARTS = new Set(
  Object.values(UIS).flatMap((source) =>
    [...(/interface PartNames \{([^}]*)\}/.exec(source)?.[1].matchAll(/'?([\w-]+)'?: true/g) ?? [])].map((match) => match[1]),
  ),
)

/** The classes a UI's source gives its parts and elements: `usePart`'s and `useKitPart`'s defaults, and `className`s. */
function classesIn(source: string): string[] {
  const given = /(?:usePart\(\s*'[\w-]+',|useKitPart\(\s*'[\w-]+',\s*'[\w-]+',)\s*(?:'([^']*)'|`([^`]*)`)/g
  const strings = [
    ...[...source.matchAll(given)].map((match) => match[1] ?? match[2]),
    ...[...source.matchAll(/className="([^"]*)"/g)].map((match) => match[1]),
  ]
  // A template's `${buttonVariants(...)}` is the kit's own classes.
  return strings.flatMap((text) => text.replace(/\$\{(?:[^{}]|\{[^{}]*\})*\}/g, ' ').split(/\s+/)).filter(Boolean)
}

/** The layout a UI's source puts over a kit part's look: `useKitPart`'s third argument. */
function kitLayoutsIn(source: string): string[] {
  return [...source.matchAll(/useKitPart\(\s*'[\w-]+',\s*'[\w-]+',\s*'([^']*)'/g)].flatMap((match) => match[1].split(/\s+/)).filter(Boolean)
}

/** The four presets, as a game imports them from `@ifloom/react/themes/`. */
const PRESETS = ['paper', 'storybook', 'studio', 'terminal'].map((name) => ({
  name,
  css: readFileSync(new URL(`../../src/themes/${name}.css`, import.meta.url), 'utf8'),
}))

describe('the presets', () => {
  it('style the story, the sections, the top bar and the drawer', () => {
    for (const { name, css } of PRESETS) {
      for (const needed of ['[data-part="story"]', '[data-part="section"]', '[data-part="section-toggle"]', '[data-part="top-bar"]', '[data-part="drawer"]']) {
        expect(css, `${name}: ${needed}`).toContain(needed)
      }
    }
  })

  it('draw dice in their own style', () => {
    for (const { name, css } of PRESETS) {
      for (const needed of ['[data-part="dice"]', '[data-part="dice-face"]']) expect(css, `${name}: ${needed}`).toContain(needed)
    }
  })

  it('draw timers in their own style', () => {
    for (const { name, css } of PRESETS) {
      for (const needed of ['[data-part="timer"]', '[data-part="timer-bar"]']) expect(css, `${name}: ${needed}`).toContain(needed)
    }
  })

  it('draw inline pieces and their dialog in their own style', () => {
    for (const { name, css } of PRESETS) {
      for (const needed of ['[data-part="inline-ui"]', '[data-part="inline-modal"]']) expect(css, `${name}: ${needed}`).toContain(needed)
    }
  })

  it('name who says a spoken line in their own style', () => {
    for (const { name, css } of PRESETS) expect(css, name).toContain('[data-part="speaker-name"]')
  })

  it('leave the page fluid: no --width-page cap', () => {
    for (const { name, css } of PRESETS) expect(css, name).not.toContain('--width-page')
  })

  // A plugin's UI is styled by the kit's parts and the theme's tokens, so a plugin, first-party or
  // not, looks right in every preset, and a preset knows no plugin by name.
  it('style the kit’s parts, never a plugin’s own', () => {
    expect(PLUGIN_PARTS.size).toBeGreaterThan(50)
    for (const { name, css } of PRESETS) {
      const named = [...css.matchAll(/data-part="([\w-]+)"/g)].map((match) => match[1]).filter((part) => PLUGIN_PARTS.has(part))
      expect([...new Set(named)], name).toEqual([])
      for (const kit of ['card', 'input', 'thumb']) expect(css, `${name}: ${kit}`).toContain(`[data-kit="${kit}"]`)
      expect(css, `${name}: data-kit names`).not.toMatch(new RegExp(`data-kit="(?!(${KIT_PARTS.join('|')})")`))
    }
  })
})

describe('the plugins’ React UIs', () => {
  // `styles.min.css` holds the classes this package's own source uses, and a game's Tailwind finds the
  // same through `@source`; neither looks in a plugin. So a first-party plugin's UI uses only those
  // classes, and needs no stylesheet of its own.
  it('use only classes the React UI’s own source uses, so its stylesheet has them', () => {
    const missing = Object.entries(UIS).flatMap(([file, source]) =>
      classesIn(source)
        .filter((token) => !CORE_TOKENS.has(token))
        .map((token) => `${file.replace(/^.*\/packages\//, '')}: ${token}`),
    )
    expect(missing).toEqual([])
  })

  // A kit part brings its own look, so a plugin's UI adds only layout, from the classes the kit promises.
  it('put only the kit’s layout classes over a kit part’s look', () => {
    const layout = new Set<string>(KIT_LAYOUT)
    const outside = Object.entries(UIS).flatMap(([file, source]) =>
      kitLayoutsIn(source)
        .filter((token) => !layout.has(token))
        .map((token) => `${file.replace(/^.*\/packages\//, '')}: ${token}`),
    )
    expect(outside).toEqual([])
  })
})

describe('the kit', () => {
  it('gives every kit part a look', () => {
    for (const kit of KIT_PARTS) expect(KIT_LOOKS[kit], kit).toBeTruthy()
  })
})
