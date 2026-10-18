import { createExampleCv } from '@cv/shared'
import { render } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { CvRenderer } from './CvRenderer'
import { CvThumbnail } from './CvThumbnail'

describe('CvThumbnail', () => {
  const cv = createExampleCv('software-developer')
  const credential = () => {
    const certificates = cv.sections.find((s) => s.type === 'certificates')
    expect(certificates?.items[0]?.link).toBeTruthy()
  }

  it('draws links as plain text: a thumbnail sits inside a link of its own', () => {
    credential()
    const { container } = render(<CvThumbnail cv={cv} width={132} />)
    expect(container.querySelectorAll('a')).toHaveLength(0)
    expect(container.textContent).toContain('aws.amazon.com/verification')
  })

  it('the finished page still has real links', () => {
    credential()
    const { container } = render(<CvRenderer cv={cv} mode="preview" />)
    expect(container.querySelectorAll('a[href^="https://"]').length).toBeGreaterThan(0)
  })
})
