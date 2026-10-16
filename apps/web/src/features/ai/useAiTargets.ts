import {
  cvFields,
  letterFields,
  type AiSuggestion,
  type CoverLetterDocument,
  type CoverLetterRecord,
  type CvDocument,
  type CvRecord,
} from '@cv/shared'
import { useQueryClient } from '@tanstack/react-query'
import { useMemo } from 'react'
import { i18n } from '../../i18n'
import { cvApi } from '../../lib/cvApi'
import { cvKeys, rememberCv } from '../../lib/cvQueries'
import { jobKeys } from '../../lib/jobQueries'
import { useCvEditor } from '../editor/cvEditorStore'
import { getAtPath, setAtPath } from '../editor/documentPath'
import { flushSave } from '../editor/editorSession'
import { useLetterEditor } from '../letter/letterEditorStore'
import type { AiTarget, BulletEntry } from './aiTarget'

const textAt = (doc: unknown, path: string) => {
  const value = getAtPath(doc, path)
  return typeof value === 'string' ? value : null
}

function bulletEntries(cv: CvDocument): BulletEntry[] {
  const entries: BulletEntry[] = []
  for (const section of cv.sections) {
    if (section.type !== 'experience' && section.type !== 'projects') continue
    const isExperience = section.type === 'experience'
    const names: [string, string][] =
      section.type === 'experience'
        ? section.items.map((i) => {
            const parts = [i.title, i.company].filter((p) => p.trim())
            return [
              i.id,
              parts.length === 2
                ? i18n.t('ai.entry.titleAtCompany', { title: i.title, company: i.company })
                : (parts[0] ?? ''),
            ]
          })
        : section.items.map((i) => [i.id, i.name])
    for (const [itemId, name] of names) {
      entries.push({
        path: `sections.${section.id}.items.${itemId}`,
        label: i18n.t(isExperience ? 'ai.entry.experience' : 'ai.entry.project', {
          name: name.trim() || i18n.t('ai.entry.untitled'),
        }),
        sectionId: section.id,
        itemId,
      })
    }
  }
  return entries
}

/** The CV editor's side of the AI panels. */
export function useCvAiTarget(record: CvRecord, cv: CvDocument): AiTarget {
  const queryClient = useQueryClient()
  return useMemo(() => {
    const store = useCvEditor.getState()
    const summary = cv.sections.find((s) => s.type === 'summary')
    return {
      kind: 'cv',
      language: cv.language,
      fields: cvFields(cv),
      getText: (path) => textAt(useCvEditor.getState().cv, path),
      setText: (path, text) => {
        store.setField(path, text)
        store.endTyping()
      },
      cv: {
        id: record.id,
        title: record.title,
        jobId: record.jobId,
        summaryPath: summary ? `sections.${summary.id}.text` : null,
        entries: bulletEntries(cv),
        setBullets: (entry, bullets) =>
          store.updateItem(entry.sectionId, entry.itemId, { bullets }),
        createTailoredCopy: async (rewrites: AiSuggestion[], jobId: string | null) => {
          // The copy is made on the server, so save pending edits first.
          await flushSave()
          const copy = await cvApi.duplicate(record.id, jobId ?? undefined)
          const document = structuredClone(copy.document)
          for (const rewrite of rewrites) {
            if (textAt(document, rewrite.path) !== null)
              setAtPath(document, rewrite.path, rewrite.replacement)
          }
          const saved = await cvApi.update(copy.id, {
            revision: copy.revision,
            document,
            // A copy for a saved job is already named after the company.
            ...(jobId ? {} : { title: i18n.t('ai.tailoredSuffix', { title: record.title }) }),
          })
          rememberCv(queryClient, saved)
          await queryClient.invalidateQueries({ queryKey: cvKeys.list })
          if (jobId) await queryClient.invalidateQueries({ queryKey: jobKeys.list })
          return saved.id
        },
      },
    } satisfies AiTarget
  }, [cv, record.id, record.title, record.jobId, queryClient])
}

/** The cover-letter editor's side of the AI panels. */
export function useLetterAiTarget(
  record: CoverLetterRecord,
  letter: CoverLetterDocument,
): AiTarget {
  return useMemo(() => {
    const store = useLetterEditor.getState()
    return {
      kind: 'coverLetter',
      language: letter.language,
      fields: letterFields(letter),
      getText: (path) => textAt(useLetterEditor.getState().letter, path),
      setText: (path, text) => {
        store.setField(path, text)
        store.endTyping()
      },
      letter: {
        cvId: record.cvId,
        jobId: record.jobId,
        setParagraphs: (paragraphs) =>
          store.change((draft) => {
            draft.paragraphs = paragraphs
          }),
      },
    } satisfies AiTarget
  }, [letter, record.cvId, record.jobId])
}
