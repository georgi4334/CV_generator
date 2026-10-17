import { PHOTO_SHAPES } from '@cv/shared'
import { ImagePlus, Trash2, UserRound } from 'lucide-react'
import { useId, useState, type DragEvent } from 'react'
import { useTranslation } from 'react-i18next'
import { cvApi } from '@/features/cv-editor/api'
import { useDesignTarget } from '@/features/cv-editor/state/designTarget'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { PHOTO_MAX_SIZE, pickImage, resizeImage } from '@/renderer/editing/image'
import { PHOTO_SHAPE_CLASS } from '@/renderer/templates/photo'
import { assetUrl } from '@/shared/api/client'

/**
 * The photo on the CV or letter: upload (pick or drop an image), change or
 * remove it, show or hide it, and choose its shape. Uploads are resized in
 * the browser first.
 */
export function PhotoPicker() {
  const { t } = useTranslation()
  const { header, updateHeader } = useDesignTarget()
  const notify = useEditorUi((s) => s.notify)
  const [uploading, setUploading] = useState(false)
  const [dragging, setDragging] = useState(false)
  const switchId = useId()
  if (!header) return null

  const hasPhoto = header.photoUrl !== null
  const shape = header.photoShape ?? 'circle'

  const upload = async (image: Promise<Blob | null>) => {
    setUploading(true)
    try {
      const blob = await image
      if (!blob) return
      const { url } = await cvApi.uploadImage(blob)
      updateHeader({ photoUrl: url, showPhoto: true })
    } catch (error) {
      notify(t('renderer.photoFailed', { message: (error as Error).message }), 'error')
    } finally {
      setUploading(false)
    }
  }

  const onDrop = (event: DragEvent) => {
    event.preventDefault()
    setDragging(false)
    const file = event.dataTransfer.files[0]
    if (file) void upload(resizeImage(file, PHOTO_MAX_SIZE))
  }

  return (
    <section className="border-b border-line py-4 first:pt-0">
      <h3 className="mb-2 text-xs font-medium tracking-wide text-fg-muted uppercase">
        {t('design.photo.title')}
      </h3>
      <div className="flex items-start gap-4">
        <button
          type="button"
          // A bigger target for the mouse and for dropping files; the button beside it is the accessible one.
          aria-hidden
          tabIndex={-1}
          disabled={uploading}
          onClick={() => void upload(pickImage(PHOTO_MAX_SIZE))}
          onDragOver={(e) => {
            e.preventDefault()
            setDragging(true)
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={onDrop}
          className={`flex size-20 shrink-0 items-center justify-center overflow-hidden border-2 border-dashed bg-muted text-fg-muted transition-colors hover:border-brand-line hover:text-brand-fg disabled:opacity-60 ${
            hasPhoto ? 'border-transparent' : 'border-line-strong'
          } ${dragging ? 'border-brand-line bg-brand-soft' : ''} ${PHOTO_SHAPE_CLASS[shape]}`}
        >
          {header.photoUrl ? (
            <img
              src={assetUrl(header.photoUrl)}
              alt=""
              className={`size-full object-cover ${header.showPhoto ? '' : 'opacity-40'}`}
            />
          ) : (
            <UserRound className="size-8" aria-hidden />
          )}
        </button>

        <div className="min-w-0 flex-1 space-y-2">
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              className="btn btn-secondary btn-sm"
              disabled={uploading}
              onClick={() => void upload(pickImage(PHOTO_MAX_SIZE))}
            >
              <ImagePlus className="size-4" aria-hidden />
              {uploading
                ? t('design.photo.uploading')
                : hasPhoto
                  ? t('design.photo.change')
                  : t('design.photo.upload')}
            </button>
            {hasPhoto && (
              <button
                type="button"
                className="btn btn-ghost btn-sm"
                disabled={uploading}
                onClick={() => updateHeader({ photoUrl: null, showPhoto: false })}
              >
                <Trash2 className="size-4" aria-hidden />
                {t('design.photo.remove')}
              </button>
            )}
          </div>
          <p className="text-xs text-fg-muted">{t('design.photo.hint')}</p>
          {hasPhoto && (
            <div className="flex items-center justify-between gap-2">
              <span id={switchId} className="text-sm">
                {t('design.photo.show')}
              </span>
              <button
                type="button"
                role="switch"
                aria-checked={header.showPhoto}
                aria-labelledby={switchId}
                onClick={() => updateHeader({ showPhoto: !header.showPhoto })}
                className={`relative h-6 w-11 shrink-0 rounded-pill transition-colors ${
                  header.showPhoto ? 'bg-brand' : 'bg-line-strong'
                }`}
              >
                <span
                  className={`absolute top-0.5 left-0.5 size-5 rounded-pill bg-surface shadow transition-transform ${
                    header.showPhoto ? 'translate-x-5' : ''
                  }`}
                />
              </button>
            </div>
          )}
        </div>
      </div>

      <div
        role="radiogroup"
        aria-label={t('design.photo.shape')}
        className="mt-3 grid grid-cols-3 gap-2"
      >
        {PHOTO_SHAPES.map((option) => (
          <button
            key={option}
            type="button"
            role="radio"
            aria-checked={shape === option}
            onClick={() => updateHeader({ photoShape: option })}
            className={`flex items-center justify-center gap-2 rounded-control border px-2 py-1.5 text-sm transition-colors hover:bg-glass-hover ${
              shape === option
                ? 'border-brand-line bg-brand-soft text-brand-fg-strong'
                : 'border-line-strong text-fg-soft'
            }`}
          >
            <span aria-hidden className={`size-3.5 bg-current ${PHOTO_SHAPE_CLASS[option]}`} />
            {t(`design.photo.shapes.${option}`)}
          </button>
        ))}
      </div>
    </section>
  )
}
