---
title: "Writing a flowing scene"
description: "Write a scene that reads on as the player chooses: words in place, a decision partway through, a question to come back to, a minigame where it stands and a part that folds away. Then draw the past picks and the folds in plain DOM, React or Vue."
---
Most scenes are one screen: some text, then the choices. When you want a conversation that carries on after each answer, or a chapter whose text builds as the player decides, write the scene as a flow. The player's picks stay on the page where they were made, and the text each pick brings follows them. [Flowing scenes](/docs/reference/flows) in the reference lists every block and check.

## Write the words in place

Start with the builders `@ifloom/engine` exports. `text()` takes a page of words, so you can write a scene's prose where its structure is, without a prose key for each paragraph. It takes off the indentation the lines share, and a blank line starts a new paragraph:

```ts
import type { DataScene } from '@ifloom/engine'
import { choice, decide, fold, jump, minigame, point, say, text, when } from '@ifloom/engine'

const river: DataScene = {
  id: 'ava.river',
  title: 'By the river',
  speaker: 'ava',
  body: [
    text(`
      Ava is on the bench with her shoes off, feeding the ducks the crusts of the day.

      "I told you it was the only quiet in town." She shuffles up to make room.
    `),
  ],
  choices: [{ id: 'home', label: 'Say goodnight', effects: [{ scene: null }] }],
}
```

Keyed prose blocks, `{ prose: 'ava.river' }`, still work beside these, so you can move a scene over a block at a time.

## Stop for a decision

`decide()` puts a decision partway through. The flow waits there until the player picks. The pick's `then` comes next, then the blocks after the decision:

```ts
body: [
  text(`Ava is on the bench with her shoes off, feeding the ducks.`),
  decide('evening', [
    choice('ducks', 'Ask about the ducks', { then: [say('ava', 'They know my name. I never asked theirs.')] }),
    choice('stay', 'Sit with her until the light goes', {
      effects: [{ stat: 'friendship', by: 5, of: 'character:ava' }],
      then: [text(`The water goes orange, then grey.`)],
    }),
  ]),
  text(`You walk back along the river together, as far as the bridge.`),
],
```

Either pick ends with the walk back, then the scene's own `choices`, Say goodnight. A pick that shouldn't rejoin leaves the scene with an effect, `{ scene: null }` or `{ scene: 'park.dusk' }`.

## Come back to a question

A conversation often has questions the player can ask in any order before moving on. Mark a `point()` before the decision, give each question `jump()` back to it, and hide each once it's asked:

```ts
const asked = (id: string) => [{ when: { chose: `ava.river#${id}` }, reason: 'You asked.', hide: true }]

body: [
  text(`Ava is on the bench with her shoes off, feeding the ducks.`),
  point('bench'),
  decide('evening', [
    choice('ducks', 'Ask about the ducks', { blocked: asked('ducks'), then: [say('ava', 'They know my name.')], effects: [jump('bench')] }),
    choice('bridge', 'Ask about the bridge', { blocked: asked('bridge'), then: [say('ava', 'Older than the town.')], effects: [jump('bench')] }),
    choice('stay', 'Sit with her until the light goes'),
  ]),
  text(`You walk back along the river together.`),
],
```

A jump is only ever a choice's effect, so the flow goes round again only when the player picks. Keep one choice that moves on: the checker reports a decision whose every choice hides once it's picked, because the flow would stop there with nothing left.

## Skip ahead

A point doesn't have to be behind you. Put one inside a section or a choice's `then`, and a jump goes straight there and reads on from it. Here the shortcut skips the climb and joins the walk at the gate:

```ts
body: [
  decide('way', [
    choice('hill', 'Over the hill', { then: [text(`It's steep. Your legs complain.`), point('gate'), text(`The gate is open.`)] }),
    choice('lane', 'Down the lane', { then: [text(`The lane is muddy but flat.`)], effects: [jump('gate')] }),
  ]),
  text(`The farmhouse is just ahead.`),
],
```

Taking the lane reads "The lane is muddy but flat.", "The gate is open." and then "The farmhouse is just ahead.": the rest of the hill's `then` after the point, then what comes after the decision.

## Play a minigame where it stands

`minigame('skim')` starts the [minigame](/docs/reference/minigames) when the flow reaches it, and the flow waits until it ends. `panel('prices', { stall: 'bread' })` opens a [panel](/docs/reference/panels) the same way and waits until the player closes it. What comes after either reads on once it's done:

```ts
body: [
  text(`Ava finds a flat stone and holds it out.`),
  minigame('skim'),
  when({ kv: 'skips', gte: 4 }, [say('ava', 'Show-off.')]),
  text(`The ripples reach the far bank.`),
],
```

## Fold a part away

`fold()` puts blocks in a part the player can open and shut, such as a letter they might not want to read again. It's presentation only and keeps no state:

```ts
fold('Read the postcard', [text(`Wish you were here. The sea is cold and the chips are good. J.`)])
```

A choice that matters to the story, such as reading the postcard at all, is a choice, so it's saved and replayed.

## Draw it yourself

A flowing scene comes to your UI as beats and choices, like any other, so a UI that draws "beats, then choices" already works. Two things are new:

- a beat `{ type: 'chose', label }` where each past pick was
- a beat's `section`, the hints of the section it's in, which is how a fold's beats say they belong together: `section.fold` is the fold's words

`view.scene.fresh` is the index of the first beat the last pick brought, if you want to animate only those. The [React UI](/docs/react/components#beat) draws all of this for you. To draw it yourself, add the `chose` beat and gather a fold's beats into a `<details>`:

```ts tab="Plain JS" tab-group="framework"
// src/main.ts: draw the beats in runs, a fold's together.
import type { SceneBeat } from '@ifloom/engine'

function drawBeats(parent: HTMLElement, beats: SceneBeat[]): void {
  let fold: { label: string; body: HTMLElement } | null = null
  for (const beat of beats) {
    const label = beat.section?.fold
    if (typeof label !== 'string') fold = null
    else if (fold?.label !== label) {
      const details = parent.appendChild(document.createElement('details'))
      details.appendChild(document.createElement('summary')).textContent = label
      fold = { label, body: details }
    }
    drawBeat(fold?.body ?? parent, beat)
  }
}

// In drawBeat's switch: a pick made earlier in the scene.
//   case 'chose':
//     add(parent, 'p', beat.label, 'beat-chose')
//     break
```

```tsx tab="React" tab-group="framework"
// src/Beats.tsx: React with the runner, without @ifloom/react.
import type { SceneBeat } from '@ifloom/engine'
import { Beat } from './Beat.tsx'

/** The beats in runs: one on its own, or a fold's together. */
function runs(beats: SceneBeat[]) {
  const out: { fold?: string; beats: SceneBeat[] }[] = []
  for (const beat of beats) {
    const fold = typeof beat.section?.fold === 'string' ? beat.section.fold : undefined
    const last = out.at(-1)
    if (fold !== undefined && last?.fold === fold) last.beats.push(beat)
    else out.push({ fold, beats: [beat] })
  }
  return out
}

export function Beats({ beats }: { beats: SceneBeat[] }) {
  return (
    <>
      {runs(beats).map((run, at) =>
        run.fold === undefined ? (
          <Beat key={at} beat={run.beats[0]} />
        ) : (
          <details key={at}>
            <summary>{run.fold}</summary>
            {run.beats.map((beat, n) => (
              <Beat key={n} beat={beat} />
            ))}
          </details>
        ),
      )}
    </>
  )
}

// In Beat's switch: case 'chose': return <p className="beat-chose">{beat.label}</p>
```

```vue tab="Vue" tab-group="framework"
<!-- src/Beats.vue: the beats in runs, a fold's together. Beat.vue draws a `chose` beat as <p class="beat-chose">. -->
<script setup lang="ts">
import { computed } from 'vue'
import type { SceneBeat } from '@ifloom/engine'
import Beat from './Beat.vue'

const props = defineProps<{ beats: SceneBeat[] }>()
const runs = computed(() => {
  const out: { fold?: string; beats: SceneBeat[] }[] = []
  for (const beat of props.beats) {
    const fold = typeof beat.section?.fold === 'string' ? beat.section.fold : undefined
    const last = out.at(-1)
    if (fold !== undefined && last?.fold === fold) last.beats.push(beat)
    else out.push({ fold, beats: [beat] })
  }
  return out
})
</script>

<template>
  <template v-for="(run, at) in runs" :key="at">
    <Beat v-if="run.fold === undefined" :beat="run.beats[0]" />
    <details v-else>
      <summary>{{ run.fold }}</summary>
      <Beat v-for="(beat, n) in run.beats" :key="n" :beat="beat" />
    </details>
  </template>
</template>
```

The templates draw a `chose` beat as a small line set in, with a `›` in front, from `.beat-chose` in `styles.css`.

## See it in the showcase

Small Town's evening by the river, `ava.river` in [`examples/showcase/src/story/ava.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/ava.ts), lets you pocket a shell and ask about the ducks before you sit with Ava. The Letter's second chapter, [`examples/novel/src/story/ch2.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/novel/src/story/ch2.ts), reads on from the answer you give Mrs Okafor.
