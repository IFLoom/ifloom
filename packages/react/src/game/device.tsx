import type { Command, RenderedChoice } from '@ifloom/engine'
import { ArrowLeftIcon } from 'lucide-react'
import { useState } from 'react'
import { Badge } from '../components/ui/badge.tsx'
import { Button } from '../components/ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog.tsx'
import { cn } from '../lib/utils.ts'
import { ChoiceList } from './choices.tsx'
import { useGame } from './context.tsx'
import { assetUrl } from './assets.ts'
import { useWords } from './words.ts'
import { Picture } from './picture.tsx'

/** The devices plugin's view, as the UI reads it. */
type SectionView =
  | { kind: 'prose'; text: string }
  | { kind: 'actions'; actions: RenderedChoice[] }
  | { kind: 'list'; entries: { id: string; title: string; text: string; image: string | null; actions: RenderedChoice[] }[] }
  | { kind: 'plugin'; plugin: string; with: Record<string, unknown> }
  | { kind: 'panel'; panel: string; data: unknown }
type AppView = { id: string; name: string; icon: string; badge: number | boolean; disabled?: string; command: Command; sections: SectionView[] }
type DeviceView = { id: string; name: string; frame: string; sidebar: boolean; wallpaper: string | null; badge: number; apps: AppView[]; open: AppView | null }

/** The devices in the view, if the game has the devices plugin. */
export function useDevices(): DeviceView[] {
  const { view } = useGame()
  return (view.plugins.devices as { devices: DeviceView[] } | undefined)?.devices ?? []
}

/** The sidebar's device buttons, each with its badge; a button opens the device. */
export function DeviceButtons() {
  const devices = useDevices().filter((device) => device.sidebar)
  const [open, setOpen] = useState<string | null>(null)
  if (!devices.length) return null
  return (
    <div className="flex gap-2">
      {devices.map((device) => (
        <Button key={device.id} variant="outline" size="sm" onClick={() => setOpen(device.id)} data-device={device.id}>
          {device.name}
          {device.badge ? <Badge>{device.badge}</Badge> : null}
        </Button>
      ))}
      <DeviceDialog deviceId={open} onClose={() => setOpen(null)} />
    </div>
  )
}

function AppBadge({ badge }: { badge: number | boolean }) {
  if (!badge) return null
  return (
    <span className="absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground">
      {typeof badge === 'number' ? badge : ''}
    </span>
  )
}

/** One section of an open app, drawn by kind; a plugin section by that plugin's renderer. */
export function AppSection({ section }: { section: SectionView }) {
  const { view, panels, sections } = useGame()
  switch (section.kind) {
    case 'prose':
      return <p className="leading-relaxed whitespace-pre-wrap">{section.text}</p>
    case 'actions':
      return <ChoiceList choices={section.actions} />
    case 'list':
      return (
        <ul className="flex flex-col gap-2">
          {section.entries.map((entry) => (
            <li key={entry.id} className="flex items-start gap-3 rounded-lg border p-2" data-entry={entry.id}>
              {entry.image ? <Picture src={entry.image} alt="" className="size-12 rounded object-cover" /> : null}
              <div className="flex flex-1 flex-col gap-1">
                <p className="font-medium">{entry.title}</p>
                {entry.text ? <p className="text-sm text-muted-foreground">{entry.text}</p> : null}
                <ChoiceList choices={entry.actions} />
              </div>
            </li>
          ))}
        </ul>
      )
    case 'plugin': {
      const Renderer = sections[section.plugin]
      return Renderer ? <Renderer data={view.plugins[section.plugin]} with={section.with} /> : null
    }
    case 'panel': {
      const Panel = panels[section.panel]
      return Panel ? <Panel data={section.data} /> : null
    }
  }
}

/** A device, open: its home screen of apps, or the app that is open, with a way back. */
export function DeviceScreen({ device }: { device: DeviceView }) {
  const { send } = useGame()
  const words = useWords()
  if (device.open) {
    return (
      <div className="flex flex-col gap-3" data-app={device.open.id}>
        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" aria-label={words('back')} onClick={() => send({ type: 'custom', name: 'devices/close', with: { device: device.id } })}>
            <ArrowLeftIcon />
          </Button>
          <h3 className="font-semibold">{device.open.name}</h3>
        </div>
        {device.open.sections.map((section, index) => (
          <AppSection key={index} section={section} />
        ))}
      </div>
    )
  }
  return (
    <div
      className="grid grid-cols-4 gap-3 bg-cover bg-center p-2"
      style={device.wallpaper ? { backgroundImage: `url(${assetUrl(device.wallpaper)})` } : undefined}
    >
      {device.apps.map((app) => (
        <button
          key={app.id}
          type="button"
          className={cn('relative flex flex-col items-center gap-1 rounded-lg p-2 text-xs hover:bg-accent', app.disabled && 'opacity-50')}
          disabled={Boolean(app.disabled)}
          title={app.disabled}
          onClick={() => send(app.command)}
          data-open-app={app.id}
        >
          <span className="flex size-10 items-center justify-center rounded-xl bg-secondary font-semibold" data-icon={app.icon}>
            {app.name.slice(0, 1)}
          </span>
          {app.name}
          <AppBadge badge={app.badge} />
        </button>
      ))}
    </div>
  )
}

/** A device in a dialog, drawn in its frame (`data-frame` for the theme to style a phone or a laptop). */
export function DeviceDialog({ deviceId, onClose }: { deviceId: string | null; onClose: () => void }) {
  const device = useDevices().find((entry) => entry.id === deviceId)
  return (
    <Dialog open={Boolean(device)} onOpenChange={(open) => (open ? undefined : onClose())}>
      {device ? (
        <DialogContent data-frame={device.frame} className={cn(device.frame === 'phone' && 'max-w-sm')}>
          <DialogTitle>{device.name}</DialogTitle>
          <DialogDescription className="sr-only">{device.name}</DialogDescription>
          <DeviceScreen device={device} />
        </DialogContent>
      ) : null}
    </Dialog>
  )
}
