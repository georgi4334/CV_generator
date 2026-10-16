interface ImportMetaEnv {
  readonly VITE_API_URL?: string
  /** Error reporting for the browser (sentry.io); off when empty. */
  readonly VITE_SENTRY_DSN?: string
  /** Who runs the service and how to reach them (privacy policy and terms). */
  readonly VITE_OPERATOR_NAME?: string
  readonly VITE_CONTACT_EMAIL?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
