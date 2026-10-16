import type { BaseLayoutProps } from 'fumadocs-ui/layouts/shared'
import { appName, repoUrl } from './shared'

export function baseOptions(): BaseLayoutProps {
  return {
    nav: { title: appName, url: '/' },
    githubUrl: repoUrl,
    links: [{ text: 'Changelog', url: '/docs/changelog', active: 'url' }],
  }
}
