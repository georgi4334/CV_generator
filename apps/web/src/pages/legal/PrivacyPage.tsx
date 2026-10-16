import { LegalLayout } from './LegalLayout'
import { CONTACT, OPERATOR } from './operator'

export function PrivacyPage() {
  return (
    <LegalLayout title="Privacy policy" updated="16 October 2026">
      <p>
        CV Generator helps you write CVs and cover letters and keep track of job applications. This
        page explains which personal data we keep, why, who helps us process it, and your rights
        under the EU General Data Protection Regulation (GDPR).
      </p>

      <h2>Who is responsible</h2>
      <p>
        The controller is {OPERATOR}. Contact: <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>What we keep</h2>
      <ul>
        <li>
          <strong>Account:</strong> your email address, your name (optional), a scrambled form of
          your password (we cannot read it), and whether you confirmed your email.
        </li>
        <li>
          <strong>Your content:</strong> CVs, cover letters, saved jobs (including job postings you
          paste), uploaded photos and logos, and earlier versions of your CVs.
        </li>
        <li>
          <strong>Share links:</strong> if you share a document, anyone with the link can view it
          until you turn the link off.
        </li>
        <li>
          <strong>Technical data:</strong> a session cookie that keeps you signed in, how many AI
          requests you made today, your IP address for a short time to stop password-guessing, and
          server logs kept by our hosting providers.
        </li>
      </ul>

      <h2>Why, and on what legal basis</h2>
      <ul>
        <li>
          To provide the service you signed up for: storing and showing your documents, sending
          account emails (confirmation, password reset). Legal basis: performance of a contract
          (Art. 6(1)(b) GDPR).
        </li>
        <li>
          To keep the service secure and working: rate limits, error reports, logs. Legal basis:
          legitimate interests (Art. 6(1)(f) GDPR).
        </li>
      </ul>
      <p>We do not sell your data, show ads or build marketing profiles.</p>

      <h2>AI features</h2>
      <p>
        When you use Fix Mistakes, Check &amp; Tailor or the AI Assistant, the text of the open
        document (and the job posting, if you use one) is sent to Google (Gemini API) to create
        suggestions. Nothing is sent unless you start one of these features. Do not put other
        people’s personal data into your documents unless you are allowed to.
      </p>

      <h2>Service providers</h2>
      <p>These companies process data for us, under data processing agreements:</p>
      <ul>
        <li>Neon (database)</li>
        <li>Render (application server)</li>
        <li>Cloudflare (website hosting and storage of uploaded images)</li>
        <li>Brevo (sending account emails)</li>
        <li>Google (Gemini API, only when you use AI features)</li>
        <li>Sentry (error reports, without the contents of your documents)</li>
      </ul>
      <p>
        Some of them are based in, or use servers in, the United States. Transfers rely on the EU–US
        Data Privacy Framework or the European Commission’s standard contractual clauses.
      </p>

      <h2>Cookies and local storage</h2>
      <p>
        We use one cookie, <code>cv_session</code>, which is strictly necessary to keep you signed
        in. Your light/dark theme choice is stored in your browser. There are no analytics or
        advertising cookies, so no cookie banner is needed.
      </p>

      <h2>How long we keep data</h2>
      <ul>
        <li>Your account and content: until you delete your account (Account → Delete account).</li>
        <li>Sessions: 30 days after last use, at most 90 days.</li>
        <li>Email links: password reset 1 hour, email confirmation 24 hours.</li>
        <li>IP addresses for rate limits: kept in memory for up to one hour.</li>
      </ul>
      <p>
        Deleting your account removes your documents, jobs, uploaded images, share links and
        sessions right away. Backups held by our database provider expire on their own schedule.
      </p>

      <h2>Your rights</h2>
      <p>
        You can access, correct and delete your data in the app at any time. You also have the right
        to data portability, to restrict or object to processing, and to complain to a data
        protection authority (in Bulgaria: the Commission for Personal Data Protection). To exercise
        a right, write to <a href={`mailto:${CONTACT}`}>{CONTACT}</a>.
      </p>

      <h2>Children</h2>
      <p>The service is not meant for children under 16.</p>

      <h2>Changes</h2>
      <p>If this policy changes in an important way, we will tell you by email or in the app.</p>
    </LegalLayout>
  )
}
