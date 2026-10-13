import { getSectionTitle, type CvDocument, type Section } from '@cv/shared'

const PAGE_SIZE_MM = {
  A4: { width: 210, height: 297 },
  Letter: { width: 215.9, height: 279.4 },
}

function SectionStub({ section, cv }: { section: Section; cv: CvDocument }) {
  const count = 'items' in section ? section.items.length : section.text ? 1 : 0
  return (
    <div className="mb-5">
      <h3 className="border-b border-current/20 pb-1 text-[11px] font-semibold tracking-wide uppercase">
        {getSectionTitle(section, cv.language)}
      </h3>
      <div className="mt-2 space-y-1.5">
        {Array.from({ length: Math.max(1, Math.min(count * 2, 6)) }, (_, i) => (
          <div
            key={i}
            className="h-1.5 rounded bg-current opacity-15"
            style={{ width: `${90 - ((i * 17) % 40)}%` }}
          />
        ))}
      </div>
    </div>
  )
}

/**
 * The CV page. Until the template renderer exists (Step 4) this draws the
 * real page size, header text and section titles with placeholder lines.
 */
export function PageCanvas({ cv, title }: { cv: CvDocument | null; title: string }) {
  const size = PAGE_SIZE_MM[cv?.design.pageSize ?? 'A4']
  const pageStyle = { width: `${size.width}mm`, minHeight: `${size.height}mm` }

  if (!cv) {
    return (
      <div
        style={pageStyle}
        className="flex shrink-0 flex-col bg-white p-16 text-slate-800 shadow-lg"
      >
        <p className="text-lg font-semibold">{title}</p>
        <p className="mt-2 text-sm text-slate-500">The cover letter editor is built in Step 13.</p>
      </div>
    )
  }

  const main = cv.sections.filter((s) => s.column === 'main' && s.visible)
  const sidebar = cv.sections.filter((s) => s.column === 'sidebar' && s.visible)

  return (
    <div
      style={{ ...pageStyle, fontFamily: `'${cv.design.fontFamily}', system-ui, sans-serif` }}
      className="flex shrink-0 bg-white text-slate-800 shadow-lg"
      aria-label="CV page"
    >
      <div className="flex-1 p-12">
        <p className="text-3xl font-semibold text-slate-700 uppercase">
          {cv.header.name || 'Your Name'}
        </p>
        <p className="mt-1 text-base" style={{ color: cv.design.accentColor }}>
          {cv.header.headline || 'The role you are applying for?'}
        </p>
        <p className="mt-2 mb-8 text-xs text-slate-500">
          {[
            cv.header.phone || 'Phone',
            cv.header.email || 'Email',
            cv.header.link || 'LinkedIn/Portfolio',
            cv.header.location || 'Location',
          ]
            .filter(Boolean)
            .join('  ·  ')}
        </p>
        {main.map((s) => (
          <SectionStub key={s.id} section={s} cv={cv} />
        ))}
      </div>
      {sidebar.length > 0 && (
        <div
          className="w-[38%] p-10 pt-32 text-white"
          style={{ backgroundColor: cv.design.accentColor }}
        >
          {sidebar.map((s) => (
            <SectionStub key={s.id} section={s} cv={cv} />
          ))}
        </div>
      )}
    </div>
  )
}
