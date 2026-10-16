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
import { useFetchSearch } from 'fumadocs-core/search/client'
import { usePathname } from 'next/navigation'

// Asks the server's /api/search, the default address.
export default function DocsSearchDialog(props: SharedProps) {
  // Search the version being read: /docs/0.1.0/… searches 0.1.0, anything else the latest.
  const version = usePathname().match(/^\/docs\/(\d+\.\d+\.\d+[^/]*)/)?.[1] ?? 'latest'
  const search = useFetchSearch({ tag: version })

  return (
    <SearchDialog {...search} {...props}>
      <SearchDialogOverlay className="ifl-search-overlay" />
      <SearchDialogContent className="ifl-search">
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
