import { PROFESSION_IDS } from '@cv/shared'
import {
  Briefcase,
  CodeXml,
  GraduationCap,
  Megaphone,
  PenTool,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { card } from '@/shared/ui/PageHeader'
import { OTHER_PROFESSION, type ProfessionChoice } from './wizardParams'

const ICONS: Record<ProfessionChoice, LucideIcon> = {
  'software-developer': CodeXml,
  designer: PenTool,
  'sales-marketing': Megaphone,
  healthcare: Stethoscope,
  academic: GraduationCap,
  [OTHER_PROFESSION]: Briefcase,
}

const CHOICES: ProfessionChoice[] = [...PROFESSION_IDS, OTHER_PROFESSION]

export function ProfessionStep({ onChoose }: { onChoose: (choice: ProfessionChoice) => void }) {
  const { t } = useTranslation()
  return (
    <ul aria-label={t('newCv.professions')} className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CHOICES.map((id) => {
        const name =
          id === OTHER_PROFESSION ? t('newCv.otherName') : t(`labels.profession.${id}.name`)
        const description =
          id === OTHER_PROFESSION
            ? t('newCv.otherDescription')
            : t(`labels.profession.${id}.description`)
        const Icon = ICONS[id]
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => onChoose(id)}
              className={`${card} flex h-full w-full items-start gap-3 p-4 text-left transition-colors hover:border-brand-line focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-line`}
            >
              <span className="rounded-control bg-brand-soft p-2 text-brand-fg">
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-medium">{name}</span>
                <span className="mt-0.5 block text-sm text-fg-muted">{description}</span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
