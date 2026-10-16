// @vitest-environment node
import { createHash } from 'node:crypto'
import { describe, expect, it } from 'vitest'
import { contentSecurityPolicy, inlineScriptHashes } from './securityHeaders'

describe('security headers', () => {
  it('allows exactly the inline scripts of the page', () => {
    const body = "document.documentElement.classList.add('dark')"
    const html = `<head><script>${body}</script><script type="module" src="/assets/index.js"></script></head>`
    const hash = createHash('sha256').update(body).digest('base64')
    expect(inlineScriptHashes(html)).toEqual([`'sha256-${hash}'`])
    const csp = contentSecurityPolicy(html)
    expect(csp).toContain(`script-src 'self' 'sha256-${hash}'`)
    expect(csp).toContain("frame-ancestors 'none'")
    expect(csp).not.toContain('unsafe-eval')
  })
})
