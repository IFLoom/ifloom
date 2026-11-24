// @vitest-environment jsdom
/**
 * The town tutorial (tutorial/town/), step by step. Each step's files are
 * loaded with `loadChecked` and its checkpoint is played with `play`, as the
 * page says the reader should see it. Steps 2 to 4 have their own copy of
 * `story/opening.ts` (`steps/<n>/`), step 5 and 6 their own `story/cafe.ts`,
 * and from step 7 on the game is the finished files. Then the finished game
 * runs in the page from each tab's files, with jsdom's localStorage emptied
 * before each.
 */
import { afterEach, describe, expect, it } from 'vitest'
import { act, waitFor } from '@testing-library/react'
import { createApp, nextTick } from 'vue'
import { apply, startingState, statValue, view, type Content, type Game, type GameState, type RenderedChoice, type View } from '@ifloom/engine'
import { freshState, loadChecked, play } from '@ifloom/engine/testing'
import { calendar } from '@ifloom/plugin-calendar'
import { places } from '@ifloom/plugin-places'
import { cast } from '@ifloom/plugin-cast'
import module from '../tutorial/town/game.ts'
import { stats } from '../tutorial/town/world/stats.ts'
import { opening } from '../tutorial/town/story/opening.ts'
import { highStreet } from '../tutorial/town/story/high-street.ts'
import { opening as opening2 } from '../tutorial/town/steps/2/opening.ts'
import { opening as opening3 } from '../tutorial/town/steps/3/opening.ts'
import { opening as opening4 } from '../tutorial/town/steps/4/opening.ts'
import { cafe as cafe5 } from '../tutorial/town/steps/5/cafe.ts'
import { cafe as cafe6 } from '../tutorial/town/steps/6/cafe.ts'
import { actions } from '../tutorial/town/world/actions.ts'
import { people } from '../tutorial/town/world/cast.ts'
import { townButtons as townButtons5 } from '../tutorial/town/steps/5/plain/town.ts'
import { townButtons } from '../tutorial/town/plain/town.ts'

/** The template's `src/world/stats.ts`, which steps 1 and 2 keep. */
const templateStats: Content = { stats: [{ id: 'courage', label: 'Courage', start: 1, max: 5 }] }
const base = { id: 'my-town', title: 'My Town' }

const choose = (id: string) => ({ type: 'choose', id }) as const
const labels = (shown: View) => [...shown.scene.choices, ...shown.actions].map((button) => button.label)
const button = (buttons: readonly RenderedChoice[], label: string) => buttons.find((each) => each.label === label)

describe('the town tutorial, step by step', () => {
  it('2: clicks from the bedroom to the kitchen and back', () => {
    const game = loadChecked([templateStats, opening2], base)
    let state = startingState(game)
    expect(view(state, game).scene.title).toBe('Moving day')
    state = play(state, game, choose('down'))
    expect(view(state, game).scene.title).toBe('The kitchen')
    state = play(state, game, choose('up'))
    expect(view(state, game).scene.title).toBe('Moving day')
  })

  it('3: unpacking a box spends 10 energy, once', () => {
    const game = loadChecked([stats, opening3], base)
    let state = startingState(game)
    expect(view(state, game).statsById.energy.text).toBe('60')
    expect(view(state, game).statsById.coins.text).toBe('10c')
    state = play(state, game, choose('unpack'))
    expect(statValue(state, game, 'energy')).toBe(50)
    expect(button(view(state, game).scene.choices, 'Unpack a box')?.disabled).toBe('Enough boxes for now.')
  })

  it('4: the tea is offered from the second visit to the kitchen', () => {
    const game = loadChecked([stats, opening4], base)
    let state = play(startingState(game), game, choose('unpack'), choose('down'))
    expect(labels(view(state, game))).toEqual(['Go back upstairs'])
    expect(view(state, game).scene.body).not.toContain('tea bags')
    state = play(state, game, choose('up'), choose('down'))
    expect(labels(view(state, game))).toEqual(['Make a cup of tea', 'Go back upstairs'])
    expect(view(state, game).scene.body).toContain('You know where the tea bags are now.')
    state = play(state, game, choose('tea'))
    expect(statValue(state, game, 'energy')).toBe(60)
    expect(state.kv.kitchenVisits).toBe(2)
  })

  it('5: steps outside, and walks from the house to the café and back', () => {
    const game = loadChecked([stats, opening, highStreet, cafe5], { ...base, plugins: [places({ start: 'house' })] })
    let state = play(startingState(game), game, choose('down'), choose('out'))
    expect(view(state, game).scene.title).toBe('Your house')
    expect(townButtons5(view(state, game)).map((exit) => exit.label)).toEqual(['The high street'])
    state = play(state, game, places.go('high-street'), places.go('cafe'))
    expect(view(state, game).scene.body).toContain('Steam on the windows')
    state = play(state, game, places.go('high-street'), places.go('house'))
    expect(places.where(state, game)).toBe('house')
  })

  it('6: Ruth is at the counter in the morning, and gone after two waits', () => {
    const game = loadChecked([stats, actions, people, opening, highStreet, cafe6], {
      ...base,
      plugins: [calendar({ turn: 'period' }), places({ start: 'house' }), cast()],
    })
    let state = play(startingState(game), game, choose('down'), choose('out'), places.go('high-street'), places.go('cafe'))
    let shown = view(state, game)
    expect(shown.when).toBe('Day 1 · Monday morning · The corner café')
    expect(shown.scene.body).toContain('Ruth is behind the counter')
    expect(townButtons(shown).map((each) => each.label)).toEqual(['The high street', 'Ruth: Talk'])
    state = play(state, game, cast.talk('ruth'), choose('chat'))
    expect(statValue(state, game, 'friendship', cast.character('ruth'))).toBe(5)
    state = play(state, game, { type: 'action', id: 'wait' })
    expect(view(state, game).when).toBe('Day 1 · Monday afternoon · The corner café')
    state = play(state, game, { type: 'action', id: 'wait' })
    shown = view(state, game)
    expect(shown.when).toBe('Day 1 · Monday evening · The corner café')
    expect(shown.scene.body).toContain('The counter is empty.')
    expect(shown.plugins.cast?.present).toEqual([])
    // The door is shut behind you.
    state = play(state, game, places.go('high-street'))
    expect(apply(state, game, places.go('cafe')).reason).toBe('Closed. Opens tomorrow morning.')
  })

  it('7: buys coffee until the coins run out, and not once the café shuts', () => {
    const { game } = module.build({ unlocked: [] })
    let state = play(freshState(game), game, places.go('high-street'), places.go('cafe'))
    const coffee = () => button(view(state, game).actions, 'Buy a coffee')
    expect(coffee()?.price?.text).toBe('4c')
    state = play(state, game, { type: 'action', id: 'places/coffee' }, { type: 'action', id: 'places/coffee' })
    expect(view(state, game).statsById.coins.text).toBe('2c')
    expect(statValue(state, game, 'energy')).toBe(100)
    expect(coffee()?.disabled).toBe('Not enough on you.')
    state = play(state, game, { type: 'action', id: 'wait' }, { type: 'action', id: 'wait' })
    expect(coffee()?.disabled).toBe('The café is closed.')
  })

  it('8: has no problems, and reports a misspelt scene', () => {
    expect(module.build({ unlocked: [] }).problems).toEqual([])
    const misspelt: Content = {
      ...opening,
      scenes: opening.scenes!.map((scene) =>
        scene.id === 'kitchen' ? { ...scene, choices: [{ id: 'up', label: 'Go back upstairs', effects: [{ scene: 'bedrom' }] }] } : scene,
      ),
    }
    expect(() => loadChecked([stats, misspelt], base)).toThrow(/bedrom/)
  })
})

afterEach(() => {
  document.body.innerHTML = ''
})

/** A fresh page with an empty #root, and nothing saved. */
function page(): HTMLElement {
  localStorage.clear()
  const root = document.body.appendChild(document.createElement('div'))
  root.id = 'root'
  return root
}

const pressed = (root: HTMLElement) => async (label: string) => {
  const found = [...root.querySelectorAll('button')].find((each) => each.textContent?.trim() === label)
  expect(found, `a button "${label}" in: ${root.textContent}`).toBeTruthy()
  expect(found!.disabled, `"${label}" is greyed out: ${found!.title}`).toBe(false)
  found!.click()
  await nextTick()
}

/** The template's draw loop, cut down: the scene's choices, the room's and game's actions, then the line step 5 adds. */
function drawPage(root: HTMLElement, game: Game, get: () => GameState, send: (state: GameState) => void): void {
  const shown = view(get(), game)
  root.replaceChildren()
  root.appendChild(document.createElement('h2')).textContent = shown.scene.title
  root.appendChild(document.createElement('p')).textContent = shown.scene.body
  for (const choice of [...shown.scene.choices, ...shown.actions, ...townButtons(shown)]) {
    const each = root.appendChild(document.createElement('button'))
    each.textContent = choice.label
    each.disabled = Boolean(choice.disabled)
    each.onclick = () => {
      send(apply(get(), game, choice.command).state)
      drawPage(root, game, get, send)
    }
  }
}

describe('the finished town, in the browser', () => {
  it('Plain JS: townButtons takes the player to the café and to Ruth', async () => {
    const root = page()
    const { game } = module.build({ unlocked: [] })
    let state = startingState(game)
    drawPage(
      root,
      game,
      () => state,
      (next) => (state = next),
    )
    const press = pressed(root)
    await press('Go down to the kitchen')
    await press('Step outside')
    await press('The high street')
    await press('The corner café')
    expect(root.textContent).toContain('Ruth is behind the counter')
    await press('Ruth: Talk')
    expect(view(state, game).scene.speaker?.name).toBe('Ruth')
  })

  it('Vue: Town.vue draws the ways out and the Talk button', async () => {
    const root = page()
    const { runner } = await import('../tutorial/town/vue/runner.ts')
    const { default: Town } = await import('../tutorial/town/vue/Town.vue')
    createApp(Town).mount(root)
    runner.apply(choose('down'))
    runner.apply(choose('out'))
    await nextTick()
    const press = pressed(root)
    await press('The high street')
    await press('The corner café')
    await press('Ruth: Talk')
    expect(runner.view().scene.speaker?.name).toBe('Ruth')
  })

  it('React: opens on the title screen, then draws the house with its way out from the places plugin’s UI', async () => {
    const root = page()
    await act(async () => {
      await import('../tutorial/town/react/main.ts')
    })
    await waitFor(() => expect(root.querySelector('[data-page="title"]')).toBeTruthy())
    const click = async (text: string) =>
      act(async () => {
        ;[...root.querySelectorAll('button')].find((each) => each.textContent?.includes(text))!.click()
      })
    await click('New game')
    await waitFor(() => expect(root.textContent).toContain('Moving day'))
    await click('Go down to the kitchen')
    await waitFor(() => expect(root.textContent).toContain('Step outside'))
    await click('Step outside')
    await waitFor(() => expect([...root.querySelectorAll('button')].some((each) => each.textContent?.includes('The high street'))).toBe(true))
  })
})
