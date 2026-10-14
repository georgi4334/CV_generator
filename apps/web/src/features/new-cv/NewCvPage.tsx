import { PROFESSIONS } from '@cv/shared'
import { ArrowLeft, Check } from 'lucide-react'
import { Link, useSearchParams } from 'react-router'
import { PageHeader, secondaryButton } from '../../components/PageHeader'
import { getTemplate } from '../../cv-renderer'
import { ProfessionStep } from './ProfessionStep'
import { StartStep } from './StartStep'
import { TemplateStep } from './TemplateStep'
import {
  OTHER_PROFESSION,
  readWizard,
  toProfessionId,
  wizardParams,
  type ProfessionChoice,
  type WizardState,
} from './wizardParams'

const STEPS = ['Profession', 'Template', 'Start'] as const

const DESCRIPTIONS = [
  'What kind of job is this CV for? We will suggest templates and sections that fit.',
  'Pick a template. You can switch to another one at any time in the editor.',
  'Start from an example you can edit, or from an empty CV.',
]

const professionName = (choice: ProfessionChoice) =>
  choice === OTHER_PROFESSION ? 'Other' : PROFESSIONS[choice].name

function Stepper({
  step,
  choices,
  onSelect,
}: {
  step: number
  /** What was chosen in each completed step. */
  choices: Array<string | null>
  onSelect: (step: number) => void
}) {
  return (
    <ol aria-label="Steps" className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm">
      {STEPS.map((label, i) => {
        const done = i < step
        const content = (
          <>
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-full text-xs font-semibold ${
                i <= step
                  ? 'bg-teal-600 text-white'
                  : 'bg-slate-200 text-slate-600 dark:bg-slate-800 dark:text-slate-300'
              }`}
            >
              {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={i === step ? 'font-semibold' : ''}>{label}</span>
            {done && choices[i] && (
              <>
                {' '}
                <span className="text-slate-500 dark:text-slate-400">· {choices[i]}</span>
              </>
            )}
          </>
        )
        return (
          <li key={label} aria-current={i === step ? 'step' : undefined}>
            {done ? (
              <button
                type="button"
                onClick={() => onSelect(i)}
                className="flex items-center gap-2 rounded-md hover:text-teal-700 dark:hover:text-teal-300"
              >
                {content}
              </button>
            ) : (
              <span
                className={`flex items-center gap-2 ${i > step ? 'text-slate-500 dark:text-slate-400' : ''}`}
              >
                {content}
              </span>
            )}
          </li>
        )
      })}
    </ol>
  )
}

/** /cvs/new: choose a profession, then a template, then an example or a blank CV. */
export function NewCvPage() {
  const [params, setParams] = useSearchParams()
  const { profession, template } = readWizard(params)
  const step = !profession ? 0 : !template ? 1 : 2
  const go = (next: Partial<WizardState>) => setParams(wizardParams(next))
  const backTo = (target: number) => go(target === 0 ? {} : { profession: profession! })

  return (
    <>
      <PageHeader
        title="Create a new CV"
        description={DESCRIPTIONS[step]}
        actions={
          <div className="flex gap-2">
            {step > 0 && (
              <button type="button" onClick={() => backTo(step - 1)} className={secondaryButton}>
                <ArrowLeft className="size-4" /> Back
              </button>
            )}
            <Link to="/documents/cvs" className={secondaryButton}>
              Cancel
            </Link>
          </div>
        }
      />
      <Stepper
        step={step}
        choices={[profession && professionName(profession), template && getTemplate(template).name]}
        onSelect={backTo}
      />

      {!profession && <ProfessionStep onChoose={(choice) => go({ profession: choice })} />}
      {profession && !template && (
        <TemplateStep
          professionId={toProfessionId(profession)}
          onChoose={(id) => go({ profession, template: id })}
        />
      )}
      {profession && template && (
        <StartStep professionId={toProfessionId(profession)} templateId={template} />
      )}
    </>
  )
}
