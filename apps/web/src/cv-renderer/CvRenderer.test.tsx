import {
  createEmptyCv,
  createExampleCv,
  CV_LANGUAGES,
  PROFESSION_IDS,
  TEMPLATE_IDS,
  type CvDocument,
} from '@cv/shared'
import { render, screen, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import { isItemEmpty } from './blocks'
import { CvRenderer } from './CvRenderer'
import { PLACEHOLDERS } from './placeholders'
import { getTemplate } from './templates'

const visiblePages = () => within(screen.getByRole('document', { name: 'CV' }))

describe('CvRenderer', () => {
  it.each(PROFESSION_IDS.flatMap((p) => TEMPLATE_IDS.map((t) => [p, t] as const)))(
    'renders the %s example with the %s template',
    (profession, templateId) => {
      const cv = createExampleCv(profession)
      cv.design.templateId = templateId
      render(<CvRenderer cv={cv} mode="preview" />)
      expect(visiblePages().getByText(cv.header.name)).toBeDefined()
    },
  )

  it('shows placeholders for empty fields while editing', () => {
    render(<CvRenderer cv={createEmptyCv()} mode="edit" />)
    expect(visiblePages().getByText('Your Name')).toBeDefined()
    expect(visiblePages().getByText('Company Name')).toBeDefined()
    expect(visiblePages().getByText('Experience')).toBeDefined()
  })

  it('hides placeholders and empty sections in preview', () => {
    const cv: CvDocument = {
      ...createEmptyCv(),
      header: { ...createEmptyCv().header, name: 'Ana Ivanova' },
    }
    render(<CvRenderer cv={cv} mode="preview" />)
    expect(visiblePages().getByText('Ana Ivanova')).toBeDefined()
    expect(visiblePages().queryByText('Company Name')).toBeNull()
    expect(visiblePages().queryByText('Experience')).toBeNull()
  })

  it('skips hidden sections', () => {
    const cv = createExampleCv('software-developer')
    const summary = cv.sections.find((s) => s.type === 'summary')!
    summary.visible = false
    render(<CvRenderer cv={cv} mode="edit" />)
    expect(visiblePages().queryByText('Summary')).toBeNull()
  })

  it('uses Bulgarian section titles for a Bulgarian CV', () => {
    const cv = { ...createExampleCv('healthcare'), language: 'bg' as const }
    render(<CvRenderer cv={cv} mode="preview" />)
    expect(visiblePages().getByText('Професионален опит')).toBeDefined()
  })
})

describe('placeholders', () => {
  it('follow the CV language', () => {
    const cv = createEmptyCv('bg')
    render(<CvRenderer cv={cv} mode="edit" />)
    const page = visiblePages()
    expect(page.getByText('Вашето име')).toBeDefined()
    expect(page.getByText('Телефон')).toBeDefined()
    expect(page.getAllByText('Име на компанията').length).toBeGreaterThan(0)
    expect(page.queryByText('Your Name')).toBeNull()
  })

  it('have a translation for every field in every language', () => {
    const keys = Object.keys(PLACEHOLDERS['en-US']).sort()
    for (const language of CV_LANGUAGES) {
      expect(Object.keys(PLACEHOLDERS[language]).sort()).toEqual(keys)
      expect(Object.values(PLACEHOLDERS[language]).every((text) => text.trim())).toBe(true)
    }
  })
})

describe('templates', () => {
  it('has its own definition for every template id', () => {
    for (const id of TEMPLATE_IDS) expect(getTemplate(id).id).toBe(id)
  })

  it('draws dated entries on a line in the Timeline template', () => {
    const cv = createExampleCv('software-developer')
    cv.design.templateId = 'timeline'
    const { container } = render(<CvRenderer cv={cv} mode="preview" />)
    const pages = container.querySelector('[role=document]')!
    expect(pages.querySelectorAll('.border-l-2').length).toBeGreaterThan(0)
  })

  it('applies the background pattern to the page', () => {
    const cv = createExampleCv('designer')
    cv.design.background = 'dots'
    const { container } = render(<CvRenderer cv={cv} mode="preview" />)
    const page = container.querySelector('[role=document] > div') as HTMLElement
    expect(page.style.backgroundImage).toContain('data:image/svg+xml')
  })
})

describe('isItemEmpty', () => {
  it('ignores the id and icon', () => {
    expect(isItemEmpty({ id: '1', icon: 'star', title: '', description: '' })).toBe(true)
    expect(isItemEmpty({ id: '1', icon: 'star', title: 'Won', description: '' })).toBe(false)
  })

  it('treats a list of blank bullets as empty', () => {
    expect(isItemEmpty({ id: '1', title: '', bullets: ['', '  '] })).toBe(true)
  })
})
