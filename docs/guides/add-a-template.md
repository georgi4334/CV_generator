# Add a CV template

Use this guide when you want a new look for CVs, for example a "Minimal" template with a thin header and a right-hand sidebar.

The eight newest templates (Portfolio, Elegant, Vivid, Spotlight, Modern, Bold, Monogram, Executive) were added in one commit, `e8da4ae`. Run `git show --stat e8da4ae` to see the whole file set. This guide follows the same path and uses those templates as examples.

## Prerequisites

- The project runs locally (see the [README](../../README.md#how-to-install-and-run-the-project)).
- Background: [../web/renderer.md](../web/renderer.md) and [../domain-model.md](../domain-model.md).

## How a template is built

A template is not a React component. It is a data object (`TemplateDefinition`) plus a small header component. The page layout (columns, sidebar, pagination) is shared code in `apps/web/src/renderer/document/PageFrame.tsx`. So a new template is mostly: an id, a definition with numbers and options, and one header.

## Steps

### 1. Add the id in the shared package

File: `packages/shared/src/cv/design.ts`.

`TEMPLATE_IDS` is made of two lists. Letters (cover and resignation) can only use `LETTER_TEMPLATE_IDS`. The newer CV-only templates come after the `// CV only.` comment:

```ts
export const TEMPLATE_IDS = [
  ...LETTER_TEMPLATE_IDS,
  // CV only.
  'portfolio',
  'elegant',
  // ...
  'executive',
] as const
```

Add your id to the end of that list. Do not add it to `LETTER_TEMPLATE_IDS` unless the letter renderers should really support it (they would need to look right too).

The id is saved inside every CV (`design.templateId`), so never rename an id later. Rename only the display name.

### 2. Give it a category

Same file. `TEMPLATE_CATEGORY` is a `Record<TemplateId, TemplateCategory>`, so TypeScript fails to compile until you add the new id:

```ts
export const TEMPLATE_CATEGORY: Record<TemplateId, TemplateCategory> = {
  // ...
  portfolio: 'design',
  elegant: 'design',
  // ...
}
```

The categories are `professional`, `design`, `marketing` and `sales`. The template pickers group templates by them.

### 3. Give it a letter fallback

Same file. A CV-only template needs a matching letter template, so a letter made from that CV still looks related. `LETTER_FALLBACK` is also a `Record`, so the compiler reminds you:

```ts
const LETTER_FALLBACK: Record<Exclude<TemplateId, LetterTemplateId>, LetterTemplateId> = {
  portfolio: 'creative',
  elegant: 'stylish',
  // ...
}
```

Pick the closest of the eight letter templates.

### 4. Add a title variant (only if the section titles look new)

File: `apps/web/src/renderer/context.ts` has the `TitleVariant` union (`'underline' | 'accent-rule' | 'accent-small' | 'bar' | 'pill' | 'block' | 'caps' | 'elegant'`). The drawing code is `SectionTitle` in `apps/web/src/renderer/editing/primitives.tsx`, one `if (titleVariant === '...')` per variant.

If an existing variant fits, reuse it (Spotlight reuses `pill`, Modern reuses `accent-rule`). If you need a new one:

1. Add it to the `TitleVariant` union.
2. Add a branch in `SectionTitle`. Use the CSS variables the page defines (`--cv-accent-text`, `--cv-strong`, `--cv-rule`, `--cv-title-bg`) and `em` units, never fixed pixels, so the text scales with the font size setting.
3. Check how it looks on a solid sidebar. `SOLID_SIDEBAR_VARS` in `apps/web/src/renderer/templates/pageStyle.ts` redefines those variables to white. Filled titles use `--cv-title-bg` so they stay visible. Stylish keeps its sidebar light for this reason ("A solid sidebar would hide the pill-shaped titles").

### 5. Write the header component

File: `apps/web/src/renderer/templates/headers.tsx`.

A header receives the `CvHeader` and draws name, headline, contacts and optionally the photo. Use `Field` for every editable text so in-place editing works, and `usePlaceholders()` for the placeholder text. Helpers in the same file: `Contacts` (layouts `row`, `column`, `centered`, `stacked`), `Photo`, `PhotoImage`. This is the Elegant header:

```tsx
export function ElegantHeader({ header }: { header: CvHeader }) {
  const P = usePlaceholders()
  return (
    <div className="flex items-center justify-between gap-[1.5em]">
      <div className="min-w-0">
        <Field
          value={header.name}
          path="header.name"
          placeholder={P.name}
          className="block text-[2.7em] leading-[1.05] font-normal italic"
          style={{ color: 'var(--cv-strong)' }}
        />
        {/* headline and <Contacts header={header} layout="row" /> follow */}
      </div>
      <Photo header={header} />
    </div>
  )
}
```

Notes:

- Sizes are in `em`, because the page font size is set on the page element.
- Hide empty contacts in preview, show them in edit mode. `Contacts` already does that; if you write your own layout, copy its `mode === 'edit' || header[key].trim()` filter.
- Some templates reuse a header: Portfolio and Spotlight both use the private `SidebarHeader` with `centered={false}` or `centered`; Multicolumn reuses `SingleColumnHeader`.
- If the header sits on a coloured band (`headerBand: true`), its text must use colours that work on the accent colour. Vivid and Executive do this; read them.

### 6. Add the definition

File: `apps/web/src/renderer/templates/templates.ts`.

Import your header at the top and add an entry. `TEMPLATES` is a `Record<TemplateId, TemplateDefinition>`, so a missing entry is a compile error. Fields (documented in the file):

- `columns`: `1` or `2`; `sidebarSide`: `'left'` or `'right'`.
- `headerPlacement`: `'main'` (top of the main column), `'full'` (whole page width) or `'sidebar'` (top of the sidebar, two columns only; Portfolio and Spotlight).
- `headerBand`: optional, a full-width header on an accent band.
- `titleVariant`, optional `timeline: true`, and `Header`.
- `sidebarOptions`: exactly four entries, one for each "Column layout" thumbnail in the Design & Font panel. Each has a `width` (fraction of the page) and a `fill` (`'none'`, `'tint'` or `'solid'`). Use the `NO_SIDEBAR` constant for one-column templates.
- `suggested`: font, column layout, spacing, font size and line height applied when the user picks the template.

```ts
  executive: {
    id: 'executive',
    name: 'Executive',
    columns: 2,
    sidebarSide: 'left',
    headerPlacement: 'full',
    headerBand: true,
    titleVariant: 'block',
    Header: ExecutiveHeader,
    sidebarOptions: [
      { width: 0.3, fill: 'none' },
      { width: 0.32, fill: 'tint' },
      { width: 0.34, fill: 'tint' },
      { width: 0.34, fill: 'solid' },
    ],
    suggested: {
      fontFamily: 'Noto Serif',
      columnLayout: 2,
      sectionSpacing: 2,
      fontSize: 2,
      lineHeight: 2,
    },
  },
```

The `name` field is an English fallback. The name users see comes from i18n (step 8).

### 7. Fonts (only if you need a new one)

The available fonts are `FONT_FAMILIES` in `packages/shared/src/cv/design.ts`, and their CSS stacks are `FONT_STACKS` in `apps/web/src/renderer/templates/fonts.ts`. Fonts must cover Cyrillic (Bulgarian CVs). Prefer one of the ten that exist. Elegant needed only an extra import for italics:

```ts
// The Elegant template's name is in italics.
import '@fontsource-variable/lora/wght-italic.css'
```

A new family also needs a Fontsource package, an import in `fonts.ts` and entries in `FONT_FAMILIES` and `FONT_STACKS`. It is a bigger change; ask first.

### 8. Add the names in all three languages

Files: `apps/web/src/i18n/locales/{en,bg,de}/labels.ts`, under `template:`.

```ts
// en
    executive: 'Executive',
// bg
    executive: 'Мениджърски',
// de
    executive: 'Führungskraft',
```

The English file is the source of the `Messages` type; the other two are typed `Messages['labels']`, so a missing key fails `pnpm typecheck`. Category names (`templateCategory`) only change if you add a category. More on i18n: [add-a-language.md](add-a-language.md) and `apps/web/src/i18n/README.md`.

### 9. Profession recommendations (optional)

File: `packages/shared/src/cv/professions.ts`. Each profession has `recommendedTemplates`, exactly three different ids. The first is the default for that profession:

```ts
recommendedTemplates: ['creative', 'portfolio', 'vivid'],
```

`professions.test.ts` checks that there are three, different, and that they exist. If you change a profession, the tests that name the recommended templates change too (see step 10).

### 10. Update the tests

Run the tests; the ones that count templates fail with useful messages. In the template commit these were changed:

| Test file                                                      | What to update                                                                                                                   |
| -------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------- |
| `apps/web/src/features/cv-editor/panels/DesignPanels.test.tsx` | Total number of template buttons (16), count per group (Professional 4, Design 5, Marketing 3, Sales 4), recommended names.      |
| `apps/web/src/features/new-cv/newCv.test.tsx`                  | Total across the groups (16) and the recommended names for the profession.                                                       |
| `apps/web/src/features/cover-letters/coverLetters.test.tsx`    | Only if you changed `LETTER_TEMPLATE_IDS` (the letters list has 8 buttons and no Portfolio).                                     |
| `packages/shared/src/cv/templates.test.ts`                     | Usually nothing: it checks that every id has a category and a letter fallback. Add a case if your fallback has a special reason. |
| `apps/web/src/renderer/document/CvRenderer.test.tsx`           | Renders every profession with every template automatically. Add a test if the header does something special (initials, sidebar). |
| `e2e/tests/visual.spec.ts`, `e2e/tests/cross-browser.spec.ts`  | The hard-coded count `16` (`toHaveCount(16)` and the loop `i < 16`).                                                             |
| `e2e/tests/__screenshots__/visual.spec.ts/`                    | New `thumbnail-<name>.png`, made by CI, see step 11.                                                                             |

Example of a renderer test for a special header, from `CvRenderer.test.tsx`:

```tsx
it('shows the initials instead of a photo in the Monogram template', () => {
  const cv = createExampleCv('sales-marketing')
  cv.design.templateId = 'monogram'
  cv.header = { ...cv.header, name: 'Aman Verma', showPhoto: false }
  render(<CvRenderer cv={cv} mode="preview" />)
  expect(visiblePages().getByText('AV')).toBeDefined()
})
```

### 11. Screenshots

`e2e/tests/visual.spec.ts` takes a picture of every template's thumbnail and of full pages for one template per kind of header (`polished`, `portfolio`, `vivid`, `bold`, `elegant`, `monogram`). Pixels differ a little between computers, so the pictures that count are made by CI.

1. Push your branch and open a pull request.
2. Add the label `update-screenshots` to the pull request (workflow `.github/workflows/update-screenshots.yml`).
3. After a few minutes a commit "Update template screenshots" appears on your branch. Open it and look at the new pictures. Are they what you intended?
4. GitHub holds back the other checks on a commit made by a workflow. Open the waiting CI run and press "Approve and run", or push any change.

Locally the visual tests run only with `E2E_VISUAL=1` (see `e2e/playwright.config.ts`); do not commit pictures made on your machine. To get a full-size picture of your template, add its id to the `for (const id of [...])` list in `visual.spec.ts`.

## Verification checklist

```bash
pnpm --filter @cv/shared test        # categories, fallbacks, professions
pnpm --filter @cv/web test           # panels, wizard, renderer
pnpm typecheck                       # Records fail here if you forgot a key
pnpm lint && pnpm format:check
pnpm build
```

Then look at it:

- Run the app (`pnpm dev`), open a CV, Templates panel: your template is in the right group.
- Try all four Column layout options, a photo in each shape, a long name, an empty CV (edit mode shows placeholders), and the preview page.
- Switch to Bulgarian and German to check the name, and create a cover letter from a CV that uses your template: it should get the fallback template.

## Common mistakes

- Forgetting `TEMPLATE_CATEGORY` or `LETTER_FALLBACK`. TypeScript catches it, but a `Record` cast would hide it. Do not cast.
- Fixed `px` sizes in a header. Use `em`.
- Colours hard-coded in the header. Use the `--cv-*` variables so solid sidebars and dark text on bands keep working.
- Putting a CV-only id in `LETTER_TEMPLATE_IDS`: the letter pickers then show it.
- Forgetting the counts in `visual.spec.ts` and `cross-browser.spec.ts`; they only run in e2e.
- Committing screenshots made on your own machine.
- Treating `TemplateDefinition.name` as the visible name: the pickers use `labels.template.<id>` from i18n.
