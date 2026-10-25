/**
 * The Corner Café: coffee, the counter, its storylets when you sit a while,
 * and weekend work.
 */
import { give, type Content } from '@ifloom/engine'
import { applyStatus, statusActive } from '@ifloom/plugin-statuses'
import { wearing } from '@ifloom/plugin-wardrobe'
import { period } from '@ifloom/plugin-calendar'
import { character, here, talk } from '@ifloom/plugin-cast'
import { openShop, vendor } from '@ifloom/plugin-shop'
import { place } from '../place.ts'

export const cafe: Content = {
  // One coffee a day: each new day resets it.
  resets: { hadCoffee: false },
  scenes: [
    // The café's storylets: scenes drawn from 'cafe' by "Sit a while", by weight, while their when holds.
    {
      id: 'cafe.window',
      title: 'The window seat',
      drawnFrom: ['cafe'],
      weight: 3,
      when: { not: { seen: 'cafe.window', gte: 2 } },
      body: [{ text: 'You take the stool by the window. A bus goes by, then a man with a ladder, then the same bus the other way.' }],
      choices: [{ id: 'leave', label: 'Finish your cup', effects: [{ scene: null }] }],
    },
    {
      id: 'cafe.crossword',
      title: 'Seven down',
      drawnFrom: ['cafe'],
      when: { not: { seen: 'cafe.crossword' } },
      body: [
        {
          text: 'The man at the next table taps his paper with a pencil.\n\n"Seven down. Somewhere to sit and wait, four letters." He looks at you over his glasses.\n\nYou try "café". He counts the squares, and writes it in.',
        },
      ],
      choices: [
        {
          id: 'leave',
          label: 'Leave him to it',
          effects: [{ stat: 'charm', by: 1 }, { scene: null }],
        },
      ],
    },
    {
      id: 'cafe.break',
      title: 'Ava’s break',
      speaker: 'ava',
      drawnFrom: ['cafe'],
      weight: 2,
      when: here('ava'),
      body: [{ text: 'Ava drops into the chair opposite with a mug of her own.\n\n"Five minutes. Don’t tell anyone I sat down."' }],
      choices: [
        {
          id: 'leave',
          label: 'Keep her secret',
          effects: [{ stat: 'friendship', by: 2, of: character('ava') }, { scene: null }],
        },
      ],
    },
    // When none of them can happen.
    {
      id: 'cafe.quiet',
      title: 'A quiet table',
      body: [{ text: 'Nothing much happens. The coffee machine sighs, and you let it.' }],
      choices: [{ id: 'leave', label: 'Get up', effects: [{ scene: null }] }],
    },
  ],
  entities: [
    place({
      id: 'cafe',
      name: 'The Corner Café',
      desc: 'Café',
      exits: ['high-street'],
      // Open in the day; the door says when it opens again.
      blocked: [{ when: { not: period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }],
      actions: [
        {
          id: 'coffee',
          label: 'Buy a coffee',
          cost: { stats: { coins: 3 } },
          blocked: [{ when: { kv: 'hadCoffee' }, reason: 'One is enough for today.' }],
          effects: [
            { stat: 'energy', by: 15 },
            { kv: 'hadCoffee', to: true },
            // And a lift that lasts till tomorrow is out: 10 more energy, never written.
            applyStatus('caffeinated'),
          ],
        },
        // The counter, the shop plugin's vendor, opens in a panel: nothing about a shop is drawn by itself.
        { id: 'counter', label: 'Go to the counter', effects: [openShop('counter')] },
        // A sandwich as a plain action: a cost, a place and a thing given, with no plugin. Always 4 coins, never sold out.
        { id: 'buy-sandwich', label: 'Buy a sandwich', cost: { stats: { coins: 4 } }, effects: [give('item:sandwich')] },
        // Something small happens while you sit: one of the café's storylets, drawn at random.
        { id: 'sit', label: 'Sit a while', effects: [{ scene: { from: 'cafe', otherwise: 'cafe.quiet' } }] },
      ],
      // A picture of the counter while Ava is on shift, with a hotspot on her that talks to her.
      stage: {
        aspect: '16/10',
        layers: [{ id: 'counter', src: 'photo/ava.svg', when: here('ava') }],
        hotspots: [{ id: 'ava', rect: [36, 22, 28, 44], label: 'Talk to Ava', command: talk('ava'), layer: 'counter' }],
      },
      body: [
        { text: 'Six tables, one of them wobbly. The coffee machine sighs like it has been working since dawn, which it has.' },
        { text: 'Ava is behind the counter, flour to the elbows, and nods you in.', when: here('ava') },
        { text: 'Someone points at your raincoat and grins. It is very yellow.', when: wearing('clothing:raincoat') },
        { text: 'Your knee won’t stop jiggling under the table. The coffee is working.', when: statusActive('caffeinated') },
      ],
    }),
    vendor({
      id: 'counter',
      name: 'The counter',
      at: ['cafe'],
      hours: ['morning', 'afternoon'],
      // Ava will take an unopened sandwich back for half.
      buysBack: 0.5,
      // One thing on the board is half price each day.
      discounts: { off: 0.5 },
      goods: [
        // Prices from each thing's sellable trait. A sandwich is always there.
        { entity: 'item:sandwich' },
        // Two a day, baked each morning: the counter holds them.
        { entity: 'item:flapjack', stock: 2, restock: 'day' },
        { entity: 'item:paper' },
      ],
    }),
  ],
  data: {
    jobs: {
      jobs: [
        {
          id: 'weekend',
          title: 'Weekend help',
          description: 'Saturday mornings behind the counter at the Corner Café.',
          blocked: [{ when: { not: { stat: 'friendship', of: character('ava'), gte: 10 } }, reason: 'Ava doesn’t know you well enough yet.' }],
          at: ['cafe'],
          // Saturdays (day 5 of the calendar's week), starting in the morning; the shift takes it.
          days: [5],
          hours: ['morning'],
          shift: { cost: { energy: 25 }, passes: 1 },
          ranks: [
            { id: 'help', title: 'Weekend help', pay: { coins: 12 } },
            { id: 'barista', title: 'Barista', pay: { coins: 16 }, requires: { shifts: 3 } },
          ],
          // Miss two Saturdays and Ava finds someone else.
          fire: { missed: 2 },
        },
      ],
    },
    statuses: {
      statuses: [
        { id: 'caffeinated', label: 'Caffeinated', summary: 'A coffee’s worth of get-up-and-go.', turns: 2, modifiers: [{ stat: 'energy', add: 10 }] },
      ],
    },
  },
}
