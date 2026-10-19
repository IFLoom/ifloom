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

/** What a count looks at, as the form edits it. */
type CountSelect = { of?: string; at?: string; tag?: string; trait?: string }

export type BuilderProps = {
  names?: Names
  /** Makes what "Add new…" names, in the editor. */
  onCreate?: (thing: Thing, id: string) => void
}

const FORMS: { value: ConditionForm; label: string }[] = [...CONDITION_FORMS, 'plugin' as const, 'json' as const].map((value) => ({
  value,
  label: CONDITION_LABELS[value],
}))

/**
 * A holder to pick: `'you'`, the player, or a unique entity that can hold
 * things. With `empty`, a blank choice for leaving the holder out. A holder
 * the list doesn't have stays shown, so nothing is lost.
 */
export function HolderPicker({
  value,
  onChange,
  holders = [],
  empty,
  'aria-label': label,
}: {
  value: string | undefined
  onChange: (value: string | undefined) => void
  holders?: readonly string[]
  empty?: string
  'aria-label': string
}) {
  const options = [
    ...(empty !== undefined ? [{ value: '', label: empty }] : []),
    { value: 'you', label: 'you' },
    { value: 'player', label: 'the player' },
    ...holders.map((h) => ({ value: h, label: h })),
  ]
  const current = value ?? ''
  if (!options.some((o) => o.value === current)) options.push({ value: current, label: current || '(none)' })
  return <Select aria-label={label} className="font-mono" value={current} options={options} onChange={(next) => onChange(next || undefined)} />
}

/** An object with one key set, or taken out when the value is undefined. */
export function withKey<T extends object>(value: T, key: string, next: unknown): T {
  const copy = { ...value } as Record<string, unknown>
  if (next === undefined) delete copy[key]
  else copy[key] = next
  return copy as T
}

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
          <span className="text-xs text-fd-muted-foreground">held by</span>
          <HolderPicker
            aria-label="Held by"
            empty="anyone"
            holders={names.holders}
            value={c.at as string | undefined}
            onChange={(at) => onChange(withKey(value, 'at', at))}
          />
          <RangeEditor value={value} onChange={onChange} ops={['set', ...RANGE_OPS]} />
        </>
      )
      break
    case 'count': {
      const select: CountSelect = typeof c.count === 'string' ? { of: c.count } : (c.count as CountSelect)
      // Only a kind is written as the kind's id; anything more as a Select.
      const setSelect = (key: keyof CountSelect, next: string | undefined) => {
        const sel = withKey(select, key, next || undefined)
        const keys = Object.keys(sel)
        onChange({ ...c, count: keys.length === 1 && keys[0] === 'of' ? sel.of : sel } as Condition)
      }
      const kinds = names.kinds ?? []
      fields = (
        <>
          <Select
            aria-label="Of kind"
            className="font-mono"
            value={select.of ?? ''}
            options={[{ value: '', label: 'any kind' }, ...[...new Set([...kinds, ...(select.of ? [select.of] : [])])].map((k) => ({ value: k, label: k }))]}
            onChange={(of) => setSelect('of', of)}
          />
          <span className="text-xs text-fd-muted-foreground">held by</span>
          <HolderPicker aria-label="Held by" empty="anyone" holders={names.holders} value={select.at} onChange={(at) => setSelect('at', at)} />
          <TextInput aria-label="Tag" className="w-24" mono optional placeholder="tag" value={select.tag} onChange={(tag) => setSelect('tag', tag)} />
          <TextInput
            aria-label="Trait"
            className="w-32"
            mono
            optional
            placeholder="trait"
            value={select.trait}
            onChange={(trait) => setSelect('trait', trait)}
          />
          <RangeEditor value={value} onChange={onChange} ops={[...RANGE_OPS]} />
          <Checkbox label="Count units" checked={c.units === true} onChange={(units) => onChange(withKey(value, 'units', units || undefined))} />
        </>
      )
      break
    }
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
    case 'roll': {
      // Bare is "a roll was made"; `passed` and `critical` narrow it.
      const outcome = c.passed === undefined ? 'made' : c.passed ? 'passed' : 'failed'
      const critical = c.critical === undefined ? 'any' : c.critical === true ? 'yes' : c.critical === false ? 'no' : (c.critical as string)
      fields = (
        <>
          <IdPicker
            noun="kv key"
            aria-label="Roll key"
            value={c.roll as string}
            options={names.kv}
            onChange={(id) => set({ roll: id })}
            onCreate={create('kv')}
          />
          <Select
            aria-label="Outcome"
            value={outcome}
            options={[
              { value: 'made', label: 'was rolled' },
              { value: 'passed', label: 'passed' },
              { value: 'failed', label: 'failed' },
            ]}
            onChange={(next) => onChange(withKey(value, 'passed', next === 'made' ? undefined : next === 'passed'))}
          />
          <Select
            aria-label="Critical"
            value={critical}
            options={[
              { value: 'any', label: 'critical or not' },
              { value: 'yes', label: 'critical' },
              { value: 'max', label: 'all top faces' },
              { value: 'min', label: 'all ones' },
              { value: 'no', label: 'not critical' },
            ]}
            onChange={(next) =>
              onChange(withKey(value, 'critical', next === 'any' ? undefined : next === 'yes' ? true : next === 'no' ? false : (next as 'max' | 'min')))
            }
          />
        </>
      )
      break
    }
    case 'timer':
      // Bare is "running"; a range asks how many milliseconds are left.
      fields = (
        <>
          <IdPicker noun="timer" aria-label="Timer" value={c.timer as string} options={names.timers ?? []} onChange={(id) => set({ timer: id })} />
          <RangeEditor value={value} onChange={onChange} ops={['set', ...RANGE_OPS]} />
          {rangeOf(value)?.op !== 'set' ? <span className="text-xs text-fd-muted-foreground">ms left</span> : null}
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
