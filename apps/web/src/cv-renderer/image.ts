const MAX_FILE_BYTES = 5 * 1024 * 1024

/** Scales an image file down in the browser, so uploads stay small. */
export async function resizeImage(file: File, maxSize: number): Promise<Blob> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > MAX_FILE_BYTES) throw new Error('The image must be smaller than 5 MB.')

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  const type = file.type === 'image/png' ? 'image/png' : 'image/jpeg'
  return new Promise((resolve, reject) =>
    canvas.toBlob(
      (blob) => (blob ? resolve(blob) : reject(new Error('Could not read the image.'))),
      type,
      0.85,
    ),
  )
}

/** Opens the file picker and resolves with a resized image, or null if cancelled. */
export function pickImage(maxSize: number): Promise<Blob | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/webp'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      resizeImage(file, maxSize).then(resolve, reject)
    }
    input.click()
  })
}

/** Pick, resize and upload an image; returns its URL, or null if cancelled. */
export async function pickAndUpload(
  maxSize: number,
  upload: (image: Blob) => Promise<string>,
): Promise<string | null> {
  const image = await pickImage(maxSize)
  return image ? upload(image) : null
}
