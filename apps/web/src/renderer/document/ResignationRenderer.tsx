import type { ResignationDocument } from '@cv/shared'
import { useTranslation } from 'react-i18next'
import { RenderContext, useRender, type RenderMode } from '@/renderer/context'
import type { EditorApi } from '@/renderer/editing/editorApi'
import { Field } from '@/renderer/editing/primitives'
import { usePlaceholders } from '@/renderer/placeholders'
import { backgroundStyle } from '@/renderer/templates/backgrounds'
import { pageStyle } from '@/renderer/templates/pageStyle'
import { getTemplate } from '@/renderer/templates/templates'
import { layoutTokens } from '@/renderer/templates/tokens'
import { Paragraphs, type LetterActions } from './LetterRenderer'

/** True when a block has text, or the letter is being edited (empty fields show hints). */
function useShown(...values: string[]) {
  const { mode } = useRender()
  return mode === 'edit' || values.some((value) => value.trim())
}

function Sender({ letter }: { letter: ResignationDocument }) {
  const P = usePlaceholders()
  const { sender } = letter
  if (!useShown(sender.name, sender.residence, sender.phone, sender.email)) return null
  return (
    <div className="flex flex-col">
      <Field
        value={sender.name}
        path="sender.name"
        placeholder={P.senderName}
        className="text-[1.15em] font-semibold"
        style={{ color: 'var(--cv-strong)' }}
      />
      <Field
        value={sender.residence}
        path="sender.residence"
        placeholder={P.senderResidence}
        style={{ color: 'var(--cv-muted)' }}
      />
      <Field
        value={sender.phone}
        path="sender.phone"
        placeholder={P.senderPhone}
        style={{ color: 'var(--cv-muted)' }}
      />
      <Field
        value={sender.email}
        path="sender.email"
        placeholder={P.senderEmail}
        style={{ color: 'var(--cv-muted)' }}
      />
    </div>
  )
}

function Employer({ letter }: { letter: ResignationDocument }) {
  const P = usePlaceholders()
  const { employer } = letter
  const lines = useShown(
    employer.company,
    employer.contact,
    employer.address,
    employer.postalCode,
    employer.city,
  )
  const place = useShown(employer.postalCode, employer.city)
  if (!lines) return null
  return (
    <div className="flex flex-col">
      <Field
        value={employer.company}
        path="employer.company"
        placeholder={P.employerCompany}
        className="font-semibold"
        style={{ color: 'var(--cv-strong)' }}
      />
      <Field value={employer.contact} path="employer.contact" placeholder={P.employerContact} />
      <Field
        value={employer.address}
        path="employer.address"
        placeholder={P.employerAddress}
        style={{ color: 'var(--cv-muted)' }}
      />
      {place && (
        <span className="flex flex-wrap gap-x-[0.4em]" style={{ color: 'var(--cv-muted)' }}>
          <Field
            value={employer.postalCode}
            path="employer.postalCode"
            placeholder={P.employerPostalCode}
          />
          <Field value={employer.city} path="employer.city" placeholder={P.employerCity} />
        </span>
      )}
    </div>
  )
}

function resignationHint(P: ReturnType<typeof usePlaceholders>) {
  return (index: number) => (index === 0 ? P.resignationOpening : P.resignationParagraph)
}

/**
 * A resignation letter as one formal page (it grows if the text is longer):
 * who is leaving, the date, who receives it, the subject, then the letter.
 * It takes the CV's fonts, size and colours.
 */
export function ResignationRenderer({
  letter,
  mode,
  editor,
  actions,
  pageClassName,
  hidePersonal = false,
  staticLinks = false,
}: {
  letter: ResignationDocument
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
  const { design } = letter
  const template = getTemplate(design.templateId)
  const tokens = layoutTokens(design)
  const { margin } = tokens
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
      <ResignationBody
        letter={letter}
        actions={actions}
        label={t('labels.documentType.resignation')}
        className={pageClassName}
        style={{
          ...pageStyle(design, tokens),
          ...backgroundStyle(design.background, design.accentColor),
          minHeight: tokens.page.height,
          padding: margin,
        }}
      />
    </RenderContext.Provider>
  )
}

/** The body needs the render context (placeholders follow the letter's language). */
function ResignationBody({
  letter,
  actions,
  label,
  className,
  style,
}: {
  letter: ResignationDocument
  actions?: LetterActions
  label: string
  className?: string
  style: React.CSSProperties
}) {
  const P = usePlaceholders()
  return (
    <div role="document" aria-label={label} className="flex flex-col">
      <div
        data-letter-page={letter.design.pageSize}
        className={`relative flex flex-col gap-[1.6em] bg-paper wrap-anywhere ${className ?? ''}`}
        style={style}
      >
        <div
          className="flex flex-wrap items-start justify-between gap-x-[2em] gap-y-[0.8em] pb-[1.2em]"
          style={{ borderBottom: `2px solid ${letter.design.accentColor}` }}
        >
          <Sender letter={letter} />
          <span className="ml-auto text-right" style={{ color: 'var(--cv-muted)' }}>
            <Field value={letter.date} path="date" placeholder={P.letterDate} />
          </span>
        </div>
        <Employer letter={letter} />
        <Field
          value={letter.subject}
          path="subject"
          placeholder={P.resignationSubject}
          className="block text-[1.1em] font-semibold"
          style={{ color: 'var(--cv-strong)' }}
        />
        <Field
          value={letter.greeting}
          path="greeting"
          placeholder={P.resignationGreeting}
          className="block"
        />
        <Paragraphs paragraphs={letter.paragraphs} actions={actions} hint={resignationHint(P)} />
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
  )
}
