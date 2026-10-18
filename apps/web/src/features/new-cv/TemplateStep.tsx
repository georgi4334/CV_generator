import {
  createExampleCv,
  PROFESSIONS,
  TEMPLATE_CATEGORIES,
  TEMPLATE_IDS,
  templatesIn,
  type CvDocument,
  type ProfessionId,
  type TemplateId,
} from '@cv/shared'
import { useId, useMemo } from 'react'
import { useTranslation } from 'react-i18next'
import { RecommendedBadge } from '@/shared/ui/Badges'
import { CvThumbnail, withTemplate } from '@/renderer'
import { FALLBACK_EXAMPLE } from './buildNewCv'

/** Width in pixels of each template thumbnail. */
const TEMPLATE_THUMBNAIL_WIDTH = 180

function TemplateGroup({
  title,
  ids,
  recommended = false,
  sample,
  onChoose,
}: {
  title: string
  ids: readonly TemplateId[]
  recommended?: boolean
  sample: CvDocument
  onChoose: (id: TemplateId) => void
}) {
  const { t } = useTranslation()
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="mb-3 text-sm font-semibold tracking-wide text-fg-muted uppercase"
      >
        {title}
      </h2>
      <ul className="grid-templates">
        {ids.map((id) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onChoose(id)}
              className="flex w-full flex-col items-center gap-2 rounded-card p-3 hover:bg-surface hover:ring-2 hover:ring-brand-line focus-visible:outline-2 focus-visible:outline-brand-line"
            >
              <CvThumbnail cv={withTemplate(sample, id)} width={TEMPLATE_THUMBNAIL_WIDTH} />
              <span className="flex items-center gap-2 text-sm font-medium">
                {t(`labels.template.${id}`)}
                {recommended && (
                  <>
                    {' '}
                    <RecommendedBadge />
                  </>
                )}
              </span>
            </button>
          </li>
        ))}
      </ul>
    </section>
  )
}

export function TemplateStep({
  professionId,
  onChoose,
}: {
  professionId: ProfessionId | null
  onChoose: (id: TemplateId) => void
}) {
  const { t } = useTranslation()
  const sample = useMemo(() => createExampleCv(professionId ?? FALLBACK_EXAMPLE), [professionId])
  const recommended = professionId ? PROFESSIONS[professionId].recommendedTemplates : []
  const others = TEMPLATE_IDS.filter((id) => !recommended.includes(id))

  return (
    <div className="space-y-8">
      {professionId && (
        <TemplateGroup
          title={t('newCv.recommendedFor', {
            profession: t(`labels.profession.${professionId}.name`),
          })}
          ids={recommended}
          recommended
          sample={sample}
          onChoose={onChoose}
        />
      )}
      {/* The rest, grouped by the kind of work they suit. */}
      {TEMPLATE_CATEGORIES.map((category) => {
        const ids = templatesIn(category, others)
        return ids.length === 0 ? null : (
          <TemplateGroup
            key={category}
            title={t(`labels.templateCategory.${category}`)}
            ids={ids}
            sample={sample}
            onChoose={onChoose}
          />
        )
      })}
      <p className="text-xs text-fg-muted">{t('newCv.previewsNote')}</p>
    </div>
  )
}
