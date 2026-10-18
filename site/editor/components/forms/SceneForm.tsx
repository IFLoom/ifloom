'use client'
/**
 * The scene form: the scene's fields, its storylet fields, its body blocks
 * with their prose, and its choices.
 */
import { useEffect, useState } from 'react'
import { inlineMarkup, type Block, type Choice, type DataScene, type SceneMedia } from '@ifloom/engine'
import { costOf, isCost, shortBlock, transitionFields, transitionOptions, transitionValue, withCost } from '../../lib/builders'
import { rename, renameChoice } from '../../lib/references'
import { OptionalCondition } from '../ConditionBuilder'
import { EffectList } from '../EffectBuilder'
import { ProseField } from '../ProseField'
import { useEditor } from '../context'
import { Button, Checkbox, Field, IdPicker, JsonField, ListInput, NumberInput, RowTools, Section, Select, TextInput, cx, move } from '../ui'
import { IdHeader, InlineProblems } from './common'

export function SceneForm({ id }: { id: string }) {
  const { project, update, replace, select, names, create, playFrom, selection } = useEditor()
  const index = project.pack.scenes.findIndex((s) => s.id === id)
  const scene = project.pack.scenes[index]
  if (!scene) return <p className="text-sm text-fd-muted-foreground">There's no scene called {id}.</p>

  const change = (fn: (draft: DataScene) => void) => update((draft) => fn(draft.pack.scenes[index]))
  const prose = (key: string) => project.pack.prose[key] ?? ''
  const setProse = (key: string, text: string) => update((draft) => void (draft.pack.prose[key] = text))
  const builder = { names, onCreate: create }
  const storylet = Boolean(scene.drawnFrom?.length)

  return (
    <div className="flex flex-col gap-3">
      <IdHeader
        noun="scene"
        id={scene.id}
        taken={names.scenes}
        onRename={(to) => {
          replace(rename(project, 'scene', scene.id, to))
          select({ thing: 'scene', id: to })
        }}
        onDelete={() => {
          update((draft) => {
            draft.pack.scenes.splice(index, 1)
            if (draft.intro === scene.id) draft.intro = draft.pack.scenes[0]?.id ?? null
          })
          select({ thing: 'project' })
        }}
        extra={
          <Button size="xs" variant="primary" onClick={() => playFrom(scene.id)}>
            Play from here
          </Button>
        }
      />
      <InlineProblems thing="scene" id={scene.id} />

      <Section title="Scene">
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Title">
            <TextInput optional value={scene.title} onChange={(title) => change((s) => void (s.title = title))} />
          </Field>
          <Field label="Speaker" hint="A character id a plugin knows, such as the cast's.">
            <TextInput optional mono value={scene.speaker} onChange={(speaker) => change((s) => void (s.speaker = speaker))} />
          </Field>
          <Field label="Frame">
            <Select
              value={scene.frame ?? ''}
              options={[
                { value: '', label: 'Stage (default)' },
                { value: 'talk', label: 'Talk' },
              ]}
              onChange={(frame) => change((s) => void (s.frame = frame === 'talk' ? 'talk' : undefined))}
            />
          </Field>
          <Field label="Tags" hint="Comma separated. The UI can style the scene by them.">
            <ListInput value={scene.tags} onChange={(tags) => change((s) => void (s.tags = tags))} />
          </Field>
        </div>
        <TransitionField value={scene.transition} onChange={(transition) => change((s) => void (s.transition = transition))} />
        <Checkbox
          checked={project.intro === scene.id}
          label="The game opens on this scene"
          onChange={(on) => update((draft) => void (draft.intro = on ? scene.id : null))}
        />
      </Section>

      <Section title="Storylet" id="field-storylet" className={cx(selection.thing === 'scene' && selection.field === 'storylet' && 'ring-2 ring-red-500/50')}>
        <p className="text-xs text-fd-muted-foreground">
          A storylet is drawn at random from a set by the effect “Draw a storylet”. Leave the sets empty for an ordinary scene.
        </p>
        <div className="grid gap-3 sm:grid-cols-2">
          <Field label="Drawn from sets" hint="Comma separated, such as market.">
            <ListInput value={scene.drawnFrom} onChange={(drawnFrom) => change((s) => void (s.drawnFrom = drawnFrom))} />
          </Field>
          <Field label="Weight" hint="How often a draw picks it. 1 if left empty.">
            <NumberInput value={scene.weight} onChange={(weight) => change((s) => void (s.weight = weight))} />
          </Field>
        </div>
        {storylet || scene.when ? (
          <Field label="Only drawn while">
            <OptionalCondition {...builder} value={scene.when} onChange={(when) => change((s) => void (s.when = when))} />
          </Field>
        ) : null}
      </Section>

      <Section
        title="Body"
        id="field-body"
        className={cx(selection.thing === 'scene' && selection.field === 'body' && 'ring-2 ring-red-500/50')}
        actions={
          <>
            <Button size="xs" onClick={() => change((s) => void s.body.push({ text: nextKey(scene, project.pack.prose) }))}>
              + Text
            </Button>
            <Button size="xs" onClick={() => change((s) => void s.body.push({ media: { src: 'scene/picture', alt: '' } }))}>
              + Picture or video
            </Button>
          </>
        }
      >
        {scene.body.map((block, i) => (
          <BlockEditor
            key={i}
            block={block}
            prose={prose}
            setProse={setProse}
            onChange={(next) => change((s) => void (s.body[i] = next))}
            tools={
              <RowTools
                label={`block ${i + 1}`}
                onUp={i > 0 ? () => change((s) => void (s.body = move(s.body, i, -1))) : undefined}
                onDown={i < scene.body.length - 1 ? () => change((s) => void (s.body = move(s.body, i, 1))) : undefined}
                onRemove={() => change((s) => void s.body.splice(i, 1))}
              />
            }
          />
        ))}
        {!scene.body.length ? <p className="text-xs text-fd-muted-foreground">No body yet.</p> : null}
      </Section>

      <Section
        title="Choices"
        actions={
          <Button
            size="xs"
            onClick={() => {
              const choiceId = freeId(
                scene.choices.map((c) => c.id),
                'choice',
              )
              change((s) => void s.choices.push({ id: choiceId, effects: [] }))
              setProse(`${scene.id}#${choiceId}`, '')
            }}
          >
            + Choice
          </Button>
        }
      >
        {scene.choices.map((choice, i) => (
          <ChoiceCard
            key={choice.id + i}
            scene={scene}
            choice={choice}
            open={selection.thing === 'scene' && selection.choice === choice.id}
            onChange={(next) => change((s) => void (s.choices[i] = next))}
            tools={
              <RowTools
                label={`choice ${choice.id}`}
                onUp={i > 0 ? () => change((s) => void (s.choices = move(s.choices, i, -1))) : undefined}
                onDown={i < scene.choices.length - 1 ? () => change((s) => void (s.choices = move(s.choices, i, 1))) : undefined}
                onRemove={() => change((s) => void s.choices.splice(i, 1))}
              />
            }
          />
        ))}
        {!scene.choices.length ? (
          <p className="text-xs text-fd-muted-foreground">No choices: the scene is an ending, unless a plugin moves the player on.</p>
        ) : null}
      </Section>

      <Section title="Stage and audio">
        <Field label="Audio while the scene is open" hint={'Track ids by channel, as JSON: { "ambience": "rain" }. null silences a channel.'}>
          <JsonField
            label="Audio"
            value={scene.audio ?? {}}
            rows={2}
            onChange={(audio) => change((s) => void (s.audio = audio && Object.keys(audio).length ? audio : undefined))}
          />
        </Field>
        <Field label="Stage" hint="A layered picture with hotspots, as JSON. Layers name their pictures by path; the preview shows placeholders.">
          <JsonField label="Stage" value={scene.stage ?? null} rows={3} onChange={(stage) => change((s) => void (s.stage = stage ?? undefined))} />
        </Field>
      </Section>
    </div>
  )
}

/** The next free body key: `scene/2`, `scene/3`… */
function nextKey(scene: DataScene, prose: Record<string, string>): string {
  const used = new Set([...Object.keys(prose), ...scene.body.flatMap((b) => ('text' in b ? [b.text] : []))])
  if (!used.has(scene.id)) return scene.id
  for (let n = 2; ; n++) if (!used.has(`${scene.id}/${n}`)) return `${scene.id}/${n}`
}

function freeId(taken: string[], base: string): string {
  if (!taken.includes(base)) return base
  for (let n = 2; ; n++) if (!taken.includes(`${base}${n}`)) return `${base}${n}`
}

function BlockEditor({
  block,
  onChange,
  prose,
  setProse,
  tools,
}: {
  block: Block
  onChange: (block: Block) => void
  prose: (key: string) => string
  setProse: (key: string, text: string) => void
  tools: React.ReactNode
}) {
  const { names, create } = useEditor()
  return (
    <div className="flex flex-col gap-2 rounded-md border border-fd-border bg-fd-background p-2">
      <div className="flex flex-wrap items-center gap-2">
        {'text' in block ? (
          <ProseKey value={block.text} onChange={(text) => onChange({ ...block, text })} moveText={(from, to) => setProse(to, prose(from))} />
        ) : 'media' in block ? (
          <span className="text-xs font-semibold uppercase tracking-wide text-fd-muted-foreground">Picture or video</span>
        ) : (
          <span className="text-xs font-semibold uppercase tracking-wide text-fd-muted-foreground">Variants: {block.variants}</span>
        )}
        <span className="ms-auto">{tools}</span>
      </div>
      {'text' in block ? <ProseField label={`Prose for ${block.text}`} value={prose(block.text)} onChange={(text) => setProse(block.text, text)} /> : null}
      {'media' in block ? <MediaFields media={block.media} onChange={(media) => onChange({ ...block, media })} /> : null}
      {'variants' in block ? <JsonField label="Variants block" value={block} rows={3} onChange={(next) => next && onChange(next)} /> : null}
      <Field label="Shown only while">
        <OptionalCondition
          names={names}
          onCreate={create}
          value={block.when}
          onChange={(when) => onChange({ ...block, when } as Block)}
          add="Only show it while…"
        />
      </Field>
      <RevealField block={block} onChange={onChange} />
    </div>
  )
}

/** How the scene comes on screen and goes off: a menu each way, and how long. Blank parts take the game's default. */
function TransitionField({ value, onChange }: { value: DataScene['transition']; onChange: (value: DataScene['transition']) => void }) {
  const fields = transitionFields(value)
  const set = (patch: Partial<typeof fields>) => onChange(transitionValue({ ...fields, ...patch }))
  const menu = (current: string) => [{ value: '', label: 'Game default' }, ...transitionOptions(current).map((name) => ({ value: name, label: name }))]
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      <Field label="Comes in" hint="How the scene appears.">
        <Select aria-label="Transition in" value={fields.in} options={menu(fields.in)} onChange={(name) => set({ in: name })} />
      </Field>
      <Field label="Goes out" hint="How it leaves for the next screen.">
        <Select aria-label="Transition out" value={fields.out} options={menu(fields.out)} onChange={(name) => set({ out: name })} />
      </Field>
      <Field label="Milliseconds" hint="Each way. 300 if left empty.">
        <NumberInput aria-label="Transition milliseconds" value={fields.ms} onChange={(ms) => set({ ms })} />
      </Field>
    </div>
  )
}

/** Whether a block comes after a pause, how long, and how. */
function RevealField({ block, onChange }: { block: Block; onChange: (block: Block) => void }) {
  const reveal = block.reveal
  const set = (next: Block['reveal']) => {
    const { reveal: _old, ...rest } = block
    onChange((next ? { ...rest, reveal: next } : rest) as Block)
  }
  return (
    <div className="flex flex-wrap items-center gap-2">
      <Checkbox checked={reveal !== undefined} label="Reveal it after a pause" onChange={(on) => set(on ? {} : undefined)} />
      {reveal ? (
        <>
          <NumberInput
            aria-label="Pause in milliseconds"
            className="w-24"
            value={reveal.delay}
            placeholder="800"
            onChange={(delay) => set({ ...reveal, delay })}
          />
          <span className="text-xs text-fd-muted-foreground">ms, then</span>
          <Select
            aria-label="Reveal transition"
            value={reveal.as ?? 'fade'}
            options={transitionOptions(reveal.as)}
            onChange={(as) => set({ ...reveal, as: as === 'fade' ? undefined : as })}
          />
        </>
      ) : null}
    </div>
  )
}

/** A prose key, editable. A new key takes the old one's text with it, if it has none. */
function ProseKey({ value, onChange, moveText }: { value: string; onChange: (key: string) => void; moveText: (from: string, to: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const commit = () => {
    const key = draft.trim()
    if (!key || key === value) return setDraft(value)
    moveText(value, key)
    onChange(key)
  }
  return (
    <label className="flex items-center gap-1 text-xs text-fd-muted-foreground">
      Prose key
      <input
        className="w-48 rounded border border-transparent bg-transparent px-1 font-mono text-xs text-fd-foreground hover:border-fd-border focus:border-fd-border focus:outline-none"
        value={draft}
        onChange={(event) => setDraft(event.target.value)}
        onBlur={commit}
        onKeyDown={(event) => event.key === 'Enter' && commit()}
      />
    </label>
  )
}

function MediaFields({ media, onChange }: { media: SceneMedia; onChange: (media: SceneMedia) => void }) {
  const set = (patch: Partial<SceneMedia>) => onChange({ ...media, ...patch })
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      <Field label="Path" hint="Under art/; .jpg is added when there's no extension. A .mp4 or .webm is a video.">
        <TextInput mono value={media.src} onChange={(src) => set({ src })} />
      </Field>
      <Field label="Alt text">
        <TextInput optional value={media.alt} onChange={(alt) => set({ alt })} />
      </Field>
      <Field label="Size">
        <Select value={media.size ?? 'inline'} options={['inline', 'wide']} onChange={(size) => set({ size: size === 'inline' ? undefined : size })} />
      </Field>
      <Field label="Where">
        <Select
          value={media.at ?? ''}
          options={[
            { value: '', label: 'Here in the body' },
            { value: 'lead', label: 'Before the body' },
            { value: 'end', label: 'After the body' },
          ]}
          onChange={(at) => set({ at: at === '' ? undefined : (at as 'lead' | 'end') })}
        />
      </Field>
    </div>
  )
}

function ChoiceCard({
  scene,
  choice,
  onChange,
  tools,
  open,
}: {
  scene: DataScene
  choice: Choice
  onChange: (choice: Choice) => void
  tools: React.ReactNode
  open: boolean
}) {
  const { project, update, replace, select, names, create } = useEditor()
  const [expanded, setExpanded] = useState(open)
  useEffect(() => {
    if (open) setExpanded(true)
  }, [open])
  const labelKey = choice.label ?? `${scene.id}#${choice.id}`
  const label = project.pack.prose[labelKey] ?? ''
  const set = (patch: Partial<Choice>) => onChange({ ...choice, ...patch })
  const cost = costOf(choice.effects)
  const builder = { names, onCreate: create }
  const statDef = (id: string) => project.pack.stats.find((s) => s.id === id)
  const spendable = project.pack.stats.filter((s) => !s.derive && !s.of)
  // The body's prose keys whose text draws this choice inline, with `[[act:id]]`.
  const textKeys = scene.body.flatMap((block) => ('text' in block ? [block.text] : []))
  const inlineIn = textKeys.filter((key) => (inlineMarkup(project.pack.prose[key] ?? '') ?? []).some((part) => part.kind === 'act' && part.id === choice.id))
  const putInline = () => {
    const key = textKeys.at(-1)
    if (!key) return
    update((draft) => {
      const text = (draft.pack.prose[key] ?? '').replace(/\s+$/, '')
      draft.pack.prose[key] = `${text}${text ? ' ' : ''}[[act:${choice.id}]]`
    })
  }

  return (
    <div id={`choice-${choice.id}`} className={cx('rounded-md border bg-fd-background', open ? 'border-fd-primary' : 'border-fd-border')}>
      <div className="flex items-center gap-2 p-2">
        <button type="button" className="flex min-w-0 flex-1 items-center gap-2 text-left" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>
          <span aria-hidden="true" className="text-xs text-fd-muted-foreground">
            {expanded ? '▾' : '▸'}
          </span>
          <code className="text-xs">{choice.id}</code>
          <span className="truncate text-sm">{label || <em className="text-fd-muted-foreground">No label yet</em>}</span>
          {inlineIn.length ? <span className="shrink-0 rounded bg-fd-primary/10 px-1 text-xs text-fd-primary">in the text</span> : null}
          {cost.length ? (
            <span className="shrink-0 rounded bg-fd-secondary px-1 text-xs">costs {cost.map((c) => `${c.amount} ${c.stat}`).join(', ')}</span>
          ) : null}
        </button>
        {tools}
      </div>
      {expanded ? (
        <div className="flex flex-col gap-3 border-t border-fd-border p-2">
          <InlineProblems thing="scene" id={scene.id} choice={choice.id} />
          <div className="grid gap-3 sm:grid-cols-[10rem_1fr]">
            <Field label="Id">
              <ChoiceId
                value={choice.id}
                taken={scene.choices.map((c) => c.id)}
                onRename={(to) => {
                  replace(renameChoice(project, scene.id, choice.id, to))
                  select({ thing: 'scene', id: scene.id, choice: to })
                }}
              />
            </Field>
            <Field
              label={
                <>
                  Label <code className="font-normal">{labelKey}</code>
                </>
              }
            >
              <TextInput value={label} placeholder="The button text" onChange={(text) => update((draft) => void (draft.pack.prose[labelKey] = text ?? ''))} />
            </Field>
          </div>

          <Field
            label="In the text"
            hint="A choice the body's prose names with [[act:id]] is drawn there, as a link in the line, and not in the list of choices."
          >
            {inlineIn.length ? (
              <p className="text-xs">
                Drawn inline by <code>[[act:{choice.id}]]</code> in{' '}
                {inlineIn.map((key) => (
                  <code key={key} className="me-1">
                    {key}
                  </code>
                ))}
              </p>
            ) : (
              <div>
                <Button
                  size="xs"
                  disabled={!textKeys.length}
                  onClick={putInline}
                  title={textKeys.length ? `Add [[act:${choice.id}]] to the end of ${textKeys.at(-1)}` : 'Add a text block first'}
                >
                  Put it in the text
                </Button>
              </div>
            )}
          </Field>

          <Field label="What it costs" hint="Spending a stat takes it from the player and shows as the button's price when the stat is spendable.">
            <div className="flex flex-col gap-1">
              {cost.map((entry, i) => (
                <div key={i} className="flex flex-wrap items-center gap-2">
                  <NumberInput
                    aria-label="Amount"
                    value={entry.amount}
                    onChange={(amount) =>
                      set({
                        effects: withCost(
                          choice.effects,
                          cost.map((c, j) => (j === i ? { ...c, amount: amount ?? 0 } : c)),
                        ),
                      })
                    }
                  />
                  <IdPicker
                    noun="stat"
                    aria-label="Stat"
                    value={entry.stat}
                    options={names.stats}
                    onCreate={(id) => create('stat', id)}
                    onChange={(stat) =>
                      set({
                        effects: withCost(
                          choice.effects,
                          cost.map((c, j) => (j === i ? { ...c, stat } : c)),
                        ),
                      })
                    }
                  />
                  {!statDef(entry.stat)?.spendable ? <span className="text-xs text-fd-muted-foreground">(not spendable, so no price shows)</span> : null}
                  <Button
                    size="xs"
                    variant="ghost"
                    onClick={() => set({ blocked: [...(choice.blocked ?? []), shortBlock(statDef(entry.stat), entry.stat, entry.amount)] })}
                  >
                    Block it when short
                  </Button>
                  <Button
                    size="xs"
                    variant="danger"
                    aria-label="Remove the cost"
                    onClick={() =>
                      set({
                        effects: withCost(
                          choice.effects,
                          cost.filter((_, j) => j !== i),
                        ),
                      })
                    }
                  >
                    ✕
                  </Button>
                </div>
              ))}
              <div>
                <Button
                  size="xs"
                  onClick={() => set({ effects: withCost(choice.effects, [...cost, { stat: spendable[0]?.id ?? names.stats[0] ?? 'coins', amount: 1 }]) })}
                >
                  + Add a cost
                </Button>
              </div>
            </div>
          </Field>

          <Field label="Shown only while">
            <OptionalCondition {...builder} value={choice.when} onChange={(when) => set({ when })} add="Only show it while…" />
          </Field>

          <Field label="Greyed out, with a reason, while" hint="The first that holds is the reason the player reads.">
            <div className="flex flex-col gap-2">
              {(choice.blocked ?? []).map((entry, i) => (
                <div key={i} className="flex flex-col gap-1 rounded-md border border-fd-border p-2">
                  <div className="flex items-center gap-2">
                    <TextInput
                      aria-label="Reason"
                      className="flex-1"
                      value={entry.reason}
                      placeholder="Why it can't be taken"
                      onChange={(reason) => set({ blocked: choice.blocked!.map((b, j) => (j === i ? { ...b, reason: reason ?? '' } : b)) })}
                    />
                    <Button
                      size="xs"
                      variant="danger"
                      aria-label="Remove the reason"
                      onClick={() => set({ blocked: choice.blocked!.filter((_, j) => j !== i).length ? choice.blocked!.filter((_, j) => j !== i) : undefined })}
                    >
                      ✕
                    </Button>
                  </div>
                  <OptionalCondition
                    {...builder}
                    value={entry.when}
                    onChange={(when) => when && set({ blocked: choice.blocked!.map((b, j) => (j === i ? { ...b, when } : b)) })}
                  />
                </div>
              ))}
              <div>
                <Button size="xs" onClick={() => set({ blocked: [...(choice.blocked ?? []), { when: { kv: names.kv[0] ?? 'busy' }, reason: 'Not now.' }] })}>
                  + Add a reason
                </Button>
              </div>
            </div>
          </Field>

          <Field label="Effects" hint="Run in order when the player picks it.">
            <EffectList
              {...builder}
              value={choice.effects.filter((e) => !cost.length || !isCost(e))}
              onChange={(effects) => set({ effects: withCost(effects, cost) })}
            />
          </Field>

          <details className="text-xs">
            <summary className="cursor-pointer text-fd-muted-foreground">More: once a turn, a warning, tags, a command, labels</summary>
            <div className="mt-2 grid gap-3 sm:grid-cols-2">
              <Field label="Once a turn: the reason shown after" hint="Left empty, it can be taken any number of times.">
                <TextInput optional value={choice.once?.reason} onChange={(reason) => set({ once: reason ? { per: 'turn', reason } : undefined })} />
              </Field>
              <Field label="Warning before it's taken">
                <TextInput optional value={choice.irreversible} onChange={(irreversible) => set({ irreversible })} />
              </Field>
              <Field label="Tags">
                <ListInput value={choice.tags} onChange={(tags) => set({ tags })} />
              </Field>
            </div>
            <Field
              label="Sends a command"
              hint={
                'As JSON, run before the effects, such as a plugin\'s: { "type": "custom", "name": "devices/open", "with": { "id": "texts" } }. It is greyed out while the command would be refused.'
              }
            >
              <JsonField
                label="Command"
                rows={2}
                value={choice.command ?? null}
                onChange={(command) => set({ command: command && typeof command === 'object' && 'type' in command ? command : undefined })}
              />
            </Field>
            <Field label="Labels that depend on state" hint={'As JSON, first match wins: [{ "when": { "seen": "home" }, "key": "market#buy-again" }].'}>
              <JsonField
                label="Labels"
                rows={2}
                value={choice.labels ?? []}
                onChange={(labels) => set({ labels: Array.isArray(labels) && labels.length ? labels : undefined })}
              />
            </Field>
          </details>
        </div>
      ) : null}
    </div>
  )
}

function ChoiceId({ value, taken, onRename }: { value: string; taken: string[]; onRename: (to: string) => void }) {
  const [draft, setDraft] = useState(value)
  useEffect(() => setDraft(value), [value])
  const clash = draft !== value && taken.includes(draft)
  const commit = () => {
    const to = draft.trim()
    if (!to || to === value || clash || !/^[A-Za-z0-9_][A-Za-z0-9_.-]*$/.test(to)) return setDraft(value)
    onRename(to)
  }
  return (
    <TextInput
      mono
      aria-label="Choice id"
      value={draft}
      onChange={(v) => setDraft(v ?? '')}
      // Renaming moves the label's key and every condition that asks about the choice.
      onBlur={commit}
      onKeyDown={(event) => event.key === 'Enter' && commit()}
    />
  )
}
