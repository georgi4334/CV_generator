import { PLAN_LIMITS } from '@cv/shared'
import { Link } from 'react-router'
import { LegalLayout } from './LegalLayout'
import { CONTACT, OPERATOR } from './operator'

export function TermsPage() {
  const free = PLAN_LIMITS.free
  return (
    <LegalLayout title="Terms of use" updated="16 October 2026">
      <p>
        These terms apply to CV Generator, run by {OPERATOR}. By creating an account you accept
        them. Questions: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>The service</h2>
      <p>
        You can create CVs and cover letters, download them as PDF, share them by link, track job
        applications and use AI features. The free plan includes up to {free.maxCvs} CVs,{' '}
        {free.maxVersionsPerCv} saved versions per CV and {free.aiRequestsPerDay} AI requests per
        day. Limits may change; we will tell you before reducing them.
      </p>

      <h2>Your account</h2>
      <ul>
        <li>Give a real email address and keep your password to yourself.</li>
        <li>You are responsible for what happens in your account.</li>
        <li>You can delete your account at any time on the Account page.</li>
      </ul>

      <h2>Your content</h2>
      <p>
        What you write and upload stays yours. You allow us to store, process and display it only to
        provide the service to you (for example, to show a document to people you share it with).
        Only upload content you have the right to use.
      </p>

      <h2>AI features</h2>
      <p>
        AI suggestions can be wrong or incomplete. Check every suggestion before you use it, and do
        not present skills or experience you do not have. You decide what goes into your documents.
      </p>

      <h2>Acceptable use</h2>
      <ul>
        <li>No unlawful, misleading, hateful or infringing content.</li>
        <li>No attempts to break, overload or get around the limits of the service.</li>
        <li>No automated sign-ups or scraping.</li>
      </ul>
      <p>We may suspend accounts that break these rules.</p>

      <h2>Availability</h2>
      <p>
        The service runs on free hosting plans. It may be slow to start after a quiet period and may
        be unavailable at times. Keep your own copies (PDF downloads) of important documents.
      </p>

      <h2>Liability</h2>
      <p>
        The service is provided as it is. To the extent the law allows, we are not liable for
        indirect damages or lost opportunities. Nothing in these terms limits rights you have as a
        consumer under the law.
      </p>

      <h2>Changes and ending</h2>
      <p>
        We may update these terms and will tell you about important changes in advance. You can stop
        using the service at any time. Our <Link to="/privacy">privacy policy</Link> explains how we
        handle personal data.
      </p>
    </LegalLayout>
  )
}
