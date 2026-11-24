/**
 * @ifloom/plugin-cast/react: the cast plugin's React UI, for a game drawn
 * with `@ifloom/react`. List `castUi` in the game's `plugins`
 * to have who is here at the end of the story, everyone met in the side
 * column, and the `people` panel; or draw them yourself from `usePeople`.
 */
import type { ComponentProps } from 'react'
import type { CastView } from '../index.ts'
import { ChoiceButton, Picture, Section, StatGauge, useGame, usePart } from '@ifloom/react'
import { cn, overridable, type Override, pluginKit, type PluginUi, PROSE, usePlugin } from '@ifloom/react/kit'

/** The cast plugin's words, in English. A game rewords any with `ui.<key>` in its strings. */
export const CAST_WORDS = {
  people: 'People',
} as const

/** The cast plugin's UI, declared once: its id and its words, for `usePlugin` and `castUi`. */
const CAST = pluginKit('cast', CAST_WORDS)

declare module '@ifloom/react' {
  interface OverridableComponents {
    PeopleHere: Override<ComponentProps<typeof PeopleHere>>
    Relationships: Override<ComponentProps<typeof Relationships>>
  }
  interface PartNames {
    'people': true
    'person': true
    'person-actions': true
    'person-desc': true
    'person-name': true
    'person-portrait': true
    'relationship': true
    'relationship-header': true
    'relationship-stats': true
    'relationships': true
  }
}

/** The cast plugin's view: who is here (`present`, each with their buttons) and everyone met (`people`), or null in a game without the plugin. `PeopleHere` and `Relationships` are drawn from it. */
export function usePeople(): CastView | null {
  return usePlugin(CAST).view ?? null
}

function PeopleHereImpl({ className }: { className?: string }) {
  const section = usePart('people', cn(PROSE, 'flex flex-col gap-2'), className)
  const card = usePart('person', 'flex flex-col gap-1.5')
  const portrait = usePart('person-portrait', 'size-8 rounded-full object-cover')
  const name = usePart('person-name', 'text-sm font-medium')
  const description = usePart('person-desc', 'text-xs text-muted-foreground')
  const actions = usePart('person-actions', 'flex flex-wrap gap-1.5')
  const people = usePeople()?.present ?? []
  if (!people.length) return null
  return (
    <section {...section}>
      {people.map((person) => (
        <div key={person.id} {...card} data-person={person.id}>
          <div className="flex items-center gap-2">
            {person.portrait ? <Picture {...portrait} src={person.portrait} alt="" /> : null}
            <div className="flex-1">
              <p {...name}>{person.name}</p>
              {person.description ? <p {...description}>{person.description}</p> : null}
            </div>
          </div>
          {person.actions.length ? (
            <div {...actions}>
              {person.actions.map((action) => (
                <ChoiceButton key={action.id} choice={action} />
              ))}
            </div>
          ) : null}
        </div>
      ))}
    </section>
  )
}

/** Who is here, with what the player can do with each of them: the cast plugin's. Nothing without it. A thin default on `usePeople`. */
export const PeopleHere = overridable('PeopleHere', PeopleHereImpl)

function RelationshipsImpl({ className }: { className?: string }) {
  const { view } = useGame()
  const list = usePart('relationships', 'flex flex-col gap-3 text-sm', className)
  const card = usePart('relationship', 'flex flex-col gap-1')
  const head = usePart('relationship-header', 'flex items-center gap-2')
  const portrait = usePart('person-portrait', 'size-8 rounded-full object-cover')
  const name = usePart('person-name', 'text-sm font-medium')
  const description = usePart('person-desc', 'text-xs text-muted-foreground')
  const stats = usePart('relationship-stats', 'grid grid-cols-[1fr_auto] gap-x-3 gap-y-1')
  const label = usePart('stat-label', 'text-muted-foreground')
  const value = usePart('stat-value', 'text-right font-medium tabular-nums')
  const people = (usePeople()?.people ?? []).filter((person) => person.met)
  if (!people.length) return null
  // Each character is an entity: the stats the player can see on it are its relationship.
  const entries = view.entities.flatMap((kind) => kind.entries)
  return (
    <div {...list}>
      {people.map((person) => {
        const shown = entries.find((entry) => entry.ref === person.ref)?.stats ?? []
        return (
          <section key={person.id} {...card} data-person={person.id}>
            <div {...head}>
              {person.portrait ? <Picture {...portrait} src={person.portrait} alt="" /> : null}
              <div className="flex-1">
                <p {...name}>{person.name}</p>
                {person.description ? <p {...description}>{person.description}</p> : null}
              </div>
            </div>
            {shown.length ? (
              <dl {...stats}>
                {shown.map((stat) => (
                  <div key={stat.key} className="contents" data-stat={stat.key}>
                    <dt {...label}>{stat.label}</dt>
                    <dd {...value}>{stat.text}</dd>
                    {stat.ui?.display === 'bar' || stat.ui?.display === 'pips' ? <StatGauge stat={stat} /> : null}
                  </div>
                ))}
              </dl>
            ) : null}
          </section>
        )
      })}
    </div>
  )
}

/**
 * Everyone the player has met, from the cast plugin, with the stats the
 * player can see on each of them (friendship, say), as the game declares them
 * on the cast's kind of entity. Nothing without the plugin, or before anyone
 * is met. A thin default on `usePeople`.
 */
export const Relationships = overridable('Relationships', RelationshipsImpl)

/** The default layout's People section: a button that opens `Relationships` in a dialog. */
export function PeopleSection() {
  const { words } = usePlugin(CAST)
  return (
    <Section id="people" title={words('people')} dialog>
      <Relationships />
    </Section>
  )
}

/**
 * The cast plugin's React UI, for `plugins` on `mountGame` or
 * `GameProvider`: a People section in the side column that opens
 * `Relationships` in a dialog, `PeopleHere` after the room's actions, the
 * `people` panel, and the cast's words.
 */
export const castUi: PluginUi = {
  ...CAST,
  layout: { sidebar: [PeopleSection], story: [() => <PeopleHere />] },
  panels: { people: { component: () => <Relationships />, title: 'people' } },
}
