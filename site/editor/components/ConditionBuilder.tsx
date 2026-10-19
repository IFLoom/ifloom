'use client'
/**
 * The condition builder: a kind from a menu and the fields that kind needs,
 * nesting for all, any and not, and JSON for anything else.
 */
import { useState } from 'react'
import type { Condition, KvValue } from '@ifloom/engine'
import { conditionForm, newCondition, rangeOf, withRange, NO_NAMES, type Names, type RangeForm } from '../lib/builders'
import { CONDITION_FORMS, CONDITION_LABELS, RANGE_LABELS, RANGE_OPS, type ConditionForm } from '../lib/kinds'
import type { Thing } from '../lib/references'
import { Button, Checkbox, IdPicker, JsonField, NumberInput, Select, TextInput, cx } from './ui'

export type BuilderProps = {
  names?: Names
  /** Makes what "Add new…" names, in the editor. */
  onCreate?: (thing: Thing, id: string) => void
}

const FORMS: { value: ConditionForm; label: string }[] = [...CONDITION_FORMS, 'plugin' as const, 'json' as const].map((value) => ({
  value,
  label: CONDITION_LABELS[value],
}))

/** An optional condition: a button to add one, or the builder with a remove button. */
export function OptionalCondition({
  value,
  onChange,
  add = 'Add a condition',
  ...props
}: BuilderProps & { value: Condition | undefined; onChange: (value: Condition | undefined) => void; add?: string }) {
  if (!value) {
    return (
      <div>
        <Button size="xs" onClick={() => onChange(newCondition('kv', props.names))}>
          + {add}
        </Button>
      </div>
    )
  }
  return <ConditionBuilder value={value} onChange={onChange} onRemove={() => onChange(undefined)} {...props} />
}

export function ConditionBuilder({
  value,
  onChange,
  onRemove,
  names = NO_NAMES,
  onCreate,
  depth = 0,
}: BuilderProps & { value: Condition; onChange: (value: Condition) => void; onRemove?: () => void; depth?: number }) {
  // Any condition can be edited as JSON, even one a form could show.
  const [raw, setRaw] = useState(false)
  const form = raw ? 'json' : conditionForm(value)
  const c = value as Record<string, unknown>
  const set = (patch: Record<string, unknown>) => onChange({ ...c, ...patch } as Condition)
  const create = (thing: Thing) => (id: string) => onCreate?.(thing, id)

  let fields: React.ReactNode = null
  switch (form) {
    case 'all':
    case 'any': {
      const list = c[form] as Condition[]
      fields = (
        <div className="flex w-full flex-col gap-2 border-s-2 border-fd-border ps-3">
          {list.map((part, i) => (
            <ConditionBuilder
              key={i}
              depth={depth + 1}
              value={part}
              names={names}
              onCreate={onCreate}
              onChange={(next) => onChange({ [form]: list.map((p, j) => (j === i ? next : p)) } as Condition)}
              onRemove={() => onChange({ [form]: list.filter((_, j) => j !== i) } as Condition)}
            />
          ))}
          <div>
            <Button size="xs" onClick={() => onChange({ [form]: [...list, newCondition('kv', names)] } as Condition)}>
              + Add a part
            </Button>
          </div>
        </div>
      )
      break
    }
    case 'not':
      fields = (
        <div className="w-full border-s-2 border-fd-border ps-3">
          <ConditionBuilder depth={depth + 1} value={c.not as Condition} names={names} onCreate={onCreate} onChange={(next) => onChange({ not: next })} />
        </div>
      )
      break
    case 'stat':
    case 'level':
      fields = (
        <>
          <IdPicker
            noun="stat"
            aria-label="Stat"
            value={c[form] as string}
            options={names.stats}
            onChange={(id) => set({ [form]: id })}
            onCreate={create('stat')}
          />
          <RangeEditor value={value} onChange={onChange} ops={[...RANGE_OPS]} />
        </>
      )
      break
    case 'kv':
      fields = (
        <>
          <IdPicker noun="kv key" aria-label="kv key" value={c.kv as string} options={names.kv} onChange={(id) => set({ kv: id })} onCreate={create('kv')} />
          <RangeEditor value={value} onChange={onChange} ops={['set', 'is', ...RANGE_OPS]} />
        </>
      )
      break
    case 'setting':
      fields = (
        <>
          <TextInput aria-label="Setting id" className="w-32" mono value={c.setting as string} onChange={(v) => set({ setting: v ?? '' })} />
          <RangeEditor value={value} onChange={onChange} ops={['set', 'is', ...RANGE_OPS]} />
        </>
      )
      break
    case 'entity':
      fields = (
        <>
          <IdPicker
            noun="thing"
            aria-label="Thing"
            value={c.entity as string}
            options={names.things}
            onChange={(id) => set({ entity: id })}
            onCreate={create('thing')}
          />
          <RangeEditor value={value} onChange={onChange} ops={['set', ...RANGE_OPS]} />
        </>
      )
      break
    case 'chose':
      fields = (
        <>
          <IdPicker noun="scene#choice" aria-label="Choice" value={c.chose as string} options={names.choices} onChange={(id) => set({ chose: id })} />
          <RangeEditor value={value} onChange={onChange} ops={['set', ...RANGE_OPS]} />
        </>
      )
      break
    case 'seen':
    case 'since':
      fields = (
        <>
          <IdPicker
            noun="scene"
            aria-label="Scene"
            value={c[form] as string}
            options={names.scenes}
            onChange={(id) => set({ [form]: id })}
            onCreate={create('scene')}
          />
          <RangeEditor value={value} onChange={onChange} ops={form === 'seen' ? ['set', ...RANGE_OPS] : [...RANGE_OPS]} />
          {form === 'since' ? (
            <Checkbox
              label="From the latest time"
              checked={c.last === true}
              onChange={(last) => {
                const { last: _old, ...rest } = c
                onChange((last ? { ...rest, last: true } : rest) as Condition)
              }}
            />
          ) : null}
        </>
      )
      break
    case 'turn':
      // The range is the condition's value: `{ turn: { gte: 3 } }`.
      fields = <RangeEditor value={c.turn as Condition} onChange={(turn) => onChange({ turn } as Condition)} ops={[...RANGE_OPS]} />
      break
    case 'plugin':
    case 'json':
      fields = (
        <div className="w-full">
          <JsonField label="Condition as JSON" value={value} rows={3} onChange={(next) => next && typeof next === 'object' && onChange(next)} />
          {form === 'plugin' ? (
            <p className="mt-1 text-xs text-fd-muted-foreground">
              A plugin's condition by its full name, such as <code>{'{ "quests/done": { "quest": "errand" } }'}</code>.
            </p>
          ) : null}
        </div>
      )
      break
  }

  return (
    <div className={cx('flex flex-wrap items-center gap-2', depth === 0 && 'rounded-md border border-fd-border bg-fd-background p-2')}>
      <Select
        aria-label="Kind of condition"
        value={form}
        options={FORMS}
        onChange={(next) => {
          setRaw(next === 'json')
          if (next !== 'json') onChange(newCondition(next, names))
        }}
      />
      {fields}
      {onRemove ? (
        <Button size="xs" variant="danger" className="ms-auto" onClick={onRemove} aria-label="Remove the condition" title="Remove">
          ✕
        </Button>
      ) : null}
    </div>
  )
}

/** A value typed for `is`: true, false, a number, or text. */
export function parseKvValue(text: string): KvValue {
  if (text === 'true') return true
  if (text === 'false') return false
  if (text.trim() !== '' && !Number.isNaN(Number(text))) return Number(text)
  return text
}

function RangeEditor({ value, onChange, ops }: { value: Condition; onChange: (value: Condition) => void; ops: RangeForm['op'][] }) {
  const range = rangeOf(value) ?? { op: 'set', value: 0 }
  return (
    <>
      <Select
        aria-label="Comparison"
        value={range.op}
        options={ops.map((op) => ({ value: op, label: RANGE_LABELS[op] }))}
        onChange={(op) =>
          onChange(
            withRange(value, {
              op,
              value: op === 'is' ? (typeof range.value === 'number' ? range.value : true) : typeof range.value === 'number' ? range.value : 1,
            }),
          )
        }
      />
      {range.op === 'is' ? (
        <TextInput
          aria-label="Value"
          className="w-28"
          value={String(range.value)}
          onChange={(text) => onChange(withRange(value, { op: 'is', value: parseKvValue(text ?? '') }))}
        />
      ) : range.op !== 'set' ? (
        <NumberInput aria-label="Number" value={range.value as number} onChange={(n) => onChange(withRange(value, { op: range.op, value: n ?? 0 }))} />
      ) : null}
    </>
  )
}
