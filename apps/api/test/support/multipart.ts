export interface Part {
  name: string
  data: Buffer | string
  filename?: string
  contentType?: string
}

/** A hand-made multipart/form-data body, so tests can send odd or broken uploads. */
export function multipartBody(parts: Part[], boundary = '----cvtestboundary') {
  const chunks: Buffer[] = []
  for (const part of parts) {
    let head = `--${boundary}\r\nContent-Disposition: form-data; name="${part.name}"`
    if (part.filename !== undefined) head += `; filename="${part.filename}"`
    head += '\r\n'
    if (part.contentType) head += `Content-Type: ${part.contentType}\r\n`
    chunks.push(Buffer.from(`${head}\r\n`), Buffer.from(part.data), Buffer.from('\r\n'))
  }
  chunks.push(Buffer.from(`--${boundary}--\r\n`))
  return {
    payload: Buffer.concat(chunks),
    contentType: `multipart/form-data; boundary=${boundary}`,
  }
}

export const PNG_SIGNATURE = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])
export const JPEG_START = Buffer.from([0xff, 0xd8, 0xff, 0xe0])
export const webpHeader = (kind = 'WEBP') =>
  Buffer.concat([Buffer.from('RIFF'), Buffer.from([4, 0, 0, 0]), Buffer.from(kind)])
