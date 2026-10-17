/**
 * The page's regions: a side column, the story, and the bottom of the story
 * for the buttons of where you are. `main.ts` draws into them. Move them
 * around, add one, or drop the side column for a page that's all story.
 */

/** Where things go on the page. */
export type Regions = { sidebar: HTMLElement; story: HTMLElement; bottom: HTMLElement }

/** Empty `root` and lay the regions out in it. */
export function layout(root: HTMLElement): Regions {
  const page = document.createElement('div')
  page.className = 'page'
  const sidebar = page.appendChild(document.createElement('aside'))
  sidebar.className = 'sidebar'
  const story = page.appendChild(document.createElement('main'))
  story.className = 'story'
  const bottom = document.createElement('div')
  bottom.className = 'bottom choices'
  root.replaceChildren(page)
  return { sidebar, story, bottom }
}

/** Which sections the player folded, so a redraw keeps them as they were. */
const folded = new Set<string>()

/** A titled section that folds: a `<details>`, open unless the player closed it. Returns where its content goes. */
export function section(parent: HTMLElement, id: string, title: string): HTMLElement {
  const details = parent.appendChild(document.createElement('details'))
  details.className = 'section'
  details.open = !folded.has(id)
  details.ontoggle = () => (details.open ? folded.delete(id) : folded.add(id))
  details.appendChild(document.createElement('summary')).textContent = title
  return details
}
