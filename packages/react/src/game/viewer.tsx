import type { SceneBeat } from '@ifloom/engine'
import { Dialog, DialogContent, DialogTitle } from '../components/ui/dialog.tsx'
import { Icon } from './icon.tsx'
import { overridable, usePart } from './overrides.tsx'
import { Picture } from './picture.tsx'
import { Video } from './video.tsx'
import { useWords } from './words.ts'

/** A picture or video beat, which the media viewer shows large. */
export type ViewerMedia = Extract<SceneBeat, { type: 'image' } | { type: 'video' }>

/** The props of `MediaViewer`. */
export type MediaViewerProps = {
  /** The picture or video beat to show. */
  media: ViewerMedia
  /** True while the viewer is open. */
  open: boolean
  /** The function the viewer calls with false when the player closes it. */
  onOpenChange: (open: boolean) => void
}

function MediaViewerImpl({ media, open, onOpenChange }: MediaViewerProps) {
  const words = useWords()
  const viewer = usePart('viewer', 'fixed top-1/2 left-1/2 z-50 w-[min(94vw,64rem)] -translate-x-1/2 -translate-y-1/2 outline-none')
  const overlay = usePart('dialog-overlay', 'fixed inset-0 z-50 bg-black/80')
  const close = usePart(
    'viewer-close',
    'absolute -top-3 -right-3 inline-flex size-9 items-center justify-center rounded-full bg-background text-foreground shadow-md hover:bg-accent focus-visible:outline-2 focus-visible:outline-ring [&_svg]:size-5',
  )
  // A definite width: an SVG with no size of its own would otherwise shrink to nothing.
  const shown = 'block max-h-[88vh] w-full rounded-lg object-contain'
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        bare
        {...viewer}
        aria-describedby={undefined}
        overlayProps={overlay}
        closeProps={close}
        closeIcon={<Icon name="close" />}
        closeLabel={words('closeViewer')}
      >
        <DialogTitle className="sr-only">{media.alt || words('zoom')}</DialogTitle>
        {media.type === 'image' ? (
          <Picture className={shown} src={media.src} alt={media.alt ?? ''} />
        ) : (
          <Video
            className={shown}
            src={media.src}
            poster={media.poster}
            alt={media.alt}
            autoplay={media.autoplay}
            loop={media.loop}
            muted={media.muted}
            controls={media.controls}
          />
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Renders a picture or video from the story large over the page, as the `viewer` part. A `Beat` opens it when the
 * player clicks its picture or clip, and `viewer: false` turns it off.
 *
 * Escape, a click outside or the close button closes it.
 */
export const MediaViewer = overridable('MediaViewer', MediaViewerImpl)
