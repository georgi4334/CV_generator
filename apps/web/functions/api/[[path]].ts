/**
 * Cloudflare Pages Function: forwards /api/* to the API on Render, so the
 * browser talks to one site (the session cookie stays first-party).
 *
 * Settings (Pages → Settings → Variables and Secrets):
 *   API_ORIGIN    e.g. https://cv-api.onrender.com
 *   PROXY_SECRET  the same value as PROXY_SECRET on the API
 */
export interface ProxyEnv {
  API_ORIGIN: string
  PROXY_SECRET: string
}

/** Headers that describe this hop, not the request; they must not be forwarded. */
const HOP_HEADERS = ['host', 'connection', 'keep-alive', 'transfer-encoding', 'upgrade']

export async function proxy(
  request: Request,
  env: ProxyEnv,
  doFetch: typeof fetch = fetch,
): Promise<Response> {
  if (!env.API_ORIGIN || !env.PROXY_SECRET) {
    return Response.json(
      { error: { code: 'proxy_not_configured', message: 'The API address is not configured' } },
      { status: 503 },
    )
  }
  const url = new URL(request.url)
  const target = new URL(url.pathname + url.search, env.API_ORIGIN)

  const headers = new Headers(request.headers)
  for (const name of HOP_HEADERS) headers.delete(name)
  // Set here, never taken from the browser, so they cannot be forged.
  headers.set('x-proxy-secret', env.PROXY_SECRET)
  headers.set('x-client-ip', request.headers.get('cf-connecting-ip') ?? '')
  headers.delete('x-forwarded-for')

  const hasBody = request.method !== 'GET' && request.method !== 'HEAD'
  try {
    return await doFetch(target, {
      method: request.method,
      headers,
      body: hasBody ? request.body : undefined,
      redirect: 'manual',
    })
  } catch {
    return Response.json(
      {
        error: {
          code: 'api_unreachable',
          message: 'The server is starting up. Try again in a minute.',
        },
      },
      { status: 502 },
    )
  }
}

export const onRequest = ({ request, env }: { request: Request; env: ProxyEnv }) =>
  proxy(request, env)
