import type { FlagValue, InputView } from '@ifloom/engine'
import { useEffect, useState, type FormEvent } from 'react'
import { Button } from '../components/ui/button.tsx'
import { cn } from '../lib/utils.ts'
import { useGame } from './context.tsx'
import { useWords } from './words.ts'

/** One input: a text box, a number box, or the options to pick from. Shows the engine's refusal if the value won't do. */
export function InputField({ input }: { input: InputView }) {
  const { send } = useGame()
  const words = useWords()
  const [text, setText] = useState(input.value === null ? '' : String(input.value))
  // Follow the value when something else changes it: an undo, a load.
  useEffect(() => setText(input.value === null ? '' : String(input.value)), [input.value])
  const [said, setSaid] = useState<string | null>(null)
  const enter = (value: FlagValue | undefined) => {
    const out = send({ type: 'input', id: input.id, value })
    setSaid(out.ok ? null : (out.refused ?? null))
  }
  const submit = (event: FormEvent) => {
    event.preventDefault()
    enter(input.kind === 'number' ? (text.trim() === '' ? undefined : Number(text)) : text)
  }
  return (
    <div className="flex flex-col gap-1.5" data-input={input.id}>
      <label className="text-sm font-medium" htmlFor={`input-${input.id}`}>
        {input.label}
      </label>
      {input.kind === 'choice' ? (
        <div className="flex flex-wrap gap-2">
          {input.options.map((option) => (
            <Button
              key={String(option.value)}
              size="sm"
              variant={input.value === option.value ? 'default' : 'outline'}
              onClick={() => enter(option.value)}
            >
              {option.label}
            </Button>
          ))}
        </div>
      ) : (
        <form onSubmit={submit} className="flex gap-2">
          <input
            id={`input-${input.id}`}
            type={input.kind === 'number' ? 'number' : 'text'}
            value={text}
            min={input.min ?? undefined}
            max={input.max ?? undefined}
            maxLength={input.maxLength ?? undefined}
            onChange={(event) => setText(event.target.value)}
            className="h-9 flex-1 rounded-md border bg-background px-3 text-sm"
          />
          <Button type="submit">{words('enter')}</Button>
        </form>
      )}
      {said ? <p className="text-sm text-destructive">{said}</p> : null}
    </div>
  )
}

/** Every input on offer now (`view.inputs`). Draws nothing when there are none. */
export function InputFields({ className }: { className?: string }) {
  const { view } = useGame()
  const inputs = Object.values(view.inputs)
  if (!inputs.length) return null
  return (
    <section className={cn('flex flex-col gap-3', className)}>
      {inputs.map((input) => (
        <InputField key={input.id} input={input} />
      ))}
    </section>
  )
}
