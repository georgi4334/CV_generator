import {
  createEmptyCv,
  createExampleCv,
  createId,
  createItem,
  createSection,
  PROFESSION_IDS,
  SECTION_TYPES,
  SKILL_DISPLAYS,
  TEMPLATE_IDS,
  type CvDocument,
  type SectionOf,
} from '@cv/shared'
import { render, screen, within } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { CvRenderer } from './CvRenderer'

const doc = () => within(screen.getByRole('document', { name: 'CV' }))
const pageCount = (container: HTMLElement) =>
  Number(container.querySelector('[role=document]')!.getAttribute('data-page-count'))

/** jsdom has no layout: give every measured block a height so pagination has something to do. */
function fakeLayout({ block = 120, header = 150 }: { block?: number; header?: number } = {}) {
  vi.spyOn(HTMLElement.prototype, 'offsetHeight', 'get').mockImplementation(function (
    this: HTMLElement,
  ) {
    if ('measureHeader' in this.dataset) return header
    if ('measureBlock' in this.dataset) return block
    return 0
  })
}

afterEach(() => vi.restoreAllMocks())

const experienceOf = (cv: CvDocument) =>
  cv.sections.find((s) => s.type === 'experience') as SectionOf<'experience'>

function bigCv(entries: number, bullets: number): CvDocument {
  const cv = createEmptyCv()
  cv.header.name = 'Big Person'
  const section = experienceOf(cv)
  section.items = Array.from({ length: entries }, (_, i) => ({
    ...createItem('experience'),
    id: createId(),
    title: `Job ${i}`,
    company: `Company ${i}`,
    startDate: '2000-01',
    endDate: '2001-01',
    bullets: Array.from({ length: bullets }, (_, b) => `Bullet ${i}.${b} did a thing`),
  }))
  return cv
}

describe('empty and minimal documents', () => {
  it.each(['edit', 'preview'] as const)(
    'renders a document without any section in %s mode',
    (mode) => {
      const cv = createEmptyCv()
      cv.sections = []
      const { container } = render(<CvRenderer cv={cv} mode={mode} />)
      expect(pageCount(container)).toBe(1)
    },
  )

  it('renders a document with every section hidden', () => {
    const cv = createExampleCv('software-developer')
    for (const s of cv.sections) s.visible = false
    const { container } = render(<CvRenderer cv={cv} mode="preview" />)
    expect(pageCount(container)).toBe(1)
    expect(doc().queryByText('Experience')).toBeNull()
  })

  it('renders sections that have no entries', () => {
    const cv = createEmptyCv()
    for (const s of cv.sections) if ('items' in s) s.items = []
    expect(() => render(<CvRenderer cv={cv} mode="edit" />)).not.toThrow()
  })

  it('renders an empty preview as one blank page, not a crash', () => {
    const { container } = render(<CvRenderer cv={createEmptyCv()} mode="preview" />)
    expect(pageCount(container)).toBe(1)
  })

  it('renders a CV that has only a summary', () => {
    const cv = createEmptyCv()
    cv.sections = cv.sections.filter((s) => s.type === 'summary')
    render(<CvRenderer cv={cv} mode="edit" />)
    expect(doc().getByText('Your Name')).toBeDefined()
  })

  it.each(SECTION_TYPES)('renders a lone, blank %s section in every mode', (type) => {
    for (const mode of ['edit', 'preview'] as const) {
      const cv = createEmptyCv()
      cv.sections = [createSection(type, 'main')]
      const { unmount } = render(<CvRenderer cv={cv} mode={mode} />)
      unmount()
    }
  })
})

describe('every template, profession and skill style', () => {
  it.each(TEMPLATE_IDS)(
    'renders all %s examples in Bulgarian and British English',
    (templateId) => {
      for (const profession of PROFESSION_IDS) {
        for (const language of ['bg', 'en-GB'] as const) {
          const cv = { ...createExampleCv(profession), language }
          cv.design.templateId = templateId
          const { unmount } = render(<CvRenderer cv={cv} mode="preview" />)
          expect(doc().getByText(cv.header.name)).toBeDefined()
          unmount()
        }
      }
    },
  )

  it.each(TEMPLATE_IDS.flatMap((t) => SKILL_DISPLAYS.map((d) => [t, d] as const)))(
    'renders the %s template with %s skills',
    (templateId, display) => {
      const cv = createExampleCv('software-developer')
      cv.design.templateId = templateId
      for (const s of cv.sections) {
        if (s.type === 'skills' || s.type === 'languages') s.levelDisplay = display
      }
      render(<CvRenderer cv={cv} mode="preview" />)
      expect(doc().getByText('TypeScript')).toBeDefined()
    },
  )

  it.each(TEMPLATE_IDS)(
    'renders %s on Letter paper with every slider at its extremes',
    (templateId) => {
      for (const level of [1, 5] as const) {
        const cv = createExampleCv('designer')
        cv.design = {
          ...cv.design,
          templateId,
          pageSize: 'Letter',
          pageMargins: level,
          sectionSpacing: level,
          fontSize: level,
          lineHeight: level,
          columnLayout: level === 1 ? 1 : 4,
        }
        const { unmount } = render(<CvRenderer cv={cv} mode="edit" />)
        unmount()
      }
    },
  )
})

describe('invalid design values', () => {
  const render1 = (change: (cv: CvDocument) => void) => {
    const cv = createExampleCv('designer')
    change(cv)
    return render(<CvRenderer cv={cv} mode="preview" />)
  }

  it('falls back to the default template for an unknown template id', () => {
    const { container } = render1((cv) => {
      ;(cv.design as { templateId: string }).templateId = 'does-not-exist'
    })
    expect(pageCount(container)).toBe(1)
    expect(doc().getByText('Skills')).toBeDefined()
  })

  it('renders with an unknown font family', () => {
    expect(() =>
      render1((cv) => {
        ;(cv.design as { fontFamily: string }).fontFamily = 'Comic Sans'
      }),
    ).not.toThrow()
  })

  it.each(['red', '#12', '', 'url(javascript:alert(1))', '#GGGGGG', 'rgb(0,0,0)'])(
    'renders with the accent colour "%s"',
    (color) => {
      const { container } = render1((cv) => {
        cv.design.accentColor = color
      })
      expect(pageCount(container)).toBe(1)
    },
  )

  it('does not put a script or url() payload from the accent colour into markup', () => {
    const { container } = render1((cv) => {
      cv.design.accentColor = '"><script>window.__pwned=1</script>'
    })
    expect(container.querySelector('script')).toBeNull()
    expect((window as unknown as { __pwned?: number }).__pwned).toBeUndefined()
  })

  it('an unknown background id is a plain page', () => {
    const { container } = render1((cv) => {
      cv.design.background = 'neon-unicorns'
    })
    const page = container.querySelector('[role=document] > div') as HTMLElement
    expect(page.style.backgroundImage).toBe('')
  })

  it.each([0, 6, -1, 2.5, Number.NaN])('slider value %s does not break the layout', (value) => {
    const { container } = render1((cv) => {
      Object.assign(cv.design, {
        pageMargins: value,
        sectionSpacing: value,
        fontSize: value,
        lineHeight: value,
      })
    })
    expect(pageCount(container)).toBe(1)
  })

  it.each([0, 5, 99])('column layout %s still renders', (columnLayout) => {
    const { container } = render1((cv) => {
      cv.design.columnLayout = columnLayout
    })
    expect(pageCount(container)).toBe(1)
  })

  // BUG: an unknown page size (e.g. "A3" from a newer app version or hand-edited data) is looked
  // up in PAGE_SIZE_PX without a fallback, so layoutTokens().page is undefined and CvRenderer
  // throws "Cannot read properties of undefined (reading 'height')": the editor shows the
  // error page. Unknown template ids and fonts fall back gracefully, page sizes do not.
  // Repro: const cv = createExampleCv('designer'); cv.design.pageSize = 'A3'; render(<CvRenderer cv={cv} mode="preview" />)
  it.fails('falls back to A4 for an unknown page size', () => {
    const { container } = render1((cv) => {
      ;(cv.design as { pageSize: string }).pageSize = 'A3'
    })
    expect(pageCount(container)).toBe(1)
  })
})

describe('broken content', () => {
  it('shows no photo for a header without a URL, even with "show photo" on', () => {
    const cv = createExampleCv('designer')
    cv.header.showPhoto = true
    cv.header.photoUrl = null
    const { container } = render(<CvRenderer cv={cv} mode="preview" />)
    expect(container.querySelectorAll('img')).toHaveLength(0)
  })

  it('renders a photo that points to a broken URL, with an empty alt text', () => {
    const cv = createExampleCv('designer')
    cv.header.showPhoto = true
    cv.header.photoUrl = '/api/uploads/missing.jpg'
    const { container } = render(<CvRenderer cv={cv} mode="preview" />)
    const image = container.querySelector('[role=document] img')!
    expect(image.getAttribute('alt')).toBe('')
    expect(image.getAttribute('src')).toBe('/api/uploads/missing.jpg')
  })

  it('does not render a photo when showPhoto is off', () => {
    const cv = createExampleCv('designer')
    cv.header.showPhoto = false
    cv.header.photoUrl = '/api/uploads/me.jpg'
    const { container } = render(<CvRenderer cv={cv} mode="preview" />)
    expect(container.querySelector('[role=document] img')).toBeNull()
  })

  it('renders an unknown photo shape as a circle', () => {
    const cv = createExampleCv('designer')
    cv.header.showPhoto = true
    cv.header.photoUrl = '/api/uploads/me.jpg'
    ;(cv.header as { photoShape: string }).photoShape = 'hexagon'
    const { container } = render(<CvRenderer cv={cv} mode="preview" />)
    expect(container.querySelector('[role=document] img')!.className).toContain('rounded-full')
  })

  it('shows text with HTML characters as text, never as markup', () => {
    const cv = createEmptyCv()
    cv.header.name = '<img src=x onerror=alert(1)>'
    const { container } = render(<CvRenderer cv={cv} mode="preview" />)
    expect(container.querySelector('[role=document] img')).toBeNull()
    expect(doc().getByText('<img src=x onerror=alert(1)>')).toBeDefined()
  })

  it('does not turn a javascript: link into a clickable link', () => {
    const cv = createExampleCv('software-developer')
    const certificates = cv.sections.find((s) => s.type === 'certificates')!
    if (certificates.type !== 'certificates') throw new Error()
    certificates.items[0]!.link = 'javascript:alert(1)'
    const { container } = render(<CvRenderer cv={cv} mode="preview" />)
    const hrefs = [...container.querySelectorAll('a')].map((a) => a.getAttribute('href') ?? '')
    expect(hrefs.some((href) => href.toLowerCase().startsWith('javascript:'))).toBe(false)
  })

  it('renders emoji, right-to-left text and combining marks', () => {
    const cv = createEmptyCv()
    cv.header.name = 'مريم 🚀 Zoë'
    cv.header.headline = 'é́́ עובד'
    render(<CvRenderer cv={cv} mode="preview" />)
    expect(doc().getByText('مريم 🚀 Zoë')).toBeDefined()
  })

  it('renders entries whose dates are partly missing or in the wrong order', () => {
    const cv = createExampleCv('software-developer')
    const experience = experienceOf(cv)
    experience.items[0]!.startDate = null
    experience.items[0]!.endDate = '2020-05'
    experience.items[1]!.startDate = '2022-01'
    experience.items[1]!.endDate = '2019-01'
    experience.items[1]!.isCurrent = false
    expect(() => render(<CvRenderer cv={cv} mode="preview" />)).not.toThrow()
  })

  it('renders a skill level outside 1 to 5', () => {
    const cv = createExampleCv('software-developer')
    const skills = cv.sections.find((s) => s.type === 'skills')!
    if (skills.type !== 'skills') throw new Error()
    skills.levelDisplay = 'dots'
    skills.items[0]!.level = 99 as never
    skills.items[1]!.level = -3 as never
    expect(() => render(<CvRenderer cv={cv} mode="preview" />)).not.toThrow()
  })
})

describe('too much content', () => {
  it('shows one 10 000 character word without throwing and keeps it in the page', () => {
    const cv = createEmptyCv()
    cv.header.name = 'W'.repeat(10_000)
    const summary = cv.sections.find((s) => s.type === 'summary')!
    if (summary.type !== 'summary') throw new Error()
    summary.text = 'x'.repeat(10_000)
    render(<CvRenderer cv={cv} mode="preview" />)
    expect(doc().getAllByText('W'.repeat(10_000)).length).toBeGreaterThan(0)
  })

  it('a 1 MB summary renders', () => {
    const cv = createEmptyCv()
    const summary = cv.sections.find((s) => s.type === 'summary')!
    if (summary.type !== 'summary') throw new Error()
    summary.text = 'word '.repeat(200_000)
    expect(() => render(<CvRenderer cv={cv} mode="preview" />)).not.toThrow()
  })

  it('spreads a long CV over several pages and still shows every entry once', () => {
    fakeLayout({ block: 120 })
    const cv = bigCv(60, 3)
    cv.design.templateId = 'single-column'
    const { container } = render(<CvRenderer cv={cv} mode="preview" />)
    expect(pageCount(container)).toBeGreaterThan(3)
    for (const title of ['Job 0', 'Job 30', 'Job 59']) {
      expect(doc().getAllByText(title)).toHaveLength(1)
    }
  })

  it('paginates every template for a long CV without losing or doubling an entry', () => {
    fakeLayout({ block: 200, header: 180 })
    for (const templateId of TEMPLATE_IDS) {
      const cv = bigCv(12, 2)
      cv.design.templateId = templateId
      const { container, unmount } = render(<CvRenderer cv={cv} mode="preview" />)
      expect(pageCount(container), templateId).toBeGreaterThan(1)
      for (let i = 0; i < 12; i++) {
        expect(doc().getAllByText(`Job ${i}`), `${templateId} Job ${i}`).toHaveLength(1)
      }
      unmount()
    }
  })

  it('renders 200 entries with 20 bullets each (4 000 bullets) and paginates', () => {
    fakeLayout({ block: 60 })
    const cv = bigCv(200, 20)
    const started = performance.now()
    const { container } = render(<CvRenderer cv={cv} mode="preview" />)
    expect(performance.now() - started).toBeLessThan(15_000)
    expect(pageCount(container)).toBeGreaterThan(10)
    expect(container.querySelectorAll('[role=document] li').length).toBe(200 * 20)
  })

  it('renders 100 sections of every column without a crash', () => {
    const cv = createEmptyCv()
    for (let i = 0; i < 100; i++)
      cv.sections.push(createSection('custom', i % 2 ? 'main' : 'sidebar'))
    expect(() => render(<CvRenderer cv={cv} mode="edit" />)).not.toThrow()
  })

  it('does not re-measure forever: a stable layout settles after a few renders', () => {
    fakeLayout({ block: 90 })
    const spy = vi.spyOn(console, 'error').mockImplementation(() => {})
    render(<CvRenderer cv={bigCv(30, 4)} mode="preview" />)
    // React reports "Maximum update depth exceeded" through console.error if measuring loops.
    expect(spy.mock.calls.flat().join(' ')).not.toContain('Maximum update depth')
  })

  it('keeps a block taller than a page on a page of its own', () => {
    fakeLayout({ block: 5000, header: 100 })
    const cv = bigCv(3, 1)
    cv.design.templateId = 'single-column'
    const { container } = render(<CvRenderer cv={cv} mode="preview" />)
    expect(pageCount(container)).toBeGreaterThanOrEqual(3)
  })
})

describe('hidden sections and modes', () => {
  it('hides a section in both modes without leaving its title behind', () => {
    for (const mode of ['edit', 'preview'] as const) {
      const cv = createExampleCv('software-developer')
      experienceOf(cv).visible = false
      const { unmount } = render(<CvRenderer cv={cv} mode={mode} />)
      expect(doc().queryByText('Experience')).toBeNull()
      unmount()
    }
  })
})
