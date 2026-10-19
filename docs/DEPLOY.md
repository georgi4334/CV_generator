# Deploying Vitae (free plans)

```
Browser ──► Cloudflare Pages (web app + /api proxy function) ──► Render (API) ──► Neon (Postgres)
                                                                    ├──► Cloudflare R2 (uploaded images)
                                                                    ├──► Brevo (account emails)
                                                                    ├──► Google Gemini (AI features)
                                                                    └──► Sentry (errors)
```

The browser only ever talks to `https://<your-app>.pages.dev`. A small Pages Function
(`apps/web/functions/api/[[path]].ts`) forwards `/api/*` to Render with a shared secret,
so the login cookie is first-party and works in every browser, without buying a domain.

Do the steps in this order; each one gives you values for the next. Keep the values in a
password manager. **Never commit them.**

## 1. Database: Neon

1. Sign up at <https://neon.tech> (free plan) and create a project, region **Europe (Frankfurt)**.
2. Copy the **pooled** connection string (it contains `-pooler` and ends with `?sslmode=require`).
   → `DATABASE_URL`

The API creates and updates the tables itself when it starts.

## 2. File storage: Cloudflare R2

1. Sign up at <https://dash.cloudflare.com>, open **R2**, enable it (free tier: 10 GB; a card may be asked for, nothing is charged within the free tier).
2. Create a bucket, e.g. `cv-uploads`, location **Europe**. Keep it **private** (no public access).
3. **Manage R2 API tokens → Create API token**, permission _Object Read & Write_, limited to that bucket.
   → `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`
4. Your **Account ID** is shown on the R2 overview page. → `R2_ACCOUNT_ID`; the bucket name → `R2_BUCKET`

## 3. Email: Brevo

1. Sign up at <https://www.brevo.com> (free: 300 emails/day).
2. **Senders, domains & dedicated IPs → Senders → Add a sender** with the address emails should come from (e.g. your Gmail), and confirm it from your inbox. → `MAIL_FROM`
3. **SMTP & API → API keys → Generate a new API key**. → `BREVO_API_KEY`

Without your own domain, some providers may put these emails in spam; a domain with
SPF/DKIM (later) fixes that.

### No confirmation email arrives?

Check these in order:

1. **Running locally?** Without `BREVO_API_KEY` no email is sent: the link is printed in the
   API's terminal (`--- Email to … ---`), and the app's banner says so. Copy the link from there.
2. **The API log** (Render → your service → Logs). At start it says
   `Account emails are sent through Brevo from …` or `… only printed in this log`. A failed
   send logs `could not send email` with Brevo's answer, e.g. `401` (wrong API key) or
   `400 … sender` (the `MAIL_FROM` address is not a verified sender). "Send it again" in the
   app now also says when sending failed.
3. **Brevo → Transactional → Logs**: shows whether Brevo accepted, delivered, or blocked
   each email. A new Brevo account may need its profile completed (and sometimes a short
   review) before it sends transactional email.
4. **Sending from a Gmail address**: Gmail and other providers often reject or hide emails
   that claim to come from `@gmail.com` but are sent by another service (DMARC). If Brevo's
   log says "delivered" but nothing arrives, this is the likely cause. The reliable fix is a
   domain of your own, authenticated in Brevo (**Senders, domains → Domains**, add the
   SPF/DKIM records it shows), with `MAIL_FROM` on that domain.

## 4. AI: Google Gemini

There are two ways to give people AI, and you can use both:

- **Their own key (recommended).** Nothing to set up on the server except `SECRETS_KEY` (step 7: Render
  generates it). Each person opens the account menu → **AI key**, pastes a free key from
  <https://aistudio.google.com/apikey> and picks a model. The API checks the key with Google, stores it
  encrypted with `SECRETS_KEY` and never returns it. Google's limits for that key apply, and the
  terms of service are between that person and Google.
- **A shared key.** Optional fallback for people without their own: `GEMINI_API_KEY` on the server,
  limited to 30 requests per account per day. → `GEMINI_API_KEY`

If you change `SECRETS_KEY` later, saved keys cannot be read any more and people add them again.

2. **Before real users in the EU/EEA, UK or Switzerland use the app, turn on billing** for the
   Google Cloud project of that key. Google's Gemini API terms only allow _paid_ services for
   apps used by people in those regions, and on the free tier Google may use the text sent to it
   to improve its products. The cost for this app is small (Flash models, short texts), and the
   daily per-user limit (30) caps it. Set a budget alert in Google Cloud.

## 5. Errors: Sentry (optional)

Sign up at <https://sentry.io> (free developer plan), create two projects: **Node.js** (API)
and **React** (web). → `SENTRY_DSN` (API) and `VITE_SENTRY_DSN` (web).
Reports contain the error and the user id, never document contents.

## 6. API: Render

1. Generate the proxy secret (at least 32 characters), e.g. `openssl rand -base64 32`. → `PROXY_SECRET`
2. Sign up at <https://render.com>, **New → Blueprint**, pick this GitHub repository. It reads
   [`render.yaml`](../render.yaml) and asks for the secrets:

   | Variable                     | Value                                                                                         |
   | ---------------------------- | --------------------------------------------------------------------------------------------- |
   | `DATABASE_URL`               | from step 1                                                                                   |
   | `APP_URL`, `CORS_ORIGIN`     | `https://<project>.pages.dev` (step 7; you can fill them in after creating the Pages project) |
   | `PROXY_SECRET`               | from above                                                                                    |
   | `R2_*`                       | from step 2                                                                                   |
   | `BREVO_API_KEY`, `MAIL_FROM` | from step 3                                                                                   |
   | `GEMINI_API_KEY`             | optional shared key from step 4                                                               |
   | `SECRETS_KEY`                | random, 32+ characters (`render.yaml` generates it); encrypts the keys people save            |
   | `SENTRY_DSN`                 | from step 5 (optional)                                                                        |

3. Deploy. The API refuses to start if something required is missing and says what
   (see the deploy log). Note the service URL, e.g. `https://cv-api.onrender.com`.
   `https://cv-api.onrender.com/api/ping` should answer `{"ok":true}`, and
   `https://cv-api.onrender.com/api/cvs` should answer **403** (only the proxy may call it).

## 7. Web app: Cloudflare Pages

1. In Cloudflare: **Workers & Pages → Create → Pages → Connect to Git**, pick the repository.
2. Build settings:
   - Production branch: `main`
   - Root directory: `apps/web`
   - Build command: `npx --yes pnpm@10.28.0 install --frozen-lockfile && npx --yes pnpm@10.28.0 build`
   - Build output directory: `dist`
3. **Environment variables** (Settings → Variables and Secrets), for Production:

   | Variable             | Value                                              |
   | -------------------- | -------------------------------------------------- |
   | `NODE_VERSION`       | `22`                                               |
   | `API_ORIGIN`         | the Render URL, e.g. `https://cv-api.onrender.com` |
   | `PROXY_SECRET`       | the same value as on Render (as a **secret**)      |
   | `VITE_OPERATOR_NAME` | your name (shown in the privacy policy and terms)  |
   | `VITE_CONTACT_EMAIL` | a contact address for privacy requests             |
   | `VITE_SENTRY_DSN`    | from step 5 (optional)                             |

4. Deploy, then put `https://<project>.pages.dev` into `APP_URL` and `CORS_ORIGIN` on Render
   (Render redeploys by itself).

The build writes `_headers` with security headers (a Content-Security-Policy that matches the
built page) and long caching for assets.

## 8. Keep the API awake (optional)

Render's free API sleeps after 15 minutes without requests; the first request then takes
30–60 seconds. To avoid that, create a free job at <https://cron-job.org> that calls
`https://cv-api.onrender.com/api/ping` every 10 minutes. `/api/ping` does not touch the
database, so Neon can still sleep and stay within its free compute hours.
(One always-on free Render service fits the 750 free hours per month.)

## 9. Check the live app

- Create an account → the confirmation email arrives (check spam).
- Upload a photo, reload → it is still there (R2).
- Forgot password → the reset email arrives and works.
- Fix Mistakes on a CV → suggestions appear (Gemini).
- Open a share link in a private window.
- Run the browser's accessibility/Lighthouse check if you like.

### Or let a script check the live site

`pnpm smoke` runs Playwright checks against the deployed site: the API, database and email service
report as up, the security headers and caching are there, you can sign in (the cookie is HttpOnly and
Secure), a CV can be created, edited, given a photo (R2), restyled, shared (also with personal details
hidden) and printed, cover and resignation letters and jobs work, the pages fit a phone, and a reset
email is accepted for sending. It cleans up after itself. Set `SMOKE_API_URL` to the Render address
to also check that the API refuses requests that skip the web app's proxy.

1. Sign up once by hand with an address you can read, and confirm the email. This is the smoke-test account.
2. Run it (it works with the Chromium that Playwright already installed for `pnpm e2e`):

   ```bash
   SMOKE_URL=https://<project>.pages.dev \
   SMOKE_EMAIL=you@example.com SMOKE_PASSWORD='the password' \
   pnpm smoke
   ```

   Add `SMOKE_AI=1` to also call the real AI (Fix Mistakes, Check & Tailor and the Assistant: 3 of the account's 30 daily requests).

3. The last check only asks for a reset email: look in the inbox (and spam) to see that it arrived.

The first request can take a minute while the free API wakes up.

## Updating

Merging to `main` redeploys both: Render runs the database migrations on start, Pages
rebuilds the web app. If a deploy fails, both keep serving the previous version.

## Costs to watch

All services above have free plans. Things that can cost money: Gemini with billing on (pay
per use; set a budget alert), and outgrowing a free tier (Neon storage/compute, R2 above
10 GB, Brevo above 300 emails/day). Free-tier limits change; check them when signing up.
