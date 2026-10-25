/**
 * The supporter content: what the unlock "supporter" opens. A file in
 * src/unlocks/ is never part of the page. `ifloom build` encrypts it under
 * the unlock's code (IFLOOM_UNLOCK_SUPPORTER, from .env here) and puts only
 * the ciphertext in the page; a player who enters the code gets it back.
 *
 * It must be data, as a mod is: no functions.
 */
import { SCHEMA, type Pack } from '@ifloom/engine'
import { hasUnlock } from '@ifloom/plugin-unlocks'

const supporter: Pack = {
  id: 'supporter',
  schema: SCHEMA,
  scenes: [
    // One more of the café's storylets, drawn by "Sit a while" once the unlock is recorded.
    {
      id: 'cafe.back-room',
      title: 'The back room',
      speaker: 'ava',
      drawnFrom: ['cafe'],
      weight: 5,
      when: { all: [hasUnlock('supporter'), { not: { seen: 'cafe.back-room' } }] },
      body: [
        {
          text: 'Ava lifts the counter flap and waves you through to the back room, where the regulars who chip in for the new espresso machine get their names chalked on the beam above the sink. Yours is there now, in her careful capitals.',
        },
      ],
      choices: [
        {
          id: 'leave',
          label: 'Thank her and head back out',
          effects: [{ stat: 'charm', by: 1 }, { scene: null }],
        },
      ],
    },
  ],
}

export default supporter
