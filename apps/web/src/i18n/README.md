# Interface translations (EN, BG, DE)

The interface language is separate from a CV's own language: a German user can
write an English CV. CV content, CV section titles and CV placeholders follow
the **CV language** (`cv-renderer/placeholders.ts`, `getSectionTitle`), not this.

## How to translate a component

```tsx
import { useTranslation } from 'react-i18next'

export function Thing({ count }: { count: number }) {
  const { t } = useTranslation()
  return <p>{t('jobs.count', { count })}</p>
}
```

- Every visible string, `aria-label`, `title`, `placeholder` and `alt` goes through `t()`.
- Keys are nested by area: `locales/en/<area>.ts`. English is the source; `bg/<area>.ts`
  and `de/<area>.ts` are typed as `Messages['<area>']`, so TypeScript reports a
  missing or extra key.
- Interpolation: `t('x.greeting', { name })` with `'Hello {{name}}'`.
- Plurals: keys `count_one` / `count_other`, called as `t('x.count', { count })`.
  (Bulgarian and German use the same two forms.)
- Rich text with links/markup: `<Trans i18nKey="..." components={{ link: <Link to="/x" /> }} />`
  with `'Read the <link>terms</link>'`.
- Fixed values: `t(\`labels.jobStatus.${status}\`)`, `labels.jobType`, `labels.cvLanguage`,
`labels.profession.<id>.name|description`, `labels.template.<id>`, `labels.documentType`.
- API errors: `errorMessage(error)` from `lib/errorMessage.ts` (translated by error code) instead
  of `toApiRequestError(error).message`.
- Dates: `formatDate()` follows the interface language; the component must call
  `useTranslation()` so it re-renders when the language changes.
- Code outside components (stores, helpers): `i18n.t(...)` from `i18n/index.ts`.
- Bulgarian: formal "Вие" form, sentence case. German: formal "Sie", sentence case,
  natural UI German (e.g. "Speichern", "Lebenslauf", "Anschreiben").
- Keep product names as they are: CV Generator, Gemini, PDF, ATS, Google.
