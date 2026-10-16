import { createHash } from 'node:crypto'
import { readFile, writeFile } from 'node:fs/promises'
import { join } from 'node:path'
import type { Plugin } from 'vite'

/** Hashes of the inline <script>s in the page, so the policy can allow exactly those. */
export function inlineScriptHashes(html: string): string[] {
  return [...html.matchAll(/<script(?![^>]*\bsrc=)[^>]*>([\s\S]*?)<\/script>/g)].map(
    ([, body]) => `'sha256-${createHash('sha256').update(body!).digest('base64')}'`,
  )
}

export function contentSecurityPolicy(html: string): string {
  return [
    "default-src 'self'",
    `script-src 'self' ${inlineScriptHashes(html).join(' ')}`.trim(),
    // Tailwind and the CV renderer set inline style attributes.
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob:",
    "font-src 'self' data:",
    // The API is on the same site (/api); Sentry reports go to its ingest servers.
    "connect-src 'self' https://*.ingest.sentry.io https://*.ingest.de.sentry.io https://*.ingest.us.sentry.io",
    "frame-src 'self'",
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
  ].join('; ')
}

/**
 * Writes Cloudflare Pages' `_headers` file at build time: security headers for
 * every page (with a Content-Security-Policy that matches the built
 * index.html) and long caching for hashed assets.
 */
export function securityHeaders(): Plugin {
  let outDir = 'dist'
  return {
    name: 'cv-security-headers',
    apply: 'build',
    configResolved(config) {
      outDir = config.build.outDir
    },
    // After the files are written, so the final index.html is hashed.
    async writeBundle() {
      const html = await readFile(join(outDir, 'index.html'), 'utf8')
      if (inlineScriptHashes(html).length === 0) {
        this.warn('index.html has no inline script; check the Content-Security-Policy')
      }
      const headers = [
        '/*',
        `  Content-Security-Policy: ${contentSecurityPolicy(html)}`,
        '  X-Content-Type-Options: nosniff',
        '  Referrer-Policy: strict-origin-when-cross-origin',
        '  Permissions-Policy: camera=(), microphone=(), geolocation=(), payment=()',
        '  Strict-Transport-Security: max-age=31536000; includeSubDomains',
        '',
        '/assets/*',
        '  Cache-Control: public, max-age=31536000, immutable',
        '',
        // Shared documents must not be indexed by search engines.
        '/s/*',
        '  X-Robots-Tag: noindex, nofollow',
        '',
      ].join('\n')
      await writeFile(join(outDir, '_headers'), headers)
    },
  }
}

/**
 * `vite preview` serves the built app with the same headers as Cloudflare
 * Pages (the `/*` block of `_headers`), so end-to-end tests run under the
 * real Content-Security-Policy.
 */
export function previewHeaders(): Plugin {
  return {
    name: 'cv-preview-headers',
    apply: 'serve',
    async configurePreviewServer(server) {
      const file = join(server.config.build.outDir, '_headers')
      const text = await readFile(file, 'utf8').catch(() => '')
      const block = text.split('\n\n')[0]!.split('\n').slice(1)
      const headers = block.map(
        (line) =>
          line
            .trim()
            .split(/:\s(.*)/s)
            .slice(0, 2) as [string, string],
      )
      server.middlewares.use((_req, res, next) => {
        for (const [name, value] of headers)
          if (name && name !== 'Strict-Transport-Security') res.setHeader(name, value)
        next()
      })
    },
  }
}
