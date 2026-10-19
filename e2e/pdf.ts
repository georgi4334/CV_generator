import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs'

export interface PdfPage {
  width: number
  height: number
  /** Text pieces with their position in points, measured from the top-left corner of the page. */
  items: Array<{ str: string; left: number; top: number; right: number; bottom: number }>
  text: string
}

/** Reads a PDF: for every page its size and where each piece of text sits. */
export async function readPdf(data: Buffer): Promise<PdfPage[]> {
  const pdf = await getDocument({ data: new Uint8Array(data), verbosity: 0 }).promise
  const pages: PdfPage[] = []
  for (let number = 1; number <= pdf.numPages; number++) {
    const page = await pdf.getPage(number)
    const [, , width, height] = page.view as [number, number, number, number]
    const content = await page.getTextContent()
    type Piece = { str: string; transform: number[]; width: number; height: number }
    const items = (content.items as Array<Partial<Piece>>)
      .filter((item): item is Piece => typeof item.str === 'string' && item.str.trim() !== '')
      .map(({ str, transform, width: w, height: h }) => {
        const x = transform[4]!
        const y = transform[5]!
        return { str, left: x, right: x + w, top: height - (y + h), bottom: height - y }
      })
    pages.push({ width, height, items, text: items.map((i) => i.str).join(' ') })
  }
  return pages
}

/** The gap between the page edge and the nearest text on each side, in points. */
export function margins(page: PdfPage) {
  return {
    top: Math.min(...page.items.map((i) => i.top)),
    bottom: page.height - Math.max(...page.items.map((i) => i.bottom)),
    left: Math.min(...page.items.map((i) => i.left)),
    right: page.width - Math.max(...page.items.map((i) => i.right)),
  }
}
