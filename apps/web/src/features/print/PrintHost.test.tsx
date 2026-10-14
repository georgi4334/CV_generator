import { createEmptyCv, createExampleCv } from '@cv/shared'
import { act, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PrintHost } from './PrintHost'
import { printCv, usePrintJob } from './printCv'

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
})
