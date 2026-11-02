import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { pickAndUpload, pickImage, PHOTO_MAX_SIZE, resizeImage } from './image'

const MB = 1024 * 1024
// Captured before any spy replaces it, so stubs can be stacked in one test.
const realCreate = document.createElement.bind(document)

function fileOf(type: string, size = 100, name = 'photo') {
  const file = new File(['x'], name, { type })
  Object.defineProperty(file, 'size', { value: size })
  return file
}

interface CanvasSpy {
  drawImage: ReturnType<typeof vi.fn>
  toBlob: ReturnType<typeof vi.fn>
}

/** jsdom has no canvas or image decoding: stand in for both. */
function stubBrowserImage(
  size: { width: number; height: number },
  { blob = new Blob(['jpeg']) as Blob | null, input = null as HTMLInputElement | null } = {},
) {
  const close = vi.fn()
  vi.stubGlobal(
    'createImageBitmap',
    vi.fn(async () => ({ ...size, close })),
  )
  const spy: CanvasSpy = { drawImage: vi.fn(), toBlob: vi.fn() }
  spy.toBlob.mockImplementation((callback: BlobCallback) => callback(blob))
  const canvases: HTMLCanvasElement[] = []
  vi.spyOn(document, 'createElement').mockImplementation(((tag: string) => {
    if (tag === 'input' && input) return input
    const element = realCreate(tag)
    if (tag === 'canvas') {
      canvases.push(element as HTMLCanvasElement)
      ;(element as HTMLCanvasElement).getContext = (() => ({
        drawImage: spy.drawImage,
      })) as never
      ;(element as HTMLCanvasElement).toBlob = spy.toBlob as never
    }
    return element
  }) as typeof document.createElement)
  return { close, spy, canvases }
}

beforeEach(() => vi.restoreAllMocks())
afterEach(() => vi.unstubAllGlobals())

describe('resizeImage', () => {
  it.each([
    ['a text file', 'text/plain'],
    ['a PDF', 'application/pdf'],
    ['an SVG-less binary', 'application/octet-stream'],
    ['a file without a type', ''],
    ['a video', 'video/mp4'],
  ])('refuses %s with a readable message and never touches the decoder', async (_, type) => {
    const decoder = vi.fn()
    vi.stubGlobal('createImageBitmap', decoder)
    await expect(resizeImage(fileOf(type), PHOTO_MAX_SIZE)).rejects.toThrow(/image/i)
    expect(decoder).not.toHaveBeenCalled()
  })

  it('accepts a file of exactly 5 MB and refuses one byte more', async () => {
    stubBrowserImage({ width: 100, height: 100 })
    await expect(resizeImage(fileOf('image/jpeg', 5 * MB), 480)).resolves.toBeInstanceOf(Blob)
    await expect(resizeImage(fileOf('image/jpeg', 5 * MB + 1), 480)).rejects.toThrow(/large|MB/i)
  })

  it('refuses a huge file before decoding it', async () => {
    const decoder = vi.fn()
    vi.stubGlobal('createImageBitmap', decoder)
    await expect(resizeImage(fileOf('image/png', 500 * MB), 480)).rejects.toThrow()
    expect(decoder).not.toHaveBeenCalled()
  })

  it('passes on the error when the image cannot be decoded (corrupt file)', async () => {
    vi.stubGlobal(
      'createImageBitmap',
      vi.fn().mockRejectedValue(new DOMException('The source image could not be decoded.')),
    )
    await expect(resizeImage(fileOf('image/jpeg'), 480)).rejects.toThrow(/decoded/)
  })

  it('reports an unreadable result when the canvas cannot encode', async () => {
    const { close } = stubBrowserImage({ width: 100, height: 100 }, { blob: null })
    await expect(resizeImage(fileOf('image/jpeg'), 480)).rejects.toThrow()
    expect(close).toHaveBeenCalledOnce()
  })

  it('scales a large landscape photo down to the longest side', async () => {
    const { canvases } = stubBrowserImage({ width: 4000, height: 2000 })
    await resizeImage(fileOf('image/jpeg'), 480)
    expect([canvases[0]!.width, canvases[0]!.height]).toEqual([480, 240])
  })

  it('scales a portrait photo by its height', async () => {
    const { canvases } = stubBrowserImage({ width: 1000, height: 4000 })
    await resizeImage(fileOf('image/jpeg'), 480)
    expect([canvases[0]!.width, canvases[0]!.height]).toEqual([120, 480])
  })

  it('never enlarges a small image', async () => {
    const { canvases } = stubBrowserImage({ width: 100, height: 50 })
    await resizeImage(fileOf('image/png'), 480)
    expect([canvases[0]!.width, canvases[0]!.height]).toEqual([100, 50])
  })

  it('handles a 1 pixel image and an extremely wide strip', async () => {
    const { canvases } = stubBrowserImage({ width: 1, height: 1 })
    await resizeImage(fileOf('image/png'), 480)
    expect([canvases[0]!.width, canvases[0]!.height]).toEqual([1, 1])
    vi.restoreAllMocks()
    const wide = stubBrowserImage({ width: 20_000, height: 10 })
    await resizeImage(fileOf('image/png'), 480)
    expect(wide.canvases[0]!.width).toBe(480)
  })

  it('keeps PNG as PNG and turns everything else (JPEG, WebP, GIF) into JPEG', async () => {
    const { spy } = stubBrowserImage({ width: 10, height: 10 })
    await resizeImage(fileOf('image/png'), 480)
    await resizeImage(fileOf('image/webp'), 480)
    await resizeImage(fileOf('image/gif'), 480)
    expect(spy.toBlob.mock.calls.map((c) => c[1])).toEqual([
      'image/png',
      'image/jpeg',
      'image/jpeg',
    ])
  })

  it('releases the decoded bitmap', async () => {
    const { close } = stubBrowserImage({ width: 10, height: 10 })
    await resizeImage(fileOf('image/jpeg'), 480)
    expect(close).toHaveBeenCalledOnce()
  })
})

/** An <input type=file> whose chosen files are known, handed out by document.createElement. */
function pickerWith(files: File[] | null, image = { width: 10, height: 10 }) {
  const input = document.createElement('input')
  const click = vi.spyOn(input, 'click').mockImplementation(() => {})
  Object.defineProperty(input, 'files', { value: files })
  stubBrowserImage(image, { input })
  const choose = () => input.onchange?.(new Event('change'))
  return { input, click, choose }
}

describe('pickImage', () => {
  it('opens the file picker for images only', async () => {
    const { input, click, choose } = pickerWith([])
    const result = pickImage(480)
    expect(click).toHaveBeenCalledOnce()
    expect(input.accept).toBe('image/png,image/jpeg,image/webp')
    choose()
    await expect(result).resolves.toBeNull()
  })

  it('resolves null when the picker is closed without a file', async () => {
    const { choose } = pickerWith(null)
    const result = pickImage(480)
    choose()
    await expect(result).resolves.toBeNull()
  })

  it('rejects when the chosen file is not an image', async () => {
    const { choose } = pickerWith([fileOf('text/plain')])
    const result = pickImage(480)
    choose()
    await expect(result).rejects.toThrow()
  })

  it('resolves with the resized image', async () => {
    const { choose } = pickerWith([fileOf('image/png')])
    const result = pickImage(480)
    choose()
    await expect(result).resolves.toBeInstanceOf(Blob)
  })
})

describe('pickAndUpload', () => {
  it('does not upload when nothing was picked', async () => {
    const upload = vi.fn()
    const { choose } = pickerWith([])
    const result = pickAndUpload(480, upload)
    choose()
    await expect(result).resolves.toBeNull()
    expect(upload).not.toHaveBeenCalled()
  })

  it('passes the resized image to upload and returns its URL', async () => {
    const { choose } = pickerWith([fileOf('image/png')])
    const upload = vi.fn(async () => '/api/uploads/new.png')
    const result = pickAndUpload(480, upload)
    choose()
    await expect(result).resolves.toBe('/api/uploads/new.png')
    expect(upload).toHaveBeenCalledOnce()
  })

  it('lets an upload error through to the caller', async () => {
    const { choose } = pickerWith([fileOf('image/png')])
    const result = pickAndUpload(480, async () => {
      throw new Error('offline')
    })
    choose()
    await expect(result).rejects.toThrow('offline')
  })

  it('does not upload a file that is too big', async () => {
    const upload = vi.fn()
    const { choose } = pickerWith([fileOf('image/jpeg', 6 * MB)])
    const result = pickAndUpload(480, upload)
    choose()
    await expect(result).rejects.toThrow()
    expect(upload).not.toHaveBeenCalled()
  })
})
