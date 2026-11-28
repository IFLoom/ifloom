---
title: "Rearrange or replace the React UI's parts"
description: "Move the React UI's parts in your layout, replace a component everywhere, or render a scene, a page or the root your own way."
---
This how-to is for `@ifloom/react`, the optional React UI. To render a game in plain DOM, Vue or React by hand, see [Start your own UI](/docs/0.1.2/how-to/render/start).

Use this when the theme isn't enough and you want to move parts, render one differently, or build the page another way. Each step goes further than the one before. For sections that fold, parts shown only at some locations and the phone's drawer, see [Arrange the layout](/docs/0.1.2/how-to/arrange-the-layout). For colours and CSS, see [Theme the React UI](/docs/0.1.2/how-to/react/theme-the-react-ui).

## Rearrange the parts in layout.tsx

The page is your layout, `src/layout.tsx`, which the `react` and `next` templates start as a copy of [`DefaultLayout`](/docs/0.1.2/reference/react/components#defaultlayout) and pass to `mountGame` as `layout`. Every part on the page is a component in it, so move parts by editing the JSX. This layout puts the notices at the top of the story and the bag under it, and leaves the quests and the wardrobe out:

```tsx
// src/layout.tsx
import { Clock, Game, GameMenu, Notices, PanelHost, RoomActions, Scene, Section, Sidebar, StatList, Story, Title } from '@ifloom/react'
import { InventoryCard } from '@ifloom/plugin-inventory/react'
import { Exits } from '@ifloom/plugin-places/react'
import { PeopleHere } from '@ifloom/plugin-cast/react'

export function Layout() {
  return (
    <Game>
      <Sidebar>
        <Title />
        <Clock />
        <StatList />
        <GameMenu />
      </Sidebar>
      <Story>
        <Notices />
        <Scene />
        <Exits />
        <RoomActions />
        <PeopleHere />
        <Section id="inventory" title="In your bag" collapsible open={false}>
          <InventoryCard title={false} />
        </Section>
      </Story>
      <PanelHost />
    </Game>
  )
}
```

Keep these in mind as you move things:

- **Delete a part where it was.** A component written twice renders twice.
- **Keep somewhere for the notices.** With no `Overlay`, nothing floats over the page, so put `Notices` in the story or the side column.
- **Keep `PanelHost`** if content opens [panels](/docs/0.1.2/reference/panels).

To put the side column on the right, use CSS. The `studio` preset does it with an `order` on the side column and a grid template on `[data-part="page"][data-has-sidebar]`.

## Replace a component everywhere

Pass your own component in `components`, under the built-in one's name. It renders everywhere the UI renders that component, with the same props plus `Default`, the built-in one, so you can hand back the cases you don't change. This one renders a character's spoken lines and pictures its own way:

```tsx
// src/main.tsx
import type { SceneBeat } from '@ifloom/engine'
import { mountGame, usePart, type Components } from '@ifloom/react'
import type { Override } from '@ifloom/react/kit'
import module from './game.ts'
import './styles.css'

const TownBeat: Override<{ beat: SceneBeat }> = ({ beat, Default }) => {
  const line = usePart('beat', 'border-l-2 border-speech pl-4 leading-prose italic')
  const picture = usePart('beat', 'mx-auto max-w-md rotate-1 rounded-lg shadow-card')
  if (beat.type === 'say' && beat.who === 'character') {
    return <blockquote {...line} data-beat="say" data-who="character">{beat.text}</blockquote>
  }
  if (beat.type === 'image') return <img {...picture} data-beat="image" src={beat.src} alt={beat.alt ?? ''} />
  return <Default beat={beat} />
}

const components: Components = { Beat: TownBeat }

mountGame(module.build(), { components })
```

[`Components`](/docs/0.1.2/reference/react/components#components) lists every name you can replace, and a plugin UI adds its own, such as `ShopCounter`, once you import its `/react`. A replacement applies everywhere. The `Beat` above renders the [backlog](/docs/0.1.2/reference/react/components#backlog)'s beats too, and a replaced `ChoiceButton` renders a scene's choices, the room's actions and the buttons in the plugins' UIs.

Follow three rules in a replacement:

- **Keep the `data-part`.** Spread [`usePart`](/docs/0.1.2/reference/react/components#usepart)'s result onto your element, so CSS, `classes` and `unstyled` still reach it. Add the [identity attributes](/docs/0.1.2/reference/react/parts#identity-attributes) your CSS uses, such as `data-beat`.
- **Render the built-in one through `Default`.** Importing `Beat` from `@ifloom/react` inside your `Beat` gives your replacement again, which calls itself forever.
- **Define `components` once**, outside any component. A new object on each render renders everything under the provider again.

[`Icon`](/docs/0.1.2/reference/react/components#icon) is the smallest one to replace. It renders every icon the UI uses, so one component swaps the whole set:

```tsx
import type { Components } from '@ifloom/react'
import type { IconName } from '@ifloom/react/kit'

const GLYPHS: Record<IconName, string> = { close: '×', back: '←', warning: '!', voice: '♪', zoom: '+', menu: '≡', chevron: '›' }

const components: Components = {
  Icon: ({ name, label }) => <span aria-label={label} aria-hidden={label ? undefined : true}>{GLYPHS[name]}</span>,
}
```

## Render the scene your own way

To restyle the scene's heading, a section with ui hints or a fold, replace [`SceneHeader`](/docs/0.1.2/reference/react/components#sceneheader), [`BeatGroup`](/docs/0.1.2/reference/react/components#beatgroup) or [`Fold`](/docs/0.1.2/reference/react/components#fold). `Scene` times its transitions, reveals and dice around those parts, so the motion stays. For a scene laid out quite differently, write your own `Scene` on [`useScene`](/docs/0.1.2/reference/react/components#usescene), which works out the same timing and renders nothing, and pass it as `components.Scene`:

```tsx
import { Beat, ChoiceList, useScene, type Components } from '@ifloom/react'

function Chapter() {
  const { view, transition, groups, pending, skip } = useScene()
  return (
    <article key={transition.key} data-transition-in={transition.in} onClick={pending ? skip : undefined}>
      <h2 className="font-heading text-scene-title">{view.scene.title}</h2>
      {groups.map((group, n) => (
        <div key={n} data-reveal={group.reveal?.as} style={{ animationDelay: `${group.reveal?.at ?? 0}ms` }}>
          {group.beats.map(({ beat, index }) => <Beat key={index} beat={beat} />)}
        </div>
      ))}
      {pending ? null : <ChoiceList choices={view.scene.choices} />}
    </article>
  )
}

const components: Components = { Scene: Chapter }
```

## Render a minigame your own way

`Scene` renders a running minigame with [`MinigameCard`](/docs/0.1.2/reference/react/components#minigamecard). Replace it in one of two ways:

- **For one minigame**, put a component in `panels` under the minigame's id. `Scene` renders it instead, with the [`MinigameView`](/docs/0.1.2/reference/minigames#minigameview) as `data`, and runs the clock for it. Call [`useMinigame`](/docs/0.1.2/reference/react/components#useminigame) in it for `send`.
- **For every minigame**, replace `MinigameCard` in `components`.

This renders the coconut shy with a component of its own, and every other minigame in a thick frame:

```tsx given
import { GameShell, type Components, type PanelComponent } from '@ifloom/react'
import { CoconutShy } from './coconut-shy.tsx'

const Coconuts: PanelComponent = () => <CoconutShy />
const panels = { coconut: Coconuts }
const components: Components = {
  MinigameCard: ({ Default }) => <div className="rounded-xl border-4 p-4"><Default /></div>,
}

export const App = () => <GameShell runner={runner} panels={panels} components={components} />
```

[Build a minigame](/docs/0.1.2/how-to/build-a-minigame) writes a minigame's panel.

## Change the shape of the page

The regions are components too. [`Game`](/docs/0.1.2/reference/react/components#game) renders the `page` part, a grid of the side column and the story when it has a `Sidebar`, and one centred column without. Anything inside it renders in order, so a header bar is a `<header>` before the story:

```tsx
// src/layout.tsx
import { Clock, Game, GameMenu, InputFields, Notices, Overlay, PanelHost, RoomActions, Scene, StatList, Story, Title } from '@ifloom/react'

export function Layout() {
  return (
    <Game className="max-w-(--width-reading)">
      <header className="flex flex-wrap items-center gap-4 border-b pb-2">
        <Title />
        <Clock />
        <StatList />
        <GameMenu />
      </header>
      <Story>
        <Scene />
        <InputFields />
        <RoomActions />
      </Story>
      <PanelHost />
      <Overlay className="fixed top-4 right-4 bottom-auto">
        <Notices />
      </Overlay>
    </Game>
  )
}
```

Every region takes `className`, merged over its own classes, and `classes` reaches the regions by their parts, `page`, `sidebar`, `story` and `overlay`. Below 48rem, `Sidebar` renders the side column as a drawer behind a menu button. To keep a column on a phone too, leave `Sidebar` out and render your own `<aside>` with the parts in it.

## Write your own root

For a page that isn't a side column and a story at all, pass any component as `layout`. It renders inside the game's provider, with the sound, the text size and the pages as the default layout has them, so [`useGame`](/docs/0.1.2/reference/react/components#usegame), the hooks and every built-in part work in it:

```tsx
// src/main.tsx
import { InputFields, Notices, Scene, mountGame, useGame, useSaves } from '@ifloom/react'
import module from './game.ts'
import './styles.css'

function TownApp() {
  const { view, runner } = useGame()
  const saves = useSaves()
  return (
    <div className="mx-auto flex max-w-2xl flex-col gap-6 p-6">
      <h1 className="font-heading text-title">{view.title}</h1>
      <Scene />
      <InputFields />
      <footer className="flex gap-3 text-sm">
        {saves.available ? <button onClick={() => void saves.save('Quick save')}>Quick save</button> : null}
        <button disabled={!runner.snapshot().canUndo} onClick={() => runner.undo()}>Undo</button>
      </footer>
      <Notices className="fixed right-4 bottom-4 w-80" />
    </div>
  )
}

mountGame(module.build(), { layout: TownApp })
```

`components`, `classes` and `unstyled` still apply to every built-in part you use. Each part reads the view itself, so leave out any part or use one twice. A part with nothing to show renders nothing, such as `Inventory` when the player holds nothing, and a plugin's part renders nothing without its plugin. Keep [`InputFields`](/docs/0.1.2/reference/react/components#inputfields) unless the game has no [inputs](/docs/0.1.2/reference/inputs), since nothing else in the UI takes the value outside a scene.

These hooks give the menus' state and actions with no look, so your own screens don't talk to the runner directly:

| Key | Meaning |
|---|---|
| [`useSaves`](/docs/0.1.2/reference/react/components#usesaves) | The save slots, and saving, loading, deleting, exporting and importing them. |
| [`useBacklog`](/docs/0.1.2/reference/react/components#usebacklog) | The backlog's entries, kept current. |
| [`useMods`](/docs/0.1.2/reference/react/components#usemods) | The player's mods, and adding, turning on and off and removing them. |
| [`useWords`](/docs/0.1.2/reference/react/components#usewords) | The UI's words in the game's language. |
| [`useDevice`](/docs/0.1.2/reference/plugins/devices#usedevice) | The device that is out, and bringing one out and putting it away. |

A button of your own that sends a command should send the `command` a [`ChoiceButton`](/docs/0.1.2/reference/react/components#choicebutton) or the view's `RenderedChoice` carries, rather than one it builds, so a greyed-out button and a refusal never disagree.

## Use the provider without GameShell

`mountGame` and [`GameShell`](/docs/0.1.2/reference/react#gameshell) add the sound, the text size and the pages around the layout. To render the React UI inside a page of your own React app, wrap it in a [`GameProvider`](/docs/0.1.2/reference/react/components#gameprovider) instead, with a [`TooltipProvider`](/docs/0.1.2/reference/react/kit#tooltip) if anything in it uses tooltips:

```tsx given
import { createRoot } from 'react-dom/client'
import { GameProvider, InputFields, Notices, Scene, StatList } from '@ifloom/react'
import { TooltipProvider } from '@ifloom/react/kit'
import { questsUi } from '@ifloom/plugin-quests/react'

const plugins = [questsUi]

createRoot(document.getElementById('root')!).render(
  <GameProvider runner={runner} plugins={plugins}>
    <TooltipProvider>
      <main className="mx-auto grid max-w-5xl gap-6 p-4 md:grid-cols-[1fr_16rem]">
        <Scene />
        <StatList />
        <InputFields />
        <Notices className="fixed right-4 bottom-4 w-80" />
      </main>
    </TooltipProvider>
  </GameProvider>,
)
```

The provider takes the same `plugins`, `panels`, `sections`, `inline` and [`UiOptions`](/docs/0.1.2/reference/react/components#uioptions) as `mountGame`. Make the runner with [`browserRunner`](/docs/0.1.2/reference/browser#browserrunner) to keep saves and settings in the browser.

## Check it worked

Run `npm run dev`. The notices show at the top of the story, a character's lines render as your block quotes, and the backlog's lines match them. Open the backlog from the menu to see the same `Beat` there.

For more, see:

- [Components](/docs/0.1.2/reference/react/components), for every part, hook and region.
- [`Components`](/docs/0.1.2/reference/react/components#components), [`Override`](/docs/0.1.2/reference/react/components#override) and [`usePart`](/docs/0.1.2/reference/react/components#usepart).
- [Add panels, sections, components and hints](/docs/0.1.2/how-to/react/extend-the-react-ui), to make your own components replaceable.
- [Choosing a UI](/docs/0.1.2/explanation/choosing-a-ui), for when to leave the React UI for one of your own.
