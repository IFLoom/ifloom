'use client'
/**
 * An entity's traits: a form for each first-party trait (the inventory's
 * `usable`, the wardrobe's `wearable`, the shop's `sellable` and the cast's
 * `person`), and JSON for any other. The preview needs the trait's plugin on
 * for it to do anything.
 */
import type { Condition, EffectRef } from '@ifloom/engine'
import { OptionalCondition, withKey, type BuilderProps } from '../ConditionBuilder'
import { EffectList } from '../EffectBuilder'
import { Button, Checkbox, Field, IdPicker, JsonField, NumberInput, RowTools, TextInput } from '../ui'

type Traits = Record<string, unknown>

/** `inventory/usable`: the button, what using one does, and whether one is kept. */
type Usable = { label: string; effects: EffectRef[]; keep?: boolean }
/** `wardrobe/wearable`: the slot it goes in. */
type Wearable = { slot: string }
/** `shop/sellable`: what one costs, by stat. */
type Sellable = { price: Record<string, number> }
/** `cast/person`, the fields the form shows; the rest are JSON. */
type Person = {
  fullName?: string
  home?: string
  storyline?: string
  talk?: string | { scene: string; when?: Condition; label?: string }[]
  met?: Condition
  schedule?: { location: string; when?: Condition }[]
  call?: { scene?: string; when?: Condition; busy?: string }
  pronouns?: Record<string, string>
}

/** The first-party traits the form knows, with the plugin each needs and what a new one starts as. */
export const TRAIT_FORMS = [
  { id: 'inventory/usable', title: 'Usable', plugin: 'inventory', start: { label: 'Use it', effects: [] } satisfies Usable },
  { id: 'wardrobe/wearable', title: 'Wearable', plugin: 'wardrobe', start: { slot: 'coat' } satisfies Wearable },
  { id: 'shop/sellable', title: 'Sellable', plugin: 'shop', start: { price: { coins: 1 } } satisfies Sellable },
  { id: 'cast/person', title: 'Person', plugin: 'cast', start: {} satisfies Person },
] as const
const KNOWN = new Set<string>(TRAIT_FORMS.map((t) => t.id))

/** The traits with one set, or taken out; no traits at all is `undefined`. */
export function withTrait(traits: Traits | undefined, id: string, value: unknown): Traits | undefined {
  const next = withKey(traits ?? {}, id, value)
  return Object.keys(next).length ? next : undefined
}

/** A record of numbers by id, such as stats or a price, as rows of an id and a number. */
export function NumberMap({
  value,
  onChange,
  options,
  noun,
  add,
}: {
  value: Record<string, number> | undefined
  onChange: (value: Record<string, number> | undefined) => void
  options: readonly string[]
  noun: string
  add: string
}) {
  const entries = Object.entries(value ?? {})
  const write = (next: [string, number][]) => onChange(next.length ? Object.fromEntries(next) : undefined)
  return (
    <div className="flex flex-col gap-1">
      {entries.map(([id, n], i) => (
        <div key={i} className="flex items-center gap-2">
          <IdPicker
            noun={noun}
            aria-label={`${noun} ${i + 1}`}
            className="w-40"
            value={id}
            options={options}
            onChange={(next) => write(entries.map((e, j) => (j === i ? [next, e[1]] : e)))}
          />
          <NumberInput aria-label={`${noun} ${i + 1} amount`} value={n} onChange={(next) => write(entries.map((e, j) => (j === i ? [e[0], next ?? 0] : e)))} />
          <Button size="xs" variant="danger" aria-label={`Remove ${noun} ${i + 1}`} onClick={() => write(entries.filter((_, j) => j !== i))}>
            ✕
          </Button>
        </div>
      ))}
      <div>
        <Button size="xs" onClick={() => write([...entries, [options.find((o) => !(o in (value ?? {}))) ?? '', 1]])}>
          + {add}
        </Button>
      </div>
    </div>
  )
}

/** The traits an entity or a kind carries: a form for each first-party one, buttons to add the rest, and JSON for any other. */
export function TraitsEditor({ value, onChange, ...builder }: BuilderProps & { value: Traits | undefined; onChange: (value: Traits | undefined) => void }) {
  const traits = value ?? {}
  const others = Object.fromEntries(Object.entries(traits).filter(([id]) => !KNOWN.has(id)))
  const set = (id: string) => (next: unknown) => onChange(withTrait(value, id, next))
  return (
    <div className="flex flex-col gap-3">
      {TRAIT_FORMS.filter((t) => t.id in traits).map((t) => (
        <div key={t.id} id={`trait-${t.id}`} className="flex flex-col gap-2 rounded-md border border-fd-border p-2">
          <div className="flex items-center justify-between gap-2">
            <span className="text-sm font-medium">
              {t.title} <code className="text-xs text-fd-muted-foreground">{t.id}</code>
            </span>
            <Button size="xs" variant="ghost" onClick={() => set(t.id)(undefined)}>
              Remove
            </Button>
          </div>
          {t.id === 'inventory/usable' ? <UsableFields {...builder} value={traits[t.id] as Usable} onChange={set(t.id)} /> : null}
          {t.id === 'wardrobe/wearable' ? <WearableFields value={traits[t.id] as Wearable} onChange={set(t.id)} /> : null}
          {t.id === 'shop/sellable' ? <SellableFields stats={builder.names?.stats ?? []} value={traits[t.id] as Sellable} onChange={set(t.id)} /> : null}
          {t.id === 'cast/person' ? <PersonFields {...builder} value={traits[t.id] as Person} onChange={set(t.id)} /> : null}
        </div>
      ))}
      <div className="flex flex-wrap gap-1">
        {TRAIT_FORMS.filter((t) => !(t.id in traits)).map((t) => (
          <Button key={t.id} size="xs" onClick={() => set(t.id)(structuredClone(t.start))} title={`The ${t.plugin} plugin's ${t.id}`}>
            + {t.title}
          </Button>
        ))}
      </div>
      <Field label="Other traits" hint={'By trait id, as JSON: { "laundry/washable": { "temp": 30 } }. An id with no / is your game’s own.'}>
        <JsonField
          label="Other traits"
          rows={3}
          value={others}
          onChange={(next) => {
            const known = Object.fromEntries(Object.entries(traits).filter(([id]) => KNOWN.has(id)))
            const all = { ...known, ...(next && typeof next === 'object' ? next : {}) }
            onChange(Object.keys(all).length ? all : undefined)
          }}
        />
      </Field>
    </div>
  )
}

function UsableFields({ value, onChange, ...builder }: BuilderProps & { value: Usable; onChange: (value: Usable) => void }) {
  return (
    <>
      <Field label="Button" hint="What the inventory's button says.">
        <TextInput aria-label="Use label" value={value.label} placeholder="Eat it" onChange={(label) => onChange({ ...value, label: label ?? '' })} />
      </Field>
      <EffectList {...builder} value={value.effects ?? []} onChange={(effects) => onChange({ ...value, effects })} />
      <Checkbox
        checked={Boolean(value.keep)}
        label="Kept: using it doesn't spend one"
        onChange={(keep) => onChange(withKey(value, 'keep', keep || undefined))}
      />
    </>
  )
}

function WearableFields({ value, onChange }: { value: Wearable; onChange: (value: Wearable) => void }) {
  return (
    <Field label="Slot" hint="The wardrobe slot it goes in, by id: coat, shoes.">
      <TextInput aria-label="Slot" mono value={value.slot} onChange={(slot) => onChange({ slot: slot ?? '' })} />
    </Field>
  )
}

function SellableFields({ value, onChange, stats }: { value: Sellable; onChange: (value: Sellable) => void; stats: readonly string[] }) {
  return (
    <Field label="Price" hint="What one costs, by stat. A shop good's own price is used over it.">
      <NumberMap noun="stat" add="Add a stat" options={stats} value={value.price} onChange={(price) => onChange({ price: price ?? {} })} />
    </Field>
  )
}

function PersonFields({ value, onChange, ...builder }: BuilderProps & { value: Person; onChange: (value: Person) => void }) {
  const set = (key: keyof Person, next: unknown) => onChange(withKey(value, key, next))
  const names = builder.names
  return (
    <>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Full name" hint="The name if left out.">
          <TextInput optional value={value.fullName} onChange={(v) => set('fullName', v)} />
        </Field>
        <Field label="Home" hint="The location they're at when no schedule entry holds.">
          <TextInput optional mono value={value.home} onChange={(v) => set('home', v)} />
        </Field>
        <Field label="Storyline" hint="While it's closed, they won't talk.">
          <TextInput optional mono value={value.storyline} onChange={(v) => set('storyline', v)} />
        </Field>
        {typeof value.talk === 'object' ? null : (
          <Field label="Talking opens" hint="A scene. Can't be talked to if left empty.">
            <IdPicker
              noun="scene"
              aria-label="Talk scene"
              empty="Nobody talks to them"
              value={value.talk ?? ''}
              options={names?.scenes ?? []}
              onChange={(id) => set('talk', id || undefined)}
              onCreate={(id) => builder.onCreate?.('scene', id)}
            />
          </Field>
        )}
      </div>
      {typeof value.talk === 'object' ? (
        <Field label="Talking opens" hint={'Several scenes, as JSON: [{ "scene": "ava.chat", "when": { ... } }].'}>
          <JsonField label="Talk options" rows={3} value={value.talk} onChange={(v) => set('talk', v)} />
        </Field>
      ) : null}
      <Field label="Met once" hint="Having seen one of their talk or call scenes, if left out.">
        <OptionalCondition {...builder} value={value.met} onChange={(met) => set('met', met)} add="Say when they're met…" />
      </Field>
      <Field label="Schedule" hint={'Where they are while each when holds, first first, as JSON: [{ "location": "cafe", "when": { ... } }].'}>
        <JsonField label="Schedule" rows={3} value={value.schedule ?? []} onChange={(v) => set('schedule', Array.isArray(v) && v.length ? v : undefined)} />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Calls" hint={'As JSON: { "scene": "ava.call", "when": { ... } }. They can’t be called if left empty.'}>
          <JsonField label="Call" rows={2} value={value.call ?? null} onChange={(v) => set('call', v ?? undefined)} />
        </Field>
        <Field label="Pronouns" hint={'As JSON: { "they": "she", "them": "her" }.'}>
          <JsonField label="Pronouns" rows={2} value={value.pronouns ?? null} onChange={(v) => set('pronouns', v ?? undefined)} />
        </Field>
      </div>
    </>
  )
}

/** Placement rows: who holds how many at the start. */
export function PlacementRows({
  value,
  onChange,
  holders,
}: {
  value: Record<string, number>
  onChange: (value: Record<string, number>) => void
  holders: readonly string[]
}) {
  const entries = Object.entries(value)
  return (
    <div className="flex flex-col gap-1">
      {entries.map(([holder, n], i) => (
        <div key={i} className="flex items-center gap-2">
          <PlacementHolder
            holders={holders}
            value={holder}
            index={i}
            onChange={(next) => onChange(Object.fromEntries(entries.map((e, j) => (j === i ? [next, e[1]] : e))))}
          />
          <NumberInput
            aria-label={`Holder ${i + 1} count`}
            value={n}
            onChange={(next) => onChange(Object.fromEntries(entries.map((e, j) => (j === i ? [e[0], next ?? 0] : e))))}
          />
          <RowTools label={`holder ${i + 1}`} onRemove={() => onChange(Object.fromEntries(entries.filter((_, j) => j !== i)))} />
        </div>
      ))}
      <div>
        <Button size="xs" onClick={() => onChange({ ...value, [['player', ...holders].find((h) => !(h in value)) ?? 'player']: 1 })}>
          + Add a holder
        </Button>
      </div>
    </div>
  )
}

/** A start's holder: the player or a unique entity. `'you'` isn't allowed in content's `at`, so it isn't offered. */
function PlacementHolder({ value, onChange, holders, index }: { value: string; onChange: (value: string) => void; holders: readonly string[]; index: number }) {
  const options = [...new Set(['player', ...holders, value])]
  return (
    <select
      aria-label={`Holder ${index + 1}`}
      className="min-w-0 rounded-md border border-fd-border bg-fd-background px-2 py-1 font-mono text-sm"
      value={value}
      onChange={(event) => onChange(event.target.value)}
    >
      {options.map((h) => (
        <option key={h} value={h}>
          {h === 'player' ? 'the player' : h}
        </option>
      ))}
    </select>
  )
}
