const MAX_FILE_BYTES = 5 * 1024 * 1024

/**
 * Reads an image file and scales it down to a square-ish data URL so it can be
 * stored inside the CV document (file storage arrives in Step 8).
 */
export async function imageFileToDataUrl(file: File, maxSize: number): Promise<string> {
  if (!file.type.startsWith('image/')) throw new Error('Please choose an image file.')
  if (file.size > MAX_FILE_BYTES) throw new Error('The image must be smaller than 5 MB.')

  const bitmap = await createImageBitmap(file)
  const scale = Math.min(1, maxSize / Math.max(bitmap.width, bitmap.height))
  const canvas = document.createElement('canvas')
  canvas.width = Math.round(bitmap.width * scale)
  canvas.height = Math.round(bitmap.height * scale)
  canvas.getContext('2d')!.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
  bitmap.close()
  return canvas.toDataURL(file.type === 'image/png' ? 'image/png' : 'image/jpeg', 0.85)
}

/** Opens the file picker and resolves with a resized image, or null if cancelled. */
export function pickImage(maxSize: number): Promise<string | null> {
  return new Promise((resolve, reject) => {
    const input = document.createElement('input')
    input.type = 'file'
    input.accept = 'image/png,image/jpeg,image/webp'
    input.onchange = () => {
      const file = input.files?.[0]
      if (!file) return resolve(null)
      imageFileToDataUrl(file, maxSize).then(resolve, reject)
    }
    input.click()
  })
}
