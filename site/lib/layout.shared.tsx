import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { appName, repoUrl } from './shared'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: <span className="ifl-mark">{appName}</span>, url: '/' },
    githubUrl: repoUrl,
    links: [{ text: 'Changelog', url: '/docs/changelog', active: 'url' }],
    // The site is dark only, so there is no light and dark switch.
    themeSwitch: { enabled: false },
  }
}
