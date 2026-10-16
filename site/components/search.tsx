'use client'
import {
  SearchDialog,
  SearchDialogClose,
  SearchDialogContent,
  SearchDialogHeader,
  SearchDialogIcon,
  SearchDialogInput,
  SearchDialogList,
  SearchDialogOverlay,
  type SharedProps,
} from 'fumadocs-ui/components/dialog/search'
import { useStaticSearch } from 'fumadocs-core/search/client'
import { usePathname } from 'next/navigation'
import { basePath } from '@/lib/shared'

// The search index is a static file written at build time. Next doesn't add
// the base path to it, so it's given in full.
export default function DocsSearchDialog(props: SharedProps) {
  // Search the version being read: /docs/0.1.0/… searches 0.1.0, anything else the latest.
  const version = usePathname().match(/^\/docs\/(\d+\.\d+\.\d+[^/]*)/)?.[1] ?? 'latest'
  const search = useStaticSearch({ from: `${basePath}/api/search`, tag: version })

  return (
    <SearchDialog {...search} {...props}>
      <SearchDialogOverlay />
      <SearchDialogContent>
        <SearchDialogHeader>
          <SearchDialogIcon />
          <SearchDialogInput />
          <SearchDialogClose />
        </SearchDialogHeader>
        <SearchDialogList />
      </SearchDialogContent>
    </SearchDialog>
  )
}
