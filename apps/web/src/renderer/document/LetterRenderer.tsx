import { letterTemplateFor, type CoverLetterDocument } from '@cv/shared'
import { Plus } from 'lucide-react'
import type { ReactNode } from 'react'
import { useTranslation } from 'react-i18next'
import { RenderContext, useEditor, useRender, type RenderMode } from '@/renderer/context'
import { HeaderControls } from '@/renderer/editing/controls'
import type { EditorApi } from '@/renderer/editing/editorApi'
import { backgroundStyle } from '@/renderer/templates/backgrounds'
import { WithCornerPhoto } from '@/renderer/templates/headers'
import { placePhoto } from '@/renderer/templates/photo'
import { pageStyle, SOLID_SIDEBAR_VARS } from '@/renderer/templates/pageStyle'
import { usePlaceholders, type Placeholders } from '@/renderer/placeholders'
import { Field } from '@/renderer/editing/primitives'
import { getTemplate } from '@/renderer/templates/templates'
import { layoutTokens } from '@/renderer/templates/tokens'

/** Letter-only edits: paragraphs are added and removed like CV bullets. */
export interface LetterActions {
  addParagraph: (afterIndex: number) => void
  removeParagraph: (index: number) => void
}

/** Opening first, closing last, "why you" and more in between, however many there are. */
function paragraphHint(P: Placeholders, index: number, count: number) {
  const [opening, whyYou, closing] = P.paragraphs
  if (index === 0) return opening!
  if (index === count - 1) return closing!
  return index === 1 ? whyYou! : P.paragraph
}

/** The letter's paragraphs, editable in place; `hint` is the grey text of an empty one. */
export function Paragraphs({
  paragraphs,
  actions,
  hint,
}: {
  paragraphs: string[]
  actions?: LetterActions
  hint?: (index: number, count: number) => string
}) {
  const P = usePlaceholders()
  const editor = useEditor()
  const { t } = useTranslation()
  const { mode } = useRender()
  return (
    <div className="flex flex-col gap-[0.8em]">
      {paragraphs.map((text, index) =>
        mode === 'preview' && !text.trim() ? null : (
          // Re-mount when paragraphs are added or removed, so the new one takes the focus.
          <p key={`${index}/${paragraphs.length}`} className="m-0">
            <Field
              value={text}
              path={`paragraphs.${index}`}
              placeholder={
                hint ? hint(index, paragraphs.length) : paragraphHint(P, index, paragraphs.length)
              }
              className="block"
              onEnter={actions ? () => actions.addParagraph(index) : undefined}
              onBackspaceEmpty={
                actions && paragraphs.length > 1 ? () => actions.removeParagraph(index) : undefined
              }
            />
          </p>
        ),
      )}
      {editor && actions && (
        <button
          type="button"
          onClick={() => actions.addParagraph(paragraphs.length - 1)}
          className="inline-flex w-fit items-center gap-1 rounded px-1 text-[0.85em] hover:bg-[var(--cv-hover)]"
          style={{ color: 'var(--cv-accent-text)' }}
        >
          <Plus className="size-[1em]" aria-hidden /> {t('renderer.addParagraph')}
        </button>
      )}
    </div>
  )
}

/**
 * A cover letter as one page (it grows if the text is longer): the header of
 * the chosen template, so letter and CV look alike, then the letter itself.
 */
export function LetterRenderer({
  letter,
  mode,
  editor,
  actions,
  pageClassName,
  hidePersonal = false,
  staticLinks = false,
}: {
  letter: CoverLetterDocument
  mode: RenderMode
  /** Makes the letter editable in place (edit mode only). */
  editor?: EditorApi
  actions?: LetterActions
  pageClassName?: string
  /** Blur the stand-ins of a share link that hides personal details. */
  hidePersonal?: boolean
  /** Draw links as plain text, for thumbnails that are themselves a link. */
  staticLinks?: boolean
}) {
  const { t } = useTranslation()
  const { design, header, recipient } = letter
  const template = getTemplate(letterTemplateFor(design.templateId))
  const tokens = layoutTokens(design)
  const { margin } = tokens
  const { Header } = template
  const banded = template.headerPlacement === 'full' && template.headerBand
  // A letter has no sidebar: a corner photo sits beside the header.
  const photo = placePhoto(header, { ...template, columns: 1 })
  const context = {
    mode,
    language: letter.language,
    titleVariant: template.titleVariant,
    inlineSkills: false,
    timeline: false,
    measuring: false,
    hidePersonal,
    staticLinks,
    editor: editor ?? null,
  }

  return (
    <RenderContext.Provider value={context}>
      <LetterPlaceholders>
        {(P) => (
          <div
            role="document"
            aria-label={t('labels.documentType.coverLetter')}
            className="flex flex-col"
          >
            <div
              data-letter-page={design.pageSize}
              className={`relative flex flex-col bg-paper wrap-anywhere ${pageClassName ?? ''}`}
              style={{
                ...pageStyle(design, tokens),
                ...backgroundStyle(design.background, design.accentColor),
                minHeight: tokens.page.height,
              }}
            >
              <div
                style={{
                  paddingTop: margin,
                  paddingBottom: Math.round(margin * 0.7),
                  // Banded templates color the whole top of the page; others draw a rule.
                  ...(banded
                    ? {
                        ...SOLID_SIDEBAR_VARS,
                        paddingLeft: margin,
                        paddingRight: margin,
                        background: design.accentColor,
                        color: 'var(--cv-text)',
                      }
                    : {
                        marginLeft: margin,
                        marginRight: margin,
                        borderBottom: '1px solid var(--cv-rule)',
                      }),
                }}
              >
                <HeaderControls hasPhoto={header.showPhoto && header.photoUrl !== null}>
                  <WithCornerPhoto photo={header} corner={photo.corner}>
                    <Header header={photo.header} />
                  </WithCornerPhoto>
                </HeaderControls>
              </div>

              <div
                className="flex flex-1 flex-col gap-[1.4em]"
                style={{ padding: `${Math.round(margin * 0.8)}px ${margin}px ${margin}px` }}
              >
                <div className="text-right" style={{ color: 'var(--cv-muted)' }}>
                  <Field value={letter.date} path="date" placeholder={P.letterDate} />
                </div>
                <div className="flex flex-col">
                  <Field
                    value={recipient.name}
                    path="recipient.name"
                    placeholder={P.recipientName}
                    className="font-semibold"
                    style={{ color: 'var(--cv-strong)' }}
                  />
                  <Field
                    value={recipient.title}
                    path="recipient.title"
                    placeholder={P.recipientTitle}
                  />
                  <Field
                    value={recipient.company}
                    path="recipient.company"
                    placeholder={P.recipientCompany}
                  />
                  <Field
                    value={recipient.address}
                    path="recipient.address"
                    placeholder={P.recipientAddress}
                    multiline
                    style={{ color: 'var(--cv-muted)' }}
                  />
                </div>
                <Field
                  value={letter.greeting}
                  path="greeting"
                  placeholder={P.greeting}
                  className="block"
                />
                <Paragraphs paragraphs={letter.paragraphs} actions={actions} />
                <div className="flex flex-col">
                  <Field value={letter.closing} path="closing" placeholder={P.closing} />
                  <Field
                    value={letter.signature}
                    path="signature"
                    placeholder={P.signature}
                    className="mt-[1.6em] text-[1.15em] font-semibold"
                    style={{ color: 'var(--cv-accent-text)' }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}
      </LetterPlaceholders>
    </RenderContext.Provider>
  )
}

/** Gives the body the placeholders of the letter language (they need the render context). */
function LetterPlaceholders({
  children,
}: {
  children: (P: ReturnType<typeof usePlaceholders>) => ReactNode
}) {
  return <>{children(usePlaceholders())}</>
}
