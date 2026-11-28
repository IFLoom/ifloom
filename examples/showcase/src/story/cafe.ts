/**
 * The Corner Café: coffee, the counter, its storylets when you sit a while,
 * and weekend work.
 */
import type { Content } from '@ifloom/engine'
import { statuses } from '@ifloom/plugin-statuses'
import { wardrobe } from '@ifloom/plugin-wardrobe'
import { calendar } from '@ifloom/plugin-calendar'
import { cast } from '@ifloom/plugin-cast'
import { places } from '@ifloom/plugin-places'
import { shop } from '@ifloom/plugin-shop'
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
      when: cast.here('ava'),
      body: [{ text: 'Ava drops into the chair opposite with a mug of her own.\n\n"Five minutes. Don’t tell anyone I sat down."' }],
      choices: [
        {
          id: 'leave',
          label: 'Keep her secret',
          effects: [{ stat: 'friendship', by: 2, of: cast.character('ava') }, { scene: null }],
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
      description: 'Café',
      exits: ['high-street'],
      // Open in the day; the door says when it opens again.
      blocked: [{ when: { not: calendar.period('morning', 'afternoon') }, reason: 'Closed. Opens tomorrow morning.' }],
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
            statuses.apply('caffeinated'),
          ],
        },
        // The counter, the shop plugin's vendor, opens in a panel: nothing about a shop is drawn by itself.
        { id: 'counter', label: 'Go to the counter', effects: [shop.open('counter')] },
        // A sandwich as a plain action: a cost, a place and a thing given, with no plugin. Always 4 coins, never sold out.
        { id: 'buy-sandwich', label: 'Buy a sandwich', cost: { stats: { coins: 4 } }, effects: [{ receive: 'item:sandwich' }] },
        // Something small happens while you sit: one of the café's storylets, drawn at random.
        { id: 'sit', label: 'Sit a while', effects: [{ scene: { from: 'cafe', otherwise: 'cafe.quiet' } }] },
      ],
      // A picture of the counter while Ava is on shift, with a hotspot on her that talks to her.
      picture: {
        aspect: '16/10',
        layers: [{ id: 'counter', src: 'photo/ava.svg', when: cast.here('ava') }],
        hotspots: [{ id: 'ava', rect: [36, 22, 28, 44], label: 'Talk to Ava', command: cast.talk('ava'), layer: 'counter' }],
      },
      body: [
        { text: 'Six tables, one of them wobbly. The coffee machine sighs like it has been working since dawn, which it has.' },
        { text: 'Ava is behind the counter, flour to the elbows, and nods you in.', when: cast.here('ava') },
        { text: 'Someone points at your raincoat and grins. It is very yellow.', when: wardrobe.wearing('clothing:raincoat') },
        { text: 'Your knee won’t stop jiggling under the table. The coffee is working.', when: statuses.active('caffeinated') },
      ],
    }),
    shop.vendor({
      id: 'counter',
      name: 'The counter',
      // At the café only (and not shown elsewhere), and open in the morning and afternoon.
      blocked: [places.onlyAt(['cafe'], { string: 'shop/notHere' }, { hide: true }), shop.hours(['morning', 'afternoon'])],
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
          name: 'Weekend help',
          description: 'Saturday mornings behind the counter at the Corner Café.',
          blocked: [{ when: { not: { stat: 'friendship', of: cast.character('ava'), gte: 10 } }, reason: 'Ava doesn’t know you well enough yet.' }],
          // Saturdays (day 5 of the calendar's week), starting in the morning; the shift takes it.
          days: [5],
          hours: ['morning'],
          // Worked at the café.
          shift: { cost: { energy: 25 }, passes: 1, blocked: [places.onlyAt(['cafe'], { string: 'jobs/notHere' })] },
          ranks: [
            { id: 'help', name: 'Weekend help', pay: { coins: 12 } },
            { id: 'barista', name: 'Barista', pay: { coins: 16 }, requires: { shifts: 3 } },
          ],
          // Miss two Saturdays and Ava finds someone else.
          fire: { missed: 2 },
        },
      ],
    },
    statuses: {
      statuses: [
        { id: 'caffeinated', name: 'Caffeinated', description: 'A coffee’s worth of get-up-and-go.', turns: 2, modifiers: [{ stat: 'energy', add: 10 }] },
      ],
    },
  },
}
