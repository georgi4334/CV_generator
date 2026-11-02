import { createEmptyCv } from '@cv/shared'
import { act, fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { cvApi } from '@/features/cv-editor/api'
import { useCvEditor } from '@/features/cv-editor/state/cvEditorStore'
import { useEditorUi } from '@/features/cv-editor/state/editorUi'
import * as image from '@/renderer/editing/image'
import { ApiRequestError } from '@/shared/api/client'
import { useToasts } from '@/shared/stores/toasts'
import { PhotoPicker } from './PhotoPicker'

const state = () => useCvEditor.getState()
const upload = () => screen.getByRole('button', { name: /^Upload photo$|^Uploading/ })
const toastText = () =>
  useToasts
    .getState()
    .toasts.map((t) => String(t.message))
    .join(' | ')
const image1 = () => new Blob(['x'], { type: 'image/jpeg' })
const stored = { id: 'me', url: '/api/images/me.jpg', contentType: 'image/jpeg', size: 1 }

beforeEach(() => {
  state().load('cv-test', createEmptyCv())
  useToasts.setState({ toasts: [] })
  useEditorUi.setState({ notice: null })
})
afterEach(() => vi.restoreAllMocks())

describe('PhotoPicker failures', () => {
  it('does nothing when the file picker is cancelled', async () => {
    vi.spyOn(image, 'pickImage').mockResolvedValue(null)
    const send = vi.spyOn(cvApi, 'uploadImage')
    render(<PhotoPicker />)
    fireEvent.click(upload())
    await waitFor(() => expect((upload() as HTMLButtonElement).disabled).toBe(false))
    expect(send).not.toHaveBeenCalled()
    expect(state().cv!.header.photoUrl).toBeNull()
    expect(toastText()).toBe('')
  })

  it('tells why a file that is not an image was refused, and keeps the CV unchanged', async () => {
    vi.spyOn(image, 'pickImage').mockRejectedValue(new Error('Choose an image file'))
    render(<PhotoPicker />)
    fireEvent.click(upload())
    await waitFor(() => expect(toastText()).toContain('Photo not uploaded: Choose an image file'))
    expect(state().cv!.header.photoUrl).toBeNull()
    expect(state().past).toHaveLength(0)
  })

  it.each([
    ['a file that is too large', new ApiRequestError(413, 'file_too_large', 'raw')],
    ['an unsupported type', new ApiRequestError(415, 'unsupported_type', 'raw')],
    [
      'the network going away',
      new ApiRequestError(null, 'network_error', 'Cannot reach the server.'),
    ],
    ['a server error', new ApiRequestError(500, 'internal_error', 'boom')],
  ])('shows an error toast for %s and can try again', async (_, error) => {
    vi.spyOn(image, 'pickImage').mockResolvedValue(image1())
    const send = vi.spyOn(cvApi, 'uploadImage').mockRejectedValueOnce(error)
    render(<PhotoPicker />)
    fireEvent.click(upload())
    await waitFor(() => expect(toastText()).toContain('Photo not uploaded'))
    expect(useToasts.getState().toasts[0]!.tone).toBe('error')
    expect(state().cv!.header.photoUrl).toBeNull()
    expect((upload() as HTMLButtonElement).disabled).toBe(false)

    send.mockResolvedValueOnce(stored)
    fireEvent.click(upload())
    await waitFor(() => expect(state().cv!.header.photoUrl).toBe(stored.url))
  })

  it('disables the button while uploading, so a double click uploads once', async () => {
    vi.spyOn(image, 'pickImage').mockResolvedValue(image1())
    let finish!: () => void
    const send = vi
      .spyOn(cvApi, 'uploadImage')
      .mockImplementation(() => new Promise((resolve) => (finish = () => resolve(stored))))
    render(<PhotoPicker />)
    const button = upload() as HTMLButtonElement
    fireEvent.click(button)
    await waitFor(() => expect(button.disabled).toBe(true))
    fireEvent.click(button)
    fireEvent.click(button)
    await act(async () => finish())
    await waitFor(() => expect(state().cv!.header.photoUrl).toBe(stored.url))
    expect(send).toHaveBeenCalledTimes(1)
  })

  it('refuses a dropped file that is not an image without calling the server', async () => {
    const send = vi.spyOn(cvApi, 'uploadImage')
    render(<PhotoPicker />)
    const target = document.querySelector('button[aria-hidden]')!
    const file = new File(['%PDF'], 'cv.pdf', { type: 'application/pdf' })
    fireEvent.drop(target, { dataTransfer: { files: [file] } })
    await waitFor(() => expect(toastText()).toContain('Photo not uploaded'))
    expect(send).not.toHaveBeenCalled()
  })

  it('refuses a dropped image above 5 MB without calling the server', async () => {
    const send = vi.spyOn(cvApi, 'uploadImage')
    render(<PhotoPicker />)
    const target = document.querySelector('button[aria-hidden]')!
    const big = new File(['x'], 'big.jpg', { type: 'image/jpeg' })
    Object.defineProperty(big, 'size', { value: 5 * 1024 * 1024 + 1 })
    fireEvent.drop(target, { dataTransfer: { files: [big] } })
    await waitFor(() => expect(toastText()).toContain('Photo not uploaded'))
    expect(send).not.toHaveBeenCalled()
  })

  it('ignores a drop with no files at all', async () => {
    const send = vi.spyOn(cvApi, 'uploadImage')
    render(<PhotoPicker />)
    const target = document.querySelector('button[aria-hidden]')!
    fireEvent.drop(target, { dataTransfer: { files: [] } })
    await new Promise((resolve) => setTimeout(resolve, 20))
    expect(send).not.toHaveBeenCalled()
  })

  it('shows nothing while no document is loaded', () => {
    useCvEditor.setState({ cv: null })
    const { container } = render(<PhotoPicker />)
    expect(container.firstChild).toBeNull()
  })

  it('removing a photo that is already gone is harmless', () => {
    state().updateHeader({ photoUrl: '/api/images/x.jpg', showPhoto: true })
    render(<PhotoPicker />)
    const remove = screen.getByRole('button', { name: 'Remove' })
    fireEvent.click(remove)
    expect(state().cv!.header.photoUrl).toBeNull()
    expect(screen.queryByRole('button', { name: 'Remove' })).toBeNull()
  })
})
