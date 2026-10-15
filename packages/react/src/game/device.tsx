import type { Command, RenderedChoice } from '@ifloom/engine'
import { useState } from 'react'
import { badgeVariants } from '../components/ui/badge.tsx'
import { buttonVariants } from '../components/ui/button.tsx'
import { Dialog, DialogContent, DialogDescription, DialogTitle } from '../components/ui/dialog.tsx'
import { ChoiceList } from './choices.tsx'
import { useGame } from './context.tsx'
import { assetUrl } from './assets.ts'
import { Icon } from './icon.tsx'
import { overridable, usePart } from './overrides.tsx'
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

/** The devices in the view (an empty list when the game has no devices plugin). */
export type DevicesState = DeviceView[]

/** The devices in the view, if the game has the devices plugin. */
export function useDevices(): DevicesState {
  const { view } = useGame()
  return (view.plugins.devices as { devices: DeviceView[] } | undefined)?.devices ?? []
}

/** Which device is open in a dialog, if any, and how to open and close one. */
export type DeviceState = {
  /** The open device's id, or `null`. */
  openId: string | null
  /** The open device as the view has it, or `null` (also when the id no longer names one). */
  device: DeviceView | null
  open: (id: string) => void
  close: () => void
}

/** Which device is open, for a button row and the dialog that shows it. Each call keeps its own. */
export function useDevice(): DeviceState {
  const devices = useDevices()
  const [openId, setOpenId] = useState<string | null>(null)
  return {
    openId,
    device: devices.find((entry) => entry.id === openId) ?? null,
    open: setOpenId,
    close: () => setOpenId(null),
  }
}

function DeviceButtonsImpl() {
  const devices = useDevices().filter((device) => device.sidebar)
  const { openId, open, close } = useDevice()
  const row = usePart('devices', 'flex gap-2')
  const button = usePart('device-button', buttonVariants({ variant: 'outline', size: 'sm' }))
  const badge = usePart('device-badge', badgeVariants())
  if (!devices.length) return null
  return (
    <div {...row}>
      {devices.map((device) => (
        <button key={device.id} type="button" {...button} onClick={() => open(device.id)} data-device={device.id}>
          {device.name}
          {device.badge ? <span {...badge}>{device.badge}</span> : null}
        </button>
      ))}
      <DeviceDialog deviceId={openId} onClose={close} />
    </div>
  )
}

/** The sidebar's device buttons, each with its badge; a button opens the device. */
export const DeviceButtons = overridable('DeviceButtons', DeviceButtonsImpl)

function AppSectionImpl({ section }: { section: SectionView }) {
  const { view, panels, sections } = useGame()
  const prose = usePart('app-prose', 'leading-relaxed whitespace-pre-wrap')
  const entries = usePart('app-entries', 'flex flex-col gap-2')
  const entry = usePart('app-entry', 'flex items-start gap-3 rounded-lg border p-2')
  const image = usePart('app-entry-image', 'size-12 rounded object-cover')
  const title = usePart('app-entry-title', 'font-medium')
  const text = usePart('app-entry-text', 'text-sm text-muted-foreground')
  switch (section.kind) {
    case 'prose':
      return <p {...prose}>{section.text}</p>
    case 'actions':
      return <ChoiceList choices={section.actions} />
    case 'list':
      return (
        <ul {...entries}>
          {section.entries.map((item) => (
            <li key={item.id} {...entry} data-entry={item.id}>
              {item.image ? <Picture {...image} src={item.image} alt="" /> : null}
              <div className="flex flex-1 flex-col gap-1">
                <p {...title}>{item.title}</p>
                {item.text ? <p {...text}>{item.text}</p> : null}
                <ChoiceList choices={item.actions} />
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

/** One section of an open app, drawn by kind; a plugin section by that plugin's renderer. */
export const AppSection = overridable('AppSection', AppSectionImpl)

function DeviceScreenImpl({ device }: { device: DeviceView }) {
  const { send } = useGame()
  const words = useWords()
  const screen = usePart('device-screen', '')
  const app = usePart('app', 'flex flex-col gap-3')
  const header = usePart('app-header', 'flex items-center gap-2')
  const back = usePart('app-back', buttonVariants({ variant: 'ghost', size: 'icon' }))
  const title = usePart('app-title', 'font-heading font-semibold')
  const launcher = usePart('app-launcher', 'grid grid-cols-4 gap-3 bg-cover bg-center p-2')
  const appButton = usePart('app-button', 'relative flex flex-col items-center gap-1 rounded-lg p-2 text-xs hover:bg-accent')
  const appButtonOff = usePart('app-button', 'relative flex flex-col items-center gap-1 rounded-lg p-2 text-xs hover:bg-accent opacity-50')
  const icon = usePart('app-icon', 'flex size-10 items-center justify-center rounded-xl bg-secondary font-semibold')
  const badge = usePart('app-badge', 'absolute -top-1 -right-1 flex min-w-5 items-center justify-center rounded-full bg-destructive px-1 text-[10px] font-bold text-destructive-foreground')
  if (device.open) {
    return (
      <div {...screen}>
        <div {...app} data-app={device.open.id}>
          <div {...header}>
            <button
              type="button"
              {...back}
              aria-label={words('back')}
              onClick={() => send({ type: 'custom', name: 'devices/close', with: { device: device.id } })}
            >
              <Icon name="back" />
            </button>
            <h3 {...title}>{device.open.name}</h3>
          </div>
          {device.open.sections.map((section, index) => (
            <AppSection key={index} section={section} />
          ))}
        </div>
      </div>
    )
  }
  return (
    <div {...screen}>
      <div {...launcher} style={device.wallpaper ? { backgroundImage: `url(${assetUrl(device.wallpaper)})` } : undefined}>
        {device.apps.map((entry) => (
          <button
            key={entry.id}
            type="button"
            {...(entry.disabled ? appButtonOff : appButton)}
            disabled={Boolean(entry.disabled)}
            title={entry.disabled}
            onClick={() => send(entry.command)}
            data-open-app={entry.id}
          >
            <span {...icon} data-icon={entry.icon}>
              {entry.name.slice(0, 1)}
            </span>
            {entry.name}
            {entry.badge ? <span {...badge}>{typeof entry.badge === 'number' ? entry.badge : ''}</span> : null}
          </button>
        ))}
      </div>
    </div>
  )
}

/** A device, open: its home screen of apps, or the app that is open, with a way back. */
export const DeviceScreen = overridable('DeviceScreen', DeviceScreenImpl)

function DeviceDialogImpl({ deviceId, onClose }: { deviceId: string | null; onClose: () => void }) {
  const words = useWords()
  const device = useDevices().find((entry) => entry.id === deviceId)
  const dialog = usePart(
    'dialog',
    'fixed top-1/2 left-1/2 z-50 grid w-full max-w-lg -translate-x-1/2 -translate-y-1/2 gap-4 rounded-lg border bg-background p-6 shadow-lg',
    device?.frame === 'phone' ? 'max-w-sm' : undefined,
  )
  const overlay = usePart('dialog-overlay', 'fixed inset-0 z-50 bg-black/50')
  const title = usePart('dialog-title', 'font-heading text-lg font-semibold leading-none')
  const close = usePart('dialog-close', 'absolute top-4 right-4 rounded-sm opacity-70 hover:opacity-100')
  return (
    <Dialog open={Boolean(device)} onOpenChange={(open) => (open ? undefined : onClose())}>
      {device ? (
        <DialogContent
          bare
          {...dialog}
          data-frame={device.frame}
          overlayProps={overlay}
          closeProps={close}
          closeIcon={<Icon name="close" />}
          closeLabel={words('close')}
        >
          <DialogTitle bare {...title}>
            {device.name}
          </DialogTitle>
          <DialogDescription className="sr-only">{device.name}</DialogDescription>
          <DeviceScreen device={device} />
        </DialogContent>
      ) : null}
    </Dialog>
  )
}

/** A device in a dialog, drawn in its frame (`data-frame` for the theme to style a phone or a laptop). */
export const DeviceDialog = overridable('DeviceDialog', DeviceDialogImpl)
