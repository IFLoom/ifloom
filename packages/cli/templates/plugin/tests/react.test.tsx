import { describe, expect, it } from 'vitest'
import { renderToString } from 'react-dom/server'
import { createRunner, loadGame, startingState, type Content } from '@ifloom/engine'
import { GameProvider } from '@ifloom/react'
import { __camel__ } from '../src/index.ts'
import { __camel__Ui, __Pascal__List } from '../src/react/index.tsx'

/** A town with two entries, the first marked by the `shop` action. */
function runner() {
  const town: Content = {
    name: 'town',
    actions: [{ id: 'shop', effects: [__camel__.mark('bread')] }],
    data: {
      '__id__': {
        entries: [
          { id: 'bread', label: 'A loaf of bread' },
          { id: 'milk', label: 'A pint of milk' },
        ],
      },
    },
  }
  const { game } = loadGame([town], { id: '__id__-town', title: '{{title}} town', plugins: [__camel__()] })
  return createRunner(game, { ...startingState(game), sceneId: null })
}

// TODO: test what your UI draws and sends. Drawn to a string here, so it needs no browser;
// @testing-library/react with jsdom can click it too.
describe('the React UI', () => {
  it('lists the entries, marked ones with a badge', () => {
    const playing = runner()
    playing.apply({ type: 'action', id: 'shop' })
    const html = renderToString(
      <GameProvider runner={playing} plugins={[__camel__Ui]}>
        <__Pascal__List />
      </GameProvider>,
    )
    expect(html).toContain('A loaf of bread')
    expect(html).toContain('A pint of milk')
    expect(html.match(/Marked/g)).toHaveLength(1)
  })

  it('is a module for the game’s plugins list, named for the plugin', () => {
    expect(__camel__Ui.id).toBe('__id__')
    expect(__camel__Ui.layout?.sidebar).toHaveLength(1)
  })
})
