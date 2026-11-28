import { describe, expect, it } from 'vitest'
import { apply, holds, ownedCount, startingState, view, type Content, type Game, type GameState } from '../../src/index.ts'
import type { Plugin } from '../../src/plugin.ts'
import { freshState, loadChecked, play } from '../../src/testing.ts'
import { inventory } from '@ifloom/plugin-inventory'
import { places } from '@ifloom/plugin-places'
import { shop, type GoodDef } from '@ifloom/plugin-shop'
import { wardrobe } from '@ifloom/plugin-wardrobe'

/**
 * The styles ADR 0016 lists, each a small game written as content and options: the ways games keep things, from
 * flags alone to every plugin together. None is the engine's own; each must play.
 */

const stats: Content['stats'] = [{ id: 'coins', label: 'Coins', start: 50, max: 999, spendable: true }]

/** A shirt that is worn (and sets a flag while it is), a coffee that is drunk, and a coffee machine. */
const things: Content = {
  kinds: [
    { id: 'clothing', label: 'Clothing', unique: true, listed: false },
    { id: 'food', label: 'Food', listed: false },
    { id: 'gadget', label: 'Gadget', unique: true, listed: false },
  ],
  entities: [
    {
      id: 'shirt',
      of: 'clothing',
      name: 'shirt',
      traits: { ...wardrobe.wearable('body', { onWear: [{ kv: 'smart', to: true }], onTakeOff: [{ kv: 'smart', to: false }] }) },
    },
    { id: 'coffee', of: 'food', name: 'coffee', traits: { ...inventory.usable('Drink it', [{ kv: 'awake', to: true }]) } },
    { id: 'machine', of: 'gadget', name: 'coffee machine' },
  ],
}

const slots: Content = { name: 'slots', data: { wardrobe: { slots: [{ id: 'body', label: 'Body' }] } } }

/** The coffee machine, bought for a flag in the kitchen: nothing is handed over. */
const machine: GoodDef = { entity: 'gadget:machine', price: { coins: 30 }, deliver: false, onBuy: [{ kv: 'kitchen.coffeeMachine', to: true }] }

/** A stall selling the shirt, coffee and the machine. */
const stall = shop.vendor({
  id: 'stall',
  name: 'Stall',
  goods: [{ entity: 'clothing:shirt', price: { coins: 10 } }, { entity: 'food:coffee', price: { coins: 2 } }, machine],
})

/** A stall selling only the machine, for a game with nothing that keeps things. */
const gadgets = shop.vendor({ id: 'stall', name: 'Gadgets', goods: [machine] })

function game(plugins: Plugin[], options: { receivers?: string[]; content?: Content[]; vendor?: typeof stall } = {}): Game {
  const selling = plugins.some((plugin) => plugin.id === 'shop') ? [options.vendor ?? stall] : []
  const base: Content = { name: 'base', stats, ...things, entities: [...things.entities!, ...selling] }
  return loadChecked([base, ...(plugins.some((plugin) => plugin.id === 'wardrobe') ? [slots] : []), ...(options.content ?? [])], {
    id: 'styles',
    title: 'Styles',
    plugins,
    ...(options.receivers ? { receivers: options.receivers } : {}),
  })
}

const owns = (state: GameState, g: Game, ref: string, via?: string) => ownedCount(state, g, ref as `${string}:${string}`, undefined, via)

describe('the styles of keeping things (ADR 0016)', () => {
  it('sends clothes straight to the wardrobe, and keeps the inventory for consumables', () => {
    const g = game([inventory(), wardrobe(), shop()], { receivers: ['wardrobe', 'inventory'] })
    const state = play(freshState(g), g, shop.buy('stall', 'clothing:shirt'), shop.buy('stall', 'food:coffee'), wardrobe.wear('clothing:shirt'))
    expect(owns(state, g, 'clothing:shirt', 'wardrobe')).toBe(1)
    expect(owns(state, g, 'clothing:shirt', 'inventory')).toBe(0)
    expect(owns(state, g, 'food:coffee', 'inventory')).toBe(1)
    expect(state.kv.smart).toBe(true)
  })

  it('carries a purchase home, then puts it away in the wardrobe', () => {
    const putAway: Content = { name: 'home', actions: [{ id: 'putAway', effects: [wardrobe.store('clothing:shirt')] }] }
    const g = game([inventory(), wardrobe({ claims: false }), shop()], { content: [putAway] })
    let state = play(freshState(g), g, shop.buy('stall', 'clothing:shirt'))
    expect(owns(state, g, 'clothing:shirt', 'inventory')).toBe(1)
    // A body wears what it carries.
    state = play(state, g, wardrobe.wear('clothing:shirt'))
    expect(state.kv.smart).toBe(true)
    state = apply(state, g, { type: 'action', id: 'putAway' }).state
    expect(owns(state, g, 'clothing:shirt', 'inventory')).toBe(0)
    expect(owns(state, g, 'clothing:shirt', 'wardrobe')).toBe(1)
    // Still owned, so still worn.
    expect(state.kv.smart).toBe(true)
  })

  it('makes a purchase only a flag, with no plugin that keeps things', () => {
    const g = game([shop()], { vendor: gadgets })
    const state = play(freshState(g), g, shop.buy('stall', 'gadget:machine'))
    expect(state.kv['kitchen.coffeeMachine']).toBe(true)
    expect(holds(state, g, { kv: 'kitchen.coffeeMachine' })).toBe(true)
    expect(state.stats.coins).toBe(20)
  })

  it('has a shop and a wardrobe and no inventory: a bought shirt is worn at once', () => {
    const g = game([wardrobe(), shop()])
    const state = play(freshState(g), g, shop.buy('stall', 'clothing:shirt'), wardrobe.wear('clothing:shirt'))
    expect(owns(state, g, 'clothing:shirt')).toBe(1)
    expect(state.kv.smart).toBe(true)
  })

  it('has the inventory alone: things start held, are given, and used up', () => {
    const start: Content = { name: 'start', traits: { 'inventory/at': { 'food:coffee': 'player' } } }
    const g = game([inventory()], { content: [start] })
    let state = freshState(g)
    expect(owns(state, g, 'food:coffee')).toBe(1)
    state = play(state, g, inventory.use('food:coffee'))
    expect(state.kv.awake).toBe(true)
    expect(owns(state, g, 'food:coffee')).toBe(0)
  })

  it('leaves things lying in rooms, picked up into the inventory or only as flags', () => {
    const lying: Content = {
      name: 'rooms',
      entities: [places.location({ id: 'kitchen', name: 'Kitchen', exits: [], body: [] })],
      traits: { 'places/lies': { 'food:coffee': { at: 'kitchen', onPickUp: [{ kv: 'gotCoffee', to: true }] } } },
    }
    for (const withInventory of [true, false]) {
      const g = game([...(withInventory ? [inventory()] : []), places({ start: 'kitchen' })], { content: [lying] })
      const state = play(freshState(g), g, places.pickUp('food:coffee'))
      expect(state.kv.gotCoffee, String(withInventory)).toBe(true)
      expect(owns(state, g, 'food:coffee'), String(withInventory)).toBe(withInventory ? 1 : 0)
    }
  })

  it('needs no plugin at all: an inventory hand-rolled in kv keys, as in Twine', () => {
    const handRolled: Content = {
      name: 'kv',
      introScene: 'kitchen',
      scenes: [
        {
          id: 'kitchen',
          body: [{ text: 'A kettle, and a jar of coffee.' }],
          choices: [
            { id: 'take', label: 'Take the coffee', when: { not: { kv: 'hasCoffee' } }, effects: [{ kv: 'hasCoffee', to: true }] },
            {
              id: 'drink',
              label: 'Drink it',
              when: { kv: 'hasCoffee' },
              effects: [
                { kv: 'hasCoffee', to: false },
                { kv: 'awake', to: true },
              ],
            },
          ],
        },
      ],
    }
    const g = loadChecked([handRolled], { id: 'kv', title: 'KV' })
    const offered = (state: GameState) => view(state, g).scene?.choices.map((choice) => choice.id)
    let state = startingState(g)
    expect(offered(state)).toEqual(['take'])
    state = apply(state, g, { type: 'choose', id: 'take' }).state
    expect(offered(state)).toEqual(['drink'])
    state = apply(state, g, { type: 'choose', id: 'drink' }).state
    expect(state.kv).toMatchObject({ hasCoffee: false, awake: true })
  })
})
