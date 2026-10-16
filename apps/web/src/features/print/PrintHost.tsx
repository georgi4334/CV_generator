import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { CvRenderer, LetterRenderer } from '@/renderer'
import { usePrintJob, type PrintJob } from './printCv'

const nextFrame = () =>
  new Promise<void>((resolve) =>
    typeof requestAnimationFrame === 'function'
      ? requestAnimationFrame(() => resolve())
      : setTimeout(resolve, 16),
  )

/** Waits for fonts, images and the renderer's page split. */
async function whenReady(root: HTMLElement) {
  await nextFrame()
  await document.fonts?.ready
  await Promise.all(
    [...root.querySelectorAll('img')].map((img) =>
      img.complete
        ? null
        : new Promise((resolve) => {
            img.addEventListener('load', resolve, { once: true })
            img.addEventListener('error', resolve, { once: true })
          }),
    ),
  )
  await nextFrame()
  await nextFrame()
}

function PrintView({ job }: { job: PrintJob }) {
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    let active = true
    const previousTitle = document.title
    const finish = () => {
      document.title = previousTitle
      usePrintJob.setState((state) => (state.job?.id === job.id ? { job: null } : state))
    }
    void whenReady(ref.current!).then(() => {
      if (!active) return
      document.title = job.title
      window.addEventListener('afterprint', finish, { once: true })
      window.print()
    })
    return () => {
      active = false
      window.removeEventListener('afterprint', finish)
      document.title = previousTitle
    }
  }, [job])

  const { doc } = job
  const design = doc.kind === 'cv' ? doc.cv.design : doc.letter.design
  const size = design.pageSize === 'Letter' ? 'letter' : 'A4'
  return (
    <div ref={ref} className="print-root" data-testid="print-root" aria-hidden>
      <style>{`@page { size: ${size} portrait; margin: 0; }`}</style>
      {doc.kind === 'cv' ? (
        <CvRenderer cv={doc.cv} mode="preview" />
      ) : (
        <LetterRenderer letter={doc.letter} mode="preview" />
      )}
    </div>
  )
}

/** Renders the CV being printed, off-screen; print CSS shows only this. Mount once. */
export function PrintHost() {
  const job = usePrintJob((s) => s.job)
  return job ? createPortal(<PrintView key={job.id} job={job} />, document.body) : null
}
