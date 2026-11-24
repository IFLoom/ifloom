---
title: "Add a quest"
description: "Give the player a goal in stages, each finished by a condition, and gate content on how far the quest has got."
---
Use this to give the player a goal in steps, such as settling into a new town. You need the [quests plugin](/docs/reference/plugins/quests) (see [Add a plugin](/docs/how-to/add-a-plugin)). A quest is a list of [stages](/docs/reference/glossary#stage), each done the first time its condition holds, in order. Progress is never taken back.

## Declare the quest

Add the quest to `data.quests.quests`, in the story file it belongs to. Each stage has a `hint`, which the player reads while it's the stage they're on, and a `done` condition. The showcase's first quest, cut down to two stages:

```ts
import type { Content } from '@ifloom/engine'
import { places } from '@ifloom/plugin-places'

export const movingDay: Content = {
  data: {
    quests: {
      quests: [
        {
          id: 'settle',
          name: 'Settle in',
          description: 'New town, new flat. Find your feet.',
          starts: { kv: 'phase', is: ['open'] },
          stages: [
            { id: 'out', hint: 'Step out onto the high street.', done: places.at('high-street') },
            { id: 'ava', hint: 'Somebody runs the café. Say hello.', done: { seen: 'ava.hi' } },
          ],
        },
      ],
    },
  },
}
```

Write each `done` for the moment something happens, such as arriving on the high street. A stage stays done when its condition stops holding, and a later stage counts only once the stages before it are done. The quest is done when its last stage is.

## Start it

Give the quest a `starts` condition, and it starts the first time that holds after a command. `settle` starts when the intro sets the `phase` key to `open`. Leave `starts` out to start the quest from an effect instead, with `quests.start()`:

```ts
import type { ActionDef } from '@ifloom/engine'
import { quests } from '@ifloom/plugin-quests'

export const collar: ActionDef = { id: 'collar', label: 'Turn up your collar', effects: [quests.start('scarf')] }
```

A quest can start another, as the showcase's `friend` quest does with `starts: quests.active('settle')`. Give a quest `secret: true` to leave it out of the count of quests still to find until it starts.

## Gate content on its progress

Read a quest's progress with its conditions, anywhere a condition goes:

```ts
import type { Choice } from '@ifloom/engine'
import { quests } from '@ifloom/plugin-quests'

export const river: Choice = { id: 'river', label: 'Walk to the river', when: quests.reached('friend', 'close'), effects: [{ scene: 'ava.river' }] }
```

- **`quests.active('settle')`** holds while the quest is started and not done.
- **`quests.reached('friend', 'close')`** holds once that stage is done.
- **`quests.done('settle')`** holds once the last stage is done.

## Show a badge for news

A quest has news when it starts, moves on a stage or is done. Print the number of quests with news the player hasn't looked at with `{{quests/updates}}`, such as in a button's label `To do ({{quests/updates}})`. When the player has looked, send `quests.seen()` to mark every quest's news seen, or `quests.seen('settle')` for one. The React UI's quest log shows the count as a badge, with a Mark all seen button that sends `quests.seen()`.

## Track one quest

Send `quests.track('scarf')` to track an active quest, which puts it first in the list. The quest log's Track button sends it. `quests.track()` with no quest stops tracking. Tracking a quest that isn't active is refused with `You are not doing that.`

## Check it worked

Run `npm run check`. It reports a quest with no stages, two stages with one id, and anything a `done` or `starts` names that the game doesn't have:

```text
content · quests settle · stage out: unknown location "lido"
```

Then play in `npm run dev`. Once the quest starts, it shows in the quest log with its first hint, and the hint moves on as each stage is done. To render the log in a UI of your own, see [Render the quest log](/docs/how-to/render/progress-plugins#render-the-quest-log).

In the showcase, Small Town, `settle` is in [`examples/showcase/src/story/moving-day.ts`](https://github.com/IFLoom/ifloom/blob/main/examples/showcase/src/story/moving-day.ts) and `friend` in `src/story/ava.ts`. For more, see:

- [Quests](/docs/reference/plugins/quests), with [`QuestDef`](/docs/reference/plugins/quests#questdef), [`QuestStage`](/docs/reference/plugins/quests#queststage) and the [`quests/start`](/docs/reference/plugins/quests#questsstart) effect.
- [Build a friendship in stages](/docs/how-to/build-friendships-in-stages), to pace a quest's stages over days.
- [Stats, the kv store and storylines](/docs/explanation/entities-and-traits#stats-the-kv-store-and-storylines).
