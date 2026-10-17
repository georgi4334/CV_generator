# Architecture and folder structure

A pnpm monorepo: two apps and one shared package.

```
apps/
  web/        React app (Vite, Tailwind, React Router, TanStack Query, Zustand, i18next)
  api/        Fastify API (Drizzle ORM, PostgreSQL)
packages/
  shared/     Types, Zod schemas and rules used by both (imported as '@cv/shared')
e2e/          Browser tests (Playwright) against the production builds
docs/         Plan, deployment guide, this file
render.yaml   Render blueprint for the API
```

## Web app: `apps/web/src`

Organised **by feature**: everything a feature needs lives in its folder.

```
app/            Wiring: main.tsx, router.tsx, lazyPages.ts, layouts/, pages/ (error, not found)
features/
  auth/         pages/ (sign in, sign up, reset, verify), components/ (AuthShell, AccountSettings,
                RequireAuth, UserMenu = account drawer, VerifyBanner), api.ts, queries.ts, sessionState.ts, localeSync.ts
  dashboard/    DashboardPage, reminders
  documents/    DocumentsPage, documentActions
  jobs/         JobsPage, components/ (table, cards, drawer, fields), api.ts, queries.ts
  cv-editor/    pages/ (editor, preview), layout/ (top bar, rails, side panel, save status…),
                panels/ (design, templates, rearrange, history), state/ (stores, autosave,
                session), lib/, api.ts, queries.ts (CVs)
  cover-letters/ pages/ (editor, new), state/, api.ts, queries.ts
  new-cv/       The "Create new CV" wizard
  ai/           panels/ (Fix Mistakes, Check & Tailor, Assistant), api.ts, queries.ts
  share/        Share dialog, shared document page, queries.ts
  print/        PDF via the browser's print dialog
  legal/        Privacy policy, terms
renderer/       Draws CVs and letters: document/, templates/, sections/, editing/ (in-place editing
                controls), placeholders, icons; public API in index.ts
shared/
  api/          HTTP client, query client, errorMessage(), health query, auth query keys
  ui/           Generic components: Modal, ConfirmDialog, PageHeader, Badges, LoadStates,
                ThemeToggle, LanguageSelect, ApiStatus, FitToWidth (and ScaledBox, for zoom)
  lib/          format, paths, lazyPage, monitoring, useMediaQuery, useBreakpoint
  styles/       tokens.css (design tokens), components.css (btn, input, card, grids…)
  stores/       theme
i18n/           Interface languages (see i18n/README.md)
test/           Test setup, fake APIs, appHarness for route-level tests
```

Also in `apps/web`: `functions/` (Cloudflare Pages Function that proxies `/api`) and `build/`
(security headers written at build time).

### Rules

- **Imports:** `@/…` for anything outside the current folder (`@/features/jobs/queries`,
  `@/shared/ui/Modal`); `./…` inside it. No `../../`.
- **`shared/` and `renderer/` never import from `features/`.** `app/` may import anything.
- **Between features**, import only the data layer: `api.ts`, `queries.ts` and `state/`
  (e.g. the dashboard reads `@/features/jobs/queries`). A component used by several features
  moves to `shared/ui/`.
- **Each feature owns its tests** next to the code. Route-level tests that render the whole
  app (`<feature>.test.tsx`) import `@/test/appHarness` first.
- **Text** shown to users goes through i18n (`t()`), with its keys in the feature's area of
  `i18n/locales`.

### Styles: design tokens

Every colour, spacing, radius, shadow, z-index, breakpoint and grid size the app uses is a
variable in **`shared/styles/tokens.css`**. Change a value there and it changes everywhere.
Components use the Tailwind classes generated from those tokens, never raw values like
`bg-teal-700`, `rounded-xl`, `z-50` or `max-w-[794px]`.

| What               | Token (in `tokens.css`)                                                            | Use in classes                                                              |
| ------------------ | ---------------------------------------------------------------------------------- | --------------------------------------------------------------------------- |
| Colours            | `--theme-*` in `:root` (light) and `.dark`                                         | `bg-surface`, `text-fg-muted`, `border-line`, `bg-brand`, `text-danger-fg`… |
| Page padding       | `--spacing-gutter`, `--spacing-gutter-wide`, `--spacing-section`, `--spacing-card` | `px-gutter`, `py-section`, `p-card`                                         |
| Controls           | `--spacing-control-x/-y`, `--spacing-touch` (44px)                                 | used by `btn`, `btn-icon`                                                   |
| Rounding           | `--radius-tight`, `-control`, `-card`, `-pill`                                     | `rounded-control`, `rounded-card`…                                          |
| Shadows            | `--shadow-card`, `-overlay`, `-paper`                                              | `shadow-card`…                                                              |
| Widths             | `--container-page`, `-reading`, `-form`, `-panel`, `-drawer`, `-menu`…             | `max-w-page`, `w-panel`…                                                    |
| Grids              | `--grid-cards-min`, `-thumbs-min`, `-templates-min`                                | `grid-cards`, `grid-thumbs`, `grid-templates`                               |
| Stacking (z-index) | `--z-raised`, `-dropdown`, `-nav`, `-overlay`, `-toast`                            | `z-(--z-dropdown)`                                                          |
| Breakpoints        | `--breakpoint-sm/md/lg/xl/2xl`                                                     | `md:…`, `lg:…`; in code `useBreakpoint('md')`                               |

- **Colours follow the theme by themselves:** `bg-surface` is white in light mode and dark
  slate in dark mode, so components need no `dark:` classes. To change a colour, edit its
  `--theme-*` value in `:root` and in `.dark`.
- **Breakpoints** are also in `shared/lib/useBreakpoint.ts` (`BREAKPOINTS`), for layout
  decisions made in code; a test fails if the two disagree.
- **Common pieces** are classes in `shared/styles/components.css`: `page-container`, `card`,
  `btn` + `btn-primary` / `btn-secondary` / `btn-danger` / `btn-ghost` / `btn-icon` / `btn-sm`,
  `input`, `input-sm`, `link`, `pill`, the grids, and `pb-safe` / `clear-bottom-nav` for phones.
- **Loading skeletons:** `shared/ui/Skeleton.tsx` (`Skeleton`, `SkeletonText`, `ListSkeleton`,
  `PaperSkeleton`, `LoadingRegion`) and `PageLoading` / `EditorLoading` in `LoadStates.tsx`.
  Their colours are `--theme-skeleton` and `--theme-skeleton-shine` (light and dark), the
  sweep is `animate-shimmer`, and it stops for people who prefer reduced motion. Wrap
  skeletons in `LoadingRegion` so screen readers hear one "Loading…" message.
- **Liquid glass:** `glass` (panels: dashboard cards, the documents list, the Saved Jobs table
  and cards) and `glass-bar` (the sticky header and the phone tab bar) blur what is behind
  them. Their colours are the `--theme-glass*` tokens (light and dark), the blur is
  `--blur-glass` and the rim and shadow `--shadow-glass`. `app-backdrop` gives the page soft
  glows (`--theme-glow-*`) for the glass to blur. Browsers that cannot blur, and people who
  ask for reduced transparency, get solid panels instead.
- **Frosted pills and illustrations:** `glass-pill` with `pill-item` / `pill-item-active` is
  a row of choices (the app's tabs, the editor's tools); `glass-solid` is more frosted glass
  for panels with forms. The not-found and error pages draw `shared/ui/illustrations.tsx`
  with the `--theme-illus-*` colours. CV and letter pages use `bg-paper`, which is white in
  both themes.
- **Splash and motion:** the splash screen is plain HTML and CSS in `index.html` (it paints
  before any JavaScript) and `shared/lib/splash.ts` fades it out once the app has rendered.
  - **Tabs** switch instantly: the highlight glides to the chosen tab (`app/layouts/TabPill.tsx`)
    and the new page eases in from that side (`animate-page-from-right/left`). Nothing waits
    or freezes, so it feels like one app; each tab's page has its own loading skeleton.
  - **Documents** zoom open from their thumbnail and shrink back when closed, with the View
    Transitions API (`shared/lib/viewTransitions.ts`, `TransitionLink`, animations in
    `shared/styles/transitions.css`). The router must be the `RouterProvider` from
    `react-router/dom`, so the new page renders inside the transition at once.
  - **Drawers and dialogs** slide or grow in and play an exit animation before closing
    (`Modal` with `useModalClose`).
  - Timings are tokens (`--duration-page`, `--duration-zoom`, `--duration-leave`,
    `--ease-spring`). Browsers without the API, and people who prefer reduced motion, get no
    animation.
- **Buttons, fields and menus** are liquid glass too: `btn-primary` / `btn-danger` have a
  bright rim and a soft glow (`--shadow-btn-*`), `btn-secondary` is frosted glass, and hover
  lifts them a little. `input` (fields and drop-downs) is frosted with a brand halo on focus.
  Drop-down menus use `glass-menu` with `menu-item` rows.
- **Notifications** are toasts in the bottom-right corner (above the tab bar on phones):
  `showToast({ tone, message })` from `shared/stores/toasts.ts`, drawn by `shared/ui/Toaster.tsx`.
  Tones: info and success fade away after a few seconds; warning and error stay until closed
  with ✕. The editor's `notify()` and the "confirm your email" reminder use them.
- **Drawers and dialogs** close with ✕, Escape, or a click on the dimmed area around them.
  Drawers float `--spacing-drawer-inset` from the screen edges, frosted like the editor's panels.
- **Scrollbars** are slim, rounded and frosted grey (`--theme-scrollbar`, `--scrollbar-size`).
- **`pb-safe`** (bars) only clears the iPhone home indicator; **`pb-safe-card`** (panel content)
  keeps the usual padding as well.
- **Charts** use `--theme-chart` (one teal, checked for contrast in light and dark) on a
  `--theme-chart-track`. The dashboard funnel and stat tiles are `features/dashboard/JobInsights.tsx`;
  the numbers come from `pipelineStats.ts` (tested on its own).
- **Name and logo:** the product name is `APP_NAME` (`packages/shared/src/common/brand.ts`);
  translations write it as `{{app}}`. The logo is `shared/ui/Logo.tsx` (`Logo`, `LogoMark`),
  drawn with the brand tokens; `public/favicon.svg` is the same drawing.
- **Not tokens on purpose:** the CV and letter templates (`renderer/`) keep their own sizes in
  `em` and `PAGE_SIZE_PX`, because they describe the printed page, not the app; job-status
  badge colours live in `shared/ui/badgeStyles.ts`.

### Phones and tablets

- **Below `md` (768px):** the app's tabs move to a bottom tab bar; the header keeps the logo,
  language, theme and account. Tables become cards; drawers open full screen.
- **Below `lg` (1024px), the editor** shows a compact top bar (back, title, undo/redo, "More"
  menu with preview, download, share, history, language and theme), a bottom toolbar with the
  tools, and opens each tool as a bottom sheet. The page is scaled to the screen width.
- **Zoom (every screen size):** the editor page sits in `FitToWidth`, which fits it to the
  screen (never above 100%) unless the zoom bar sets a scale (`editorUi.zoom`, 25–200%).
  `ScaledBox` scales with a transform but takes up the scaled size, so scrolling and centring
  work; its structure never changes with the scale, so zooming does not remount the page.
- One navigation is rendered at a time (chosen with `useBreakpoint`), so screen readers and
  tests never see two. Touch targets are at least 44px on touch screens (`btn-icon`), and
  bars respect the phone's safe areas (`viewport-fit=cover`).
- `e2e/tests/mobile.spec.ts` runs on a phone (Pixel 7): no sideways scrolling on any page,
  the bottom navigation, the editor toolbar and sheet, and the accessibility checks.

## API: `apps/api/src`

```
server.ts       Starts the server (reads config, picks storage, mailer, AI provider)
app.ts          Builds the Fastify app: plugins, hooks, route registration
config/         env.ts (validated environment), production.ts (start-up checks)
db/             client.ts, migrate.ts, schema/ (one file per area; index.ts for drizzle-kit)
modules/<area>/ routes.ts plus that area's logic:
                auth (sessions, passwords, tokens, emails, requireUser), cvs, cover-letters,
                jobs, share, uploads, professions, health, ai (provider, gemini, mock, prompts)
infra/          errors, rate limits, mailer (log/Brevo), storage (local/R2)
```

Tests: `apps/api/test/modules/<area>.test.ts` (real Postgres) and `test/support/` (test app,
database setup). Migrations: `apps/api/drizzle/` (generated by `pnpm --filter @cv/api db:generate`).

### Rules

- A module's routes may use `infra/`, `db/` and other modules' helpers (e.g. `requireUser`);
  `infra/` never imports from `modules/`.
- Every query is scoped to `request.user.id`.

## Shared package: `packages/shared/src`

Grouped by area: `common/` (ids, health), `api/` (plans and limits, request and error
shapes), `auth/`, `cv/` (document model, sections, design, professions), `examples/`,
`cover-letter/`, `documents/` (lists and share links), `jobs/`, `ai/`. Everything is
exported from `index.ts`, so apps import from `'@cv/shared'` only.
