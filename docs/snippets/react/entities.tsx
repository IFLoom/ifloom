import { EntityTable, Game, Scene, Section, Sidebar, Story } from '@ifloom/react'

// A layout of your own, for mountGame's `layout`. A table of a kind is yours to place.
export function Layout() {
  return (
    <Game>
      <Sidebar>
        <Section id="people" title="People you know" collapsible>
          {/* A listed kind's entities and their stats, from view.entities. */}
          <EntityTable kinds={['character']} />
        </Section>
      </Sidebar>
      <Story>
        <Scene />
      </Story>
    </Game>
  )
}
