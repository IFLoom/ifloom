import { Game, Scene, Section, Sidebar, StatList, Story, useGame, useWords } from '@ifloom/react'

// A layout of your own, for mountGame's `layout`, with the stats in the side column as the default layout has them.
export function Layout() {
  const words = useWords()
  return (
    <Game>
      <Sidebar>
        <Section id="stats" title={words('stats')} collapsible open>
          {/* Each listed stat, with a bar or pips by its `display` hint, and its level. */}
          <StatList />
        </Section>
        <Purse />
      </Sidebar>
      <Story>
        <Scene />
      </Story>
    </Game>
  )
}

// One stat your own way, from statsById, which has every stat, listed or not.
export function Purse() {
  const { view } = useGame()
  return <p className="purse">{view.statsById.coins?.text}</p>
}
