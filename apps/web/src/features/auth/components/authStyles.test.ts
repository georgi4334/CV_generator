import { describe, expect, it } from 'vitest'
import { safeNext } from './authStyles'

describe('safeNext', () => {
  it.each([
    ['/', '/'],
    ['/jobs', '/jobs'],
    ['/jobs?status=applied&q=a%20b', '/jobs?status=applied&q=a%20b'],
    ['/cvs/123/edit', '/cvs/123/edit'],
    ['/documents/cvs#top', '/documents/cvs#top'],
    ['/%2F/evil.com', '/%2F/evil.com'],
    ['/a//b', '/a//b'],
  ])('keeps the same-site path %s', (value, expected) => {
    expect(safeNext(value)).toBe(expected)
  })

  it.each([
    ['nothing', null],
    ['an empty string', ''],
    ['a bare word', 'jobs'],
    ['a protocol-relative url', '//evil.com'],
    ['a protocol-relative url with a path', '//evil.com/jobs'],
    ['three slashes', '///evil.com'],
    ['an absolute url', 'https://evil.com'],
    ['an absolute url with the same path', 'https://evil.com/jobs'],
    ['an http url', 'http://evil.com'],
    ['a javascript url', 'javascript:alert(1)'],
    ['a data url', 'data:text/html,<script>alert(1)</script>'],
    ['a mailto link', 'mailto:a@b.c'],
    ['a url with credentials', 'https://user@evil.com'],
    ['whitespace', '   '],
    ['a space before the slashes', ' //evil.com'],
    ['the text null', 'null'],
    ['a relative path', '../evil'],
    ['a backslash then a slash', '\\/evil.com'],
  ])('falls back to the dashboard for %s', (_, value) => {
    expect(safeNext(value)).toBe('/')
  })

  // BUG: safeNext only rejects a second "/", but browsers treat a backslash like a slash when
  // they resolve a URL ("/\evil.com" and "/\t/evil.com" both become "//evil.com", a link to
  // another site) and strip tabs/newlines inside a URL. These values are returned as they are,
  // so `/login?next=/%5Cevil.com` signs the user in and then sends them to evil.com (or throws a
  // SecurityError from history.pushState).
  // Repro: safeNext('/\\evil.com') === '/\\evil.com'. Expected: '/'.
  it.fails.each([
    ['a backslash after the slash', '/\\evil.com'],
    ['two backslashes', '/\\\\evil.com'],
    ['a tab between the slashes', '/\t/evil.com'],
    ['a newline between the slashes', '/\n/evil.com'],
    ['a carriage return between the slashes', '/\r/evil.com'],
  ])('falls back to the dashboard for %s', (_, value) => {
    expect(safeNext(value)).toBe('/')
  })
})
