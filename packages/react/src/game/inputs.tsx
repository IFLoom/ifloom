import type { KvValue, InputView } from '@ifloom/engine'
import { useEffect, useState, type FormEvent } from 'react'
import { buttonVariants } from '../components/ui/button.tsx'
import { useGame } from './context.tsx'
import { overridable, usePart } from './overrides.tsx'
import { useWords } from './words.ts'

function InputFieldImpl({ input }: { input: InputView }) {
  const { send } = useGame()
  const words = useWords()
  const box = usePart('input', 'flex flex-col gap-1.5')
  const label = usePart('input-label', 'text-sm font-medium')
  const options = usePart('input-options', 'flex flex-wrap gap-2')
  const picked = usePart('button', buttonVariants({ size: 'sm', variant: 'default' }))
  const unpicked = usePart('button', buttonVariants({ size: 'sm', variant: 'outline' }))
  const field = usePart('input-field', 'h-9 flex-1 rounded-md border bg-background px-3 text-sm')
  const submitButton = usePart('input-submit', buttonVariants())
  const error = usePart('input-error', 'text-sm text-destructive')
  const [text, setText] = useState(input.value === null ? '' : String(input.value))
  // Follow the value when something else changes it: an undo, a load.
  useEffect(() => setText(input.value === null ? '' : String(input.value)), [input.value])
  const [said, setSaid] = useState<string | null>(null)
  const enter = (value: KvValue | undefined) => {
    const out = send({ type: 'input', id: input.id, to: value })
    setSaid(out.ok ? null : (out.reason ?? null))
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    enter(input.kind === 'number' ? (text.trim() === '' ? undefined : Number(text)) : text)
  }
  return (
    <div {...box} data-input={input.id}>
      <label {...label} htmlFor={`input-${input.id}`}>
        {input.label}
      </label>
      {input.kind === 'choice' ? (
        <div {...options}>
          {input.options.map((option) => (
            <button
              key={String(option.value)}
              type="button"
              {...(input.value === option.value ? picked : unpicked)}
              onClick={() => enter(option.value)}
            >
              {option.label}
            </button>
          ))}
        </div>
      ) : (
        <form onSubmit={submit} className="flex gap-2">
          <input
            {...field}
            id={`input-${input.id}`}
            type={input.kind === 'number' ? 'number' : 'text'}
            value={text}
            min={input.min ?? undefined}
            max={input.max ?? undefined}
            maxLength={input.maxLength ?? undefined}
            onChange={(event) => setText(event.target.value)}
          />
          <button {...submitButton} type="submit">
            {words('enter')}
          </button>
        </form>
      )}
      {said ? <p {...error}>{said}</p> : null}
    </div>
  )
}

/** One input: a text box, a number box, or the options to pick from. Shows the engine's refusal if the value won't do. */
export const InputField = overridable('InputField', InputFieldImpl)

function InputFieldsImpl({ className }: { className?: string }) {
  const { view } = useGame()
  const list = usePart('inputs', 'flex max-w-(--width-prose) flex-col gap-3', className)
  const inputs = Object.values(view.inputs)
  if (!inputs.length) return null
  return (
    <section {...list}>
      {inputs.map((input) => (
        <InputField key={input.id} input={input} />
      ))}
    </section>
  )
}

/** Every input on offer now (`view.inputs`). Draws nothing when there are none. */
export const InputFields = overridable('InputFields', InputFieldsImpl)
