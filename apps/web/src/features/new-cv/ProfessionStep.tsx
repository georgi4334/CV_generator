import { PROFESSION_IDS, PROFESSIONS } from '@cv/shared'
import {
  Briefcase,
  CodeXml,
  GraduationCap,
  Megaphone,
  PenTool,
  Stethoscope,
  type LucideIcon,
} from 'lucide-react'
import { card } from '../../components/PageHeader'
import { OTHER_PROFESSION, type ProfessionChoice } from './wizardParams'

const ICONS: Record<ProfessionChoice, LucideIcon> = {
  'software-developer': CodeXml,
  designer: PenTool,
  'sales-marketing': Megaphone,
  healthcare: Stethoscope,
  academic: GraduationCap,
  [OTHER_PROFESSION]: Briefcase,
}

const CHOICES: Array<{ id: ProfessionChoice; name: string; description: string }> = [
  ...PROFESSION_IDS.map((id) => PROFESSIONS[id]),
  {
    id: OTHER_PROFESSION,
    name: 'Other',
    description: 'Any other job. Start from a general layout.',
  },
]

export function ProfessionStep({ onChoose }: { onChoose: (choice: ProfessionChoice) => void }) {
  return (
    <ul aria-label="Professions" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {CHOICES.map(({ id, name, description }) => {
        const Icon = ICONS[id]
        return (
          <li key={id}>
            <button
              type="button"
              onClick={() => onChoose(id)}
              className={`${card} flex h-full w-full items-start gap-3 p-4 text-left transition-colors hover:border-teal-500 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-600 dark:hover:border-teal-500`}
            >
              <span className="rounded-lg bg-teal-50 p-2 text-teal-700 dark:bg-teal-950 dark:text-teal-300">
                <Icon className="size-5" aria-hidden />
              </span>
              <span>
                <span className="block font-medium">{name}</span>
                <span className="mt-0.5 block text-sm text-slate-500 dark:text-slate-400">
                  {description}
                </span>
              </span>
            </button>
          </li>
        )
      })}
    </ul>
  )
}
