// @vitest-environment jsdom
/**
 * Every snippet, drawn in a few states of Small Town without throwing: each
 * Plain JS `draw…(parent, view)`, each Vue component and each React component
 * that takes no props. The other test files press their buttons; this one
 * makes sure none of them is left untried.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { act, cleanup, render } from '@testing-library/react'
import { createElement, type ComponentType } from 'react'
import { createApp, nextTick, type Component } from 'vue'
import { createRunner, startingState, type Runner, type RunnerSnapshot } from '@ifloom/engine'
import { GameProvider } from '@ifloom/react'
import module from '../react/game.ts'
import { runner as plainRunner } from '../plain/runner.ts'
import { runner as vueRunner } from '../vue/runner.ts'
import { STATES } from './play.ts'

const PLAIN = import.meta.glob(['../plain/*.ts', '!../plain/runner.ts', '!../plain/game.ts'], { eager: true }) as Record<string, Record<string, unknown>>
const VUE = import.meta.glob('../vue/*.vue', { eager: true, import: 'default' }) as Record<string, Component>
// A mount-… file mounts a whole game when it's imported; react.test.tsx imports one.
const REACT = import.meta.glob(['../react/*.tsx', '!../react/mount-*.tsx'], { eager: true }) as Record<string, Record<string, unknown>>

afterEach(() => {
  cleanup()
  document.body.innerHTML = ''
})

type Draw = (parent: HTMLElement, snapshot: RunnerSnapshot) => void
const draws = Object.entries(PLAIN).flatMap(([file, exports]) =>
  Object.entries(exports)
    .filter(([name, value]) => /^draw[A-Z]/.test(name) && typeof value === 'function')
    .map(([name, value]) => ({ name: `${file.slice(9)} ${name}`, draw: value as Draw })),
)
const components = Object.entries(REACT).flatMap(([file, exports]) =>
  Object.entries(exports)
    .filter(([name, value]) => /^[A-Z]/.test(name) && typeof value === 'function')
    .map(([name, value]) => ({ name: `${file.slice(9)} ${name}`, component: value as ComponentType })),
)

/** A runner played to a state, from a new game. */
async function at(runner: Runner, state: (typeof STATES)[number]): Promise<void> {
  await runner.newGame()
  state.play(runner)
}

describe('every snippet', () => {
  it('is found', () => {
    expect(draws.length).toBeGreaterThan(0)
    expect(Object.keys(VUE).length).toBeGreaterThan(0)
    expect(components.length).toBeGreaterThan(0)
  })

  for (const state of STATES) {
    it(`Plain JS, ${state.name}: draws without throwing`, async () => {
      await at(plainRunner, state)
      for (const { name, draw } of draws) {
        const box = document.createElement('div')
        expect(() => draw(box, plainRunner.snapshot()), name).not.toThrow()
      }
    })

    it(`Vue, ${state.name}: mounts without throwing`, async () => {
      await at(vueRunner, state)
      for (const [name, component] of Object.entries(VUE)) {
        const box = document.body.appendChild(document.createElement('div'))
        const app = createApp(component)
        app.config.errorHandler = (error) => {
          throw new Error(`${name}: ${String(error)}`)
        }
        app.config.warnHandler = (message) => {
          throw new Error(`${name}: ${message}`)
        }
        app.mount(box)
        await nextTick()
        app.unmount()
      }
    })

    it(`React, ${state.name}: renders without throwing`, () => {
      const { game } = module.build()
      const runner = createRunner(game, startingState(game))
      state.play(runner)
      for (const { component } of components) {
        act(() => {
          render(createElement(GameProvider, { runner, children: createElement(component) }))
        })
        cleanup()
      }
    })
  }
})
