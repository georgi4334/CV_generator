import { Trans, useTranslation } from 'react-i18next'
import { LegalLayout } from './LegalLayout'
import { CONTACT, OPERATOR } from './operator'

export function PrivacyPage() {
  const { t } = useTranslation()
  const values = { operator: OPERATOR, contact: CONTACT }
  const components = {
    mail: <a href={`mailto:${CONTACT}`} />,
    strong: <strong />,
    code: <code />,
  }
  return (
    <LegalLayout title={t('legal.privacy.title')} updated={t('legal.privacy.updated')}>
      <p>{t('legal.privacy.intro')}</p>

      <h2>{t('legal.privacy.who.title')}</h2>
      <p>
        <Trans i18nKey="legal.privacy.who.body" values={values} components={components} />
      </p>

      <h2>{t('legal.privacy.keep.title')}</h2>
      <ul>
        <li>
          <Trans i18nKey="legal.privacy.keep.account" components={components} />
        </li>
        <li>
          <Trans i18nKey="legal.privacy.keep.content" components={components} />
        </li>
        <li>
          <Trans i18nKey="legal.privacy.keep.share" components={components} />
        </li>
        <li>
          <Trans i18nKey="legal.privacy.keep.technical" components={components} />
        </li>
      </ul>

      <h2>{t('legal.privacy.why.title')}</h2>
      <ul>
        <li>{t('legal.privacy.why.contract')}</li>
        <li>{t('legal.privacy.why.interests')}</li>
      </ul>
      <p>{t('legal.privacy.why.noSale')}</p>

      <h2>{t('legal.privacy.ai.title')}</h2>
      <p>{t('legal.privacy.ai.body')}</p>

      <h2>{t('legal.privacy.providers.title')}</h2>
      <p>{t('legal.privacy.providers.intro')}</p>
      <ul>
        <li>{t('legal.privacy.providers.neon')}</li>
        <li>{t('legal.privacy.providers.render')}</li>
        <li>{t('legal.privacy.providers.cloudflare')}</li>
        <li>{t('legal.privacy.providers.brevo')}</li>
        <li>{t('legal.privacy.providers.google')}</li>
        <li>{t('legal.privacy.providers.sentry')}</li>
      </ul>
      <p>{t('legal.privacy.providers.transfers')}</p>

      <h2>{t('legal.privacy.cookies.title')}</h2>
      <p>
        <Trans i18nKey="legal.privacy.cookies.body" components={components} />
      </p>

      <h2>{t('legal.privacy.retention.title')}</h2>
      <ul>
        <li>{t('legal.privacy.retention.account')}</li>
        <li>{t('legal.privacy.retention.sessions')}</li>
        <li>{t('legal.privacy.retention.links')}</li>
        <li>{t('legal.privacy.retention.ip')}</li>
      </ul>
      <p>{t('legal.privacy.retention.deletion')}</p>

      <h2>{t('legal.privacy.rights.title')}</h2>
      <p>
        <Trans i18nKey="legal.privacy.rights.body" values={values} components={components} />
      </p>

      <h2>{t('legal.privacy.children.title')}</h2>
      <p>{t('legal.privacy.children.body')}</p>

      <h2>{t('legal.privacy.changes.title')}</h2>
      <p>{t('legal.privacy.changes.body')}</p>
    </LegalLayout>
  )
}
