import { Badge } from '@ifloom/react/kit'
import { useDevices } from '@ifloom/plugin-devices/react'

export function PhoneBadge() {
  const phone = useDevices().find((device) => device.id === 'phone')
  if (!phone) return null
  return <Badge>{phone.badge}</Badge>
}
