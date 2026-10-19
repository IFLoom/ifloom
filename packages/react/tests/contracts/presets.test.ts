/// <reference types="node" />
import { readFileSync } from 'node:fs'
import { describe, expect, it } from 'vitest'

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

  it('leave the page fluid: no --width-page cap', () => {
    for (const { name, css } of PRESETS) expect(css, name).not.toContain('--width-page')
  })
})
