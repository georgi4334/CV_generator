import {
  createCoverLetter,
  createEmptyCv,
  createExampleCv,
  createResignationLetter,
} from '@cv/shared'
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PrintHost } from './PrintHost'
import { printCv, printDocument, usePrintJob } from './printCv'

const printRoot = () => screen.queryByTestId('print-root')

describe('printing (Download PDF)', () => {
  const print = vi.fn()

  beforeEach(() => {
    print.mockReset()
    vi.spyOn(window, 'print').mockImplementation(print)
    document.title = 'CV Generator'
    usePrintJob.setState({ job: null })
  })
  afterEach(() => vi.restoreAllMocks())

  it('prints only the CV, in preview mode, named after the CV', async () => {
    render(<PrintHost />)
    expect(printRoot()).toBeNull()
    const cv = createExampleCv('designer')
    act(() => printCv(cv, 'Designer CV'))

    const root = printRoot()!
    expect(root.parentElement).toBe(document.body)
    expect(root.textContent).toContain(cv.header.name)
    expect(root.querySelector('style')!.textContent).toContain('size: A4 portrait')
    await waitFor(() => expect(print).toHaveBeenCalledOnce())
    expect(document.title).toBe('Designer CV')

    act(() => void window.dispatchEvent(new Event('afterprint')))
    expect(printRoot()).toBeNull()
    expect(document.title).toBe('CV Generator')
  })

  it('leaves out placeholders and uses the CV page size', async () => {
    render(<PrintHost />)
    const cv = createEmptyCv()
    cv.design.pageSize = 'Letter'
    act(() => printCv(cv, 'Empty'))
    const root = printRoot()!
    expect(root.querySelector('[data-placeholder]')).toBeNull()
    expect(root.querySelector('[data-cv-page]')!.getAttribute('data-cv-page')).toBe('Letter')
    expect(root.querySelector('style')!.textContent).toContain('size: letter portrait')
    await waitFor(() => expect(print).toHaveBeenCalledOnce())
  })

  it('prints again when asked again', async () => {
    render(<PrintHost />)
    act(() => printCv(createEmptyCv(), 'One'))
    await waitFor(() => expect(print).toHaveBeenCalledTimes(1))
    act(() => printCv(createEmptyCv(), 'Two'))
    await waitFor(() => expect(print).toHaveBeenCalledTimes(2))
    expect(document.title).toBe('Two')
  })

  it("keeps a letter's margins on every page after the first, and a CV edge to edge", async () => {
    render(<PrintHost />)
    const letter = createResignationLetter()
    act(() => printDocument({ kind: 'resignation', letter }, 'Leaving'))
    const style = printRoot()!.querySelector('style')!.textContent!
    expect(style).toMatch(/@page \{ size: A4 portrait; margin: \d+px 0; \}/)
    expect(style).toContain('@page :first { margin-top: 0; }')
    expect(printRoot()!.style.getPropertyValue('--letter-margin')).toMatch(/^\d+px$/)
    await waitFor(() => expect(print).toHaveBeenCalledOnce())
    act(() => void window.dispatchEvent(new Event('afterprint')))

    act(() => printDocument({ kind: 'coverLetter', letter: createCoverLetter() }, 'Letter'))
    expect(printRoot()!.querySelector('style')!.textContent).toContain('@page :first')
    act(() => void window.dispatchEvent(new Event('afterprint')))

    act(() => printCv(createEmptyCv(), 'CV'))
    const cvStyle = printRoot()!.querySelector('style')!.textContent!
    expect(cvStyle).toContain('margin: 0;')
    expect(cvStyle).not.toContain(':first')
    expect(printRoot()!.style.getPropertyValue('--letter-margin')).toBe('0px')
  })
})
