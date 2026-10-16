import { PLAN_LIMITS } from '@cv/shared'
import { Trans, useTranslation } from 'react-i18next'
import { Link } from 'react-router'
import { LegalLayout } from './LegalLayout'
import { CONTACT, OPERATOR } from './operator'

export function TermsPage() {
  const { t } = useTranslation()
  const free = PLAN_LIMITS.free
  const components = {
    mail: <a href={`mailto:${CONTACT}`} />,
    privacy: <Link to="/privacy" />,
  }
  return (
    <LegalLayout title={t('legal.terms.title')} updated={t('legal.terms.updated')}>
      <p>
        <Trans
          i18nKey="legal.terms.intro"
          values={{ operator: OPERATOR, contact: CONTACT }}
          components={components}
        />
      </p>

      <h2>{t('legal.terms.service.title')}</h2>
      <p>
        {t('legal.terms.service.body', {
          maxCvs: free.maxCvs,
          maxVersions: free.maxVersionsPerCv,
          aiRequests: free.aiRequestsPerDay,
        })}
      </p>

      <h2>{t('legal.terms.account.title')}</h2>
      <ul>
        <li>{t('legal.terms.account.email')}</li>
        <li>{t('legal.terms.account.responsible')}</li>
        <li>{t('legal.terms.account.delete')}</li>
      </ul>

      <h2>{t('legal.terms.content.title')}</h2>
      <p>{t('legal.terms.content.body')}</p>

      <h2>{t('legal.terms.ai.title')}</h2>
      <p>{t('legal.terms.ai.body')}</p>

      <h2>{t('legal.terms.use.title')}</h2>
      <ul>
        <li>{t('legal.terms.use.unlawful')}</li>
        <li>{t('legal.terms.use.abuse')}</li>
        <li>{t('legal.terms.use.automated')}</li>
      </ul>
      <p>{t('legal.terms.use.suspend')}</p>

      <h2>{t('legal.terms.availability.title')}</h2>
      <p>{t('legal.terms.availability.body')}</p>

      <h2>{t('legal.terms.liability.title')}</h2>
      <p>{t('legal.terms.liability.body')}</p>

      <h2>{t('legal.terms.changes.title')}</h2>
      <p>
        <Trans i18nKey="legal.terms.changes.body" components={components} />
      </p>
    </LegalLayout>
  )
}
