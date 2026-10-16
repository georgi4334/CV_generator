export const legal = {
  privacy: {
    title: 'Privacy policy',
    updated: '16 October 2026',
    intro:
      '{{app}} helps you write CVs and cover letters and keep track of job applications. This page explains which personal data we keep, why, who helps us process it, and your rights under the EU General Data Protection Regulation (GDPR).',
    who: {
      title: 'Who is responsible',
      body: 'The controller is {{operator}}. Contact: <mail>{{contact}}</mail>.',
    },
    keep: {
      title: 'What we keep',
      account:
        '<strong>Account:</strong> your email address, your name (optional), a scrambled form of your password (we cannot read it), and whether you confirmed your email.',
      content:
        '<strong>Your content:</strong> CVs, cover letters, saved jobs (including job postings you paste), uploaded photos and logos, and earlier versions of your CVs.',
      share:
        '<strong>Share links:</strong> if you share a document, anyone with the link can view it until you turn the link off.',
      technical:
        '<strong>Technical data:</strong> a session cookie that keeps you signed in, how many AI requests you made today, your IP address for a short time to stop password-guessing, and server logs kept by our hosting providers.',
    },
    why: {
      title: 'Why, and on what legal basis',
      contract:
        'To provide the service you signed up for: storing and showing your documents, sending account emails (confirmation, password reset). Legal basis: performance of a contract (Art. 6(1)(b) GDPR).',
      interests:
        'To keep the service secure and working: rate limits, error reports, logs. Legal basis: legitimate interests (Art. 6(1)(f) GDPR).',
      noSale: 'We do not sell your data, show ads or build marketing profiles.',
    },
    ai: {
      title: 'AI features',
      body: 'When you use Fix Mistakes, Check & Tailor or the AI Assistant, the text of the open document (and the job posting, if you use one) is sent to Google (Gemini API) to create suggestions. Nothing is sent unless you start one of these features. Do not put other people’s personal data into your documents unless you are allowed to.',
    },
    providers: {
      title: 'Service providers',
      intro: 'These companies process data for us, under data processing agreements:',
      neon: 'Neon (database)',
      render: 'Render (application server)',
      cloudflare: 'Cloudflare (website hosting and storage of uploaded images)',
      brevo: 'Brevo (sending account emails)',
      google: 'Google (Gemini API, only when you use AI features)',
      sentry: 'Sentry (error reports, without the contents of your documents)',
      transfers:
        'Some of them are based in, or use servers in, the United States. Transfers rely on the EU–US Data Privacy Framework or the European Commission’s standard contractual clauses.',
    },
    cookies: {
      title: 'Cookies and local storage',
      body: 'We use one cookie, <code>cv_session</code>, which is strictly necessary to keep you signed in. Your light/dark theme choice is stored in your browser. There are no analytics or advertising cookies, so no cookie banner is needed.',
    },
    retention: {
      title: 'How long we keep data',
      account:
        'Your account and content: until you delete your account (Account → Delete account).',
      sessions: 'Sessions: 30 days after last use, at most 90 days.',
      links: 'Email links: password reset 1 hour, email confirmation 24 hours.',
      ip: 'IP addresses for rate limits: kept in memory for up to one hour.',
      deletion:
        'Deleting your account removes your documents, jobs, uploaded images, share links and sessions right away. Backups held by our database provider expire on their own schedule.',
    },
    rights: {
      title: 'Your rights',
      body: 'You can access, correct and delete your data in the app at any time. You also have the right to data portability, to restrict or object to processing, and to complain to a data protection authority (in Bulgaria: the Commission for Personal Data Protection). To exercise a right, write to <mail>{{contact}}</mail>.',
    },
    children: {
      title: 'Children',
      body: 'The service is not meant for children under 16.',
    },
    changes: {
      title: 'Changes',
      body: 'If this policy changes in an important way, we will tell you by email or in the app.',
    },
  },
  terms: {
    title: 'Terms of use',
    updated: '16 October 2026',
    intro:
      'These terms apply to {{app}}, run by {{operator}}. By creating an account you accept them. Questions: <mail>{{contact}}</mail>.',
    service: {
      title: 'The service',
      body: 'You can create CVs and cover letters, download them as PDF, share them by link, track job applications and use AI features. The free plan includes up to {{maxCvs}} CVs, {{maxVersions}} saved versions per CV and {{aiRequests}} AI requests per day. Limits may change; we will tell you before reducing them.',
    },
    account: {
      title: 'Your account',
      email: 'Give a real email address and keep your password to yourself.',
      responsible: 'You are responsible for what happens in your account.',
      delete: 'You can delete your account at any time on the Account page.',
    },
    content: {
      title: 'Your content',
      body: 'What you write and upload stays yours. You allow us to store, process and display it only to provide the service to you (for example, to show a document to people you share it with). Only upload content you have the right to use.',
    },
    ai: {
      title: 'AI features',
      body: 'AI suggestions can be wrong or incomplete. Check every suggestion before you use it, and do not present skills or experience you do not have. You decide what goes into your documents.',
    },
    use: {
      title: 'Acceptable use',
      unlawful: 'No unlawful, misleading, hateful or infringing content.',
      abuse: 'No attempts to break, overload or get around the limits of the service.',
      automated: 'No automated sign-ups or scraping.',
      suspend: 'We may suspend accounts that break these rules.',
    },
    availability: {
      title: 'Availability',
      body: 'The service runs on free hosting plans. It may be slow to start after a quiet period and may be unavailable at times. Keep your own copies (PDF downloads) of important documents.',
    },
    liability: {
      title: 'Liability',
      body: 'The service is provided as it is. To the extent the law allows, we are not liable for indirect damages or lost opportunities. Nothing in these terms limits rights you have as a consumer under the law.',
    },
    changes: {
      title: 'Changes and ending',
      body: 'We may update these terms and will tell you about important changes in advance. You can stop using the service at any time. Our <privacy>privacy policy</privacy> explains how we handle personal data.',
    },
  },
}
