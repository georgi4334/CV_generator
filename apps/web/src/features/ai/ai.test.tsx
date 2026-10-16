import type { CvDocument, FixMistakesInput, TailorInput } from '@cv/shared'
import { fireEvent, screen, waitFor, within } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { ApiRequestError } from '@/shared/api/client'
import type { FakeAiApi } from '@/test/fakeAiApi'
import type { FakeCvApi } from '@/test/fakeCvApi'
import { renderRoute } from '@/test/renderRoute'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import { useCvEditor } from '@/features/cv-editor/state/cvEditorStore'
import { useLetterEditor } from '@/features/cover-letters/state/letterEditorStore'

const fake = vi.hoisted(() => ({ current: null as unknown as FakeCvApi }))
const ai = vi.hoisted(() => ({ current: null as unknown as FakeAiApi }))

vi.mock('@/features/cv-editor/api', async () => {
  const { createFakeCvApi } = await import('@/test/fakeCvApi')
  fake.current ??= createFakeCvApi()
  return { cvApi: fake.current.api }
})
vi.mock('@/features/cover-letters/api', async () => {
  const { createFakeCvApi } = await import('@/test/fakeCvApi')
  fake.current ??= createFakeCvApi()
  return { coverLetterApi: fake.current.coverLetterApi }
})
vi.mock('@/features/jobs/api', async () => {
  const { createFakeCvApi } = await import('@/test/fakeCvApi')
  fake.current ??= createFakeCvApi()
  return { jobsApi: fake.current.jobsApi }
})
vi.mock('./api', async () => {
  const { createFakeAiApi } = await import('@/test/fakeAiApi')
  ai.current ??= createFakeAiApi()
  return { aiApi: ai.current.api }
})

beforeEach(() => {
  fake.current.reset()
  ai.current.reset()
  useEditorUi.setState({ activePanel: null, notice: null, previewVersionId: null })
  useCvEditor.setState({ docId: null, cv: null, past: [], future: [] })
})

const POSTING =
  'We need a frontend engineer with React, Kubernetes and a passion for accessibility in large teams.'

const summaryOf = (cv: CvDocument) => {
  const section = cv.sections.find((s) => s.type === 'summary')!
  if (section.type !== 'summary') throw new Error()
  return section
}

async function openCv(panel: 'Fix Mistakes' | 'Check & Tailor' | 'AI Assistant') {
  const cv = fake.current.seed('Frontend CV')
  const router = renderRoute(`/cvs/${cv.id}/edit`)
  await screen.findByDisplayValue('Frontend CV')
  fireEvent.click(screen.getByRole('button', { name: panel }))
  const aside = await screen.findByRole('complementary', { name: panel })
  return { cv, router, aside: within(aside) }
}

describe('Fix Mistakes', () => {
  it('applies an accepted fix to the CV (undoable) and leaves rejected ones', async () => {
    let sent: FixMistakesInput | undefined
    ai.current.state.fix = (input) => {
      sent = input
      const headline = input.fields.find((f) => f.path === 'header.headline')!
      const word = headline.text.split(' ')[0]!
      return {
        suggestions: [
          {
            path: 'header.headline',
            label: 'Headline',
            original: word,
            replacement: `${word}X`,
            reason: 'Spelling',
          },
          {
            path: 'header.headline',
            label: 'Headline',
            original: `${word} `,
            replacement: 'Nope ',
            reason: 'Other',
          },
        ],
      }
    }
    const { aside } = await openCv('Fix Mistakes')
    fireEvent.click(await aside.findByRole('button', { name: 'Check spelling & grammar' }))
    await aside.findByText('2 of 2 suggestions open')
    expect(sent!.language).toBe('en-US')
    expect(sent!.fields.length).toBeGreaterThan(5)

    const before = useCvEditor.getState().cv!.header.headline
    const [first, second] = aside.getAllByRole('listitem')
    fireEvent.click(within(first!).getByRole('button', { name: 'Accept' }))
    const word = before.split(' ')[0]!
    expect(useCvEditor.getState().cv!.header.headline).toBe(before.replace(word, `${word}X`))
    // The second suggestion's text is gone now.
    fireEvent.click(within(second!).getByRole('button', { name: 'Accept' }))
    expect(within(second!).getByText(/text changed since the check/)).toBeDefined()

    useCvEditor.getState().undo()
    expect(useCvEditor.getState().cv!.header.headline).toBe(before)
  })

  it('says when there is nothing to fix', async () => {
    const { aside } = await openCv('Fix Mistakes')
    fireEvent.click(await aside.findByRole('button', { name: 'Check spelling & grammar' }))
    expect(await aside.findByText('No mistakes found.')).toBeDefined()
    expect(aside.getByText(/29 of 30 AI requests left today/)).toBeDefined()
  })

  it('shows the daily limit message', async () => {
    ai.current.state.fix = () =>
      new ApiRequestError(429, 'ai_limit', 'You have used all 30 AI requests for today.')
    const { aside } = await openCv('Fix Mistakes')
    fireEvent.click(await aside.findByRole('button', { name: 'Check spelling & grammar' }))
    expect((await aside.findByRole('alert')).textContent).toContain('all your AI requests')
  })

  it('explains when AI is not set up', async () => {
    ai.current.state.enabled = false
    const { aside } = await openCv('Fix Mistakes')
    expect(await aside.findByText('AI is not set up on this server.')).toBeDefined()
    expect(aside.queryByRole('button', { name: 'Check spelling & grammar' })).toBeNull()
  })
})

describe('Check & Tailor', () => {
  const tailorAnswer = (input: TailorInput) => {
    const summary = input.fields.find((f) => f.label === 'Summary')!
    return {
      keywords: [
        { term: 'React', importance: 'high' as const },
        { term: 'Kubernetes', importance: 'high' as const },
      ],
      advice: ['Mention Kubernetes if you used it.'],
      rewrites: [
        {
          path: summary.path,
          label: 'Summary',
          original: summary.text,
          replacement: `${summary.text} Experienced with Kubernetes.`,
          reason: 'Adds Kubernetes',
        },
      ],
    }
  }

  it('scores the CV, applies a rewrite and the score goes up', async () => {
    ai.current.state.tailor = tailorAnswer
    const { aside } = await openCv('Check & Tailor')
    fireEvent.change(await aside.findByPlaceholderText('Paste the full job description…'), {
      target: { value: POSTING },
    })
    fireEvent.click(aside.getByRole('button', { name: 'Check match' }))
    expect(await aside.findByLabelText('Match score 50%')).toBeDefined()
    expect(aside.getByText('Missing (1)')).toBeDefined()

    fireEvent.click(aside.getByRole('button', { name: 'Apply' }))
    expect(summaryOf(useCvEditor.getState().cv!).text).toContain('Experienced with Kubernetes.')
    expect(await aside.findByLabelText('Match score 100%')).toBeDefined()
  })

  it('uses a saved job’s description and saves a tailored copy linked to the job', async () => {
    ai.current.state.tailor = tailorAnswer
    const job = fake.current.seedJob({
      position: 'Engineer',
      company: 'Acme',
      description: POSTING,
    })
    const { cv, router, aside } = await openCv('Check & Tailor')
    await aside.findByRole('option', { name: 'Engineer at Acme' })
    fireEvent.change(aside.getByRole('combobox'), { target: { value: job.id } })
    fireEvent.click(aside.getByRole('button', { name: 'Check match' }))
    await aside.findByLabelText('Match score 50%')
    expect((ai.current.state.requests[0] as TailorInput).jobDescription).toBe(POSTING)

    fireEvent.click(aside.getByRole('button', { name: /Save as tailored copy/ }))
    await waitFor(() => expect(router.state.location.pathname).not.toBe(`/cvs/${cv.id}/edit`))
    const copyId = router.state.location.pathname.split('/')[2]!
    const copy = fake.current.cvs.get(copyId)!
    expect(copy.title).toBe('Frontend CV – Acme')
    expect(copy.jobId).toBe(job.id)
    expect(summaryOf(copy.document).text).toContain('Experienced with Kubernetes.')
    // The original CV is unchanged.
    expect(summaryOf(fake.current.cvs.get(cv.id)!.document).text).not.toContain('Kubernetes')
  })
})

describe('AI Assistant', () => {
  it('improves the summary after the user accepts the proposal', async () => {
    ai.current.state.assist = () => ({ texts: ['A sharper summary.'] })
    const { aside } = await openCv('AI Assistant')
    fireEvent.change(await aside.findByPlaceholderText(/shorter, more confident/), {
      target: { value: 'shorter' },
    })
    fireEvent.click(aside.getByRole('button', { name: 'Improve' }))
    expect(await aside.findByText('A sharper summary.')).toBeDefined()
    expect(summaryOf(useCvEditor.getState().cv!).text).not.toBe('A sharper summary.')
    fireEvent.click(aside.getByRole('button', { name: 'Replace' }))
    expect(summaryOf(useCvEditor.getState().cv!).text).toBe('A sharper summary.')
    expect(ai.current.state.requests[0]).toMatchObject({ task: 'summary', instruction: 'shorter' })
  })

  it('rewrites the bullets of an experience entry', async () => {
    ai.current.state.assist = () => ({ texts: ['Shipped A', 'Shipped B'] })
    const { aside } = await openCv('AI Assistant')
    const select = await aside.findByRole('combobox')
    const option = within(select).getAllByRole('option')[1] as HTMLOptionElement
    fireEvent.change(select, { target: { value: option.value } })
    fireEvent.click(aside.getByRole('button', { name: 'Improve' }))
    await aside.findByText('Shipped A')
    fireEvent.click(aside.getByRole('button', { name: 'Replace' }))
    const experience = useCvEditor.getState().cv!.sections.find((s) => s.type === 'experience')!
    if (experience.type !== 'experience') throw new Error()
    expect(experience.items[0]!.bullets).toEqual(['Shipped A', 'Shipped B'])
  })

  it('writes a cover letter from the linked CV and job', async () => {
    ai.current.state.assist = () => ({ texts: ['First.', 'Second.', 'Third.'] })
    const cv = fake.current.seed('Frontend CV')
    const job = fake.current.seedJob({
      position: 'Engineer',
      company: 'Acme',
      description: POSTING,
    })
    const letter = fake.current.seedLetter('Letter', { cvId: cv.id, jobId: job.id })
    renderRoute(`/cover-letters/${letter.id}/edit`)
    await screen.findByDisplayValue('Letter')
    fireEvent.click(screen.getByRole('button', { name: 'Check & Tailor' }))
    expect(useEditorUi.getState().notice).toContain('works on CVs')
    fireEvent.click(screen.getByRole('button', { name: 'AI Assistant' }))
    const aside = within(await screen.findByRole('complementary', { name: 'AI Assistant' }))
    await aside.findByText(/from “Frontend CV” for Engineer at Acme/)
    fireEvent.click(aside.getByRole('button', { name: 'Write the letter' }))
    await aside.findByText('Second.')
    fireEvent.click(aside.getByRole('button', { name: 'Replace paragraphs' }))
    expect(useLetterEditor.getState().letter!.paragraphs).toEqual(['First.', 'Second.', 'Third.'])
    const request = ai.current.state.requests[0] as { fields: { path: string }[]; company: string }
    expect(request.company).toBe('Acme')
    expect(request.fields.some((f) => f.path.startsWith('cv.sections.'))).toBe(true)
  })
})
