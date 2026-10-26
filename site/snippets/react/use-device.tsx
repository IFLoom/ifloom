import { useDevice } from '@ifloom/plugin-devices/react'

// Which device is out is the game's state: open brings the phone out, and the devices UI's DeviceDialog shows it.
export function OpenPhone() {
  const { openId, open, close } = useDevice()
  return openId ? <button onClick={close}>Put it away</button> : <button onClick={() => open('phone')}>Phone</button>
}
