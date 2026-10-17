'use client'
/**
 * The snippet tools at /editor/snippets: the editor's builders on their own,
 * each showing the TypeScript it makes, to copy into a game.
 */
import { useState } from 'react'
import type { Condition, EffectRef, ItemDef, SettingDef, StatDef } from '@ifloom/engine'
import { SNIPPET_DEFAULTS, compact, snippet } from '../lib/builders'
import { MARKUP_FIELDS, MARKUP_KINDS, MARKUP_LABELS, markup, type MarkupKind } from '../lib/markup'
import { ConditionBuilder } from './ConditionBuilder'
import { EffectList } from './EffectBuilder'
import { ItemFields, SettingFields, StatFields } from './forms/DefFields'
import { Beats } from './ProseField'
import { CodeOut, Field, Select, TextInput, cx } from './ui'

const TOOLS = [
  { id: 'condition', title: 'Condition', blurb: 'A condition for a choice’s when, a blocked reason, a block or a storylet.' },
  { id: 'effects', title: 'Effects', blurb: 'A list of effects for a choice or an item’s use, run in order.' },
  { id: 'stat', title: 'Stat', blurb: 'A StatDef for a pack’s stats or a game’s.' },
  { id: 'item', title: 'Item', blurb: 'An ItemDef for a pack’s items.' },
  { id: 'setting', title: 'Setting', blurb: 'A SettingDef for a game’s settings screen.' },
  { id: 'markup', title: 'Prose markup', blurb: 'Pictures, video, sound, voice, speaker lines, thoughts, pool pictures and reveals, for a prose key.' },
] as const
type Tool = (typeof TOOLS)[number]['id']

/** A few sample ids, so the pickers have something to offer. */
const NAMES = { scenes: ['cafe.counter', 'street', 'home'], stats: ['coins', 'charm', 'energy'], items: ['umbrella', 'key'], kv: ['metAva', 'visits'], choices: ['cafe.counter#buy'], sets: ['cafe'] }

export function Snippets() {
  const [tool, setTool] = useState<Tool>('condition')
  const current = TOOLS.find((t) => t.id === tool)!
  return (
    <div className="mx-auto grid w-full max-w-(--fd-layout-width) gap-6 px-4 py-6 md:grid-cols-[12rem_minmax(0,1fr)]">
      <nav aria-label="Snippet tools" className="flex flex-wrap gap-1 md:flex-col">
        {TOOLS.map((t) => (
          <button
            key={t.id}
            type="button"
            aria-current={tool === t.id ? 'page' : undefined}
            onClick={() => setTool(t.id)}
            className={cx('rounded-md px-3 py-1.5 text-left text-sm', tool === t.id ? 'bg-fd-primary/10 font-medium text-fd-primary' : 'text-fd-muted-foreground hover:bg-fd-accent hover:text-fd-accent-foreground')}
          >
            {t.title}
          </button>
        ))}
      </nav>
      <section aria-labelledby="snippet-title" className="flex min-w-0 flex-col gap-4">
        <div>
          <h1 id="snippet-title" className="text-2xl font-semibold">
            {current.title}
          </h1>
          <p className="text-sm text-fd-muted-foreground">{current.blurb}</p>
        </div>
        {tool === 'condition' ? <ConditionTool /> : null}
        {tool === 'effects' ? <EffectsTool /> : null}
        {tool === 'stat' ? <StatTool /> : null}
        {tool === 'item' ? <ItemTool /> : null}
        {tool === 'setting' ? <SettingTool /> : null}
        {tool === 'markup' ? <MarkupTool /> : null}
      </section>
    </div>
  )
}

function Split({ form, code, label }: { form: React.ReactNode; code: string; label?: string }) {
  return (
    <div className="grid items-start gap-4 lg:grid-cols-2">
      <div className="min-w-0 rounded-lg border border-fd-border bg-fd-card p-3">{form}</div>
      <div className="min-w-0 lg:sticky lg:top-20">
        <CodeOut code={code} label={label} />
      </div>
    </div>
  )
}

function ConditionTool() {
  const [value, setValue] = useState<Condition>({ all: [{ stat: 'coins', gte: 4 }, { not: { kv: 'metAva' } }] })
  return <Split form={<ConditionBuilder value={value} names={NAMES} onChange={setValue} />} code={snippet(value)} />
}

function EffectsTool() {
  const [value, setValue] = useState<EffectRef[]>([
    { kind: 'stat', stat: 'coins', by: -4 },
    { kind: 'item', item: 'umbrella', by: 1 },
    { kind: 'scene', scene: null },
  ])
  return <Split form={<EffectList value={value} names={NAMES} onChange={setValue} />} code={snippet(value)} />
}

function StatTool() {
  const [value, setValue] = useState<StatDef>(SNIPPET_DEFAULTS.stat)
  return <Split form={<StatFields withId value={value} names={NAMES} onChange={setValue} />} code={snippet(compact(value))} />
}

function ItemTool() {
  const [value, setValue] = useState<ItemDef>(SNIPPET_DEFAULTS.item)
  return <Split form={<ItemFields withId value={value} names={NAMES} onChange={setValue} />} code={snippet(compact(value))} />
}

function SettingTool() {
  const [value, setValue] = useState<SettingDef>(SNIPPET_DEFAULTS.setting)
  return <Split form={<SettingFields value={value} onChange={setValue} />} code={snippet(compact(value))} />
}

function MarkupTool() {
  const [kind, setKind] = useState<MarkupKind>('wide')
  const [fields, setFields] = useState<Record<string, string>>(() => Object.fromEntries(MARKUP_FIELDS.wide.map((f) => [f.name, f.sample])))
  const text = markup(kind, fields)
  return (
    <Split
      label="Markup"
      code={text}
      form={
        <div className="flex flex-col gap-3">
          <Field label="Kind">
            <Select
              value={kind}
              options={MARKUP_KINDS.map((k) => ({ value: k, label: MARKUP_LABELS[k] }))}
              onChange={(next) => {
                setKind(next)
                setFields(Object.fromEntries(MARKUP_FIELDS[next].map((f) => [f.name, f.sample])))
              }}
            />
          </Field>
          {MARKUP_FIELDS[kind].map((field) => (
            <Field key={field.name} label={field.label}>
              <TextInput mono={field.name !== 'text' && field.name !== 'alt'} value={fields[field.name]} onChange={(v) => setFields({ ...fields, [field.name]: v ?? '' })} />
            </Field>
          ))}
          <Field label="How it reads" hint="Each piece of markup is a paragraph of its own in the prose.">
            <Beats text={text} />
          </Field>
        </div>
      }
    />
  )
}
