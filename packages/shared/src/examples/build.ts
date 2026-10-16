import { DEFAULT_DESIGN, type CvDesign } from '../cv/design'
import { CV_SCHEMA_VERSION, type CvDocument } from '../cv/document'
import type { CvHeader } from '../cv/header'
import type { Section } from '../cv/sections'
import { createId } from '../common/id'

type WithoutId<T> = T extends unknown ? Omit<T, 'id'> : never
type ItemInput<S> = S extends { items: Array<infer I> } ? Omit<I, 'id'> : never
type SectionInput = {
  [K in Section['type']]: WithoutId<
    Omit<Extract<Section, { type: K }>, 'items' | 'title' | 'visible'>
  > & {
    items?: Array<ItemInput<Extract<Section, { type: K }>>>
  }
}[Section['type']]

/** Builds an example CV with fresh ids, so every copy is independent. */
export function buildExample(
  header: Omit<CvHeader, 'photoUrl' | 'showPhoto'>,
  sections: SectionInput[],
  design: Partial<CvDesign> = {},
): CvDocument {
  return {
    schemaVersion: CV_SCHEMA_VERSION,
    language: 'en-US',
    header: { ...header, photoUrl: null, showPhoto: false },
    sections: sections.map(
      (s) =>
        ({
          ...s,
          id: createId(),
          title: null,
          visible: true,
          ...('items' in s && s.items
            ? { items: s.items.map((item) => ({ ...item, id: createId() })) }
            : {}),
        }) as Section,
    ),
    design: { ...DEFAULT_DESIGN, ...design },
  }
}

export const range = (startDate: string | null, endDate: string | null = null) => ({
  startDate,
  endDate,
  isCurrent: endDate === null,
})
