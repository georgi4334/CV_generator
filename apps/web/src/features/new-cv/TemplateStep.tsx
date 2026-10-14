import {
  createExampleCv,
  PROFESSIONS,
  TEMPLATE_IDS,
  type CvDocument,
  type ProfessionId,
  type TemplateId,
} from '@cv/shared'
import { useId, useMemo } from 'react'
import { RecommendedBadge } from '../../components/Badges'
import { CvThumbnail, getTemplate, withTemplate } from '../../cv-renderer'
import { FALLBACK_EXAMPLE } from './buildNewCv'

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
  const headingId = useId()
  return (
    <section aria-labelledby={headingId}>
      <h2
        id={headingId}
        className="mb-3 text-sm font-semibold tracking-wide text-slate-500 uppercase dark:text-slate-400"
      >
        {title}
      </h2>
      <ul className="grid grid-cols-[repeat(auto-fill,minmax(200px,1fr))] gap-4">
        {ids.map((id) => (
          <li key={id}>
            <button
              type="button"
              onClick={() => onChoose(id)}
              className="flex w-full flex-col items-center gap-2 rounded-xl p-3 hover:bg-white hover:ring-2 hover:ring-teal-500 focus-visible:outline-2 focus-visible:outline-teal-600 dark:hover:bg-slate-900"
            >
              <CvThumbnail cv={withTemplate(sample, id)} width={180} />
              <span className="flex items-center gap-2 text-sm font-medium">
                {getTemplate(id).name}
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
  const sample = useMemo(() => createExampleCv(professionId ?? FALLBACK_EXAMPLE), [professionId])
  const recommended = professionId ? PROFESSIONS[professionId].recommendedTemplates : []
  const others = TEMPLATE_IDS.filter((id) => !recommended.includes(id))

  return (
    <div className="space-y-8">
      {professionId && (
        <TemplateGroup
          title={`Recommended for ${PROFESSIONS[professionId].name}`}
          ids={recommended}
          recommended
          sample={sample}
          onChoose={onChoose}
        />
      )}
      <TemplateGroup
        title={professionId ? 'More templates' : 'All templates'}
        ids={others}
        sample={sample}
        onChoose={onChoose}
      />
      <p className="text-xs text-slate-500 dark:text-slate-400">Previews show sample content.</p>
    </div>
  )
}
