/**
 * @ifloom/plugin-devices/react: the devices plugin's React UI, for a game drawn
 * with `@ifloom/react`. List `devicesUi` in the game's
 * `plugins` to have a button for each device in the side column and each
 * app with news in the notice strip; or draw them yourself from
 * `useDevices`. An app's plugin section is drawn by that plugin's UI, by its
 * id, so list the messages and feed UIs too.
 */
import type { DevicesView, DeviceView, SectionView } from '../index.ts'
import { useState, type ComponentProps } from 'react'
import {
  assetUrl,
  badgeVariants,
  buttonVariants,
  ChoiceList,
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  Icon,
  overridable,
  type Override,
  Picture,
  type PluginUi,
  useDialogParts,
  useGame,
  useKitPart,
  usePart,
  useWords,
} from '@ifloom/react'

declare module '@ifloom/react' {
  interface OverridableComponents {
    DeviceButtons: Override<ComponentProps<typeof DeviceButtons>>
    AppSection: Override<ComponentProps<typeof AppSection>>
    DeviceScreen: Override<ComponentProps<typeof DeviceScreen>>
    DeviceDialog: Override<ComponentProps<typeof DeviceDialog>>
    DeviceStrip: Override<ComponentProps<typeof DeviceStrip>>
  }
  interface PartNames {
    'app': true
    'app-back': true
    'app-button': true
    'app-entries': true
    'app-entry': true
    'app-entry-image': true
    'app-entry-text': true
    'app-entry-title': true
    'app-header': true
    'app-icon': true
    'app-launcher': true
    'app-prose': true
    'app-title': true
    'device-badge': true
    'device-button': true
    'device-screen': true
    'devices': true
    'app-badge': true
  }
}

/** The devices in the view (an empty list when the game has no devices plugin). */
export type DevicesState = DeviceView[]

/** The devices in the view, if the game has the devices plugin. */
export function useDevices(): DevicesState {
  const { view } = useGame()
  return (view.plugins.devices as DevicesView | undefined)?.devices ?? []
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
  const button = useKitPart('opener', 'device-button', buttonVariants({ variant: 'outline', size: 'sm' }))
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
  switch (section.type) {
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
      return Panel ? <Panel data={section.with} /> : null
    }
  }
}

/** One section of an open app, drawn by kind; a plugin section by that plugin's renderer. */
export const AppSection = overridable('AppSection', AppSectionImpl)

/** The home screen's grid: four apps to a row, over the wallpaper, if any, covering it. */
const LAUNCHER = { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', backgroundSize: 'cover', backgroundPosition: 'center' } as const

function DeviceScreenImpl({ device }: { device: DeviceView }) {
  const { send } = useGame()
  const words = useWords()
  const screen = usePart('device-screen', '')
  const app = usePart('app', 'flex flex-col gap-3')
  const header = usePart('app-header', 'flex items-center gap-2')
  const back = usePart('app-back', buttonVariants({ variant: 'ghost', size: 'icon' }))
  const title = usePart('app-title', 'font-heading font-semibold')
  const launcher = usePart('app-launcher', 'grid gap-3 p-2')
  const appButton = usePart('app-button', 'relative flex flex-col items-center gap-1 rounded-lg p-2 text-xs hover:bg-accent')
  const appButtonOff = usePart('app-button', 'relative flex flex-col items-center gap-1 rounded-lg p-2 text-xs hover:bg-accent opacity-70')
  const icon = usePart('app-icon', 'flex size-10 items-center justify-center rounded-xl bg-secondary font-semibold')
  const badge = usePart(
    'app-badge',
    'absolute -top-2 -right-2 flex items-center justify-center rounded-full bg-destructive px-1.5 text-xs font-bold text-destructive-foreground',
  )
  if (device.open) {
    return (
      <div {...screen}>
        <div {...app} data-app={device.open.id}>
          <div {...header}>
            <button type="button" {...back} aria-label={words('back')} onClick={() => send({ type: 'custom', name: 'devices/close', with: { id: device.id } })}>
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
      <div {...launcher} style={{ ...LAUNCHER, ...(device.wallpaper ? { backgroundImage: `url(${assetUrl(device.wallpaper)})` } : {}) }}>
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
  const { dialog, overlay, title, close } = useDialogParts(device?.frame === 'phone' ? 'max-w-sm' : undefined)
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

function DeviceStripImpl() {
  const { send } = useGame()
  const words = useWords()
  const devices = useDevices()
  const device = useDevice()
  const item = usePart('notice-strip-item', buttonVariants({ size: 'sm', variant: 'outline' }))
  const badge = usePart('badge', badgeVariants())
  // Each app with a badge, on any device: the button opens the device on that app.
  const apps = devices.flatMap((entry) => entry.apps.filter((app) => app.badge && !app.disabled).map((app) => ({ device: entry, app })))
  // The device stays open once the news is read.
  if (!apps.length && !device.openId) return null
  return (
    <>
      {apps.map(({ device: entry, app }) => (
        <button
          key={`${entry.id}/${app.id}`}
          type="button"
          {...item}
          data-strip={`${entry.id}/${app.id}`}
          onClick={() => {
            device.open(entry.id)
            send(app.command)
          }}
        >
          {app.name}
          {typeof app.badge === 'number' ? <span {...badge}>{app.badge}</span> : <span {...badge} aria-label={words('unread')} />}
        </button>
      ))}
      <DeviceDialog deviceId={device.openId} onClose={device.close} />
    </>
  )
}

/**
 * Each app with news on the game's devices, as a count in the `NoticeStrip`:
 * a button that opens the device on that app. The devices UI puts it at the
 * strip's `strip` spot.
 */
export const DeviceStrip = overridable('DeviceStrip', DeviceStripImpl)

/**
 * The devices plugin's React UI, for `plugins` on `mountGame` or
 * `GameProvider`: the `DeviceButtons` in the side column, and each app with
 * news in the `NoticeStrip`. An app's plugin sections are drawn by the UI of
 * the plugin they name, such as `messagesUi` and `feedUi`.
 */
export const devicesUi: PluginUi = {
  id: 'devices',
  layout: { sidebar: [() => <DeviceButtons />], strip: [() => <DeviceStrip />] },
}
