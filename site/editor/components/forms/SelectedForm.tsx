'use client'
/** The form for what the outline has selected. */
import { useEffect } from 'react'
import { PLUGINS, PLUGIN_IDS, THEMES, slug } from '../../lib/model'
import { rename, walkPack } from '../../lib/references'
import { useEditor } from '../context'
import { Checkbox, Field, IdPicker, JsonField, Section, Select, TextInput } from '../ui'
import { IdHeader, InlineProblems } from './common'
import { ItemFields, StatFields } from './DefFields'
import { SceneForm } from './SceneForm'

export function SelectedForm() {
  const { selection } = useEditor()
  const key = selection.thing === 'project' ? 'project' : `${selection.thing}:${selection.id}`
  // Bring the choice or field a problem points at into view.
  useEffect(() => {
    if (selection.thing === 'project') return
    const target = selection.choice ? `choice-${selection.choice}` : selection.field ? `field-${selection.field}` : null
    if (target) requestAnimationFrame(() => document.getElementById(target)?.scrollIntoView({ block: 'center', behavior: 'smooth' }))
  }, [selection])
  switch (selection.thing) {
    case 'project':
      return <ProjectForm key={key} />
    case 'scene':
      return <SceneForm key={key} id={selection.id} />
    case 'stat':
      return <StatForm key={key} id={selection.id} />
    case 'item':
      return <ItemForm key={key} id={selection.id} />
    case 'kv':
      return <KvForm key={key} id={selection.id} />
  }
}

function Missing({ noun, id }: { noun: string; id: string }) {
  return (
    <p className="text-sm text-fd-muted-foreground">
      There's no {noun} called {id}.
    </p>
  )
}

function StatForm({ id }: { id: string }) {
  const { project, update, replace, select, names, create } = useEditor()
  const index = project.pack.stats.findIndex((s) => s.id === id)
  const stat = project.pack.stats[index]
  if (!stat) return <Missing noun="stat" id={id} />
  return (
    <div className="flex flex-col gap-3">
      <IdHeader
        noun="stat"
        id={stat.id}
        taken={names.stats}
        onRename={(to) => {
          replace(rename(project, 'stat', stat.id, to))
          select({ thing: 'stat', id: to })
        }}
        onDelete={() => {
          update((draft) => void draft.pack.stats.splice(index, 1))
          select({ thing: 'project' })
        }}
      />
      <InlineProblems thing="stat" id={stat.id} />
      <Section title="Stat">
        <StatFields names={names} onCreate={create} value={stat} onChange={(next) => update((draft) => void (draft.pack.stats[index] = next))} />
      </Section>
    </div>
  )
}

function ItemForm({ id }: { id: string }) {
  const { project, update, replace, select, names, create } = useEditor()
  const index = project.pack.items.findIndex((i) => i.id === id)
  const item = project.pack.items[index]
  if (!item) return <Missing noun="item" id={id} />
  return (
    <div className="flex flex-col gap-3">
      <IdHeader
        noun="item"
        id={item.id}
        taken={names.items}
        onRename={(to) => {
          replace(rename(project, 'item', item.id, to))
          select({ thing: 'item', id: to })
        }}
        onDelete={() => {
          update((draft) => void draft.pack.items.splice(index, 1))
          select({ thing: 'project' })
        }}
      />
      <InlineProblems thing="item" id={item.id} />
      <Section title="Item">
        <ItemFields names={names} onCreate={create} value={item} onChange={(next) => update((draft) => void (draft.pack.items[index] = next))} />
      </Section>
    </div>
  )
}

function KvForm({ id }: { id: string }) {
  const { project, update, replace, select, names } = useEditor()
  const index = project.kv.findIndex((v) => v.name === id)
  const entry = project.kv[index]
  if (!entry) return <Missing noun="kv key" id={id} />
  // Where the pack reads or sets it.
  const uses: string[] = []
  for (const scene of project.pack.scenes) {
    const single = { ...project.pack, scenes: [scene], stats: [], items: [] }
    let used = false
    walkPack(single, {
      condition: (c) => void (c.kv === id && (used = true)),
      effect: (e) => void (e.kind === 'kv' && e.key === id && (used = true)),
    })
    if (used) uses.push(scene.id)
  }
  return (
    <div className="flex flex-col gap-3">
      <IdHeader
        noun="kv key"
        id={entry.name}
        taken={names.kv}
        onRename={(to) => {
          replace(rename(project, 'kv', entry.name, to))
          select({ thing: 'kv', id: to })
        }}
        onDelete={() => {
          update((draft) => void draft.kv.splice(index, 1))
          select({ thing: 'project' })
        }}
      />
      <Section title="kv key">
        <p className="text-xs text-fd-muted-foreground">
          A key in the kv store needs no declaration: an effect sets it and a condition reads it. Unset, it reads as false, or 0 for a number. This note is for
          you and goes into the TypeScript export as a comment.
        </p>
        <Field label="Note">
          <TextInput
            value={entry.note}
            placeholder="What it records, and its default"
            onChange={(note) => update((draft) => void (draft.kv[index].note = note ?? ''))}
          />
        </Field>
        <div className="text-xs text-fd-muted-foreground">
          {uses.length ? (
            <>
              Used in{' '}
              {uses.map((scene, i) => (
                <span key={scene}>
                  {i ? ', ' : ''}
                  <button type="button" className="font-mono text-fd-primary underline" onClick={() => select({ thing: 'scene', id: scene })}>
                    {scene}
                  </button>
                </span>
              ))}
              .
            </>
          ) : (
            'No scene uses it yet.'
          )}
        </div>
      </Section>
    </div>
  )
}

function ProjectForm() {
  const { project, update, names, selection } = useEditor()
  const preview = project.preview
  return (
    <div className="flex flex-col gap-3">
      <h2 className="text-lg font-semibold">Project settings</h2>
      <InlineProblems thing="project" id="" />
      <Section title="The game">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title">
            <TextInput value={project.title} onChange={(title) => update((draft) => void (draft.title = title ?? ''))} />
          </Field>
          <Field label="Pack id" hint="Names the exported constant and file.">
            <TextInput mono value={project.pack.id} placeholder={slug(project.title)} onChange={(id) => update((draft) => void (draft.pack.id = id ?? ''))} />
          </Field>
          <Field label="Opens on" hint="The intro scene a new game starts at.">
            <IdPicker
              noun="scene"
              aria-label="Intro scene"
              empty="No scene: the idle screen"
              value={project.intro ?? ''}
              options={names.scenes}
              onChange={(id) => update((draft) => void (draft.intro = id || null))}
            />
          </Field>
        </div>
        {selection.thing === 'project' && selection.field === 'intro' ? (
          <p className="text-xs text-red-600 dark:text-red-400">Pick a scene the game opens on.</p>
        ) : null}
      </Section>
      <Section title="Preview">
        <Field label="Theme preset" hint="One of the React UI's presets, or its own look.">
          <Select value={preview.theme} options={THEMES} onChange={(theme) => update((draft) => void (draft.preview.theme = theme))} />
        </Field>
      </Section>
      <Section title="Plugins">
        <p className="text-xs text-fd-muted-foreground">
          Switch on the first-party plugins the preview should run. Their options are the JSON each plugin's function is called with. Their conditions and
          effects go in the builders as JSON, and their content in the pack's data below.
        </p>
        <div className="flex flex-col gap-2">
          {PLUGIN_IDS.map((id) => {
            const setting = preview.plugins[id]
            return (
              <div key={id} className="flex flex-col gap-1">
                <Checkbox
                  checked={Boolean(setting?.on)}
                  label={
                    <>
                      {PLUGINS[id].label} <code className="text-xs text-fd-muted-foreground">@ifloom/plugin-{id}</code>
                    </>
                  }
                  onChange={(on) => update((draft) => void (draft.preview.plugins[id] = { on, options: setting?.options ?? PLUGINS[id].options }))}
                />
                {setting?.on && PLUGINS[id].options !== '' ? (
                  <textarea
                    aria-label={`${PLUGINS[id].label} options`}
                    className="ms-6 rounded-md border border-fd-border bg-fd-background p-1 font-mono text-xs"
                    rows={2}
                    value={setting.options}
                    onChange={(event) => update((draft) => void (draft.preview.plugins[id] = { on: true, options: event.target.value }))}
                  />
                ) : null}
              </div>
            )
          })}
        </div>
        <Field label="Plugin content (the pack's data)" hint={'By plugin id, then list: { "quests": { "quests": [ ... ] } }.'}>
          <JsonField
            label="Plugin data"
            rows={5}
            value={project.pack.data ?? {}}
            onChange={(data) => update((draft) => void (draft.pack.data = data && Object.keys(data).length ? data : undefined))}
          />
        </Field>
      </Section>
    </div>
  )
}
