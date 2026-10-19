'use client'
/**
 * The fields of a stat, a kind, a thing and a setting, as controlled forms.
 * The editor wraps the first three with a rename and delete header; the
 * snippets page uses the stat, thing and setting on their own.
 */
import type { Condition, EntityDef, KindDef, Placement, SettingDef, StatDef, StatWords } from '@ifloom/engine'
import { NO_NAMES, type Names } from '../../lib/builders'
import { STAT_DISPLAYS, STAT_ROUNDS } from '../../lib/kinds'
import { ConditionBuilder, OptionalCondition, type BuilderProps } from '../ConditionBuilder'
import { Button, Checkbox, Field, JsonField, ListInput, NumberInput, Select, TextInput } from '../ui'
import { NumberMap, PlacementRows, TraitsEditor } from './TraitFields'

/** A stat's words for any number: the line itself, or its line for numbers other than 1. */
const anyNumber = (words: StatWords | undefined) => (typeof words === 'object' ? words.other : words)
/** A stat's line for exactly 1, when it has one. */
const justOne = (words: StatWords | undefined) => (typeof words === 'object' ? words.one : undefined)
/** The words from the two fields: one line, or a line for 1 and one for the rest. */
const statWords = (other: string | undefined, one: string | undefined): StatWords | undefined => (one ? { one, other: other ?? '' } : other)

export function StatFields({ value, onChange, withId, ...builder }: BuilderProps & { value: StatDef; onChange: (value: StatDef) => void; withId?: boolean }) {
  const set = (patch: Partial<StatDef>) => onChange({ ...value, ...patch })
  const derived = value.derive !== undefined
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {withId ? (
          <Field label="Id">
            <TextInput mono value={value.id} onChange={(id) => set({ id: id ?? '' })} />
          </Field>
        ) : null}
        <Field label="Label" hint="What the player reads.">
          <TextInput value={value.label} onChange={(label) => set({ label: label ?? '' })} />
        </Field>
        <Field label="Format" hint="{n} is the number: '{n}p', '£{n}', '{n} coins'.">
          <TextInput
            optional
            value={anyNumber(value.format)}
            placeholder="{n}"
            onChange={(format) => set({ format: statWords(format, justOne(value.format)) })}
          />
        </Field>
        <Field label="Format for 1" hint="Only if 1 reads differently: '{n} coin'.">
          <TextInput optional value={justOne(value.format)} onChange={(one) => set({ format: statWords(anyNumber(value.format), one) })} />
        </Field>
        {!derived ? (
          <Field label="Start" hint="0 if left empty.">
            <NumberInput value={value.start} onChange={(start) => set({ start })} />
          </Field>
        ) : null}
        <Field label="Min" hint="0 if left empty.">
          <NumberInput value={value.min} onChange={(min) => set({ min })} />
        </Field>
        <Field label="Max" hint="100 if left empty. Raise it for coins.">
          {typeof value.max === 'object' ? (
            <TextInput mono value={value.max.value} onChange={(name) => set({ max: { value: name ?? '' } })} aria-label="Custom value for the ceiling" />
          ) : (
            <NumberInput value={value.max} onChange={(max) => set({ max })} />
          )}
        </Field>
        <Field label="Display">
          <Select
            value={value.display ?? 'number'}
            options={STAT_DISPLAYS}
            onChange={(display) => set({ display: display === 'number' ? undefined : display })}
          />
        </Field>
        <Field label="Round when read">
          <Select value={value.round ?? 'none'} options={STAT_ROUNDS} onChange={(round) => set({ round: round === 'none' ? undefined : round })} />
        </Field>
        <Field label="When short" hint="The refusal when a cost asks for more, with {n}.">
          <TextInput
            optional
            value={anyNumber(value.lacking)}
            placeholder={`Not enough ${value.label.toLowerCase()}.`}
            onChange={(lacking) => set({ lacking: statWords(lacking, justOne(value.lacking)) })}
          />
        </Field>
        <Field label="Belongs to a kind" hint="An entity kind, such as staff. Empty for the player's own.">
          <TextInput optional mono value={value.of} onChange={(of) => set({ of })} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-4">
        {!derived ? (
          <Checkbox
            checked={Boolean(value.spendable)}
            label="Spendable: costs in it show as prices"
            onChange={(spendable) => set({ spendable: spendable || undefined })}
          />
        ) : null}
        <Checkbox checked={value.listed !== false} label="Listed with the stats" onChange={(listed) => set({ listed: listed ? undefined : false })} />
      </div>
      <Field label="Visible only while">
        <OptionalCondition {...builder} value={value.visible} onChange={(visible) => set({ visible })} add="Only show it while…" />
      </Field>
      <Field label="Levels" hint="The value each level starts at, lowest first, and a notice with {label} and {level}.">
        <div className="grid gap-2 sm:grid-cols-2">
          <ListInput numbers value={value.levels?.at} placeholder="10, 30, 60" onChange={(at) => set({ levels: at ? { ...value.levels, at } : undefined })} />
          <TextInput
            optional
            value={value.levels?.notice}
            placeholder="{label} is now level {level}."
            onChange={(notice) => value.levels && set({ levels: { ...value.levels, notice } })}
          />
        </div>
        {value.levels ? (
          <Checkbox
            checked={Boolean(value.levels.hidden)}
            label="Hidden: conditions read the levels, the player never sees them"
            onChange={(hidden) => value.levels && set({ levels: { ...value.levels, hidden: hidden || undefined } })}
          />
        ) : null}
      </Field>
      <Field label="Derived from a formula" hint={'Worked out from other stats, never kept: "baking", { "sum": [...] }, { "scale": "x", "by": 0.5 }.'}>
        {derived ? (
          <div className="flex flex-col gap-1">
            <JsonField label="Formula" value={value.derive} rows={3} onChange={(derive) => set({ derive })} />
            <div>
              <Button size="xs" variant="ghost" onClick={() => set({ derive: undefined })}>
                Keep it as a plain stat
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button size="xs" onClick={() => set({ derive: { sum: [] }, start: undefined, spendable: undefined })}>
              + Derive it
            </Button>
          </div>
        )}
      </Field>
    </div>
  )
}

/** A thing's `at` as counts by holder: one holder is one of it. */
export function placementCounts(at: Placement | undefined): Record<string, number> {
  if (at === undefined) return {}
  return typeof at === 'string' ? { [at]: 1 } : { ...at }
}

/** Counts by holder as the shortest `at` that says them: none, a holder for one, or the counts. */
export function placementOf(counts: Record<string, number>): Placement | undefined {
  const entries = Object.entries(counts)
  if (!entries.length) return undefined
  if (entries.length === 1 && entries[0][1] === 1) return entries[0][0]
  return counts
}

/** The value without the keys a form left undefined, so a cleared field leaves nothing behind. */
const tidy = <T extends object>(value: T): T => Object.fromEntries(Object.entries(value).filter(([, v]) => v !== undefined)) as T

/** The names a definition's conditions are asked with: `'$'` is the entity itself. */
const withSelf = (names: Names | undefined): Names => ({ ...(names ?? NO_NAMES), things: ['$', ...(names?.things ?? [])] })

/**
 * A thing: an entity the pack declares, of any kind. Its name, words and
 * picture, who holds it at the start, its stats and kv, when the view lists
 * it, and its traits. A trait does something only with its plugin on.
 */
export function ThingFields({
  value,
  onChange,
  withId,
  ...builder
}: BuilderProps & { value: EntityDef; onChange: (value: EntityDef) => void; withId?: boolean }) {
  const set = (patch: Partial<EntityDef>) => onChange(tidy({ ...value, ...patch }))
  const names = builder.names ?? NO_NAMES
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {withId ? (
          <Field label="Id">
            <TextInput mono value={value.id} onChange={(id) => set({ id: id ?? '' })} />
          </Field>
        ) : null}
        {withId ? (
          <Field label="Kind">
            <TextInput mono value={value.of} onChange={(of) => set({ of: of ?? '' })} />
          </Field>
        ) : null}
        <Field label="Name" hint="Prose tokens are filled in: {{playerName}}.">
          <TextInput value={value.name} onChange={(name) => set({ name: name ?? '' })} />
        </Field>
        <Field label="Picture" hint="A path under the game's art, through artSrc.">
          <TextInput optional mono value={value.image} placeholder="things/umbrella.png" onChange={(image) => set({ image })} />
        </Field>
        <Field label="Tags" hint="Words to sort or style things by, separated by commas. The engine gives them no meaning.">
          <ListInput value={value.tags} placeholder="clothes" onChange={(tags) => set({ tags })} />
        </Field>
      </div>
      <Field label="Description">
        <TextInput optional value={value.desc} onChange={(desc) => set({ desc })} />
      </Field>
      <Field label="Who holds it at the start" hint="The player or a unique entity, and how many. Nobody if left empty.">
        <PlacementRows holders={names.holders ?? []} value={placementCounts(value.at)} onChange={(counts) => set({ at: placementOf(counts) })} />
      </Field>
      <Field label="Listed only while" hint="Narrows its kind's listing: $ is this thing.">
        <OptionalCondition
          {...builder}
          names={withSelf(builder.names)}
          value={value.visible}
          onChange={(visible) => set({ visible })}
          add="Only list it while…"
        />
      </Field>
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Stats" hint="Where its stats start, where they differ from each stat's start.">
          <NumberMap noun="stat" add="Add a stat" options={names.stats} value={value.stats} onChange={(stats) => set({ stats })} />
        </Field>
        <Field label="kv at the start" hint={'As JSON: { "role": "cook" }.'}>
          <JsonField
            label="kv"
            rows={2}
            value={value.kv ?? {}}
            onChange={(kv) => set({ kv: kv && typeof kv === 'object' && Object.keys(kv).length ? kv : undefined })}
          />
        </Field>
      </div>
      <Field label="Traits" hint="Data a plugin reads: using it, wearing it, selling it, or a person to meet.">
        <TraitsEditor {...builder} value={value.traits} onChange={(traits) => set({ traits: traits as EntityDef['traits'] })} />
      </Field>
    </div>
  )
}

/** How a kind is listed, as the form's menu has it. */
type Listing = 'yes' | 'no' | 'when'
const LISTINGS: { value: Listing; label: string }[] = [
  { value: 'yes', label: 'Listed' },
  { value: 'no', label: 'Not listed' },
  { value: 'when', label: 'Listed while a condition holds' },
]

/**
 * A kind: what its entities are called, whether each is one particular thing
 * (`unique`, so it can hold others), whether the view lists them, its tags,
 * its flags, and traits every one of it starts with.
 */
export function KindFields({ value, onChange, ...builder }: BuilderProps & { value: KindDef; onChange: (value: KindDef) => void }) {
  const set = (patch: Partial<KindDef>) => onChange(tidy({ ...value, ...patch }))
  const listing: Listing = value.listed === false ? 'no' : typeof value.listed === 'object' ? 'when' : 'yes'
  const self = withSelf(builder.names)
  const flags = Object.entries(value.flags ?? {})
  const setFlags = (next: [string, Condition][]) => set({ flags: next.length ? Object.fromEntries(next) : undefined })
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Label" hint="What the player reads for one: Member of staff.">
          <TextInput value={value.label} onChange={(label) => set({ label: label ?? '' })} />
        </Field>
        <Field label="Plural" hint="For more than one: Staff. The label if left empty.">
          <TextInput optional value={value.plural} onChange={(plural) => set({ plural })} />
        </Field>
        <Field label="Tags" hint="Words every one of the kind has, before its own.">
          <ListInput value={value.tags} placeholder="food" onChange={(tags) => set({ tags })} />
        </Field>
      </div>
      <Checkbox
        checked={Boolean(value.unique)}
        label="Unique: each is one particular thing, such as a person, and can hold things"
        onChange={(unique) => set({ unique: unique || undefined })}
      />
      <Field label="In the view" hint="Whether view.entities lists them. $ is each one. What you hold is in view.held either way.">
        <Select
          aria-label="Listed"
          value={listing}
          options={LISTINGS}
          onChange={(next) => set({ listed: next === 'yes' ? undefined : next === 'no' ? false : { entity: '$', at: 'you' } })}
        />
        {typeof value.listed === 'object' ? <ConditionBuilder {...builder} names={self} value={value.listed} onChange={(listed) => set({ listed })} /> : null}
      </Field>
      <Field label="Flags" hint="Named conditions asked of each listed one, so a UI can split them: met, broken.">
        <div className="flex flex-col gap-2">
          {flags.map(([name, condition], i) => (
            <div key={i} className="flex flex-col gap-1">
              <div className="flex items-center gap-2">
                <TextInput
                  aria-label={`Flag ${i + 1}`}
                  className="w-40"
                  mono
                  value={name}
                  onChange={(next) => setFlags(flags.map((m, j) => (j === i ? [next ?? '', m[1]] : m)))}
                />
                <Button size="xs" variant="danger" aria-label={`Remove flag ${i + 1}`} onClick={() => setFlags(flags.filter((_, j) => j !== i))}>
                  ✕
                </Button>
              </div>
              <ConditionBuilder {...builder} names={self} value={condition} onChange={(next) => setFlags(flags.map((m, j) => (j === i ? [m[0], next] : m)))} />
            </div>
          ))}
          <div>
            <Button size="xs" onClick={() => setFlags([...flags, [`flag${flags.length + 1}`, { entity: '$', at: 'you' }]])}>
              + Add a flag
            </Button>
          </div>
        </div>
      </Field>
      <Field label="Traits every one has" hint="Defaults its entities start from, by trait id.">
        <TraitsEditor {...builder} value={value.traits} onChange={(traits) => set({ traits: traits as KindDef['traits'] })} />
      </Field>
    </div>
  )
}

export function SettingFields({ value, onChange }: { value: SettingDef; onChange: (value: SettingDef) => void }) {
  const base = { id: value.id, label: value.label, ...(value.affects ? { affects: value.affects } : {}) }
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        <Field label="Id">
          <TextInput mono value={value.id} onChange={(id) => onChange({ ...value, id: id ?? '' })} />
        </Field>
        <Field label="Label">
          <TextInput value={value.label} onChange={(label) => onChange({ ...value, label: label ?? '' })} />
        </Field>
        <Field label="Kind">
          <Select
            value={value.kind}
            options={['toggle', 'choice', 'range']}
            onChange={(kind) =>
              onChange(
                kind === 'toggle'
                  ? { ...base, kind, default: true }
                  : kind === 'choice'
                    ? { ...base, kind, options: [{ value: 'normal', label: 'Normal' }], default: 'normal' }
                    : { ...base, kind, min: 0, max: 10, default: 5 },
              )
            }
          />
        </Field>
        <Field label="Affects" hint="Play settings are in the save and conditions read them.">
          <Select
            value={value.affects ?? 'play'}
            options={[
              { value: 'play', label: 'Play' },
              { value: 'ui', label: 'The UI only' },
            ]}
            onChange={(affects) => onChange({ ...value, affects: affects === 'play' ? undefined : affects })}
          />
        </Field>
      </div>
      {value.kind === 'toggle' ? <Checkbox checked={value.default} label="On by default" onChange={(on) => onChange({ ...value, default: on })} /> : null}
      {value.kind === 'range' ? (
        <div className="flex flex-wrap gap-3">
          <Field label="Min">
            <NumberInput value={value.min} onChange={(min) => onChange({ ...value, min: min ?? 0 })} />
          </Field>
          <Field label="Max">
            <NumberInput value={value.max} onChange={(max) => onChange({ ...value, max: max ?? 0 })} />
          </Field>
          <Field label="Step">
            <NumberInput value={value.step} onChange={(step) => onChange({ ...value, step })} />
          </Field>
          <Field label="Default">
            <NumberInput value={value.default} onChange={(d) => onChange({ ...value, default: d ?? 0 })} />
          </Field>
        </div>
      ) : null}
      {value.kind === 'choice' ? (
        <Field label="Options and default" hint={'As JSON: [{ "value": "easy", "label": "Easy" }]. The default is the first unless you change it below.'}>
          <JsonField label="Options" value={value.options} rows={3} onChange={(options) => Array.isArray(options) && onChange({ ...value, options })} />
          <Select
            value={value.default}
            options={value.options.map((o) => ({ value: o.value, label: o.label }))}
            onChange={(d) => onChange({ ...value, default: d })}
          />
        </Field>
      ) : null}
    </div>
  )
}
