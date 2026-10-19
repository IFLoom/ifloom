'use client'
/**
 * The effect builder: a list of effects, each a kind from a menu and the
 * fields it needs, with JSON for plugin calls and the rarer kinds.
 */
import { useState } from 'react'
import { readDice, type EffectRef } from '@ifloom/engine'
import { effectForm, newEffect, NO_NAMES } from '../lib/builders'
import { EFFECT_LABELS, EFFECT_MENU, type EffectForm } from '../lib/kinds'
import type { Thing } from '../lib/references'
import { HolderPicker, parseKvValue, withKey, type BuilderProps } from './ConditionBuilder'
import { Button, IdPicker, JsonField, NumberInput, RowTools, Select, TextInput, move } from './ui'

const FORMS: { value: EffectForm; label: string }[] = EFFECT_MENU.map((value) => ({ value, label: EFFECT_LABELS[value] }))

export function EffectList({
  value,
  onChange,
  names = NO_NAMES,
  onCreate,
  add = 'Add an effect',
}: BuilderProps & { value: EffectRef[]; onChange: (value: EffectRef[]) => void; add?: string }) {
  return (
    <div className="flex flex-col gap-2">
      {value.map((effect, i) => (
        <EffectBuilder
          key={i}
          value={effect}
          names={names}
          onCreate={onCreate}
          onChange={(next) => onChange(value.map((e, j) => (j === i ? next : e)))}
          tools={
            <RowTools
              label={`effect ${i + 1}`}
              onUp={i > 0 ? () => onChange(move(value, i, -1)) : undefined}
              onDown={i < value.length - 1 ? () => onChange(move(value, i, 1)) : undefined}
              onRemove={() => onChange(value.filter((_, j) => j !== i))}
            />
          }
        />
      ))}
      <div>
        <Button size="xs" onClick={() => onChange([...value, newEffect('scene', names)])}>
          + {add}
        </Button>
      </div>
    </div>
  )
}

export function EffectBuilder({
  value,
  onChange,
  names = NO_NAMES,
  onCreate,
  tools,
}: BuilderProps & { value: EffectRef; onChange: (value: EffectRef) => void; tools?: React.ReactNode }) {
  const [raw, setRaw] = useState(false)
  const form = raw ? 'json' : effectForm(value)
  const e = value as Record<string, any>
  const set = (patch: Record<string, unknown>) => onChange({ ...e, ...patch } as EffectRef)
  const create = (thing: Thing) => (id: string) => onCreate?.(thing, id)

  let fields: React.ReactNode = null
  switch (form) {
    case 'stat':
      fields = (
        <>
          <IdPicker noun="stat" aria-label="Stat" value={e.stat} options={names.stats} onChange={(stat) => set({ stat })} onCreate={create('stat')} />
          <span className="text-xs text-fd-muted-foreground">by</span>
          <NumberInput aria-label="By" value={e.by} onChange={(by) => set({ by: by ?? 0 })} />
        </>
      )
      break
    case 'statTo':
      fields = (
        <>
          <IdPicker noun="stat" aria-label="Stat" value={e.stat} options={names.stats} onChange={(stat) => set({ stat })} onCreate={create('stat')} />
          <span className="text-xs text-fd-muted-foreground">to</span>
          <NumberInput aria-label="To" value={e.to} onChange={(to) => set({ to: to ?? 0 })} />
        </>
      )
      break
    case 'kv':
      fields = (
        <>
          <IdPicker noun="kv key" aria-label="kv key" value={e.key} options={names.kv} onChange={(key) => set({ key })} onCreate={create('kv')} />
          <span className="text-xs text-fd-muted-foreground">to</span>
          <TextInput aria-label="To" className="w-28" value={String(e.to)} onChange={(text) => set({ to: parseKvValue(text ?? '') })} />
        </>
      )
      break
    case 'kvBy':
      fields = (
        <>
          <IdPicker noun="kv key" aria-label="kv key" value={e.key} options={names.kv} onChange={(key) => set({ key })} onCreate={create('kv')} />
          <span className="text-xs text-fd-muted-foreground">by</span>
          <NumberInput aria-label="By" value={e.by} onChange={(by) => set({ by: by ?? 0 })} />
        </>
      )
      break
    case 'entity':
      fields = (
        <>
          <IdPicker noun="thing" aria-label="Thing" value={e.entity} options={names.things} onChange={(entity) => set({ entity })} onCreate={create('thing')} />
          <span className="text-xs text-fd-muted-foreground">for</span>
          {/* `at` is 'you' when it's left out, so picking you leaves it out. */}
          <HolderPicker
            aria-label="Held by"
            holders={names.holders}
            value={e.at ?? 'you'}
            onChange={(at) => onChange(withKey(value, 'at', at === 'you' ? undefined : at))}
          />
          <span className="text-xs text-fd-muted-foreground">by</span>
          <NumberInput aria-label="By" value={e.by} onChange={(by) => set({ by: by ?? 0 })} />
        </>
      )
      break
    case 'move':
      fields = (
        <>
          <IdPicker noun="thing" aria-label="Thing" value={e.entity} options={names.things} onChange={(entity) => set({ entity })} onCreate={create('thing')} />
          <span className="text-xs text-fd-muted-foreground">from</span>
          <HolderPicker
            aria-label="From"
            empty="where it is"
            holders={names.holders}
            value={e.from}
            onChange={(from) => onChange(withKey(value, 'from', from))}
          />
          <span className="text-xs text-fd-muted-foreground">to</span>
          <HolderPicker aria-label="To" holders={names.holders} value={e.to} onChange={(to) => set({ to: to ?? 'player' })} />
          <span className="text-xs text-fd-muted-foreground">how many</span>
          <NumberInput aria-label="How many" value={e.by} placeholder="all" onChange={(by) => onChange(withKey(value, 'by', by))} />
        </>
      )
      break
    case 'you':
      fields = (
        <Select
          aria-label="Play as"
          className="font-mono"
          value={e.to === 'player' ? '' : (e.to ?? '')}
          options={[
            { value: '', label: 'the player' },
            ...[...new Set([...(names.holders ?? []), ...(e.to && e.to !== 'player' ? [e.to as string] : [])])].map((h) => ({ value: h, label: h })),
          ]}
          onChange={(to) => set({ to: to || null })}
        />
      )
      break
    case 'scene':
      fields = (
        <IdPicker
          noun="scene"
          aria-label="Scene"
          empty="Close the scene"
          value={e.scene ?? ''}
          options={names.scenes}
          onChange={(id) => set({ scene: id || null })}
          onCreate={create('scene')}
        />
      )
      break
    case 'draw':
      fields = (
        <>
          <span className="text-xs text-fd-muted-foreground">from the set</span>
          <IdPicker noun="set" aria-label="Storylet set" value={e.from} options={names.sets} onChange={(from) => set({ from })} />
          <span className="text-xs text-fd-muted-foreground">or else</span>
          <IdPicker
            noun="scene"
            aria-label="Otherwise"
            empty="Nothing"
            value={e.otherwise ?? ''}
            options={names.scenes}
            onChange={(id) => set({ otherwise: id || undefined })}
            onCreate={create('scene')}
          />
        </>
      )
      break
    case 'notify':
      fields = (
        <>
          <TextInput aria-label="Title" className="min-w-40 flex-1" value={e.title} placeholder="Title" onChange={(title) => set({ title: title ?? '' })} />
          <TextInput
            aria-label="Text (a prose key)"
            className="w-40"
            mono
            optional
            value={e.text}
            placeholder="prose key (optional)"
            onChange={(text) => set({ text })}
          />
        </>
      )
      break
    case 'turn':
      fields = (
        <>
          <span className="text-xs text-fd-muted-foreground">times</span>
          <NumberInput aria-label="How many turns" value={e.by} placeholder="1" onChange={(by) => set({ by })} />
        </>
      )
      break
    case 'sound':
      fields = <TextInput aria-label="Track" className="w-40" mono value={e.track} placeholder="track id" onChange={(track) => set({ track: track ?? '' })} />
      break
    case 'audio':
      fields = (
        <>
          <TextInput
            aria-label="Channel"
            className="w-28"
            mono
            value={e.channel}
            placeholder="channel"
            onChange={(channel) => set({ channel: channel ?? '' })}
          />
          <span className="text-xs text-fd-muted-foreground">to</span>
          <TextInput
            aria-label="Track"
            className="w-32"
            mono
            value={e.to ?? ''}
            placeholder={e.to === null ? 'silent' : 'track id'}
            onChange={(to) => set({ to: to || undefined })}
          />
          <Button size="xs" variant="ghost" onClick={() => set({ to: null })} title="Silence the channel">
            Silence
          </Button>
        </>
      )
      break
    case 'roll': {
      const read = readDice(e.dice)
      const plus: 'none' | 'number' | 'stat' = e.plus === undefined ? 'none' : typeof e.plus === 'number' ? 'number' : 'stat'
      fields = (
        <>
          <TextInput aria-label="Dice" className="w-24" mono value={e.dice} placeholder="2d6+1" onChange={(dice) => set({ dice: dice ?? '' })} />
          <span className="text-xs text-fd-muted-foreground">into</span>
          <IdPicker noun="kv key" aria-label="kv key" value={e.key} options={names.kv} onChange={(key) => set({ key })} onCreate={create('kv')} />
          <span className="text-xs text-fd-muted-foreground">plus</span>
          <Select
            aria-label="Plus"
            value={plus}
            options={[
              { value: 'none', label: 'nothing' },
              { value: 'number', label: 'a number' },
              { value: 'stat', label: 'a stat' },
            ]}
            onChange={(next) => onChange(withKey(value, 'plus', next === 'none' ? undefined : next === 'number' ? 1 : { stat: names.stats[0] ?? 'strength' }))}
          />
          {plus === 'number' ? <NumberInput aria-label="Plus number" value={e.plus} onChange={(n) => set({ plus: n ?? 0 })} /> : null}
          {plus === 'stat' ? (
            <IdPicker
              noun="stat"
              aria-label="Plus stat"
              value={e.plus.stat}
              options={names.stats}
              onChange={(stat) => set({ plus: { stat } })}
              onCreate={create('stat')}
            />
          ) : null}
          <span className="text-xs text-fd-muted-foreground">against</span>
          <NumberInput aria-label="Against" value={e.against} placeholder="no target" onChange={(against) => onChange(withKey(value, 'against', against))} />
          {'problem' in read ? (
            <p role="alert" className="w-full text-xs text-red-600 dark:text-red-400">
              {read.problem}
            </p>
          ) : null}
        </>
      )
      break
    }
    case 'plugin':
    case 'json':
      fields = (
        <div className="w-full">
          <JsonField label="Effect as JSON" value={value} rows={3} onChange={(next) => next && typeof next === 'object' && onChange(next)} />
          {form === 'plugin' ? (
            <p className="mt-1 text-xs text-fd-muted-foreground">
              A plugin's effect by its full name, such as <code>{'{ "quests/start": { "quest": "errand" } }'}</code>.
            </p>
          ) : null}
        </div>
      )
      break
  }

  return (
    <div className="flex flex-wrap items-center gap-2 rounded-md border border-fd-border bg-fd-background p-2">
      <Select
        aria-label="Kind of effect"
        value={form}
        options={FORMS}
        onChange={(next) => {
          setRaw(next === 'json')
          if (next !== 'json') onChange(newEffect(next, names))
        }}
      />
      {fields}
      {tools ? <span className="ms-auto">{tools}</span> : null}
    </div>
  )
}
