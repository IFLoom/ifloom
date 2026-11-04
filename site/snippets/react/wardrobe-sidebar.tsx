import { Sidebar, Title } from '@ifloom/react'
import { WardrobeSection } from '@ifloom/plugin-wardrobe/react'

// What the player wears, kept in view in the side column.
export function SidebarWithWardrobe() {
  return (
    <Sidebar>
      <Title />
      <WardrobeSection />
    </Sidebar>
  )
}
