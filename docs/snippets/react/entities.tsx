import { EntityTable, Game, Inventory, Scene, Section, Sidebar, Story, useWords } from '@ifloom/react'

// A layout of your own, for mountGame's `layout`. The default layout has the inventory; a table of a kind is yours to place.
export function Layout() {
  const words = useWords()
  return (
    <Game>
      <Sidebar>
        <Section id="inventory" title={words('inventory')} collapsible>
          {/* What you hold, from view.held. */}
          <Inventory title={false} />
        </Section>
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
