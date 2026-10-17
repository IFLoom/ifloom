'use client'
/**
 * The fields of a stat, an item and a setting, as controlled forms. The
 * editor wraps the first two with a rename and delete header; the snippets
 * page uses all three on their own.
 */
import type { Effect, ItemDef, SettingDef, StatDef } from '@ifloom/engine'
import { STAT_DISPLAYS, STAT_ROUNDS } from '../../lib/kinds'
import { OptionalCondition, type BuilderProps } from '../ConditionBuilder'
import { EffectList } from '../EffectBuilder'
import { Button, Checkbox, Field, JsonField, ListInput, NumberInput, Select, TextInput } from '../ui'

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
        <Field label="Format" hint="{n} is the number: '{n}p', '£{n}'.">
          <TextInput optional value={value.format} placeholder="{n}" onChange={(format) => set({ format })} />
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
          <Select value={value.display ?? 'number'} options={STAT_DISPLAYS} onChange={(display) => set({ display: display === 'number' ? undefined : display })} />
        </Field>
        <Field label="Round when read">
          <Select value={value.round ?? 'none'} options={STAT_ROUNDS} onChange={(round) => set({ round: round === 'none' ? undefined : round })} />
        </Field>
        <Field label="When short" hint="The refusal when a cost asks for more, with {n}.">
          <TextInput optional value={value.lacking} placeholder={`Not enough ${value.label.toLowerCase()}.`} onChange={(lacking) => set({ lacking })} />
        </Field>
        <Field label="Bands" hint="Hidden thresholds for tier conditions, lowest first.">
          <ListInput numbers value={value.bands} onChange={(bands) => set({ bands })} />
        </Field>
        <Field label="Belongs to a kind" hint="An entity kind, such as staff. Empty for the player's own.">
          <TextInput optional mono value={value.of} onChange={(of) => set({ of })} />
        </Field>
      </div>
      <div className="flex flex-wrap gap-4">
        {!derived ? <Checkbox checked={Boolean(value.spendable)} label="Spendable: costs in it show as prices" onChange={(spendable) => set({ spendable: spendable || undefined })} /> : null}
        <Checkbox checked={value.listed !== false} label="Listed with the stats" onChange={(listed) => set({ listed: listed ? undefined : false })} />
      </div>
      <Field label="Visible only while">
        <OptionalCondition {...builder} value={value.visible} onChange={(visible) => set({ visible })} add="Only show it while…" />
      </Field>
      <Field label="Levels" hint="The value each level starts at, lowest first, and a notice with {label} and {level}.">
        <div className="grid gap-2 sm:grid-cols-2">
          <ListInput numbers value={value.levels?.at} placeholder="10, 30, 60" onChange={(at) => set({ levels: at ? { ...value.levels, at } : undefined })} />
          <TextInput optional value={value.levels?.notice} placeholder="{label} is now level {level}." onChange={(notice) => value.levels && set({ levels: { ...value.levels, notice } })} />
        </div>
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

export function ItemFields({ value, onChange, withId, ...builder }: BuilderProps & { value: ItemDef; onChange: (value: ItemDef) => void; withId?: boolean }) {
  const set = (patch: Partial<ItemDef>) => onChange({ ...value, ...patch })
  return (
    <div className="flex flex-col gap-3">
      <div className="grid gap-3 sm:grid-cols-2">
        {withId ? (
          <Field label="Id">
            <TextInput mono value={value.id} onChange={(id) => set({ id: id ?? '' })} />
          </Field>
        ) : null}
        <Field label="Name">
          <TextInput value={value.name} onChange={(name) => set({ name: name ?? '' })} />
        </Field>
        <Field label="Tags" hint="Words to sort or style items by, separated by commas. The engine gives them no meaning.">
          <ListInput value={value.tags} placeholder="clothes" onChange={(tags) => set({ tags })} />
        </Field>
        <Field label="Start with" hint="How many a new game has. None if left empty.">
          <NumberInput value={value.start} onChange={(start) => set({ start })} />
        </Field>
      </div>
      <Field label="Description">
        <TextInput value={value.desc} onChange={(desc) => set({ desc: desc ?? '' })} />
      </Field>
      <Field label="Using it" hint="A button in the inventory that runs these effects.">
        {value.use ? (
          <div className="flex flex-col gap-2">
            <TextInput aria-label="Use label" value={value.use.label} placeholder="Eat it" onChange={(label) => set({ use: { ...value.use!, label: label ?? '' } })} />
            <EffectList {...builder} value={value.use.effects} onChange={(effects) => set({ use: { ...value.use!, effects: effects as Effect[] } })} />
            <div>
              <Button size="xs" variant="ghost" onClick={() => set({ use: undefined })}>
                It can't be used
              </Button>
            </div>
          </div>
        ) : (
          <div>
            <Button size="xs" onClick={() => set({ use: { label: 'Use it', effects: [] } })}>
              + Make it usable
            </Button>
          </div>
        )}
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
          <Select value={value.default} options={value.options.map((o) => ({ value: o.value, label: o.label }))} onChange={(d) => onChange({ ...value, default: d })} />
        </Field>
      ) : null}
    </div>
  )
}
