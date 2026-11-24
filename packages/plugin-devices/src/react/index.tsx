/**
 * @ifloom/plugin-devices/react: the devices plugin's React UI, for a game drawn
 * with `@ifloom/react`. List `devicesUi` in the game's
 * `plugins` to have a button for each device in the side column, each
 * app with news in the notice strip, and the device that's out in a dialog;
 * or draw them yourself from `useDevices`. Which device is out, and on what,
 * is the game's state, so every UI shows the same. An app's plugin section is
 * drawn by that plugin's UI, by its id, so list the messages and feed UIs too.
 */
import type { AppView, DeviceView, SectionView } from '../index.ts'
import { createContext, useContext, type ComponentProps, type ReactNode } from 'react'
import {
  assetUrl,
  badgeVariants,
  Beat,
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
  pluginKit,
  type PluginUi,
  useDialogParts,
  useGame,
  useKitPart,
  usePart,
  usePlugin,
} from '@ifloom/react'

/** The devices plugin's UI, declared once: its id, for `usePlugin` and `devicesUi`. */
const DEVICES = pluginKit('devices')

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
  return usePlugin(DEVICES).view?.devices ?? []
}

/** Which device is out, as the game's state has it, and how to bring one out and put it away. */
export type DeviceState = {
  /** The id of the device that's out, the first if more than one is, or `null`. */
  openId: string | null
  /** That device as the view has it, or `null`. */
  device: DeviceView | null
  /** Brings a device out on its home screen: sends its `home` button's command. */
  open: (id: string) => void
  /** Puts the device that's out away: sends its `close` button's command. */
  close: () => void
}

/** Which device is out, for a button row and the dialog that shows it. Every call reads the same, from the view. */
export function useDevice(): DeviceState {
  const { send } = usePlugin(DEVICES)
  const devices = useDevices()
  const device = devices.find((entry) => entry.shown) ?? null
  return {
    openId: device?.id ?? null,
    device,
    open: (id) => {
      const home = devices.find((entry) => entry.id === id)?.home
      if (home) send(home.command)
    },
    close: () => {
      if (device?.close) send(device.close.command)
    },
  }
}

function DeviceButtonsImpl() {
  const { send } = usePlugin(DEVICES)
  const devices = useDevices().filter((device) => device.sidebar)
  const row = usePart('devices', 'flex gap-2')
  const button = useKitPart('opener', 'device-button')
  const badge = usePart('device-badge', badgeVariants())
  if (!devices.length) return null
  return (
    <div {...row}>
      {devices.map((device) => (
        <button key={device.id} type="button" {...button} onClick={() => send(device.home.command)} data-device={device.id}>
          {device.name}
          {device.badge ? <span {...badge}>{device.badge}</span> : null}
        </button>
      ))}
    </div>
  )
}

/** The sidebar's device buttons, each with its badge; a button brings the device out on its home screen, and the `DeviceDialog` shows it. */
export const DeviceButtons = overridable('DeviceButtons', DeviceButtonsImpl)

function AppSectionImpl({ section }: { section: SectionView }) {
  const { view, panels, sections } = useGame()
  const prose = usePart('app-prose', 'flex flex-col gap-2 leading-relaxed')
  const entries = usePart('app-entries', 'flex flex-col gap-2')
  const entry = useKitPart('card', 'app-entry', 'flex-row items-start gap-3')
  const image = useKitPart('thumb', 'app-entry-image')
  const title = useKitPart('title', 'app-entry-title')
  const text = useKitPart('note', 'app-entry-text')
  switch (section.type) {
    case 'prose':
      return (
        <div {...prose}>
          {section.beats.map((beat, index) => (
            <Beat key={index} beat={beat} />
          ))}
        </div>
      )
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

/** The app being drawn, and its device. */
export type OpenAppState = { device: DeviceView; app: AppView }

const OpenApp = createContext<OpenAppState | null>(null)

/**
 * The app a section is drawn in, with all its sections, and its device; null
 * outside an open app. A `{ panel }` section's component gets only its `with`
 * as `data`, so it reads the app's other sections here: the buttons of an
 * `actions` section, to draw them on a card of its own.
 */
export function useOpenApp(): OpenAppState | null {
  return useContext(OpenApp)
}

/** The home screen's grid: four apps to a row, over the wallpaper, if any, covering it. */
const LAUNCHER = { gridTemplateColumns: 'repeat(4, minmax(0, 1fr))', backgroundSize: 'cover', backgroundPosition: 'center' } as const

function DeviceScreenImpl({ device }: { device: DeviceView }) {
  const { words, send } = usePlugin(DEVICES)
  const screen = usePart('device-screen', 'min-w-0')
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
            <button type="button" {...back} aria-label={words('back')} onClick={() => send(device.home.command)}>
              <Icon name="back" />
            </button>
            <h3 {...title}>{device.open.name}</h3>
          </div>
          <OpenApp.Provider value={{ device, app: device.open }}>
            {device.open.sections.map((section, index) => (
              <AppSection key={index} section={section} />
            ))}
          </OpenApp.Provider>
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

function DeviceDialogImpl({ deviceId, onClose }: { deviceId?: string | null; onClose?: () => void }) {
  const { words, send } = usePlugin(DEVICES)
  const devices = useDevices()
  // The device asked for while it's out, else the one that's out.
  const device = deviceId === undefined ? devices.find((entry) => entry.shown) : devices.find((entry) => entry.id === deviceId && entry.shown)
  const { dialog, overlay, title, close } = useDialogParts(device?.frame === 'phone' ? 'max-w-sm' : undefined)
  const putAway = () => {
    if (device?.close) send(device.close.command)
    onClose?.()
  }
  return (
    <Dialog open={Boolean(device)} onOpenChange={(open) => (open ? undefined : putAway())}>
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

/**
 * The device that's out, in a dialog, drawn in its frame (`data-frame` for
 * the theme to style a phone or a laptop); `deviceId` draws only that one.
 * Closing the dialog puts the device away, and calls `onClose` if given. The
 * devices UI draws one for the whole game.
 */
export const DeviceDialog = overridable('DeviceDialog', DeviceDialogImpl)

function DeviceStripImpl() {
  const { words, send } = usePlugin(DEVICES)
  const devices = useDevices()
  const item = usePart('notice-strip-item', buttonVariants({ size: 'sm', variant: 'outline' }))
  const badge = usePart('badge', badgeVariants())
  // Each app with a badge, on any device: the button opens that app, which brings its device out on it.
  const apps = devices.flatMap((entry) => entry.apps.filter((app) => app.badge && !app.disabled).map((app) => ({ device: entry, app })))
  if (!apps.length) return null
  return (
    <>
      {apps.map(({ device: entry, app }) => (
        <button key={`${entry.id}/${app.id}`} type="button" {...item} data-strip={`${entry.id}/${app.id}`} onClick={() => send(app.command)}>
          {app.name}
          {typeof app.badge === 'number' ? <span {...badge}>{app.badge}</span> : <span {...badge} aria-label={words('unread')} />}
        </button>
      ))}
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
 * `GameProvider`: the `DeviceButtons` in the side column, each app with
 * news in the `NoticeStrip`, and the `DeviceDialog` for the device that's
 * out. An app's plugin sections are drawn by the UI of the plugin they name,
 * such as `messagesUi` and `feedUi`.
 */
export const devicesUi: PluginUi = {
  ...DEVICES,
  layout: { sidebar: [() => <DeviceButtons />], strip: [() => <DeviceStrip />] },
  provider: DevicesProvider,
}

/** Draws the device that's out over the game, once, wherever its buttons are. */
function DevicesProvider({ children }: { children: ReactNode }) {
  return (
    <>
      {children}
      <DeviceDialog />
    </>
  )
}
