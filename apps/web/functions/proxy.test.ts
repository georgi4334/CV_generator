// @vitest-environment node
import { describe, expect, it } from 'vitest'
import { proxy } from './api/[[path]]'

const env = { API_ORIGIN: 'https://cv-api.onrender.com', PROXY_SECRET: 's'.repeat(40) }

function capture(response = new Response('{"ok":true}', { status: 200 })) {
  const calls: { url: string; init: RequestInit }[] = []
  const fn = (async (url: URL, init: RequestInit) => {
    calls.push({ url: url.toString(), init })
    return response
  }) as unknown as typeof fetch
  return { fn, calls }
}

describe('Pages proxy', () => {
  it('forwards the path, query and body with the secret and the client address', async () => {
    const f = capture()
    const request = new Request('https://cv.pages.dev/api/cvs?x=1', {
      method: 'POST',
      body: '{"title":"A"}',
      headers: {
        'content-type': 'application/json',
        cookie: 'cv_session=abc',
        'cf-connecting-ip': '203.0.113.7',
        'x-proxy-secret': 'forged',
        'x-client-ip': '6.6.6.6',
        'x-forwarded-for': '6.6.6.6',
      },
    })
    const response = await proxy(request, env, f.fn)
    expect(response.status).toBe(200)
    const { url, init } = f.calls[0]!
    expect(url).toBe('https://cv-api.onrender.com/api/cvs?x=1')
    expect(init.method).toBe('POST')
    const headers = init.headers as Headers
    expect(headers.get('x-proxy-secret')).toBe(env.PROXY_SECRET)
    expect(headers.get('x-client-ip')).toBe('203.0.113.7')
    expect(headers.get('x-forwarded-for')).toBeNull()
    expect(headers.get('cookie')).toBe('cv_session=abc')
    expect(await new Response(init.body).text()).toBe('{"title":"A"}')
  })

  it('passes cookies from the API back to the browser', async () => {
    const api = new Response(null, {
      status: 204,
      headers: { 'set-cookie': 'cv_session=new; HttpOnly' },
    })
    const response = await proxy(
      new Request('https://cv.pages.dev/api/auth/logout', { method: 'POST' }),
      env,
      capture(api).fn,
    )
    expect(response.headers.get('set-cookie')).toBe('cv_session=new; HttpOnly')
  })

  it('explains a missing configuration or a sleeping API', async () => {
    const unconfigured = await proxy(new Request('https://cv.pages.dev/api/cvs'), {
      API_ORIGIN: '',
      PROXY_SECRET: '',
    })
    expect(unconfigured.status).toBe(503)
    const failing = (async () => {
      throw new TypeError('network')
    }) as unknown as typeof fetch
    const down = await proxy(new Request('https://cv.pages.dev/api/cvs'), env, failing)
    expect(down.status).toBe(502)
    expect((await down.json()).error.code).toBe('api_unreachable')
  })
})
