# Extending the UI

The base UI draws everything the engine and the first-party plugins put in the view. What it cannot know about is your game's own: a scene with a screen of its own, an app's custom screen, your own plugin's view. You hand it components for those. And when the layout itself is not what you want, you build your own from the same parts.

## Panels

A **panel** is a screen the game draws itself, in place of the usual one. There are two places for one:

- **A scene's panel**, drawn instead of its choices: a market stall with prices, a card game, a map. The scene names it with [`panel`](/reference/scenes#sceneview).
- **An app's panel section**, drawn inside an app: an inbox, a radio dial. The app has a [`{ panel }` section](/plugins/devices#section).

Either way, the component is a [`PanelComponent`](/ui/components#panelcomponent): it gets `data`, what the game's [custom panel](/reference/custom#panels) returned, and reads anything else it needs with [`useGame`](/ui/components#usegame). You give the UI your panels by name in the `panels` prop.

### A scene's panel

The market stall shows today's prices and lets the player buy a loaf. The scene names the panel and the custom panel that fills it; its choices are still the moves that can be made:

```ts
const stall: DataScene = {
  id: 'market.stall',
  title: 'The stall',
  panel: 'StallPanel',
  panelData: 'stallPrices',
  body: [{ text: 'stall' }],
  choices: [
    { id: 'buy', effects: [{ kind: 'stat', key: 'coins', by: -4 }, { kind: 'scene', id: null }] },
    { id: 'leave', effects: [{ kind: 'scene', id: null }] },
  ],
}

// on the pack or the game
custom: { panels: { stallPrices: () => ({ loaf: 4 }) } }
```

The component draws the prices its own way and ends by sending one of the scene's own choices, so what happens is still content, and the engine still checks it:

```tsx
import { Button, Card, CardContent, CardHeader, CardTitle, GameShell, useGame, type PanelComponent } from '@ifloom/ui'

const StallPanel: PanelComponent = ({ data }) => {
  const { send } = useGame()
  const prices = data as { loaf: number }
  return (
    <Card>
      <CardHeader><CardTitle>Today's bread</CardTitle></CardHeader>
      <CardContent className="flex gap-2">
        <Button onClick={() => send({ type: 'choose', id: 'buy' })}>A loaf, {prices.loaf}c</Button>
        <Button variant="ghost" onClick={() => send({ type: 'choose', id: 'leave' })}>Not today</Button>
      </CardContent>
    </Card>
  )
}

const panels = { StallPanel }

<GameShell runner={runner} panels={panels} />
```

The key in `panels` is the scene's `panel`. The scene's title and body are drawn above the panel as usual.

### An app's panel

An app's `{ panel: 'inbox' }` section names a custom panel, and the UI draws the component of **the same name**, with what that custom panel returned:

```ts
custom: { panels: { inbox: (state) => ({ unread: state.flags.newMail ? 1 : 0 }) } }
```

```tsx
const Inbox: PanelComponent = ({ data }) => <p>{(data as { unread: number }).unread} unread</p>

const panels = { StallPanel, inbox: Inbox }
```

**Gotchas.**
- **A panel with no component is quietly left out.** A scene falls back to its choices; an app section draws nothing.
- **The data is whatever the custom panel returned,** typed `unknown`. Cast it to the shape you wrote it with.
- **A panel's own state is its own.** A component may keep local state (what is in the basket, which card is face up) with React's `useState`; it is not in the save, so end with a command that is.
- **Define `panels` once,** outside any component. See [`GameProvider`](/ui/components#gameprovider).

## Plugin sections

An app's `{ plugin: 'loyalty' }` section asks the UI to draw a plugin's view inside the app. The UI has renderers for the [messages](/plugins/messages) and [feed](/plugins/feed) plugins built in; for any other plugin, yours included, you give one in the `sections` prop, keyed by **plugin id**.

The component is a [`PluginSectionComponent`](/ui/components#pluginsectioncomponent): it gets `data`, the plugin's whole view at [`view.plugins[id]`](/reference/view#plugins), and `with`, the section's `with`, which says which part to show.

The [loyalty card plugin](/reference/plugins#a-worked-example) as an app on the laptop:

```ts
devices({
  devices: [{ id: 'laptop', name: 'Laptop', frame: 'laptop', sidebar: true }],
  apps: [{ id: 'card', name: 'Card', icon: 'card', on: 'laptop', sections: [{ plugin: 'loyalty' }] }],
})
```

```tsx
import type { PluginSectionComponent } from '@ifloom/ui'

const LoyaltyCard: PluginSectionComponent = ({ data }) => {
  const card = data as { stamps: number; free: number } | undefined
  if (!card) return null
  return <p>{card.stamps} of 5 stamps</p>
}

const sections = { loyalty: LoyaltyCard }

<GameShell runner={runner} sections={sections} />
```

Return nothing when `data` is `undefined`: that is a game without the plugin.

To draw messages or a feed your own way, register a renderer under `messages` or `feed`; yours wins over the built-in one. It gets the same `data` and `with` (`{ channel }` or `{ feed }`).

## A plugin's view anywhere

A plugin section is only for apps. To show a plugin's view anywhere else, such as the loyalty card in the sidebar, read it from the view in a component of your own, and put it in the [layout](/ui/#layouts):

```tsx
function StampCount() {
  const { view } = useGame()
  const card = view.plugins.loyalty as { stamps: number } | undefined
  return card ? <Badge variant="outline">{card.stamps} stamps</Badge> : null
}

const [title, ...rest] = DEFAULT_LAYOUT.sidebar

<GameShell runner={runner} layout={{ ...DEFAULT_LAYOUT, sidebar: [title, <StampCount key="stamps" />, ...rest] }} />
```

This is how the UI reads the first-party plugins too: by the shape of their views, never by importing them. A component of yours can do the same, and your UI then works whether or not the game has the plugin.

## Your own layout

Most arrangements need no code of your own: [`GameShell`](/ui/#gameshell)'s `layout` names the parts for the side column and the stage, in order, with your own components among them (see [Layouts](/ui/#layouts)). The stats over the stage, no quest list, the tables of a management game under the scene:

```tsx
<GameShell runner={runner} layout={{ sidebar: ['title', 'menu', 'location', 'people', 'actions'], stage: ['stats', 'scene', 'inputs'] }} />
```

When you want a page `GameShell` cannot draw (the side column on the right, two columns of parts, a header bar), write your own shell from the exported parts. Wrap it in a [`GameProvider`](/ui/components#gameprovider), and a [`TooltipProvider`](/ui/components#tooltip) if anything in it uses tooltips. [`Parts`](/ui/components#parts) draws a list of parts by name, as `GameShell` does, and [`Sidebar`](/ui/components#sidebar) is the side column on its own:

```tsx
import { GameProvider, Notices, Parts, QuestLog, Sidebar, TooltipProvider } from '@ifloom/ui'

function MyLayout() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 p-4 md:grid-cols-[1fr_16rem]">
      <main className="flex flex-col gap-4">
        <Parts parts={['scene', 'inputs', <QuestLog key="quests" title="Journal" />, 'debug']} />
      </main>
      <Sidebar className="gap-3" />
      <Notices className="fixed right-4 bottom-4 w-80" />
    </div>
  )
}

createRoot(document.getElementById('app')!).render(
  <GameProvider runner={runner} panels={panels} sections={sections}>
    <TooltipProvider>
      <MyLayout />
    </TooltipProvider>
  </GameProvider>,
)
```

Every part is a component too ([`SceneStage`](/ui/components#scenestage), [`StatList`](/ui/components#statlist), [`Title`](/ui/components#title), [`Actions`](/ui/components#actions) and the rest), for a part that needs props, such as the quest list's `title` above, or a page that wants no list at all.

Each part reads the view itself, so you can leave any out or put any twice. Each part that belongs to a plugin draws nothing without it, and so does each part with nothing to show: `InputFields` with no input on offer, `Inventory` with empty pockets, `GameMenu` on a runner with no saves, undo or backlog and a provider with no `mods`.

**Gotcha.** Leave out `InputFields` only if the game has no [inputs](/reference/inputs). Nothing else in the UI sends `input`, so without it the player has no way to give the value.

To replace one part, write your own in its place. A component that draws a list of buttons from the view only needs [`useGame`](/ui/components#usegame), [`ChoiceButton`](/ui/components#choicebutton) for each, and [`useWords`](/ui/components#usewords) for any word of the UI's. A component that sends commands should send what the view's buttons carry (`choice.command`), not commands it builds, so a greyed-out button and a refusal never disagree.

## More shadcn/ui components

The UI exports the primitives it uses: [`Button`](/ui/components#button), [`Badge`](/ui/components#badge), [`Card`](/ui/components#card), [`Dialog`](/ui/components#dialog), [`ScrollArea`](/ui/components#scrollarea), [`Separator`](/ui/components#separator), [`Tabs`](/ui/components#tabs) and [`Tooltip`](/ui/components#tooltip). For anything else shadcn/ui has, such as a slider, a select or a sheet, add it to your own project the shadcn/ui way, with its CLI or by copying the component in. It will match the UI with no extra work: shadcn/ui components are styled by the same CSS variables, and [`@ifloom/ui/styles.css`](/ui/#theming) already defines them all and maps them to Tailwind colours.

Set up the CLI as shadcn/ui's [Vite guide](https://ui.shadcn.com/docs/installation/vite) says, with the `@/` path alias, pointing it at your stylesheet. Then:

```sh
npx shadcn@latest add slider
```

writes `src/components/ui/slider.tsx`, and installs the Radix package it needs.

**Gotchas.**
- **Keep your stylesheet's variables.** `shadcn init` writes its own `:root` and `.dark` variables and `@theme` block into the stylesheet it is pointed at. `@ifloom/ui/styles.css` already has them; delete the ones it wrote, or keep only those you mean to override, after the import.
- **One `cn` is as good as another.** The CLI writes its own `lib/utils.ts` with `cn`. It is the same function as the UI's [`cn`](/ui/components#cn); use either.
- **Import Tailwind once.** If the CLI adds `@import "tailwindcss"` to your stylesheet, remove it: the UI's stylesheet imports it already.
