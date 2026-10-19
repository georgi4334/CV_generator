# Add a CV section type or a field to a section

Use this guide when you want to:

- add a **field** to an item of an existing section (for example a "grade" on education), or
- add a whole new **section type** (for example "Volunteering" or "Publications").

The worked example is `certificates`, because it has a nullable date field that was added later (`expiryDate`, commit `e99a5f6`), a link, and its own editing control. `projects` is a good second example for a section with bullets.

## Prerequisites

- Read [../domain-model.md](../domain-model.md) (what a CV document is) and [../web/renderer.md](../web/renderer.md) (blocks, items, pagination).
- Know that the CV is stored as one JSON document (JSONB) in the `cvs` table. There is no table per section, so **adding a field or section needs no database migration**.

## The most important rule: old documents must still open

Saved CVs do not change when you change the code. The web app reads every CV through `CvRecordSchema` (`apps/web/src/features/cv-editor/api.ts`), which contains `CvDocumentSchema`. If a stored document lacks a field that your schema requires, parsing fails and the CV does not open.

So a new field on an existing item must be optional-with-default. This is how `expiryDate` was added in `packages/shared/src/cv/sections.ts`:

```ts
export const CertificateItemSchema = z.object({
  id: IdSchema,
  name: z.string(),
  issuer: z.string(),
  date: YearMonthSchema.nullable(),
  /** When it runs out; `null` for certificates that never expire. Missing in older CVs. */
  expiryDate: YearMonthSchema.nullable().default(null),
  link: z.string(),
})
```

The header does the same for `photoShape` (`.default('circle')` in `header.ts`). `CV_SCHEMA_VERSION` (`packages/shared/src/cv/document.ts`) is `z.literal(1)`. Its comment says to bump it and add a migration when the shape changes, but I found no migration code in the repo. Do not bump it for an additive field; use `.default()`. See "Open questions".

A new **section type** is different: old documents simply do not contain it, so nothing breaks. But a section type the code does not know is rejected by the discriminated union, so never remove or rename a type.

## Part A: add a field to an existing section

### A1. Schema

Add the field to the item schema in `packages/shared/src/cv/sections.ts` with `.default(...)`:

```ts
degreeGrade: z.string().default(''),
```

The inferred type (`EducationItem`) now has the field. TypeScript will point you to every place that builds an item.

### A2. Factory

`createItem` in `packages/shared/src/cv/factories.ts` returns a blank item per type, typed so a missing field is an error:

```ts
certificates: { id, name: '', issuer: '', date: null, expiryDate: null, link: '' },
```

Add your field with its blank value. This also matters for typing: `setAtPath` (`apps/web/src/features/cv-editor/state/documentPath.ts`) only writes to a key that already exists in the object (`last in node`), so a field missing from a stored item would silently ignore typing. The `.default()` from step A1 fills it when the document is read.

### A3. Examples

`packages/shared/src/examples/index.ts` holds the sample CVs per profession (used for the new-CV wizard previews and "Start from an example"). Add the field where it makes the example nicer (`expiryDate: '2026-05'`). `examples.test.ts` checks every example is a valid document.

### A4. Renderer

Items are drawn in `apps/web/src/renderer/sections/items.tsx`. Every editable text is a `Field` with a `path` built by `pathOf(refs, 'fieldName')` and a placeholder from `usePlaceholders()`:

```tsx
<Field value={item.issuer} path={pathOf(refs, 'issuer')} placeholder={P.issuer} />
```

For non-text values (a date, a toggle, a choice) use `useUpdate(refs)` which calls `editor.updateItem(sectionId, itemId, patch)`. `CertificateView` does this with `CertificateDatesField` (a picker in `renderer/editing/primitives.tsx` and `dateInputs.tsx`) and formats the text with `formatCertificateDates` from `packages/shared/src/cv/i18n.ts`.

Rules for the markup: use `em` units; use the `--cv-*` colours (see [add-a-template.md](add-a-template.md)); show optional rows only in edit mode when empty. `CredentialLink` is a good example: in edit mode it shows an input, in preview it shows a link only if there is one, and with `staticLinks` (thumbnails) it shows plain text.

### A5. Placeholders (CV language)

The grey hint texts inside the CV follow the **CV language**, not the interface language. They live in `apps/web/src/renderer/placeholders.ts`: `EN` is the source, `PLACEHOLDERS` maps `'en-US'`, `'en-GB'` (spread of `EN` with overrides) and `bg`. `Placeholders` is `typeof EN`, so a key missing from `bg` is a compile error:

```ts
certificateDates: 'Issued · expires',        // EN
certificateDates: 'Издаден · валиден до',    // bg
```

Fixed words that appear in the printed CV (not placeholders), like "Expires", are in `packages/shared/src/cv/i18n.ts` per CV language (`EXPIRES`).

### A6. Interface texts (only if you added UI)

If the field has its own control with a label, a tooltip or an aria-label, those texts are interface texts and go in `apps/web/src/i18n/locales/{en,bg,de}/renderer.ts` (or `editor.ts`). All three files, or `pnpm typecheck` fails. See [add-a-language.md](add-a-language.md).

### A7. Other readers of the item

- **AI**: `packages/shared/src/ai/ai.ts` has `itemTexts()` listing the text fields the AI may read and improve. Add your field if it is free text worth improving. Links and dates are left out (see `certificates`).
- **"Hide personal details" share links**: `hidePersonalDetails` in `packages/shared/src/documents/share.ts` replaces names and contacts. A new field with personal data needs handling there; read it before deciding.
- **Empty items**: `isItemEmpty` in `renderer/sections/blocks.tsx` decides if an item is hidden in preview. Only string and array fields count; other types are ignored.

### A8. Tests

- `packages/shared/src/cv/cv.test.ts`: add a case that an older document without the field still parses and gets the default.
- `packages/shared/src/cv/format.test.ts` if you added a formatter.
- `apps/web/src/renderer/document/CvRenderer.test.tsx`: render a CV with the field and check the text (see how `expiryDate` is tested there).
- Editor behaviour: `apps/web/src/features/cv-editor/editor.test.tsx`.

## Part B: add a new section type

Everything in Part A applies to its item. In addition:

### B1. Shared schema

In `packages/shared/src/cv/sections.ts`:

1. Add an item schema (`XxxItemSchema`, with `id: IdSchema`).
2. Add the id to `SECTION_TYPES`.
3. Add a section schema with `...sectionBase`, `type: z.literal('xxx')` and `items: z.array(XxxItemSchema)`, plus any section-level options (like `levelDisplay`).
4. Add it to the `SectionSchema` discriminated union and export the item type.

### B2. Factories

`packages/shared/src/cv/factories.ts`: add an entry to **both** `createItem` and `createSection`. Both are typed with a mapped type over `SectionType`, so the compiler tells you.

### B3. Default title in every CV language

`DEFAULT_SECTION_TITLES` in `packages/shared/src/cv/i18n.ts` has an entry per CV language (`en-US`, `en-GB`, `bg`). Add the title to all three. The Rearrange panel's "Add section" menu uses these titles as the button labels, so there is no separate interface key for the type name.

### B4. Renderer

1. In `apps/web/src/renderer/sections/items.tsx`, add `XxxView({ item, refs })`.
2. In `apps/web/src/renderer/sections/blocks.tsx`, add a `case` in `renderItem` (otherwise it returns `null` and the section shows a title with nothing under it). If the entries are dated and should sit on the Timeline template's line, add the type to `DATED_TYPES`.
3. Summary and skills have their own branches in `buildBlocks`. A normal item section needs nothing more.

### B5. Editor

- `apps/web/src/features/cv-editor/panels/RearrangePanel.tsx`: new sections go to the sidebar unless the type is in `MAIN_TYPES` (`summary`, `experience`, `education`, `projects`). Add yours there if it belongs in the wide column.
- Item add / move / duplicate / delete work for any type through `createItem` (`cvEditorStore.ts`). No code is needed.
- One section of each type per CV, except `custom` (`taken` check in `RearrangePanel`).

### B6. Professions and AI

- `packages/shared/src/cv/professions.ts`: add `['xxx', 'main' | 'sidebar']` to the professions that should start with it. `examples.test.ts` requires the example CV to follow the profession's layout, so update `examples/index.ts` too.
- `SECTION_LABELS` and `itemTexts()` in `packages/shared/src/ai/ai.ts` are both exhaustive: add the type.

### B7. Tests

`professions.test.ts` and `examples.test.ts` run over all of this. Add a renderer test (`CvRenderer.test.tsx`) and a store test for adding the section (`cvEditorStore.test.ts`).

## Verification checklist

```bash
pnpm typecheck                 # exhaustive Records / switches point at what you missed
pnpm --filter @cv/shared test
pnpm --filter @cv/web test
pnpm lint && pnpm format:check
pnpm e2e                       # at least editor/quality specs if you changed editing
```

By hand:

- Open an **existing** CV created before your change. It must open and save.
- Add the section or fill the field in the editor; reload; the value is still there.
- Preview and PDF (print) show it; an empty item is hidden in preview.
- Switch the CV language to Bulgarian: the title and placeholder are translated.
- Share link opens; thumbnails on Documents still render.

## Common mistakes

- A new field without `.default()`: old CVs stop opening.
- Forgetting the `bg` placeholder: compile error, easy. Forgetting `en-GB`: it inherits `EN`, so check the spelling by eye (`issuer` is overridden to "organisation").
- Adding the type to `SECTION_TYPES` but not to `renderItem`: the section renders only a title.
- Using `px` or fixed colours in a view.
- Saving limits: every text is limited to `TEXT_MAX` (5000) characters when **saving** (`SaveableCvSchema` in `packages/shared/src/api/api.ts`) and while typing (`EditableText`), but **not when reading**, so older documents still open. Do not put the limit in `CvDocumentSchema` itself. Header fields have their own `HEADER_LIMITS` in `header.ts`. If your field needs a smaller limit, follow the header pattern: a limits object, a `fieldMaxLength` style lookup used while typing, and a `refine` in `api.ts`.
- Writing a field name in `pathOf` that does not exist on the object: typing is ignored without an error.

## Open questions

- `CV_SCHEMA_VERSION` is `1` and nothing reads it except the schema literal. If a breaking change ever needs a migration, there is no framework for it yet; I could not find one.
