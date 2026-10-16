import { ArrowLeft, Check } from 'lucide-react'
import { useTranslation } from 'react-i18next'
import { Link, useSearchParams } from 'react-router'
import { PageHeader, secondaryButton } from '@/shared/ui/PageHeader'
import { ProfessionStep } from './ProfessionStep'
import { StartStep } from './StartStep'
import { TemplateStep } from './TemplateStep'
import {
  OTHER_PROFESSION,
  readWizard,
  toProfessionId,
  wizardParams,
  type WizardState,
} from './wizardParams'

const STEPS = ['stepProfession', 'stepTemplate', 'stepStart'] as const
const DESCRIPTIONS = ['descriptionProfession', 'descriptionTemplate', 'descriptionStart'] as const

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
  const { t } = useTranslation()
  return (
    <ol
      aria-label={t('newCv.steps')}
      className="mb-6 flex flex-wrap items-center gap-x-6 gap-y-2 text-sm"
    >
      {STEPS.map((stepKey, i) => {
        const done = i < step
        const content = (
          <>
            <span
              className={`flex size-6 shrink-0 items-center justify-center rounded-pill text-xs font-semibold ${
                i <= step ? 'bg-brand text-on-brand' : 'bg-muted-strong text-fg-soft'
              }`}
            >
              {done ? <Check className="size-3.5" aria-hidden /> : i + 1}
            </span>
            <span className={i === step ? 'font-semibold' : ''}>{t(`newCv.${stepKey}`)}</span>
            {done && choices[i] && (
              <>
                {' '}
                <span className="text-fg-muted">· {choices[i]}</span>
              </>
            )}
          </>
        )
        return (
          <li key={stepKey} aria-current={i === step ? 'step' : undefined}>
            {done ? (
              <button
                type="button"
                onClick={() => onSelect(i)}
                className="flex items-center gap-2 rounded-tight hover:text-brand-fg"
              >
                {content}
              </button>
            ) : (
              <span className={`flex items-center gap-2 ${i > step ? 'text-fg-muted ' : ''}`}>
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
  const { t } = useTranslation()
  const [params, setParams] = useSearchParams()
  const { profession, template } = readWizard(params)
  const step = !profession ? 0 : !template ? 1 : 2
  const go = (next: Partial<WizardState>) => setParams(wizardParams(next))
  const backTo = (target: number) => go(target === 0 ? {} : { profession: profession! })

  return (
    <>
      <PageHeader
        title={t('newCv.title')}
        description={t(`newCv.${DESCRIPTIONS[step]!}`)}
        actions={
          <div className="flex gap-2">
            {step > 0 && (
              <button type="button" onClick={() => backTo(step - 1)} className={secondaryButton}>
                <ArrowLeft className="size-4" /> {t('common.back')}
              </button>
            )}
            <Link to="/documents/cvs" className={secondaryButton}>
              {t('common.cancel')}
            </Link>
          </div>
        }
      />
      <Stepper
        step={step}
        choices={[
          profession &&
            (profession === OTHER_PROFESSION
              ? t('newCv.otherName')
              : t(`labels.profession.${profession}.name`)),
          template && t(`labels.template.${template}`),
        ]}
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
